import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { History, FileText, CheckCircle, ShieldAlert, Sparkles, Terminal, ChevronRight, MessageSquare } from 'lucide-react';

export default function HistoryPage({ currentRepo }) {
  const [analyses, setAnalyses] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeTab, setActiveTab] = useState('scans'); // scans, chats
  const [selectedScanId, setSelectedScanId] = useState('');
  const [scanDetail, setScanDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState('');
  
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    fetchHistory();
  }, [currentRepo]);

  // Handle page highlight redirect (if redirected from dashboard activity table)
  useEffect(() => {
    if (location.state?.highlightAnalysisId) {
      const scanId = location.state.highlightAnalysisId;
      setSelectedScanId(scanId);
      setActiveTab('scans');
      loadScanDetail(scanId);
    }
  }, [location.state, analyses]);

  const fetchHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const repoId = currentRepo?.id || null;
      const params = repoId ? { repo_id: repoId } : {};
      
      const scansRes = await api.get('/history/analyses', { params });
      setAnalyses(scansRes.data);

      const convsRes = await api.get('/history/conversations', { params });
      setConversations(convsRes.data);

      // If redirected from dashboard and we have the list, let's load it
      if (location.state?.highlightAnalysisId) {
        loadScanDetail(location.state.highlightAnalysisId);
      } else if (scansRes.data.length > 0 && !selectedScanId) {
        setSelectedScanId(scansRes.data[0].id);
        loadScanDetail(scansRes.data[0].id);
      }
    } catch (e) {
      console.error(e);
      setError('Failed to retrieve history logs');
    } finally {
      setLoading(false);
    }
  };

  const loadScanDetail = async (scanId) => {
    setLoadingDetail(true);
    try {
      const res = await api.get(`/history/analyses/${scanId}`);
      setScanDetail(res.data);
    } catch (e) {
      console.error(e);
      setError('Failed to load analysis details');
    } finally {
      setLoadingDetail(false);
    }
  };

  const getScoreColorClass = (score) => {
    if (score >= 85) return 'text-success';
    if (score >= 70) return 'text-warning';
    return 'text-danger';
  };

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center py-5">
        <div className="spinner-border text-cyan" role="status"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h3 className="fw-bold mb-1 text-light">Intel History Logs</h3>
        <p className="text-secondary mb-0 small">Review past AI code diagnostic scans, audit lists, and repository discussions</p>
      </div>

      {error && (
        <div className="alert alert-danger border-0 bg-danger/10 text-danger mb-4 py-2 px-3 small">
          {error}
        </div>
      )}

      {/* Tabs */}
      <ul className="nav nav-tabs border-secondary/15 mb-3" style={{ borderBottomColor: 'var(--border-light)' }}>
        <li className="nav-item">
          <button 
            onClick={() => setActiveTab('scans')}
            className={`nav-link bg-transparent text-secondary border-0 py-2 ${activeTab === 'scans' ? 'active text-cyan border-bottom border-cyan' : ''}`}
            style={{ fontSize: '0.8rem', borderBottom: activeTab === 'scans' ? '2px solid var(--accent-cyan)' : 'none' }}
          >
            AI Scans
          </button>
        </li>
        <li className="nav-item">
          <button 
            onClick={() => setActiveTab('chats')}
            className={`nav-link bg-transparent text-secondary border-0 py-2 ${activeTab === 'chats' ? 'active text-cyan border-bottom border-cyan' : ''}`}
            style={{ fontSize: '0.8rem', borderBottom: activeTab === 'chats' ? '2px solid var(--accent-cyan)' : 'none' }}
          >
            Conversations
          </button>
        </li>
      </ul>

      {activeTab === 'scans' ? (
        <div className="row g-3">
          {/* Left Column: List of Scans */}
          <div className="col-12 col-md-5">
            <div className="glass-card" style={{ maxHeight: '600px', overflowY: 'auto' }}>
              <h6 className="fw-bold text-light mb-3 pb-2 border-bottom border-secondary/15 d-flex align-items-center gap-2">
                <History size={16} className="text-cyan" />
                <span>Saved Diagnostics ({analyses.length})</span>
              </h6>

              {analyses.length === 0 ? (
                <div className="text-center py-4 text-secondary small">No AI analysis runs saved.</div>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {analyses.map((scan) => (
                    <button
                      key={scan.id}
                      onClick={() => {
                        setSelectedScanId(scan.id);
                        loadScanDetail(scan.id);
                      }}
                      className={`btn text-start w-100 p-2 rounded border-0 ${
                        selectedScanId === scan.id ? 'bg-cyan/15 border-left border-cyan' : 'bg-darker/30 text-secondary hover-bg-light/5'
                      }`}
                      style={{ fontSize: '0.8rem', borderLeft: selectedScanId === scan.id ? '3px solid var(--accent-cyan)' : 'none' }}
                    >
                      <div className="d-flex justify-content-between mb-1">
                        <span className="fw-bold text-light text-truncate" style={{ maxWidth: '180px' }}>
                          {scan.file_path?.split('/').pop() || scan.file_path}
                        </span>
                        <span className="badge bg-secondary/35 text-secondary" style={{ fontSize: '0.65rem' }}>
                          {scan.analysis_type?.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-muted d-flex justify-content-between" style={{ fontSize: '0.7rem' }}>
                        <span>{scan.file_path}</span>
                        <span>{new Date(scan.created_at).toLocaleDateString()}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Scan Details Display */}
          <div className="col-12 col-md-7">
            {loadingDetail ? (
              <div className="glass-card text-center py-5">
                <div className="spinner-border spinner-border-sm text-cyan" role="status"></div>
                <p className="small text-muted mt-2">Loading scan content...</p>
              </div>
            ) : scanDetail ? (
              <div className="glass-card d-flex flex-column gap-3">
                <div className="border-bottom border-secondary/15 pb-3">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <h5 className="fw-bold text-light mb-0">
                      {scanDetail.file_path?.split('/').pop() || scanDetail.file_path}
                    </h5>
                    <span className="badge bg-cyan/10 text-cyan border border-cyan-900/30 py-1">
                      {scanDetail.analysis_type?.toUpperCase()}
                    </span>
                  </div>
                  <span className="text-muted small">
                    Path: {scanDetail.file_path} • Ran on {new Date(scanDetail.created_at).toLocaleString()}
                  </span>
                </div>

                {/* Display based on analysis type */}
                {scanDetail.analysis_type === 'bug_detect' ? (
                  <div className="d-flex flex-column gap-3" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                    {scanDetail.result.length === 0 ? (
                      <div className="alert alert-success border-0 bg-success/15 text-success small">
                        ✓ No bugs identified in this scan.
                      </div>
                    ) : (
                      scanDetail.result.map((bug, i) => (
                        <div key={i} className="p-3 rounded border border-secondary/15 bg-darker/40">
                          <div className="d-flex align-items-center gap-2 mb-2">
                            <span className={`badge bg-danger/10 text-danger border border-danger/25 py-0.5`} style={{ fontSize: '0.7rem' }}>
                              {bug.severity}
                            </span>
                            <h6 className="mb-0 fw-bold text-light small">{bug.problem}</h6>
                          </div>
                          <p className="text-secondary small mb-3">{bug.explanation}</p>
                          {bug.suggested_fix && (
                            <div className="bg-darker border border-secondary/10 p-2 rounded">
                              <pre className="text-info m-0 p-1 small" style={{ fontSize: '0.78rem', overflowX: 'auto' }}>
                                <code>{bug.suggested_fix}</code>
                              </pre>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                ) : scanDetail.analysis_type === 'code_review' ? (
                  <div className="row g-3" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                    <div className="col-12 col-md-4 text-center">
                      <div className="p-3 rounded border border-secondary/10 bg-darker/30">
                        <span className="text-secondary small d-block mb-3">Code Score</span>
                        <div className={`fs-1 fw-bold ${getScoreColorClass(scanDetail.result.score)}`}>
                          {scanDetail.result.score}/100
                        </div>
                      </div>
                    </div>
                    <div className="col-12 col-md-8">
                      <div className="p-3 rounded border border-secondary/10 bg-darker/30">
                        <h6 className="fw-bold text-light small">Review Summary</h6>
                        <p className="text-secondary small mb-0">{scanDetail.result.summary}</p>
                      </div>
                    </div>
                    {scanDetail.result.details && (
                      <div className="col-12">
                        <div className="row g-2">
                          {Object.keys(scanDetail.result.details).map(k => (
                            <div key={k} className="col-12 col-md-6">
                              <div className="p-2 rounded bg-dark border border-secondary/10 small text-secondary">
                                <strong className="text-light text-capitalize">{k}</strong>: {scanDetail.result.details[k].comment}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  // Markdown results (Explain, Tests, Docs, Commits, PRs)
                  <div className="bg-darker/60 rounded border border-secondary/10 p-3" style={{ maxHeight: '420px', overflowY: 'auto' }}>
                    <pre className="text-light m-0 small leading-relaxed" style={{ fontSize: '0.82rem', whiteSpace: 'pre-wrap' }}>
                      <code>{scanDetail.result}</code>
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="glass-card text-center py-5 text-muted small">
                Select a diagnostic log to view saved AI summary.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Conversation History list */
        <div className="glass-card">
          <h6 className="fw-bold text-light mb-3 pb-2 border-bottom border-secondary/15 d-flex align-items-center gap-2">
            <MessageSquare size={16} className="text-cyan" />
            <span>Saved Conversations ({conversations.length})</span>
          </h6>
          
          {conversations.length === 0 ? (
            <div className="text-center py-5 text-secondary small">No discussions cached.</div>
          ) : (
            <div className="row g-3">
              {conversations.map((conv) => (
                <div key={conv.id} className="col-12 col-md-6 col-lg-4">
                  <div 
                    onClick={() => navigate('/chat', { state: { selectConversationId: conv.id } })}
                    className="p-3 rounded border border-secondary/15 bg-darker/40 cursor-pointer h-100 d-flex flex-column justify-content-between"
                    style={{ cursor: 'pointer', transition: 'border-color 0.2s' }}
                  >
                    <div>
                      <h6 className="fw-bold text-light mb-1 text-truncate">{conv.title}</h6>
                      <span className="text-muted small d-block mb-3">
                        {conv.messages.length} messages • Created on {new Date(conv.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="d-flex align-items-center justify-content-between text-cyan small fw-semibold">
                      <span>Resume Chat</span>
                      <ChevronRight size={14} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
