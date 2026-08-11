import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { GitCommit, Sparkles, ArrowLeft, ChevronRight, FileCode, CheckCircle } from 'lucide-react';

export default function Commits({ currentRepo }) {
  const [commits, setCommits] = useState([]);
  const [selectedSha, setSelectedSha] = useState('');
  const [commitDetails, setCommitDetails] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiReport, setAiReport] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentRepo) {
      navigate('/connect');
      return;
    }
    fetchCommits();
  }, [currentRepo]);

  const fetchCommits = async () => {
    setLoadingList(true);
    setError('');
    try {
      const res = await api.get(`/github/commits/${currentRepo.id}`);
      setCommits(res.data);
    } catch (e) {
      console.error(e);
      setError('Failed to retrieve repository commits');
    } finally {
      setLoadingList(false);
    }
  };

  const handleSelectCommit = async (sha) => {
    setSelectedSha(sha);
    setCommitDetails(null);
    setAiReport('');
    setLoadingDetails(true);
    setError('');

    try {
      const res = await api.get(`/github/commits/${currentRepo.id}/${sha}`);
      setCommitDetails(res.data);
    } catch (e) {
      console.error(e);
      setError(`Failed to retrieve details for commit ${sha.slice(0, 8)}`);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleRunAIReview = async () => {
    if (!selectedSha) return;
    setLoadingAI(true);
    setError('');
    setAiReport('');

    try {
      const res = await api.post('/ai/analyze-commit', {
        repo_id: currentRepo.id,
        commit_sha: selectedSha
      });
      setAiReport(res.data.result);
    } catch (e) {
      console.error(e);
      setError('AI commit code review request failed.');
    } finally {
      setLoadingAI(false);
    }
  };

  if (loadingList) {
    return (
      <div className="d-flex align-items-center justify-content-center py-5">
        <Loader2 className="text-cyan animate-spin d-inline" size={24} />
        <span className="small text-muted ms-2">Fetching git commit history...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h3 className="fw-bold mb-1 text-light">Git Commit Analyzer</h3>
        <p className="text-secondary mb-0 small">Select repository commits to inspect files and generate AI reviews of code differences</p>
      </div>

      {error && (
        <div className="alert alert-danger border-0 bg-danger/10 text-danger mb-4 py-2 px-3 small">
          {error}
        </div>
      )}

      <div className="row g-3">
        {/* Left Side: Commit list */}
        <div className="col-12 col-md-5">
          <div className="glass-card" style={{ maxHeight: '600px', overflowY: 'auto' }}>
            <h6 className="fw-bold text-light mb-3 pb-2 border-bottom border-secondary/15 d-flex align-items-center gap-2">
              <GitCommit size={16} className="text-cyan" />
              <span>Commit Logs ({commits.length})</span>
            </h6>

            {commits.length === 0 ? (
              <div className="text-center py-4 text-secondary small">No commits found in default branch.</div>
            ) : (
              <div className="d-flex flex-column gap-2">
                {commits.map((c) => (
                  <button
                    key={c.sha}
                    onClick={() => handleSelectCommit(c.sha)}
                    className={`btn text-start w-100 p-2 rounded border-0 ${
                      selectedSha === c.sha ? 'bg-cyan/15 border-left border-cyan' : 'bg-darker/30 text-secondary hover-bg-light/5'
                    }`}
                    style={{ fontSize: '0.8rem', borderLeft: selectedSha === c.sha ? '3px solid var(--accent-cyan)' : 'none' }}
                  >
                    <div className="d-flex justify-content-between mb-1">
                      <span className="fw-bold text-light">{c.author}</span>
                      <span className="text-muted" style={{ fontSize: '0.7rem' }}>{c.sha.slice(0, 7)}</span>
                    </div>
                    <div className="text-truncate text-secondary mb-1">{c.message}</div>
                    <div className="text-muted small" style={{ fontSize: '0.7rem' }}>
                      {new Date(c.date).toLocaleString()}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Commit Diff Details & AI review panel */}
        <div className="col-12 col-md-7">
          {loadingDetails ? (
            <div className="glass-card text-center py-5">
              <Loader2 className="text-cyan animate-spin d-inline" size={24} />
              <p className="small text-muted mt-2">Loading commit details...</p>
            </div>
          ) : commitDetails ? (
            <div className="glass-card d-flex flex-column gap-3">
              <div className="d-flex justify-content-between align-items-start border-bottom border-secondary/15 pb-3">
                <div>
                  <h6 className="fw-bold text-light mb-1">{commitDetails.message}</h6>
                  <span className="text-muted small">
                    By <strong>{commitDetails.author}</strong> on {new Date(commitDetails.date).toLocaleString()}
                  </span>
                </div>
                <button
                  disabled={loadingAI}
                  onClick={handleRunAIReview}
                  className="btn btn-cyan btn-sm d-flex align-items-center gap-1 py-1"
                >
                  <Sparkles size={13} />
                  <span>Analyze Commit</span>
                </button>
              </div>

              {/* Changed files list */}
              <div>
                <h6 className="fw-bold text-light small mb-2">Files Changed ({commitDetails.files.length})</h6>
                <div className="d-flex flex-wrap gap-2 mb-3">
                  {commitDetails.files.map((file, i) => (
                    <span 
                      key={i} 
                      className="badge bg-dark border border-secondary/10 text-secondary py-1.5 px-2 d-flex align-items-center gap-1.5"
                      style={{ fontSize: '0.72rem' }}
                    >
                      <FileCode size={11} className="text-cyan" />
                      <span>{file.filename}</span>
                      <span className="text-success">+{file.additions}</span>
                      <span className="text-danger">-{file.deletions}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* AI Report Output */}
              {loadingAI ? (
                <div className="text-center py-5 border border-cyan-900/30 rounded bg-dark/30">
                  <Loader2 className="text-cyan animate-spin d-inline mb-2" size={28} />
                  <p className="small text-cyan animate-pulse mb-0">Groq model reviewing commit diff patch...</p>
                </div>
              ) : aiReport ? (
                <div className="border border-secondary/15 rounded bg-darker/50 p-3" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                  <h6 className="fw-bold text-cyan mb-3 d-flex align-items-center gap-1.5 small pb-2 border-bottom border-secondary/10">
                    <CheckCircle size={15} />
                    <span>AI Commit Review Insights</span>
                  </h6>
                  <div className="text-light small leading-relaxed" style={{ whiteSpace: 'pre-wrap' }}>
                    {aiReport}
                  </div>
                </div>
              ) : (
                <div className="text-center py-5 text-muted border border-secondary/10 rounded bg-dark/20 small">
                  Click "Analyze Commit" in the top header to run Groq diagnostics on this commit patch.
                </div>
              )}
            </div>
          ) : (
            <div className="glass-card text-center py-5 text-muted small">
              Select a commit from the log to view details and request AI code review.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Loader2({ className, size = 16 }) {
  return <div className={`spinner-border spinner-border-sm ${className}`} style={{ width: size, height: size }} role="status"></div>;
}
