import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { 
  GitBranch, 
  Terminal, 
  ShieldAlert, 
  Sparkles, 
  ClipboardList, 
  ChevronRight, 
  Activity, 
  FolderGit 
} from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    total_repositories: 0,
    total_analyses: 0,
    bugs_detected: 0,
    code_reviews: 0,
    tests_generated: 0,
    recent_activity: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await api.get('/history/stats');
        setStats(res.data);
      } catch (err) {
        console.error(err);
        setError('Failed to load dashboard metrics');
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const getSeverityBadgeClass = (severity) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL': return 'badge bg-danger text-light';
      case 'HIGH': return 'badge bg-warning text-dark';
      case 'MEDIUM': return 'badge bg-primary text-light';
      default: return 'badge bg-info text-dark';
    }
  };

  const getMetricCard = (title, value, icon, colorClass, route) => (
    <div 
      className={`glass-card cursor-pointer d-flex flex-column justify-content-between h-100 ${colorClass}`}
      onClick={() => navigate(route)}
      style={{ cursor: 'pointer' }}
    >
      <div className="d-flex justify-content-between align-items-start mb-3">
        <div>
          <span className="text-secondary small fw-semibold d-block mb-1">{title}</span>
          <span className="fs-2 fw-bold text-light">{value}</span>
        </div>
        <div 
          className="p-2 rounded-lg d-flex align-items-center justify-content-center"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {icon}
        </div>
      </div>
      <div className="d-flex align-items-center gap-1 text-cyan small fw-semibold">
        <span>View Details</span>
        <ChevronRight size={14} />
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100 py-5">
        <div className="spinner-border text-cyan" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="fw-bold mb-1 text-light">Developer Cockpit</h3>
          <p className="text-secondary mb-0 small">Overview of code intelligence scans and repository health</p>
        </div>
        <button onClick={() => navigate('/connect')} className="btn btn-cyan d-flex align-items-center gap-2">
          <GitBranch size={16} />
          <span>Connect Repository</span>
        </button>
      </div>

      {error && (
        <div className="alert alert-danger border-0 bg-danger/10 text-danger mb-4 py-2 px-3 small">
          {error}
        </div>
      )}

      {/* Metrics Row */}
      <div className="row g-3 mb-4">
        <div className="col-12 col-md-6 col-lg-3">
          {getMetricCard(
            'Connected Repositories', 
            stats.total_repositories, 
            <FolderGit className="text-cyan" size={20} />, 
            'glass-card-glow-cyan', 
            '/connect'
          )}
        </div>
        <div className="col-12 col-md-6 col-lg-3">
          {getMetricCard(
            'Analyses Performed', 
            stats.total_analyses, 
            <Terminal className="text-purple" size={20} />, 
            'glass-card-glow-purple', 
            '/history'
          )}
        </div>
        <div className="col-12 col-md-6 col-lg-3">
          {getMetricCard(
            'Bugs Detected', 
            stats.bugs_detected, 
            <ShieldAlert className="text-danger" size={20} />, 
            'glass-card-glow-cyan', 
            '/history'
          )}
        </div>
        <div className="col-12 col-md-6 col-lg-3">
          {getMetricCard(
            'Unit Tests Created', 
            stats.tests_generated, 
            <ClipboardList className="text-success" size={20} />, 
            'glass-card-glow-purple', 
            '/history'
          )}
        </div>
      </div>

      <div className="row g-4">
        {/* Recent Activity Log */}
        <div className="col-12 col-lg-8">
          <div className="glass-card h-100">
            <h5 className="fw-bold mb-3 d-flex align-items-center gap-2 text-light">
              <Activity size={18} className="text-cyan animate-pulse" />
              <span>Recent Scan Activity</span>
            </h5>
            
            {stats.recent_activity.length === 0 ? (
              <div className="text-center py-5 text-secondary">
                <Terminal size={32} className="mb-2 opacity-30" />
                <p className="mb-0 small">No activity found. Connect a repository and run a scan to start!</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-dark table-hover align-middle mb-0" style={{ backgroundColor: 'transparent' }}>
                  <thead>
                    <tr style={{ borderBottomColor: 'var(--border-light)' }}>
                      <th className="bg-transparent text-secondary small fw-semibold border-0 py-2">Activity Details</th>
                      <th className="bg-transparent text-secondary small fw-semibold border-0 py-2">Repository</th>
                      <th className="bg-transparent text-secondary small fw-semibold border-0 py-2">Scan Type</th>
                      <th className="bg-transparent text-secondary small fw-semibold border-0 py-2">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recent_activity.map((activity, index) => (
                      <tr 
                        key={index} 
                        style={{ borderBottomColor: 'var(--border-light)', cursor: 'pointer' }}
                        onClick={() => {
                          if (activity.type === 'analysis') {
                            navigate('/history', { state: { highlightAnalysisId: activity.id } });
                          } else {
                            navigate('/chat', { state: { selectConversationId: activity.id } });
                          }
                        }}
                      >
                        <td className="bg-transparent border-0 text-light fw-medium py-3 small">
                          {activity.title}
                        </td>
                        <td className="bg-transparent border-0 text-secondary py-3 small">
                          {activity.repo_name}
                        </td>
                        <td className="bg-transparent border-0 py-3 small">
                          <span className={`badge ${activity.type === 'chat' ? 'bg-info text-dark' : 'bg-secondary text-light'} py-1 px-2`}>
                            {activity.type === 'chat' ? 'CHAT' : activity.analysis_type?.toUpperCase()}
                          </span>
                        </td>
                        <td className="bg-transparent border-0 text-muted py-3 small">
                          {new Date(activity.timestamp).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* AI Capabilities panel */}
        <div className="col-12 col-lg-4">
          <div className="glass-card h-100 bg-gradient-cyan">
            <h5 className="fw-bold mb-3 text-light d-flex align-items-center gap-2">
              <Sparkles size={18} className="text-cyan" />
              <span>AI System Status</span>
            </h5>
            <p className="text-secondary small">
              Connected with the <strong>Groq Llama-3</strong> intelligence engine. Start analyzing files or testing structures.
            </p>
            <div className="d-flex flex-column gap-2 mt-4">
              <div className="d-flex align-items-center justify-content-between p-2 rounded bg-dark/40 border border-secondary/10">
                <span className="small text-secondary">Groq Status</span>
                <span className="badge bg-success/10 text-success border border-success/30 small">Operational</span>
              </div>
              <div className="d-flex align-items-center justify-content-between p-2 rounded bg-dark/40 border border-secondary/10">
                <span className="small text-secondary">Database Connection</span>
                <span className="badge bg-success/10 text-success border border-success/30 small">Atlas Active</span>
              </div>
              <div className="d-flex align-items-center justify-content-between p-2 rounded bg-dark/40 border border-secondary/10">
                <span className="small text-secondary">Default LLM Model</span>
                <span className="badge bg-info/10 text-info border border-info/30 small">Llama 3 (70B/8B)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
