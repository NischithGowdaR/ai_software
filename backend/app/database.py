import sys
import os
import json
import dns.resolver
from pymongo import MongoClient
from app.config import settings
from bson import ObjectId

# Fix local system DNS timeout for MongoDB Atlas SRV record resolution
try:
    dns.resolver.default_resolver = dns.resolver.Resolver(configure=False)
    dns.resolver.default_resolver.nameservers = ['8.8.8.8', '1.1.1.1']
except Exception:
    pass

# --- Custom Local File-Based Fallback DB ---
class MockCursor:
    def __init__(self, data):
        self.data = data

    def sort(self, key, direction=1):
        try:
            # Sort helper: direction -1 is descending, 1 is ascending
            self.data.sort(
                key=lambda x: x.get(key) if x.get(key) is not None else "",
                reverse=(direction == -1)
            )
        except Exception as e:
            print(f"MockCursor sort error: {e}", file=sys.stderr)
        return self

    def limit(self, count):
        self.data = self.data[:count]
        return self

    def __iter__(self):
        for doc in self.data:
            # Ensure _id is an ObjectId for compatibility
            if "_id" in doc and isinstance(doc["_id"], str):
                try:
                    doc["_id"] = ObjectId(doc["_id"])
                except Exception:
                    pass
            yield doc


class MockCollection:
    def __init__(self, name):
        self.name = name
        self.directory = "db_data"
        self.file_path = os.path.join(self.directory, f"{name}.json")
        os.makedirs(self.directory, exist_ok=True)
        if not os.path.exists(self.file_path):
            with open(self.file_path, "w") as f:
                json.dump([], f)

    def _read(self):
        try:
            if not os.path.exists(self.file_path):
                return []
            with open(self.file_path, "r") as f:
                return json.load(f)
        except Exception as e:
            print(f"MockCollection read error for {self.name}: {e}", file=sys.stderr)
            return []

    def _write(self, data):
        try:
            with open(self.file_path, "w") as f:
                json.dump(data, f, default=str, indent=2)
        except Exception as e:
            print(f"MockCollection write error for {self.name}: {e}", file=sys.stderr)

    def insert_one(self, document):
        data = self._read()
        doc_copy = dict(document)
        if "_id" not in doc_copy:
            doc_copy["_id"] = str(ObjectId())
        else:
            doc_copy["_id"] = str(doc_copy["_id"])
            
        data.append(doc_copy)
        self._write(data)

        class Result:
            inserted_id = ObjectId(doc_copy["_id"])
        return Result()

    def insert_many(self, documents):
        data = self._read()
        inserted_ids = []
        for doc in documents:
            doc_copy = dict(doc)
            if "_id" not in doc_copy:
                doc_copy["_id"] = str(ObjectId())
            else:
                doc_copy["_id"] = str(doc_copy["_id"])
            data.append(doc_copy)
            inserted_ids.append(ObjectId(doc_copy["_id"]))
        self._write(data)
        
        class Result:
            inserted_ids = inserted_ids
        return Result()

    def find_one(self, query):
        data = self._read()
        for doc in data:
            match = True
            for k, v in query.items():
                if k == "_id":
                    if str(doc.get("_id")) != str(v):
                        match = False
                        break
                elif doc.get(k) != v:
                    match = False
                    break
            if match:
                doc_copy = dict(doc)
                doc_copy["_id"] = ObjectId(doc_copy["_id"])
                return doc_copy
        return None

    def find(self, query=None):
        data = self._read()
        if not query:
            return MockCursor(data)
        
        matched = []
        for doc in data:
            match = True
            for k, v in query.items():
                if k == "_id":
                    if str(doc.get("_id")) != str(v):
                        match = False
                        break
                elif doc.get(k) != v:
                    match = False
                    break
            if match:
                matched.append(doc)
        return MockCursor(matched)

    def count_documents(self, query):
        data = self._read()
        count = 0
        for doc in data:
            match = True
            for k, v in query.items():
                if k == "_id":
                    if str(doc.get("_id")) != str(v):
                        match = False
                        break
                elif doc.get(k) != v:
                    match = False
                    break
            if match:
                count += 1
        return count

    def delete_many(self, query):
        data = self._read()
        remaining = []
        for doc in data:
            match = True
            for k, v in query.items():
                if k == "_id":
                    if str(doc.get("_id")) != str(v):
                        match = False
                        break
                elif doc.get(k) != v:
                    match = False
                    break
            if not match:
                remaining.append(doc)
        self._write(remaining)

    def update_one(self, query, update, upsert=False):
        data = self._read()
        matched_idx = -1
        for idx, doc in enumerate(data):
            match = True
            for k, v in query.items():
                if k == "_id":
                    if str(doc.get("_id")) != str(v):
                        match = False
                        break
                elif doc.get(k) != v:
                    match = False
                    break
            if match:
                matched_idx = idx
                break

        if matched_idx == -1:
            if upsert:
                new_doc = {k: v for k, v in query.items() if k != "_id"}
                self._apply_update(new_doc, update)
                self.insert_one(new_doc)
            return

        doc = data[matched_idx]
        self._apply_update(doc, update)
        data[matched_idx] = doc
        self._write(data)

    def _apply_update(self, doc, update):
        if "$push" in update:
            for k, v in update["$push"].items():
                if k not in doc or not isinstance(doc[k], list):
                    doc[k] = []
                if isinstance(v, dict) and "$each" in v:
                    doc[k].extend(v["$each"])
                else:
                    doc[k].append(v)
        if "$set" in update:
            for k, v in update["$set"].items():
                doc[k] = v


# --- DB Initialization ---
try:
    if not settings.MONGODB_URI:
        print("WARNING: MONGODB_URI is not set. Database connections will fail.", file=sys.stderr)
        client = None
        db = None
    else:
        # Set a short timeout so local system fallback is instant if connection fails
        client = MongoClient(settings.MONGODB_URI, serverSelectionTimeoutMS=3000)
        db = client[settings.DATABASE_NAME]
        
        # Test connection
        client.admin.command('ping')
        print("Successfully connected to MongoDB Atlas!")
except Exception as e:
    print(f"Error connecting to MongoDB: {e}", file=sys.stderr)
    print("WARNING: Bypassing Atlas network blockade. Falling back to local file-based database (db_data/*.json)!", file=sys.stderr)
    client = None
    db = None

def get_db():
    return db

def get_collection(name: str):
    if db is None:
        return MockCollection(name)
    try:
        # Check connection viability
        db.client.admin.command('ping')
        return db[name]
    except Exception:
        print(f"WARNING: MongoDB Atlas connection lost. Falling back to local storage for '{name}'!", file=sys.stderr)
        return MockCollection(name)
