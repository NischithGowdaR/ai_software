import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { 
  MessageSquare, 
  Send, 
  Bot, 
  User, 
  Terminal, 
  Plus, 
  Paperclip,
  FileCode,
  Sparkles
} from 'lucide-react';

export default function AIChat({ currentRepo }) {
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState('');
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [relevantFiles, setRelevantFiles] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState('');
  
  const chatEndRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!currentRepo) {
      navigate('/connect');
      return;
    }
    fetchConversations();
  }, [currentRepo]);

  // Handle location state redirect (if user clicked recent activity chat)
  useEffect(() => {
    if (location.state?.selectConversationId) {
      const convId = location.state.selectConversationId;
      setActiveConvId(convId);
      loadConversationMessages(convId);
    }
  }, [location.state]);

  const fetchConversations = async () => {
    try {
      const res = await api.get('/history/conversations', {
        params: { repo_id: currentRepo.id }
      });
      setConversations(res.data);
      if (res.data.length > 0 && !activeConvId && !location.state?.selectConversationId) {
        // Load the first conversation by default
        const latestId = res.data[0].id;
        setActiveConvId(latestId);
        loadConversationMessages(latestId);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadConversationMessages = async (convId) => {
    setLoadingHistory(true);
    setError('');
    try {
      const res = await api.get(`/history/conversations/${convId}`);
      setMessages(res.data.messages);
      setRelevantFiles([]); // Diffs loaded on next prompt or kept empty
    } catch (e) {
      console.error(e);
      setError('Failed to load chat history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const startNewChat = () => {
    setActiveConvId('');
    setMessages([]);
    setRelevantFiles([]);
    setError('');
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || sending) return;

    const userMessage = {
      sender: 'user',
      text: inputText,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setSending(true);
    setError('');

    try {
      const res = await api.post('/ai/chat', {
        repo_id: currentRepo.id,
        message: userMessage.text,
        conversation_id: activeConvId || null
      });

      const reply = res.data.message;
      setMessages(prev => [...prev, {
        sender: 'ai',
        text: reply.text,
        timestamp: reply.timestamp
      }]);
      setRelevantFiles(res.data.relevant_files || []);

      if (!activeConvId) {
        setActiveConvId(res.data.conversation_id);
        fetchConversations();
      }
    } catch (err) {
      console.error(err);
      setError('Failed to communicate with AI chat assistant.');
    } finally {
      setSending(false);
    }
  };

  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div>
      <div className="mb-4">
        <h3 className="fw-bold mb-1 text-light">Repository Q&A Assistant</h3>
        <p className="text-secondary mb-0 small">Ask questions about repository flow, database hooks, structure, or auth modules</p>
      </div>

      <div className="row g-3">
        {/* Left Side: Past Chat Sessions */}
        <div className="col-12 col-md-3">
          <div className="glass-card d-flex flex-column h-100" style={{ maxHeight: '600px', minHeight: '500px' }}>
            <button 
              onClick={startNewChat}
              className="btn btn-cyan w-100 d-flex align-items-center justify-content-center gap-2 mb-3 py-2"
              style={{ fontSize: '0.85rem' }}
            >
              <Plus size={16} />
              <span>New Conversation</span>
            </button>
            
            <h6 className="text-muted small fw-semibold mb-2">Previous Chats</h6>
            <div className="overflow-auto flex-grow-1" style={{ maxHeight: '420px' }}>
              {conversations.length === 0 ? (
                <div className="text-center py-4 text-muted small">No previous discussions.</div>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => {
                      setActiveConvId(conv.id);
                      loadConversationMessages(conv.id);
                    }}
                    className={`btn text-start w-100 p-2 mb-1 rounded text-truncate border-0 ${
                      activeConvId === conv.id ? 'bg-cyan/15 text-cyan' : 'text-secondary hover-bg-light/5'
                    }`}
                    style={{ fontSize: '0.8rem' }}
                  >
                    <MessageSquare size={13} className="d-inline me-2" />
                    <span>{conv.title}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Middle: Chat Workspace */}
        <div className="col-12 col-md-6">
          <div className="glass-card d-flex flex-column justify-content-between h-100" style={{ minHeight: '500px', maxHeight: '600px' }}>
            {/* Header */}
            <div className="d-flex align-items-center justify-content-between pb-3 border-bottom border-secondary/15">
              <div className="d-flex align-items-center gap-2">
                <Bot size={18} className="text-cyan animate-pulse" />
                <h6 className="mb-0 fw-bold text-light">AI Developer Brain</h6>
              </div>
              <span className="badge bg-secondary/35 text-secondary small py-1" style={{ fontSize: '0.7rem' }}>
                Context: {currentRepo.name}
              </span>
            </div>

            {/* Chat Messages */}
            <div className="flex-grow-1 overflow-auto py-3" style={{ maxHeight: '420px' }}>
              {error && (
                <div className="alert alert-danger border-0 bg-danger/10 text-danger py-2 px-3 small mx-3 mb-3">
                  {error}
                </div>
              )}

              {loadingHistory ? (
                <div className="text-center py-5">
                  <div className="spinner-border spinner-border-sm text-cyan" role="status"></div>
                  <p className="text-muted small mt-2">Loading logs...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-5 my-4 text-secondary">
                  <Terminal size={40} className="mb-2 opacity-30 mx-auto" />
                  <p className="small mb-1">Ask anything about the workspace, e.g.:</p>
                  <em className="small text-cyan d-block">"Where is database connection configured?"</em>
                  <em className="small text-cyan d-block">"Which endpoint handles registration?"</em>
                </div>
              ) : (
                <div className="chat-bubble-container p-2">
                  {messages.map((msg, idx) => (
                    <div 
                      key={idx} 
                      className={`chat-bubble ${msg.sender === 'user' ? 'user' : 'ai'}`}
                      style={{ whiteSpace: 'pre-wrap' }}
                    >
                      <div className="d-flex align-items-center gap-1 mb-1 opacity-70" style={{ fontSize: '0.72rem' }}>
                        {msg.sender === 'user' ? <User size={10} /> : <Bot size={10} />}
                        <span className="fw-semibold">{msg.sender === 'user' ? 'Developer' : 'Antigravity AI'}</span>
                      </div>
                      <div style={{ fontSize: '0.85rem' }}>{msg.text}</div>
                    </div>
                  ))}
                  {sending && (
                    <div className="chat-bubble ai">
                      <div className="d-flex align-items-center gap-2">
                        <Loader2 className="text-cyan animate-spin d-inline" size={13} />
                        <span className="small text-muted">Reading indexes & generating answer...</span>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSend} className="pt-3 border-top border-secondary/15">
              <div className="input-group">
                <input
                  type="text"
                  required
                  disabled={sending || loadingHistory}
                  placeholder="Ask a question about the repository..."
                  className="form-control custom-input bg-dark border-secondary/20"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                />
                <button 
                  type="submit" 
                  disabled={sending || loadingHistory || !inputText.trim()}
                  className="btn btn-cyan px-3"
                >
                  <Send size={16} />
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Side: Index/RAG Context Files */}
        <div className="col-12 col-md-3">
          <div className="glass-card d-flex flex-column h-100" style={{ maxHeight: '600px', minHeight: '500px' }}>
            <h6 className="fw-bold text-light mb-3 pb-2 border-bottom border-secondary/15 d-flex align-items-center gap-2">
              <Paperclip size={15} className="text-cyan" />
              <span>Reference Context</span>
            </h6>
            
            <p className="text-secondary small mb-3" style={{ fontSize: '0.76rem' }}>
              The search engine matches repository files to your query terms to load code snippets as context for Groq.
            </p>

            <div className="overflow-auto flex-grow-1" style={{ maxHeight: '420px' }}>
              {relevantFiles.length === 0 ? (
                <div className="text-center py-4 text-muted small opacity-50">
                  No files referenced in the current turn.
                </div>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {relevantFiles.map((file, idx) => (
                    <div 
                      key={idx} 
                      className="p-2 rounded bg-dark border border-secondary/10 text-truncate text-secondary d-flex align-items-center gap-2"
                      style={{ fontSize: '0.75rem', cursor: 'pointer' }}
                      onClick={() => navigate('/explorer')}
                      title={file}
                    >
                      <FileCode size={13} className="text-cyan flex-shrink-0" />
                      <span className="text-truncate">{file}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Loader2({ className, size = 16 }) {
  return <div className={`spinner-border spinner-border-sm ${className}`} style={{ width: size, height: size }} role="status"></div>;
}
