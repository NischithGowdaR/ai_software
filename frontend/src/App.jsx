import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ConnectRepo from './pages/ConnectRepo';
import CodeExplorer from './pages/CodeExplorer';
import AIChat from './pages/AIChat';
import BugDetector from './pages/BugDetector';
import CodeReview from './pages/CodeReview';
import TestGenerator from './pages/TestGenerator';
import DocGenerator from './pages/DocGenerator';
import Commits from './pages/Commits';
import PullRequests from './pages/PullRequests';
import HistoryPage from './pages/History';

// Simple Route Guard to protect private developer views
function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

// Layout wrapper for pages requiring Sidebar
function MainLayout({ currentRepo, onDisconnectRepo, children }) {
  return (
    <div className="app-container">
      <Sidebar currentRepo={currentRepo} onDisconnectRepo={onDisconnectRepo} />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

export default function App() {
  const [currentRepo, setCurrentRepo] = useState(null);

  useEffect(() => {
    const repoStr = localStorage.getItem('currentRepo');
    if (repoStr) {
      try {
        setCurrentRepo(JSON.parse(repoStr));
      } catch (e) {
        setCurrentRepo(null);
      }
    }
  }, []);

  const handleSelectRepo = (repo) => {
    setCurrentRepo(repo);
  };

  const handleDisconnectRepo = () => {
    localStorage.removeItem('currentRepo');
    setCurrentRepo(null);
  };

  return (
    <Router>
      <Routes>
        {/* Auth Route */}
        <Route path="/login" element={<Login />} />

        {/* Protected Developer Cockpit Routes */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <MainLayout currentRepo={currentRepo} onDisconnectRepo={handleDisconnectRepo}>
                <Dashboard />
              </MainLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/connect" 
          element={
            <ProtectedRoute>
              <MainLayout currentRepo={currentRepo} onDisconnectRepo={handleDisconnectRepo}>
                <ConnectRepo onSelectRepo={handleSelectRepo} />
              </MainLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/explorer" 
          element={
            <ProtectedRoute>
              <MainLayout currentRepo={currentRepo} onDisconnectRepo={handleDisconnectRepo}>
                <CodeExplorer currentRepo={currentRepo} />
              </MainLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/chat" 
          element={
            <ProtectedRoute>
              <MainLayout currentRepo={currentRepo} onDisconnectRepo={handleDisconnectRepo}>
                <AIChat currentRepo={currentRepo} />
              </MainLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/bugs" 
          element={
            <ProtectedRoute>
              <MainLayout currentRepo={currentRepo} onDisconnectRepo={handleDisconnectRepo}>
                <BugDetector currentRepo={currentRepo} />
              </MainLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/review" 
          element={
            <ProtectedRoute>
              <MainLayout currentRepo={currentRepo} onDisconnectRepo={handleDisconnectRepo}>
                <CodeReview currentRepo={currentRepo} />
              </MainLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/tests" 
          element={
            <ProtectedRoute>
              <MainLayout currentRepo={currentRepo} onDisconnectRepo={handleDisconnectRepo}>
                <TestGenerator currentRepo={currentRepo} />
              </MainLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/docs" 
          element={
            <ProtectedRoute>
              <MainLayout currentRepo={currentRepo} onDisconnectRepo={handleDisconnectRepo}>
                <DocGenerator currentRepo={currentRepo} />
              </MainLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/commits" 
          element={
            <ProtectedRoute>
              <MainLayout currentRepo={currentRepo} onDisconnectRepo={handleDisconnectRepo}>
                <Commits currentRepo={currentRepo} />
              </MainLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/pulls" 
          element={
            <ProtectedRoute>
              <MainLayout currentRepo={currentRepo} onDisconnectRepo={handleDisconnectRepo}>
                <PullRequests currentRepo={currentRepo} />
              </MainLayout>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/history" 
          element={
            <ProtectedRoute>
              <MainLayout currentRepo={currentRepo} onDisconnectRepo={handleDisconnectRepo}>
                <HistoryPage currentRepo={currentRepo} />
              </MainLayout>
            </ProtectedRoute>
          } 
        />

        {/* Fallback to Dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
