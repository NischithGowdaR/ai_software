import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, GitBranch, MessageSquare, ClipboardList, FileText } from 'lucide-react';

const featureCards = [
  {
    title: 'Instant Repo Insights',
    description: 'Connect your GitHub repositories and analyze code structure, quality, and risk patterns in seconds.',
    icon: GitBranch,
    accent: 'text-cyan'
  },
  {
    title: 'AI-Powered Assistant',
    description: 'Ask questions about your codebase, generate fixes, or explore architecture with context-aware recommendations.',
    icon: MessageSquare,
    accent: 'text-purple'
  },
  {
    title: 'Automated Review & Testing',
    description: 'Generate code reviews, bug analysis, and unit tests without manual setup.',
    icon: ClipboardList,
    accent: 'text-green'
  },
  {
    title: 'Docs & History',
    description: 'Create documentation from your repository and review analysis history in one developer cockpit.',
    icon: FileText,
    accent: 'text-amber'
  },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing-page min-vh-100 d-flex align-items-center">
      <div className="container py-5">
        <div className="row align-items-center gy-5">
          <div className="col-lg-6">
            <div className="landing-badge mb-4">
              <Sparkles size={18} />
              <span>AI developer cockpit for modern engineering teams</span>
            </div>
            <h1 className="landing-title mb-4">Ship safer code faster with AI-powered repository intelligence.</h1>
            <p className="landing-text mb-4">
              Antigravity AI helps teams connect repositories, inspect source code, detect bugs, generate tests, and deliver high-quality software from a single dashboard.
            </p>
            <div className="d-flex flex-wrap gap-3">
              <button className="btn btn-cyan btn-lg" onClick={() => navigate('/login')}>
                Get started
              </button>
              <button className="btn btn-outline-custom btn-lg" onClick={() => navigate('/login')}>
                Sign in
              </button>
            </div>
          </div>

          <div className="col-lg-6">
            <div className="glass-card landing-hero-card p-4">
              <div className="d-flex align-items-center justify-content-between mb-4">
                <div>
                  <h4 className="fw-bold mb-1 text-light">Developer Cockpit</h4>
                  <p className="text-secondary small mb-0">Realtime repo metrics, AI chat, bug detection, and docs generation.</p>
                </div>
                <Sparkles size={28} className="text-cyan" />
              </div>
              <div className="row g-3">
                <div className="col-6">
                  <div className="feature-pill px-3 py-2 rounded-3 bg-dark border border-secondary/15 text-secondary small">
                    Repository
                  </div>
                </div>
                <div className="col-6 text-end">
                  <div className="feature-pill px-3 py-2 rounded-3 bg-dark border border-secondary/15 text-secondary small">
                    AI Assistant
                  </div>
                </div>
              </div>
              <div className="mt-4 text-light">
                <p className="mb-2 small text-secondary">Connected Repositories</p>
                <h2 className="fw-bold mb-3">12</h2>
                <p className="small text-secondary mb-0">Automatic analysis of code quality, security, and documentation coverage.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="row gy-4 mt-5">
          {featureCards.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="col-md-6">
                <div className="glass-card feature-card h-100 p-4">
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <div className="d-flex align-items-center justify-content-center feature-icon rounded-3 bg-dark" style={{ width: 42, height: 42 }}>
                      <Icon size={20} className={feature.accent} />
                    </div>
                    <span className="text-secondary small">AI first</span>
                  </div>
                  <h5 className="fw-bold text-light mb-2">{feature.title}</h5>
                  <p className="text-secondary small mb-0">{feature.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
