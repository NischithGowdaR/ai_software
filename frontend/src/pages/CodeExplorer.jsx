import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import CodeViewer from '../components/CodeViewer';
import { 
  Folder, 
  File, 
  ChevronRight, 
  ChevronDown, 
  Terminal, 
  Sparkles, 
  ShieldAlert, 
  ClipboardList, 
  FileText,
  AlertCircle,
  Clock,
  Compass
} from 'lucide-react';

export default function CodeExplorer({ currentRepo }) {
  const [fileList, setFileList] = useState([]);
  const [fileTree, setFileTree] = useState({});
  const [expandedNodes, setExpandedNodes] = useState({});
  const [selectedPath, setSelectedPath] = useState('');
  const [codeContent, setCodeContent] = useState('');
  const [loadingCode, setLoadingCode] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  
  // Tabs and results
  const [activeTab, setActiveTab] = useState('editor'); // editor, explain, bugs, review, tests, docs
  const [results, setResults] = useState({
    explain: '',
    bugs: null,
    review: null,
    tests: '',
    docs: ''
  });
  
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentRepo) {
      navigate('/connect');
      return;
    }

    async function fetchFiles() {
      try {
        const res = await api.get(`/github/files/${currentRepo.id}`);
        setFileList(res.data);
        
        // Build nested tree structure
        const tree = buildTree(res.data);
        setFileTree(tree);
        
        // Expand root nodes by default
        const initialExpanded = {};
        Object.keys(tree).forEach(key => {
          if (tree[key].type === 'dir') {
            initialExpanded[tree[key].path] = true;
          }
        });
        setExpandedNodes(initialExpanded);
      } catch (e) {
        console.error(e);
        setError('Failed to retrieve file tree');
      }
    }
    fetchFiles();
  }, [currentRepo]);

  // Helper to convert flat array to folder tree
  const buildTree = (files) => {
    const root = {};
    files.forEach((file) => {
      const parts = file.path.split('/');
      let current = root;
      parts.forEach((part, index) => {
        if (!current[part]) {
          current[part] = {
            name: part,
            path: parts.slice(0, index + 1).join('/'),
            type: index === parts.length - 1 ? file.type : 'dir',
            children: {}
          };
        }
        current = current[part].children;
      });
    });
    return root;
  };

  const toggleFolder = (path) => {
    setExpandedNodes(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  const handleFileSelect = async (path) => {
    setSelectedPath(path);
    setLoadingCode(true);
    setError('');
    setActiveTab('editor');
    
    // Clear previous results
    setResults({
      explain: '',
      bugs: null,
      review: null,
      tests: '',
      docs: ''
    });

    try {
      const res = await api.get(`/github/file-content/${currentRepo.id}`, {
        params: { path }
      });
      setCodeContent(res.data.content);
    } catch (e) {
      console.error(e);
      setError(`Failed to load file content for ${path}`);
      setCodeContent('');
    } finally {
      setLoadingCode(false);
    }
  };

  const handleAction = async (actionType) => {
    if (!selectedPath || !codeContent) return;
    
    setLoadingAction(true);
    setError('');
    
    let endpoint = '';
    let tabKey = '';
    
    if (actionType === 'explain') {
      endpoint = '/ai/explain';
      tabKey = 'explain';
    } else if (actionType === 'bugs') {
      endpoint = '/ai/bug-detect';
      tabKey = 'bugs';
    } else if (actionType === 'review') {
      endpoint = '/ai/code-review';
      tabKey = 'review';
    } else if (actionType === 'tests') {
      endpoint = '/ai/generate-tests';
      tabKey = 'tests';
    } else if (actionType === 'docs') {
      endpoint = '/ai/documentation';
      tabKey = 'docs';
    }
    
    setActiveTab(tabKey);

    try {
      const res = await api.post(endpoint, {
        repo_id: currentRepo.id,
        file_path: selectedPath,
        code_content: codeContent // Backed up by dynamic download on server if too large, but sending optimizes speed
      });
      
      setResults(prev => ({
        ...prev,
        [tabKey]: res.data.result
      }));
    } catch (err) {
      console.error(err);
      setError(`AI analysis request failed for ${actionType}`);
      setActiveTab('editor');
    } finally {
      setLoadingAction(false);
    }
  };

  // Render tree node recursively
  const renderTreeNode = (node) => {
    const isDir = node.type === 'dir';
    const isExpanded = expandedNodes[node.path];
    const isSelected = selectedPath === node.path;

    return (
      <div key={node.path} className="ms-2">
        <div 
          className={`file-node ${isSelected ? 'selected' : ''}`}
          onClick={() => isDir ? toggleFolder(node.path) : handleFileSelect(node.path)}
        >
          {isDir ? (
            <>
              {isExpanded ? <ChevronDown size={14} className="text-secondary" /> : <ChevronRight size={14} className="text-secondary" />}
              <Folder size={14} className="text-warning fill-warning/10" />
            </>
          ) : (
            <>
              <span className="ms-3"></span>
              <File size={14} className="text-cyan" />
            </>
          )}
          <span className="text-truncate" style={{ fontSize: '0.8rem' }}>{node.name}</span>
        </div>

        {isDir && isExpanded && (
          <div className="border-left border-secondary/10 ms-2">
            {Object.values(node.children).map(child => renderTreeNode(child))}
          </div>
        )}
      </div>
    );
  };

  const getScoreColorClass = (score) => {
    if (score >= 85) return 'text-success';
    if (score >= 70) return 'text-warning';
    return 'text-danger';
  };

  return (
    <div>
      <div className="mb-4">
        <h3 className="fw-bold mb-1 text-light">Repository Code Explorer</h3>
        <p className="text-secondary mb-0 small">Select repository files to inspect source and request AI diagnostics</p>
      </div>

      {error && (
        <div className="alert alert-danger border-0 bg-danger/10 text-danger mb-4 py-2 px-3 small d-flex align-items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="row g-3">
        {/* Left Column: File Explorer Tree */}
        <div className="col-12 col-lg-3">
          <div className="glass-card" style={{ maxHeight: '650px', overflowY: 'auto' }}>
            <h6 className="fw-bold text-light mb-3 pb-2 border-bottom border-secondary/15 d-flex align-items-center gap-2">
              <Compass size={16} className="text-cyan" />
              <span>Workspace Files</span>
            </h6>
            <div className="file-tree-container">
              {Object.keys(fileTree).length === 0 ? (
                <div className="text-center py-4 text-muted small">Loading file tree...</div>
              ) : (
                Object.values(fileTree).map(node => renderTreeNode(node))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Code Editor & Console Tabs */}
        <div className="col-12 col-lg-9">
          <div className="glass-card p-3 d-flex flex-column h-100">
            {/* Nav Tabs */}
            <ul className="nav nav-tabs border-secondary/15 mb-3" style={{ borderBottomColor: 'var(--border-light)' }}>
              <li className="nav-item">
                <button 
                  onClick={() => setActiveTab('editor')}
                  className={`nav-link bg-transparent text-secondary border-0 py-2 ${activeTab === 'editor' ? 'active text-cyan border-bottom border-cyan' : ''}`}
                  style={{ fontSize: '0.8rem', borderBottom: activeTab === 'editor' ? '2px solid var(--accent-cyan)' : 'none' }}
                >
                  Code Editor
                </button>
              </li>
              
              {results.explain && (
                <li className="nav-item">
                  <button 
                    onClick={() => setActiveTab('explain')}
                    className={`nav-link bg-transparent text-secondary border-0 py-2 ${activeTab === 'explain' ? 'active text-cyan border-bottom border-cyan' : ''}`}
                    style={{ fontSize: '0.8rem' }}
                  >
                    AI Explanation
                  </button>
                </li>
              )}

              {results.bugs !== null && (
                <li className="nav-item">
                  <button 
                    onClick={() => setActiveTab('bugs')}
                    className={`nav-link bg-transparent text-secondary border-0 py-2 ${activeTab === 'bugs' ? 'active text-cyan border-bottom border-cyan' : ''}`}
                    style={{ fontSize: '0.8rem' }}
                  >
                    Bug Diagnostics
                  </button>
                </li>
              )}

              {results.review !== null && (
                <li className="nav-item">
                  <button 
                    onClick={() => setActiveTab('review')}
                    className={`nav-link bg-transparent text-secondary border-0 py-2 ${activeTab === 'review' ? 'active text-cyan border-bottom border-cyan' : ''}`}
                    style={{ fontSize: '0.8rem' }}
                  >
                    Code Review Score
                  </button>
                </li>
              )}

              {results.tests && (
                <li className="nav-item">
                  <button 
                    onClick={() => setActiveTab('tests')}
                    className={`nav-link bg-transparent text-secondary border-0 py-2 ${activeTab === 'tests' ? 'active text-cyan border-bottom border-cyan' : ''}`}
                    style={{ fontSize: '0.8rem' }}
                  >
                    Unit Tests
                  </button>
                </li>
              )}

              {results.docs && (
                <li className="nav-item">
                  <button 
                    onClick={() => setActiveTab('docs')}
                    className={`nav-link bg-transparent text-secondary border-0 py-2 ${activeTab === 'docs' ? 'active text-cyan border-bottom border-cyan' : ''}`}
                    style={{ fontSize: '0.8rem' }}
                  >
                    Documentation
                  </button>
                </li>
              )}
            </ul>

            {/* Tab Panes */}
            <div className="tab-content flex-grow-1">
              {loadingCode ? (
                <div className="text-center py-5">
                  <Loader2 className="text-cyan animate-spin d-inline" size={24} />
                  <p className="small text-muted mt-2">Loading source file from GitHub...</p>
                </div>
              ) : activeTab === 'editor' ? (
                <CodeViewer 
                  filename={selectedPath} 
                  code={codeContent} 
                  onActionClick={handleAction}
                  loadingAction={loadingAction}
                />
              ) : loadingAction ? (
                <div className="text-center py-5 my-4">
                  <Loader2 className="text-cyan animate-spin d-inline mb-2" size={32} />
                  <p className="small text-cyan animate-pulse mb-0">Groq model analyzing code lines...</p>
                </div>
              ) : activeTab === 'explain' && results.explain ? (
                <div className="bg-darker/60 rounded border border-secondary/10 p-3" style={{ whiteSpace: 'pre-wrap', maxHeight: '550px', overflowY: 'auto' }}>
                  <div className="d-flex align-items-center gap-2 mb-3 text-cyan pb-2 border-bottom border-secondary/10">
                    <Sparkles size={16} />
                    <span className="fw-semibold">AI Assistant Explanations</span>
                  </div>
                  <div className="text-light small leading-relaxed">{results.explain}</div>
                </div>
              ) : activeTab === 'bugs' && results.bugs ? (
                <div className="d-flex flex-column gap-3" style={{ maxHeight: '550px', overflowY: 'auto' }}>
                  <div className="d-flex align-items-center gap-2 text-cyan pb-2 border-bottom border-secondary/10">
                    <ShieldAlert size={16} />
                    <span className="fw-semibold">Detected Code Vulnerabilities ({results.bugs.length})</span>
                  </div>
                  
                  {results.bugs.length === 0 ? (
                    <div className="alert alert-success border-0 bg-success/15 text-success small py-3">
                      ✓ No severe bugs or logical errors detected by the Llama security index scan. Nice code quality!
                    </div>
                  ) : (
                    results.bugs.map((bug, i) => (
                      <div key={i} className="p-3 rounded border border-secondary/15 bg-darker/40">
                        <div className="d-flex align-items-center gap-2 mb-2">
                          <span className={`badge-${bug.severity?.toLowerCase() || 'low'}`}>
                            {bug.severity?.toUpperCase()}
                          </span>
                          <h6 className="mb-0 fw-bold text-light">{bug.problem}</h6>
                        </div>
                        <p className="text-secondary small mb-3">{bug.explanation}</p>
                        
                        {bug.suggested_fix && (
                          <div className="bg-darker border border-secondary/10 p-2 rounded">
                            <span className="text-muted small d-block mb-1 font-semibold" style={{ fontSize: '0.75rem' }}>Suggested Fix:</span>
                            <pre className="text-info m-0 p-1 small" style={{ fontSize: '0.8rem', overflowX: 'auto' }}>
                              <code>{bug.suggested_fix}</code>
                            </pre>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              ) : activeTab === 'review' && results.review ? (
                <div className="row g-3" style={{ maxHeight: '550px', overflowY: 'auto' }}>
                  <div className="col-12 col-md-4 text-center">
                    <div className="glass-card bg-darker/50 py-4 d-flex flex-column justify-content-center h-100">
                      <span className="text-secondary small fw-semibold d-block mb-3">Overall Quality Score</span>
                      <div className="rating-circle rating-circle-cyan">
                        <span className={`rating-circle-val ${getScoreColorClass(results.review.score)}`}>
                          {results.review.score}
                        </span>
                      </div>
                      <span className="text-muted small mt-3">Target standard &gt; 80%</span>
                    </div>
                  </div>
                  
                  <div className="col-12 col-md-8">
                    <div className="glass-card bg-darker/50 h-100">
                      <h6 className="fw-bold text-light mb-3">Code Review Summary</h6>
                      <p className="text-secondary small">{results.review.summary}</p>
                      
                      <h6 className="fw-bold text-light mt-3 mb-2 small">Actionable Recommendations</h6>
                      <ul className="text-secondary small ps-3 mb-0">
                        {results.review.recommendations?.map((rec, idx) => (
                          <li key={idx} className="mb-1">{rec}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {results.review.details && (
                    <div className="col-12">
                      <div className="row g-2 mt-2">
                        {Object.keys(results.review.details).map((key) => {
                          const det = results.review.details[key];
                          return (
                            <div key={key} className="col-12 col-md-6">
                              <div className="p-3 rounded border border-secondary/10 bg-darker/30">
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
                    </div>
                  )}
                </div>
              ) : activeTab === 'tests' && results.tests ? (
                <div className="bg-darker/60 rounded border border-secondary/10 p-3" style={{ maxHeight: '550px', overflowY: 'auto' }}>
                  <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom border-secondary/10">
                    <div className="d-flex align-items-center gap-2 text-success">
                      <ClipboardList size={16} />
                      <span className="fw-semibold">Generated Automated Unit Tests</span>
                    </div>
                  </div>
                  <pre className="text-light m-0 small leading-relaxed" style={{ fontSize: '0.82rem', whiteSpace: 'pre-wrap' }}>
                    <code>{results.tests}</code>
                  </pre>
                </div>
              ) : activeTab === 'docs' && results.docs ? (
                <div className="bg-darker/60 rounded border border-secondary/10 p-3" style={{ maxHeight: '550px', overflowY: 'auto' }}>
                  <div className="d-flex align-items-center gap-2 mb-3 text-cyan pb-2 border-bottom border-secondary/10">
                    <FileText size={16} />
                    <span className="fw-semibold">Generated Code Documentation</span>
                  </div>
                  <div className="text-light small leading-relaxed" style={{ whiteSpace: 'pre-wrap' }}>{results.docs}</div>
                </div>
              ) : (
                <div className="text-center py-5 text-muted">
                  <Terminal size={32} className="mb-2 opacity-30" />
                  <p className="mb-0 small">Run analysis from editor top bar options to populate tabs</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Loader helper inside page
function Loader2({ className, size = 16 }) {
  return <div className={`spinner-border spinner-border-sm ${className}`} style={{ width: size, height: size }} role="status"></div>;
}
