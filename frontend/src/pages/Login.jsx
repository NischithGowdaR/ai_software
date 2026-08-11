import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Sparkles, Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // Log in
        const res = await api.post('/auth/login', { email, password });
        localStorage.setItem('token', res.data.access_token);
        
        // Fetch current user details
        const meRes = await api.get('/auth/me');
        localStorage.setItem('user', JSON.stringify(meRes.data));
        navigate('/');
      } else {
        // Register
        await api.post('/auth/register', { email, password });
        // After registration, automatically login
        const res = await api.post('/auth/login', { email, password });
        localStorage.setItem('token', res.data.access_token);
        
        const meRes = await api.get('/auth/me');
        localStorage.setItem('user', JSON.stringify(meRes.data));
        navigate('/');
      }
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail || 
        'An error occurred. Please verify your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="d-flex align-items-center justify-content-center min-vh-100 w-100 px-3"
      style={{
        background: 'radial-gradient(circle at center, #111a30 0%, #05070c 80%)'
      }}
    >
      <div className="w-100" style={{ maxWidth: '420px' }}>
        <div className="text-center mb-4">
          <div 
            className="d-inline-flex align-items-center justify-content-center p-3 rounded-circle mb-3"
            style={{ background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.2)' }}
          >
            <Sparkles size={32} className="text-cyan" />
          </div>
          <h2 className="fw-bold mb-1" style={{ letterSpacing: '0.5px' }}>
            {isLogin ? 'Welcome Back' : 'Get Started'}
          </h2>
          <p className="text-secondary small">
            {isLogin ? 'Sign in to access AI Code Intelligence' : 'Create an account to start reviewing code'}
          </p>
        </div>

        <div className="glass-card p-4">
          {error && (
            <div className="alert alert-danger d-flex align-items-center gap-2 py-2 px-3 small border-0 bg-danger/10 text-danger mb-3">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label text-secondary small fw-semibold">Email Address</label>
              <div className="position-relative">
                <Mail 
                  className="position-absolute text-muted" 
                  size={16} 
                  style={{ left: '12px', top: '50%', transform: 'translateY(-50%)' }} 
                />
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  className="form-control custom-input w-100"
                  style={{ paddingLeft: '38px' }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="form-label text-secondary small fw-semibold">Password</label>
              <div className="position-relative">
                <Lock 
                  className="position-absolute text-muted" 
                  size={16} 
                  style={{ left: '12px', top: '50%', transform: 'translateY(-50%)' }} 
                />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="form-control custom-input w-100"
                  style={{ paddingLeft: '38px' }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-cyan w-100 d-flex align-items-center justify-content-center gap-2 mb-3"
            >
              <span>{loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}</span>
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>

          <div className="text-center mt-3">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="btn btn-link text-cyan p-0 border-0 bg-transparent text-decoration-none small"
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
