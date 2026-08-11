import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { GitBranch, Plus, FolderGit, ExternalLink, Loader2, Play } from 'lucide-react';

export default function ConnectRepo({ onSelectRepo }) {
  const [url, setUrl] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [repositories, setRepositories] = useState([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchRepos = async () => {
    try {
      const res = await api.get('/github/repositories');
      setRepositories(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchRepos();
  }, []);

  const handleConnect = async (e) => {
    e.preventDefault();
    setError('');
    setConnecting(true);
    
    // Animate loading status text steps
    const messages = [
      'Contacting GitHub API...',
      'Validating repository scope...',
      'Fetching recursive branch trees...',
      'Mapping directory structure...',
      'Analyzing repository file types...',
      'Building search indexing database in Atlas...'
    ];
    
    let msgIdx = 0;
    setStatusText(messages[0]);
    const timer = setInterval(() => {
      msgIdx = (msgIdx + 1) % messages.length;
      setStatusText(messages[msgIdx]);
    }, 2500);

    try {
      const res = await api.post('/github/connect', { repo_url: url });
      clearInterval(timer);
      
      // Connection complete, add to repos and select
      const newRepo = res.data;
      localStorage.setItem('currentRepo', JSON.stringify(newRepo));
      if (onSelectRepo) onSelectRepo(newRepo);
      
      setUrl('');
      navigate('/explorer');
    } catch (err) {
      console.error(err);
      clearInterval(timer);
      setError(
        err.response?.data?.detail || 
        'Could not connect repository. Make sure GITHUB_TOKEN is valid or repository is public.'
      );
    } finally {
      setConnecting(false);
      setStatusText('');
      fetchRepos();
    }
  };

  const handleSelect = (repo) => {
    localStorage.setItem('currentRepo', JSON.stringify(repo));
    if (onSelectRepo) onSelectRepo(repo);
    navigate('/explorer');
  };

  return (
    <div>
      <div className="mb-4">
        <h3 className="fw-bold mb-1 text-light">Connect GitHub Repository</h3>
        <p className="text-secondary mb-0 small">Import a public or authorized private repository to analyze source code</p>
      </div>

      <div className="row g-4">
        {/* Connect Form */}
        <div className="col-12 col-lg-5">
          <div className="glass-card">
            <h5 className="fw-bold mb-3 d-flex align-items-center gap-2 text-light">
              <Plus size={18} className="text-cyan" />
              <span>Add New Repository</span>
            </h5>
            
            {error && (
              <div className="alert alert-danger border-0 bg-danger/10 text-danger mb-3 py-2 px-3 small">
                {error}
              </div>
            )}

            <form onSubmit={handleConnect}>
              <div className="mb-4">
                <label className="form-label text-secondary small fw-semibold">GitHub Repository URL</label>
                <div className="position-relative">
                  <GitBranch 
                    className="position-absolute text-muted" 
                    size={16} 
                    style={{ left: '12px', top: '50%', transform: 'translateY(-50%)' }} 
                  />
                  <input
                    type="url"
                    required
                    disabled={connecting}
                    placeholder="https://github.com/username/project"
                    className="form-control custom-input w-100"
                    style={{ paddingLeft: '38px' }}
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                </div>
                <span className="text-muted small mt-1 d-block" style={{ fontSize: '0.75rem' }}>
                  Format: https://github.com/owner/repository_name
                </span>
              </div>

              {connecting ? (
                <div className="text-center py-3">
                  <Loader2 className="text-cyan animate-spin mb-2 d-inline" size={32} />
                  <p className="small text-cyan mb-0 animate-pulse">{statusText}</p>
                </div>
              ) : (
                <button type="submit" className="btn btn-cyan w-100 py-2 d-flex align-items-center justify-content-center gap-2">
                  <Plus size={18} />
                  <span>Connect Project</span>
                </button>
              )}
            </form>
          </div>
        </div>

        {/* Existing Connected Repositories */}
        <div className="col-12 col-lg-7">
          <div className="glass-card h-100">
            <h5 className="fw-bold mb-3 d-flex align-items-center gap-2 text-light">
              <FolderGit size={18} className="text-cyan" />
              <span>Your Connected Repositories</span>
            </h5>

            {repositories.length === 0 ? (
              <div className="text-center py-5 text-secondary">
                <FolderGit size={40} className="mb-2 opacity-30" />
                <p className="mb-0 small">No repositories connected yet. Add one on the left!</p>
              </div>
            ) : (
              <div className="d-flex flex-column gap-3">
                {repositories.map((repo) => (
                  <div 
                    key={repo.id} 
                    className="p-3 rounded-lg border border-secondary/15 d-flex align-items-center justify-content-between bg-darker/40"
                    style={{ transition: 'border-color 0.2s' }}
                  >
                    <div>
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <h6 className="mb-0 fw-bold text-light">{repo.owner}/{repo.name}</h6>
                        <a 
                          href={repo.url} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-secondary hover-text-cyan d-inline-flex"
                        >
                          <ExternalLink size={13} />
                        </a>
                      </div>
                      <p className="text-secondary small mb-2 text-truncate" style={{ maxWidth: '350px' }}>
                        {repo.description || 'No description provided.'}
                      </p>
                      <div className="d-flex gap-2">
                        <span className="badge bg-secondary/30 text-secondary py-1" style={{ fontSize: '0.7rem' }}>
                          branch: {repo.default_branch}
                        </span>
                        {Object.keys(repo.languages).slice(0, 3).map((lang) => (
                          <span key={lang} className="badge bg-cyan/10 text-cyan border border-cyan-900/30 py-1" style={{ fontSize: '0.7rem' }}>
                            {lang} {repo.languages[lang]}%
                          </span>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => handleSelect(repo)}
                      className="btn btn-sm btn-cyan d-flex align-items-center gap-1 py-1"
                    >
                      <Play size={13} />
                      <span>Select</span>
                    </button>
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
