import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { GitPullRequest, Sparkles, FileCode, CheckCircle, AlertCircle } from 'lucide-react';

export default function PullRequests({ currentRepo }) {
  const [prs, setPrs] = useState([]);
  const [selectedPrNumber, setSelectedPrNumber] = useState('');
  const [prDetails, setPrDetails] = useState(null);
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
    fetchPRs();
  }, [currentRepo]);

  const fetchPRs = async () => {
    setLoadingList(true);
    setError('');
    try {
      const res = await api.get(`/github/pull-requests/${currentRepo.id}`);
      setPrs(res.data);
    } catch (e) {
      console.error(e);
      setError('Failed to retrieve repository pull requests');
    } finally {
      setLoadingList(false);
    }
  };

  const handleSelectPR = async (prNumber) => {
    setSelectedPrNumber(prNumber);
    setPrDetails(null);
    setAiReport('');
    setLoadingDetails(true);
    setError('');

    try {
      const res = await api.get(`/github/pull-requests/${currentRepo.id}/${prNumber}`);
      setPrDetails(res.data);
    } catch (e) {
      console.error(e);
      setError(`Failed to retrieve details for PR #${prNumber}`);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleRunAIReview = async () => {
    if (!selectedPrNumber) return;
    setLoadingAI(true);
    setError('');
    setAiReport('');

    try {
      const res = await api.post('/ai/analyze-pr', {
        repo_id: currentRepo.id,
        pr_number: selectedPrNumber
      });
      setAiReport(res.data.result);
    } catch (e) {
      console.error(e);
      setError('AI pull request review request failed.');
    } finally {
      setLoadingAI(false);
    }
  };

  if (loadingList) {
    return (
      <div className="d-flex align-items-center justify-content-center py-5">
        <Loader2 className="text-cyan animate-spin d-inline" size={24} />
        <span className="small text-muted ms-2">Fetching pull request list...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h3 className="fw-bold mb-1 text-light">Pull Request Reviewer</h3>
        <p className="text-secondary mb-0 small">Select pull requests to inspect code diff files and generate AI-powered tech lead reviews</p>
      </div>

      {error && (
        <div className="alert alert-danger border-0 bg-danger/10 text-danger mb-4 py-2 px-3 small">
          {error}
        </div>
      )}

      <div className="row g-3">
        {/* Left Side: PR list */}
        <div className="col-12 col-md-5">
          <div className="glass-card" style={{ maxHeight: '600px', overflowY: 'auto' }}>
            <h6 className="fw-bold text-light mb-3 pb-2 border-bottom border-secondary/15 d-flex align-items-center gap-2">
              <GitPullRequest size={16} className="text-cyan" />
              <span>Pull Requests ({prs.length})</span>
            </h6>

            {prs.length === 0 ? (
              <div className="text-center py-4 text-secondary small">No pull requests found.</div>
            ) : (
              <div className="d-flex flex-column gap-2">
                {prs.map((pr) => (
                  <button
                    key={pr.number}
                    onClick={() => handleSelectPR(pr.number)}
                    className={`btn text-start w-100 p-2 rounded border-0 ${
                      selectedPrNumber === pr.number ? 'bg-cyan/15 border-left border-cyan' : 'bg-darker/30 text-secondary hover-bg-light/5'
                    }`}
                    style={{ fontSize: '0.8rem', borderLeft: selectedPrNumber === pr.number ? '3px solid var(--accent-cyan)' : 'none' }}
                  >
                    <div className="d-flex justify-content-between mb-1">
                      <span className="fw-bold text-light">PR #{pr.number}</span>
                      <span className={`badge ${pr.state === 'open' ? 'bg-success text-light' : 'bg-secondary text-light'} py-0.5`} style={{ fontSize: '0.65rem' }}>
                        {pr.state?.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-truncate text-secondary mb-1">{pr.title}</div>
                    <div className="text-muted small" style={{ fontSize: '0.7rem' }}>
                      By <strong>{pr.author}</strong> on {new Date(pr.created_at).toLocaleDateString()}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: PR Details & AI review panel */}
        <div className="col-12 col-md-7">
          {loadingDetails ? (
            <div className="glass-card text-center py-5">
              <Loader2 className="text-cyan animate-spin d-inline" size={24} />
              <p className="small text-muted mt-2">Loading PR details...</p>
            </div>
          ) : prDetails ? (
            <div className="glass-card d-flex flex-column gap-3">
              <div className="d-flex justify-content-between align-items-start border-bottom border-secondary/15 pb-3">
                <div>
                  <h6 className="fw-bold text-light mb-1">#{prDetails.number}: {prDetails.title}</h6>
                  <span className="text-muted small">
                    Created by <strong>{prDetails.author}</strong>
                  </span>
                  {prDetails.body && (
                    <p className="text-secondary small mt-2 mb-0 border-left border-secondary/20 pl-2 text-truncate" style={{ maxWidth: '300px' }}>
                      {prDetails.body}
                    </p>
                  )}
                </div>
                <button
                  disabled={loadingAI}
                  onClick={handleRunAIReview}
                  className="btn btn-cyan btn-sm d-flex align-items-center gap-1 py-1"
                >
                  <Sparkles size={13} />
                  <span>Review PR with AI</span>
                </button>
              </div>

              {/* Changed files list */}
              <div>
                <h6 className="fw-bold text-light small mb-2">Files Changed ({prDetails.files.length})</h6>
                <div className="d-flex flex-wrap gap-2 mb-3">
                  {prDetails.files.map((file, i) => (
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
                  <p className="small text-cyan animate-pulse mb-0">Groq model reviewing pull request changes...</p>
                </div>
              ) : aiReport ? (
                <div className="border border-secondary/15 rounded bg-darker/50 p-3" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                  <h6 className="fw-bold text-cyan mb-3 d-flex align-items-center gap-1.5 small pb-2 border-bottom border-secondary/10">
                    <CheckCircle size={15} />
                    <span>AI Pull Request Review Notes</span>
                  </h6>
                  <div className="text-light small leading-relaxed" style={{ whiteSpace: 'pre-wrap' }}>
                    {aiReport}
                  </div>
                </div>
              ) : (
                <div className="text-center py-5 text-muted border border-secondary/10 rounded bg-dark/20 small">
                  Click "Review PR with AI" in the top header to run Groq code quality analysis on this pull request diff.
                </div>
              )}
            </div>
          ) : (
            <div className="glass-card text-center py-5 text-muted small">
              Select a pull request from the log to view details and request AI code review.
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
