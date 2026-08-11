import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Sparkles, Terminal, Play, Award, Shield, CheckCircle2 } from 'lucide-react';

export default function CodeReview({ currentRepo }) {
  const [files, setFiles] = useState([]);
  const [selectedPath, setSelectedPath] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [review, setReview] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentRepo) {
      navigate('/connect');
      return;
    }
    fetchFiles();
  }, [currentRepo]);

  const fetchFiles = async () => {
    try {
      const res = await api.get(`/github/files/${currentRepo.id}`);
      const codeFiles = res.data.filter(f => f.type === 'file');
      setFiles(codeFiles);
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileChange = async (path) => {
    setSelectedPath(path);
    if (!path) {
      setCustomCode('');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/github/file-content/${currentRepo.id}`, { params: { path } });
      setCustomCode(res.data.content);
    } catch (e) {
      console.error(e);
      setError('Failed to fetch file content');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (e) => {
    e.preventDefault();
    if (!customCode.trim() || loading) return;

    setLoading(true);
    setError('');
    setReview(null);

    try {
      const res = await api.post('/ai/code-review', {
        repo_id: currentRepo.id,
        file_path: selectedPath || 'custom_code_snippet',
        code_content: customCode
      });
      setReview(res.data.result);
    } catch (err) {
      console.error(err);
      setError('Code review request failed.');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColorClass = (score) => {
    if (score >= 85) return 'text-success';
    if (score >= 70) return 'text-warning';
    return 'text-danger';
  };

  return (
    <div>
      <div className="mb-4">
        <h3 className="fw-bold mb-1 text-light">AI Code Reviewer</h3>
        <p className="text-secondary mb-0 small">Audit file composition, check style conventions, and retrieve actionable optimizations</p>
      </div>

      {error && (
        <div className="alert alert-danger border-0 bg-danger/10 text-danger mb-4 py-2 px-3 small">
          {error}
        </div>
      )}

      <div className="row g-3">
        {/* Left Input card */}
        <div className="col-12 col-lg-5">
          <div className="glass-card">
            <h5 className="fw-bold text-light mb-3 d-flex align-items-center gap-2">
              <Terminal size={18} className="text-cyan" />
              <span>Select Code for Audit</span>
            </h5>

            <form onSubmit={handleReview}>
              <div className="mb-3">
                <label className="form-label text-secondary small fw-semibold">Choose File from Repository</label>
                <select
                  className="form-select custom-input bg-dark border-secondary/20"
                  value={selectedPath}
                  onChange={(e) => handleFileChange(e.target.value)}
                  disabled={loading}
                >
                  <option value="">-- Paste custom code below or select a file --</option>
                  {files.map(f => (
                    <option key={f.path} value={f.path}>{f.path}</option>
                  ))}
                </select>
              </div>

              <div className="mb-3">
                <label className="form-label text-secondary small fw-semibold">Source Code</label>
                <textarea
                  className="form-control custom-input bg-dark border-secondary/20"
                  rows={10}
                  required
                  placeholder="Paste your code snippet here..."
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
                  value={customCode}
                  onChange={(e) => {
                    setCustomCode(e.target.value);
                    if (selectedPath) setSelectedPath('');
                  }}
                  disabled={loading}
                />
              </div>

              <button 
                type="submit" 
                disabled={loading || !customCode.trim()} 
                className="btn btn-cyan w-100 py-2 d-flex align-items-center justify-content-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="text-cyan animate-spin d-inline" size={16} />
                    <span>Reviewing Coding Best Practices...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Generate Code Review</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Audit Display Card */}
        <div className="col-12 col-lg-7">
          <div className="glass-card h-100" style={{ minHeight: '400px' }}>
            <h5 className="fw-bold text-light mb-3 d-flex align-items-center gap-2">
              <Award size={18} className="text-cyan" />
              <span>Audit Report Output</span>
            </h5>

            {loading ? (
              <div className="text-center py-5 my-4">
                <Loader2 className="text-cyan animate-spin d-inline mb-2" size={32} />
                <p className="small text-cyan animate-pulse">Groq model auditing complexity and maintainability indices...</p>
              </div>
            ) : review === null ? (
              <div className="text-center py-5 text-secondary">
                <Award size={40} className="mb-2 opacity-35 mx-auto" />
                <p className="small mb-0">No reviews generated yet. Click "Generate Code Review" to audit.</p>
              </div>
            ) : (
              <div className="d-flex flex-column gap-3 overflow-auto" style={{ maxHeight: '480px' }}>
                <div className="row g-3">
                  <div className="col-12 col-md-4 text-center">
                    <div className="p-3 rounded border border-secondary/10 bg-darker/40 d-flex flex-column justify-content-center h-100">
                      <span className="text-secondary small d-block mb-3">Overall Quality</span>
                      <div className="rating-circle rating-circle-cyan">
                        <span className={`rating-circle-val ${getScoreColorClass(review.score)}`}>
                          {review.score}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-12 col-md-8">
                    <div className="p-3 rounded border border-secondary/10 bg-darker/40 h-100">
                      <h6 className="fw-bold text-light mb-2 small">Audit Summary</h6>
                      <p className="text-secondary small mb-0">{review.summary}</p>
                    </div>
                  </div>
                </div>

                {/* Recommendations */}
                <div className="p-3 rounded border border-secondary/15 bg-darker/20">
                  <h6 className="fw-bold text-light small mb-2 d-flex align-items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-cyan" />
                    <span>Actionable Recommendations</span>
                  </h6>
                  <ul className="text-secondary small ps-3 mb-0">
                    {review.recommendations?.map((rec, idx) => (
                      <li key={idx} className="mb-1.5">{rec}</li>
                    ))}
                  </ul>
                </div>

                {/* Details Breakdown */}
                {review.details && (
                  <div className="row g-2">
                    {Object.keys(review.details).map((key) => {
                      const det = review.details[key];
                      return (
                        <div key={key} className="col-12 col-md-6">
                          <div className="p-3 rounded border border-secondary/10 bg-darker/40">
                            <div className="d-flex justify-content-between align-items-center mb-1">
                              <span className="text-light fw-bold small text-capitalize">{key}</span>
                              <span className={`fw-bold small ${getScoreColorClass(det.score)}`}>{det.score}/100</span>
                            </div>
                            <p className="text-secondary small mb-0" style={{ fontSize: '0.78rem' }}>{det.comment}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Loader2({ className, size = 16 }) {
  return <div className={`spinner-border spinner-border-sm ${className}`} style={{ width: size, height: size }} role="status"></div>;
}
