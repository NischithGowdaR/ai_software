#!/usr/bin/env python3
"""
Migrate local `db_data/users.json` (the fallback DB) into MongoDB Atlas.

Usage:
  - Ensure `MONGODB_URI` and `DATABASE_NAME` are set in backend/.env or environment.
  - Dry run (no writes):
      python backend/tools/migrate_users_to_atlas.py --dry-run
  - Perform migration:
      python backend/tools/migrate_users_to_atlas.py

The script will skip users that already exist in Atlas (matched by email).
"""
import os
import json
from datetime import datetime
from pymongo import MongoClient
from bson import ObjectId
from app.config import settings


def load_local_users(path):
    if not os.path.exists(path):
        print(f"Local users file not found: {path}")
        return []
    with open(path, "r", encoding="utf-8") as f:
        try:
            data = json.load(f)
            if isinstance(data, list):
                return data
            # sometimes file may be an object with key 'users'
            if isinstance(data, dict) and "users" in data:
                return data["users"]
            return []
        except Exception as e:
            print("Failed to parse local users file:", e)
            return []


def connect_atlas(uri, db_name):
    client = MongoClient(uri, serverSelectionTimeoutMS=5000)
    db = client[db_name]
    # quick ping
    client.admin.command("ping")
    return db


def normalize_doc(doc):
    # Ensure created_at is a datetime and _id is an ObjectId
    d = dict(doc)
    if "created_at" in d and isinstance(d["created_at"], str):
        try:
            d["created_at"] = datetime.fromisoformat(d["created_at"])
        except Exception:
            pass
    if "_id" in d and isinstance(d["_id"], str):
        try:
            d["_id"] = ObjectId(d["_id"])
        except Exception:
            d.pop("_id", None)
    return d


def migrate(local_path, dry_run=False):
    if not settings.MONGODB_URI:
        print("MONGODB_URI is not set. Set it in environment or backend/.env and retry.")
        return

    print("Connecting to Atlas...")
    try:
        db = connect_atlas(settings.MONGODB_URI, settings.DATABASE_NAME)
    except Exception as e:
        print("Failed to connect to Atlas:", e)
        return

    users_col = db.get_collection("users")
    local_users = load_local_users(os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "db_data", "users.json"))
    # fallback path if above fails
    if not local_users:
        local_users = load_local_users(os.path.join("db_data", "users.json"))
    if not local_users:
        print("No local users to migrate.")
        return

    migrated = 0
    skipped = 0
    for u in local_users:
        email = u.get("email")
        if not email:
            skipped += 1
            continue
        exists = users_col.find_one({"email": email})
        if exists:
            skipped += 1
            continue

        doc = normalize_doc(u)
        # Ensure password_hash exists (fallback safekeep)
        if "password_hash" not in doc and "password" in doc:
            # never store plaintext, skip if only plaintext present
            doc.pop("password", None)

        if dry_run:
            print("[DRY] Would insert:", {"email": email})
            migrated += 1
            continue

        try:
            users_col.insert_one(doc)
            print("Inserted:", email)
            migrated += 1
        except Exception as e:
            print("Failed to insert", email, e)

    print(f"Done. Migrated: {migrated}. Skipped: {skipped}.")


if __name__ == "__main__":
    import argparse

    p = argparse.ArgumentParser()
    p.add_argument("--dry-run", action="store_true", help="Show what would be migrated without writing")
    args = p.parse_args()

    migrate(os.path.join("db_data", "users.json"), dry_run=args.dry_run)
