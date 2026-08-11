import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  GitBranch,
  FolderCode,
  MessageSquareCode,
  ShieldAlert,
  Sparkles,
  ClipboardList,
  FileText,
  GitCommit,
  GitPullRequest,
  History,
  LogOut,
  FolderDot
} from 'lucide-react';

export default function Sidebar({ currentRepo, onDisconnectRepo }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        setUserEmail(u.email || '');
      } catch (e) {
        setUserEmail('');
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('currentRepo');
    if (onDisconnectRepo) onDisconnectRepo();
    navigate('/login');
  };

  return (
    <aside className="sidebar-panel">
      <div>
        <div className="sidebar-brand">
          <Sparkles size={22} className="text-cyan-400 animate-pulse" />
          <span>ANTIGRAVITY AI</span>
        </div>

        {currentRepo ? (
          <div className="p-3 mb-4 rounded-lg bg-dark border border-cyan-900/30 glass-card">
            <div className="d-flex align-items-center gap-2 text-info small mb-1">
              <FolderDot size={14} className="text-cyan" />
              <span className="fw-semibold text-cyan text-truncate" style={{ maxWidth: '160px' }}>
                {currentRepo.owner}/{currentRepo.name}
              </span>
            </div>
            <button
              onClick={onDisconnectRepo}
              className="btn btn-sm btn-outline-danger w-100 py-1"
              style={{ fontSize: '0.75rem' }}
            >
              Disconnect Repo
            </button>
          </div>
        ) : (
          <div className="p-3 mb-4 rounded-lg bg-dark border border-secondary/20 text-center glass-card">
            <span className="text-muted small d-block mb-2">No repository connected</span>
            <button
              onClick={() => navigate('/connect')}
              className="btn btn-sm btn-cyan w-100 py-1"
              style={{ fontSize: '0.75rem' }}
            >
              Connect Now
            </button>
          </div>
        )}

        <nav>
          <NavLink to="/dashboard" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}>
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </NavLink>

          <NavLink to="/connect" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}>
            <GitBranch size={18} />
            <span>Connect Repo</span>
          </NavLink>

          {currentRepo && (
            <>
              <NavLink to="/explorer" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}>
                <FolderCode size={18} />
                <span>Code Explorer</span>
              </NavLink>

              <NavLink to="/chat" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}>
                <MessageSquareCode size={18} />
                <span>AI Assistant</span>
              </NavLink>

              <NavLink to="/bugs" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}>
                <ShieldAlert size={18} />
                <span>Bug Detector</span>
              </NavLink>

              <NavLink to="/review" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}>
                <Sparkles size={18} />
                <span>Code Review</span>
              </NavLink>

              <NavLink to="/tests" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}>
                <ClipboardList size={18} />
                <span>Test Generator</span>
              </NavLink>

              <NavLink to="/docs" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}>
                <FileText size={18} />
                <span>Documentation</span>
              </NavLink>

              <NavLink to="/commits" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}>
                <GitCommit size={18} />
                <span>Commits</span>
              </NavLink>

              <NavLink to="/pulls" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}>
                <GitPullRequest size={18} />
                <span>Pull Requests</span>
              </NavLink>
            </>
          )}

          <NavLink to="/history" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`}>
            <History size={18} />
            <span>History</span>
          </NavLink>
        </nav>
      </div>

      <div className="mt-auto border-top border-secondary/20 pt-3">
        <div className="text-truncate text-muted small mb-2 px-2" title={userEmail}>
          {userEmail || 'developer@antigravity'}
        </div>
        <button
          onClick={handleLogout}
          className="btn btn-link sidebar-nav-link text-danger border-0 bg-transparent w-100 text-start m-0"
        >
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
