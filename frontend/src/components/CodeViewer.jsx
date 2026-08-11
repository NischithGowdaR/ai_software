import React from 'react';
import { Copy, Check, Terminal } from 'lucide-react';

export default function CodeViewer({ filename, code, onActionClick, loadingAction }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getLanguage = (path) => {
    if (!path) return 'javascript';
    const ext = path.split('.').pop().toLowerCase();
    if (ext === 'py') return 'python';
    if (ext === 'js' || ext === 'jsx') return 'javascript';
    if (ext === 'ts' || ext === 'tsx') return 'typescript';
    if (ext === 'html') return 'html';
    if (ext === 'css') return 'css';
    if (ext === 'go') return 'go';
    if (ext === 'rs') return 'rust';
    return 'javascript';
  };

  if (!code) {
    return (
      <div className="code-viewer-panel d-flex align-items-center justify-content-center py-5">
        <div className="text-center text-muted">
          <Terminal size={40} className="mb-2 text-secondary opacity-50" />
          <p className="mb-0">Select a file from the tree to view its content</p>
        </div>
      </div>
    );
  }

  // Split code into lines for displaying line numbers
  const lines = code.split('\n');

  return (
    <div className="code-viewer-panel">
      <div className="code-viewer-header">
        <div className="d-flex align-items-center gap-2">
          <Terminal size={16} className="text-cyan" />
          <span className="fw-semibold text-light small text-truncate" style={{ maxWidth: '350px' }}>
            {filename}
          </span>
          <span className="badge bg-secondary/35 text-secondary small py-1" style={{ fontSize: '0.7rem' }}>
            {lines.length} lines
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="btn btn-sm btn-outline-custom d-flex align-items-center gap-1 py-1"
          style={{ fontSize: '0.75rem' }}
        >
          {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      {onActionClick && (
        <div className="bg-dark/40 border-bottom border-secondary/10 px-3 py-2 d-flex flex-wrap gap-2">
          <button
            disabled={loadingAction}
            onClick={() => onActionClick('explain')}
            className="btn btn-sm btn-cyan py-1 px-2"
            style={{ fontSize: '0.75rem' }}
          >
            Explain Code
          </button>
          <button
            disabled={loadingAction}
            onClick={() => onActionClick('bugs')}
            className="btn btn-sm btn-cyan py-1 px-2"
            style={{ fontSize: '0.75rem' }}
          >
            Find Bugs
          </button>
          <button
            disabled={loadingAction}
            onClick={() => onActionClick('review')}
            className="btn btn-sm btn-cyan py-1 px-2"
            style={{ fontSize: '0.75rem' }}
          >
            Review Code
          </button>
          <button
            disabled={loadingAction}
            onClick={() => onActionClick('tests')}
            className="btn btn-sm btn-cyan py-1 px-2"
            style={{ fontSize: '0.75rem' }}
          >
            Generate Tests
          </button>
          <button
            disabled={loadingAction}
            onClick={() => onActionClick('docs')}
            className="btn btn-sm btn-cyan py-1 px-2"
            style={{ fontSize: '0.75rem' }}
          >
            Generate Docs
          </button>
        </div>
      )}

      <div className="code-viewer-body d-flex p-0">
        {/* Line numbers column */}
        <div
          className="text-end px-3 py-3 border-right border-secondary/10 bg-darker/60 select-none"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
            minWidth: '50px',
            backgroundColor: '#05070c'
          }}
        >
          {lines.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        {/* Code content column */}
        <pre
          className="flex-grow-1 m-0 p-3 overflow-auto text-light"
          style={{
            fontSize: '0.85rem',
            lineHeight: '1.6',
            backgroundColor: '#080b11'
          }}
        >
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}
