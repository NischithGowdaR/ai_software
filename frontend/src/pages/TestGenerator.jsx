import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { ClipboardList, Terminal, Play, Copy, Check, CheckCircle2 } from 'lucide-react';

export default function TestGenerator({ currentRepo }) {
  const [files, setFiles] = useState([]);
  const [selectedPath, setSelectedPath] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [tests, setTests] = useState('');
  const [copied, setCopied] = useState(false);
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

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!customCode.trim() || loading) return;

    setLoading(true);
    setError('');
    setTests('');

    try {
      const res = await api.post('/ai/generate-tests', {
        repo_id: currentRepo.id,
        file_path: selectedPath || 'custom_code_snippet',
        code_content: customCode
      });
      setTests(res.data.result);
    } catch (err) {
      console.error(err);
      setError('Unit test suite generation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(tests);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <div className="mb-4">
        <h3 className="fw-bold mb-1 text-light">Unit Test Generator</h3>
        <p className="text-secondary mb-0 small">Create comprehensive test structures for custom routines and repository source modules</p>
      </div>

      {error && (
        <div className="alert alert-danger border-0 bg-danger/10 text-danger mb-4 py-2 px-3 small">
          {error}
        </div>
      )}

      <div className="row g-3">
        {/* Input Panel */}
        <div className="col-12 col-lg-5">
          <div className="glass-card">
            <h5 className="fw-bold text-light mb-3 d-flex align-items-center gap-2">
              <Terminal size={18} className="text-cyan" />
              <span>Select Code to Test</span>
            </h5>

            <form onSubmit={handleGenerate}>
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
                  placeholder="Paste your function or script here..."
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
                    <span>Writing Test Statements...</span>
                  </>
                ) : (
                  <>
                    <Play size={16} />
                    <span>Generate Unit Tests</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Results Panel */}
        <div className="col-12 col-lg-7">
          <div className="glass-card h-100" style={{ minHeight: '400px' }}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold text-light mb-0 d-flex align-items-center gap-2">
                <ClipboardList size={18} className="text-cyan" />
                <span>Generated Code Panel</span>
              </h5>
              {tests && (
                <button 
                  onClick={handleCopy} 
                  className="btn btn-sm btn-outline-custom d-flex align-items-center gap-1 py-1"
                  style={{ fontSize: '0.75rem' }}
                >
                  {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              )}
            </div>

            {loading ? (
              <div className="text-center py-5 my-4">
                <Loader2 className="text-cyan animate-spin d-inline mb-2" size={32} />
                <p className="small text-cyan animate-pulse">Groq model writing mock frameworks and test assertions...</p>
              </div>
            ) : !tests ? (
              <div className="text-center py-5 text-secondary">
                <ClipboardList size={40} className="mb-2 opacity-35 mx-auto" />
                <p className="small mb-0">No tests created. Click "Generate Unit Tests" to populate code.</p>
              </div>
            ) : (
              <div className="border border-secondary/15 rounded bg-darker/50 p-3 overflow-auto" style={{ maxHeight: '480px' }}>
                <h6 className="fw-bold text-cyan mb-3 d-flex align-items-center gap-1.5 small pb-2 border-bottom border-secondary/10">
                  <CheckCircle2 size={15} />
                  <span>AI Automated Test Suite</span>
                </h6>
                <pre className="text-light m-0 small leading-relaxed" style={{ fontSize: '0.82rem', whiteSpace: 'pre-wrap' }}>
                  <code>{tests}</code>
                </pre>
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
