import React, { useState, useEffect, useRef } from 'react';
import ToolPageLayout from '../components/ToolPageLayout';
import DropZone from '../components/DropZone';
import ToolSeoHead from '../components/ToolSeoHead';
import ToolSeoContent from '../components/ToolSeoContent';
import { formatBytes } from '../fileManager';
import { pdfjsLib } from '../utils/pdfjs';
import { CreateMLCEngine } from '@mlc-ai/web-llm';
import { useAuth } from '../context/AuthContext';
import { logUserAction } from '../services/activityLog';
import { bumpLocalJob } from '../services/privacyStats';
import { addRecentFile } from '../services/recentFiles';
import '../styles/Home.css'; // Reuse basic styles

export default function ChatPdf() {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [pdfText, setPdfText] = useState('');
  
  // Chat state
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // AI Engine State
  const [engine, setEngine] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [engineReady, setEngineReady] = useState(false);
  const [error, setError] = useState('');
  
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const loadFile = async (raw) => {
    const f = Array.isArray(raw) ? raw[0] : (raw?.[0] || raw);
    if (!f || f.type !== 'application/pdf') { setError('Please select a valid PDF.'); return; }
    
    setFile(f);
    setError('');
    
    try {
      // 1. Extract text from PDF
      setProgressText('Extracting text from PDF...');
      const buf = await f.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
      
      let fullText = '';
      // Limit to first 10 pages to avoid overflowing context window for small models
      const maxPages = Math.min(pdf.numPages, 10); 
      for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        fullText += content.items.map(item => item.str).join(' ') + '\n';
      }
      
      setPdfText(fullText.trim());
      addRecentFile({ tool: 'chat_pdf', name: f.name, size: f.size });
      bumpLocalJob();
      
      // 2. Initialize AI Engine
      initEngine();
      
    } catch (err) {
      setError('Failed to read PDF: ' + err.message);
    }
  };

  const initEngine = async () => {
    if (engine) return;
    setLoadingAI(true);
    try {
      // Use a fast, small model for in-browser CPU/GPU
      const selectedModel = 'Phi-3-mini-4k-instruct-q4f16_1-MLC';
      
      const newEngine = await CreateMLCEngine(
        selectedModel,
        {
          initProgressCallback: (progress) => {
            setProgressText(progress.text);
          }
        }
      );
      
      setEngine(newEngine);
      setEngineReady(true);
      setMessages([{ role: 'assistant', content: 'Hello! I have read your document. What would you like to know about it?' }]);
      await logUserAction(user, 'chat_pdf', { status: 'success' });
    } catch (err) {
      setError('Failed to load AI Engine. Your browser might not support WebGPU, or you ran out of memory. Error: ' + err.message);
    } finally {
      setLoadingAI(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !engineReady || !engine) return;
    
    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsTyping(true);
    
    try {
      // Construct conversation context
      // We inject the PDF text as a system prompt instruction
      const systemPrompt = `You are a helpful AI assistant. Answer questions based on the following document context. If the answer is not in the document, say so. Do not hallucinate.\n\nDOCUMENT CONTEXT:\n${pdfText.substring(0, 10000)}`; // Trim to ~10k chars to be safe on context limits
      
      // Build MLCEngine messages format
      const mlcMessages = [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMessage }
      ];

      // Stream the reply
      const chunks = await engine.chat.completions.create({
        messages: mlcMessages,
        temperature: 0.5,
        stream: true,
      });

      let reply = '';
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
      
      for await (const chunk of chunks) {
        reply += chunk.choices[0]?.delta.content || '';
        setMessages(prev => {
          const newMsg = [...prev];
          newMsg[newMsg.length - 1].content = reply;
          return newMsg;
        });
      }
      
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ Error generating response: ' + err.message }]);
    } finally {
      setIsTyping(false);
    }
  };

  const sidebarContent = (
    <>
      <p className="ux-section-label">AI Status</p>
      
      <div className={`ux-option-card ${engineReady ? 'selected' : ''}`}>
        <div className="ux-option-title">{engineReady ? '🟢 AI Ready (WebGPU)' : '🔴 Offline'}</div>
        <div className="ux-option-desc">Model: Phi-3-mini (Local)</div>
      </div>

      <div style={{ padding: 12, background: 'var(--bg-muted)', borderRadius: 8, marginTop: 16, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <p style={{ margin: '0 0 8px 0' }}><strong>100% Private:</strong> The AI model runs entirely on your device's graphics card (GPU). Your document is never sent to the cloud.</p>
        <p style={{ margin: 0, color: '#f59e0b' }}>⚠️ <strong>Note:</strong> The first launch downloads a 1.8GB AI model. It may take several minutes depending on your internet connection. A Desktop/PC is highly recommended over a mobile device.</p>
      </div>
      
      {error && <div className="alert alert-error" style={{ marginTop: 12 }}><span>❌ {error}</span></div>}
    </>
  );

  return (
    <ToolPageLayout
      title="Chat with PDF"
      subtitle="Ask questions, summarize, and extract data using a local AI that never leaves your device."
      icon="🤖"
      sidebarContent={sidebarContent}
      actionButton={<div />} // Chat relies on its own input bar
    >
      <ToolSeoHead toolKey="chatPdf" />

      {!file ? (
        <DropZone onFiles={loadFile} label="Drop a PDF to chat with" hint="First launch downloads a 1.8GB AI model. PC/Desktop highly recommended." />
      ) : (
        <div className="ux-workspace-content" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 500, padding: 0, overflow: 'hidden' }}>
          {/* Header */}
          <div className="ux-toolbar-inline" style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
            <div>
              <h2 style={{ margin:0, fontSize:'1.3rem', fontWeight:800 }}>AI Chat</h2>
              <p style={{ margin:'4px 0 0', fontSize:'0.8rem', color:'var(--text-muted)' }}>{file.name} ({formatBytes(file.size)})</p>
            </div>
            <button className="ux-btn-secondary" style={{ borderRadius:'10px', padding:'8px 16px' }} onClick={() => window.location.reload()}>
              Close Session
            </button>
          </div>

          {/* Loading State */}
          {loadingAI && !engineReady && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: 40 }}>
               <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                <circle cx="12" cy="12" r="10" stroke="rgba(0,0,0,0.1)" strokeWidth="3"/>
                <path d="M12 2a10 10 0 0 1 10 10" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round"/>
              </svg>
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ margin: '0 0 8px 0' }}>Downloading AI Model...</h3>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>{progressText || 'Preparing WebGPU Engine...'}</p>
              </div>
            </div>
          )}

          {/* Chat Interface */}
          {engineReady && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-body)' }}>
              {/* Messages Area */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                {messages.map((msg, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 16, marginBottom: 24, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: msg.role === 'user' ? 'var(--primary)' : '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0, fontSize: '1.2rem' }}>
                      {msg.role === 'user' ? '👤' : '🤖'}
                    </div>
                    <div style={{ maxWidth: '80%', background: msg.role === 'user' ? 'var(--primary)' : 'var(--bg-card)', color: msg.role === 'user' ? '#fff' : 'var(--text-primary)', padding: '12px 16px', borderRadius: 12, border: msg.role === 'user' ? 'none' : '1px solid var(--border)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isTyping && (
                   <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
                   <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>🤖</div>
                   <div style={{ maxWidth: '80%', background: 'var(--bg-card)', color: 'var(--text-muted)', padding: '12px 16px', borderRadius: 12, border: '1px solid var(--border)', fontStyle: 'italic' }}>
                     Generating...
                   </div>
                 </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div style={{ padding: '20px 24px', borderTop: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                <form onSubmit={handleSend} style={{ display: 'flex', gap: 12 }}>
                  <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask a question about your PDF..."
                    className="ux-text-input"
                    style={{ flex: 1, padding: '12px 16px', borderRadius: 100, border: '1px solid var(--border)' }}
                    disabled={isTyping}
                  />
                  <button type="submit" className="ux-btn-primary" style={{ borderRadius: 100, padding: '0 24px', margin: 0, width: 'max-content', flexShrink: 0 }} disabled={!input.trim() || isTyping}>
                    Send
                  </button>
                </form>
              </div>
            </div>
          )}

        </div>
      )}

      <ToolSeoContent toolKey="chatPdf" />
    </ToolPageLayout>
  );
}
