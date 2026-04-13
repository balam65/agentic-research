import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Plane, ShoppingBag, Send, Loader2, CheckCircle2, MessageSquare, BrainCircuit } from 'lucide-react';
import './index.css';

const TEMPLATES = {
  flight: "scrape the flight price details of air india , flight from delhi to detroit for coming saturday",
  amazon: "I want to scrape the front page of amazon.com for gaming laptops. Give me the titles, prices, and review count."
};

function App() {
  const [messages, setMessages] = useState([]);
  const [inputVal, setInputVal] = useState('');
  const [status, setStatus] = useState('idle'); // idle, processing, success, waiting_reply
  const [errorMsg, setErrorMsg] = useState('');
  
  const historyRef = useRef(null);

  // Auto-scroll chat
  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [messages]);

  const loadTemplate = (type) => {
    setInputVal(TEMPLATES[type]);
  };

  const handleSend = async () => {
    const trimmed = inputVal.trim();
    if (!trimmed) return;

    setErrorMsg('');
    setInputVal('');
    
    const newMessages = [...messages, { role: 'user', content: trimmed }];
    setMessages(newMessages);
    setStatus('processing');

    try {
      const response = await axios.post('http://127.0.0.1:3000/api/v1/intake', {
        messages: newMessages
      });

      const data = response.data;

      if (data.clarifying_question) {
        setMessages([...newMessages, { role: 'assistant', content: data.clarifying_question }]);
        setStatus('waiting_reply');
      } else {
        // Success payload generated
        setStatus('success');
      }
    } catch (err) {
      console.error(err);
      setStatus('idle');
      setErrorMsg(err.response?.data?.error || err.message || 'Unknown Server Error');
      setTimeout(() => setErrorMsg(''), 5000);
    }
  };

  const currentIcon = () => {
    if (status === 'processing') return <Loader2 size={32} className="status-icon processing" />;
    if (status === 'success') return <CheckCircle2 size={32} className="status-icon success" />;
    if (status === 'waiting_reply') return <MessageSquare size={32} className="status-icon idle" />;
    return <BrainCircuit size={32} className="status-icon idle" />;
  };

  const statusTitle = () => {
    if (status === 'processing') return "Backend Processing... 🧠";
    if (status === 'success') return "Validation Passed! ✓";
    if (status === 'waiting_reply') return "Awaiting User Reply... 💬";
    return "Awaiting Prompt...";
  };

  const statusDesc = () => {
    if (status === 'processing') return "The LLM is determining targets and structure.";
    if (status === 'success') return "Module 2 payload generated successfully and dispatched.";
    if (status === 'waiting_reply') return "We need more information. Check the chat above.";
    return "Submit a natural language prompt to begin.";
  };

  return (
    <div className="app-container">
      {/* Target Definition / Chat Column */}
      <main className="intake-column glass-panel">
        <header>
          <h1>✨ Module 1: AI-Powered Intake</h1>
          <p className="subtitle">Type your scraping request in plain English. We dynamically route it downstream.</p>
        </header>

        <section className="templates">
          <h3>Quick Examples</h3>
          <div className="templates-btn-group">
            <button className="btn-template" onClick={() => loadTemplate('flight')}>
              <Plane size={16} /> Flight Details
            </button>
            <button className="btn-template" onClick={() => loadTemplate('amazon')}>
              <ShoppingBag size={16} /> Amazon Search
            </button>
          </div>
        </section>

        <div className="chat-container">
          <div className="chat-history" ref={historyRef}>
            {messages.length === 0 && (
              <div style={{ color: "var(--text-secondary)", textAlign: "center", marginTop: "2rem" }}>
                Send a request to start the session.
              </div>
            )}
            {messages.map((msg, idx) => (
              <div key={idx} className={`chat-bubble ${msg.role === 'user' ? 'user-bubble' : 'ai-bubble'}`}>
                {msg.content}
              </div>
            ))}
          </div>
          
          <div className="chat-input-wrapper">
            <textarea
              className="chat-input"
              rows={2}
              placeholder="Example: scrape flight details of air india from delhi..."
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <button 
              className="btn-primary" 
              onClick={handleSend}
              disabled={status === 'processing' || !inputVal.trim()}
            >
              {status === 'processing' ? <Loader2 size={20} className="spinner" /> : <Send size={20} />}
            </button>
          </div>
        </div>
        
        {errorMsg && (
          <div style={{ color: "#ef4444", fontSize: "0.85rem", marginTop: "0.5rem" }}>
            ❌ Error: {errorMsg} (Make sure the Node backend is running)
          </div>
        )}
      </main>

      {/* Output / Status Column */}
      <aside className="output-column glass-panel">
        <header>
          <h2>🧠 Backend Status</h2>
          <p className="subtitle">Real-time status of the validation and distribution event.</p>
        </header>

        <div className="status-card">
          {currentIcon()}
          <h3 className="status-text">{statusTitle()}</h3>
          <p className="status-desc">{statusDesc()}</p>
          
          {status === 'success' && (
            <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', border: '1px solid var(--success-green)' }}>
              <p style={{ color: 'var(--success-green)', fontSize: '0.9rem', fontWeight: 500 }}>
                System Ready for Orchestration 🚀
              </p>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

export default App;
