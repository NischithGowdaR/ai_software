import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { ShieldAlert, AlertTriangle, Play, Terminal, Sparkles } from 'lucide-react';

export default function BugDetector({ currentRepo }) {
  const [files, setFiles] = useState([]);
  const [selectedPath, setSelectedPath] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [bugs, setBugs] = useState(null);
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
      // Filter only code files
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

  const handleScan = async (e) => {
    e.preventDefault();
    if (!customCode.trim() || loading) return;

    setLoading(true);
    setError('');
    setBugs(null);

    try {
      const res = await api.post('/ai/bug-detect', {
        repo_id: currentRepo.id,
        file_path: selectedPath || 'custom_code_snippet',
        code_content: customCode
      });
      setBugs(res.data.result);
    } catch (err) {
      console.error(err);
      setError('Bug diagnostics request failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-4">
        <h3 className="fw-bold mb-1 text-light">AI Bug Detector</h3>
        <p className="text-secondary mb-0 small">Scan repository files or paste custom scripts to detect logical, syntax, or security issues</p>
      </div>

      {error && (
        <div className="alert alert-danger border-0 bg-danger/10 text-danger mb-4 py-2 px-3 small">
          {error}
        </div>
      )}

      <div className="row g-3">
        {/* Input Panel */}
        <div className="col-12 col-lg-6">
          <div className="glass-card h-100">
            <h5 className="fw-bold text-light mb-3 d-flex align-items-center gap-2">
              <Terminal size={18} className="text-cyan" />
              <span>Select Code to Scan</span>
            </h5>

            <form onSubmit={handleScan}>
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
                  rows={12}
                  required
                  placeholder="Paste your code snippet here..."
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
                  value={customCode}
                  onChange={(e) => {
                    setCustomCode(e.target.value);
                    if (selectedPath) setSelectedPath(''); // reset selection if edited
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
                    <span>Analyzing Code Elements...</span>
                  </>
                ) : (
                  <>
                    <Play size={16} />
                    <span>Run Bug Diagnostics</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Results Panel */}
        <div className="col-12 col-lg-6">
          <div className="glass-card h-100" style={{ minHeight: '400px' }}>
            <h5 className="fw-bold text-light mb-3 d-flex align-items-center gap-2">
              <ShieldAlert size={18} className="text-cyan" />
              <span>Scan Diagnostics</span>
            </h5>

            {loading ? (
              <div className="text-center py-5 my-4">
                <Loader2 className="text-cyan animate-spin d-inline mb-2" size={32} />
                <p className="small text-cyan animate-pulse">Groq model scanning AST and checking syntax patterns...</p>
              </div>
            ) : bugs === null ? (
              <div className="text-center py-5 text-secondary">
                <ShieldAlert size={40} className="mb-2 opacity-35 mx-auto" />
                <p className="small mb-0">No active scans. Click "Run Bug Diagnostics" to evaluate code.</p>
              </div>
            ) : bugs.length === 0 ? (
              <div className="alert alert-success border-0 bg-success/15 text-success py-3 small">
                ✓ No vulnerabilities, logical bugs, or syntax errors detected by the Llama code review engine.
              </div>
            ) : (
              <div className="d-flex flex-column gap-3 overflow-auto" style={{ maxHeight: '480px' }}>
                {bugs.map((bug, idx) => (
                  <div key={idx} className="p-3 rounded border border-secondary/15 bg-darker/40">
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <span className={`badge-${bug.severity?.toLowerCase() || 'low'}`}>
                        {bug.severity?.toUpperCase()}
                      </span>
                      <h6 className="mb-0 fw-bold text-light small">{bug.problem}</h6>
                    </div>
                    <p className="text-secondary small mb-3">{bug.explanation}</p>
                    
                    {bug.suggested_fix && (
                      <div className="bg-darker border border-secondary/10 p-2 rounded">
                        <span className="text-muted small d-block mb-1 font-semibold" style={{ fontSize: '0.75rem' }}>Suggested Fix:</span>
                        <pre className="text-info m-0 p-1 small" style={{ fontSize: '0.78rem', overflowX: 'auto' }}>
                          <code>{bug.suggested_fix}</code>
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
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
