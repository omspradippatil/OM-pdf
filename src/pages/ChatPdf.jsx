import { useState, useEffect, useRef } from 'react';
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
import { marked } from 'marked';
import '../styles/ChatPdf.css';

// Pre-configured Local WebGPU Models
const LOCAL_MODELS = [
  { id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC', name: 'Llama 3.2 1B (Fast & Recommended)', size: '~700 MB', vram: '~880 MB' },
  { id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC', name: 'Qwen 2.5 1.5B (High Accuracy)', size: '~1.1 GB', vram: '~1.6 GB' },
  { id: 'SmolLM2-1.7B-Instruct-q4f16_1-MLC', name: 'SmolLM2 1.7B (Balanced)', size: '~1.2 GB', vram: '~1.7 GB' },
];

export default function ChatPdf() {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  
  // Extracted PDF Data
  const [pagesData, setPagesData] = useState([]); // [{ pageNum: 1, text: "..." }]
  const [pdfStats, setPdfStats] = useState({ totalPages: 0, totalWords: 0, textLength: 0 });
  const [extracting, setExtracting] = useState(false);
  const [extractProgress, setExtractProgress] = useState(0);

  // Engine Configuration State
  const [engineType, setEngineType] = useState('local'); // 'local' | 'cloud' | 'extractor'
  const [selectedLocalModel, setSelectedLocalModel] = useState(LOCAL_MODELS[0].id);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('om_pdf_ai_key') || '');
  const [cloudProvider, setCloudProvider] = useState(() => localStorage.getItem('om_pdf_ai_provider') || 'gemini');
  
  // Local WebLLM Engine State
  const [engine, setEngine] = useState(null);
  const [loadingLocalAI, setLoadingLocalAI] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [progressPct, setProgressPct] = useState(0);
  const [localEngineReady, setLocalEngineReady] = useState(false);
  const [webgpuSupported, setWebgpuSupported] = useState(true);

  // Chat State
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState('');
  const [copyFeedback, setCopyFeedback] = useState(null);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Check WebGPU capability on mount
  useEffect(() => {
    if (typeof navigator !== 'undefined' && !navigator.gpu) {
      setWebgpuSupported(false);
      setEngineType('extractor');
    }
  }, []);

  // Save API key preferences
  useEffect(() => {
    if (apiKey) localStorage.setItem('om_pdf_ai_key', apiKey);
  }, [apiKey]);

  useEffect(() => {
    if (cloudProvider) localStorage.setItem('om_pdf_ai_provider', cloudProvider);
  }, [cloudProvider]);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // 1. PDF Loading & Comprehensive Text Extraction
  const loadFile = async (raw) => {
    const f = Array.isArray(raw) ? raw[0] : (raw?.[0] || raw);
    if (!f || f.type !== 'application/pdf') {
      setError('Please select a valid PDF file.');
      return;
    }

    setFile(f);
    setError('');
    setExtracting(true);
    setExtractProgress(0);
    setPagesData([]);
    setMessages([]);

    try {
      const buf = await f.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
      const numPages = pdf.numPages;
      const maxPagesToExtract = Math.min(numPages, 100);
      const extractedPages = [];
      let totalWordCount = 0;
      let totalCharCount = 0;

      for (let i = 1; i <= maxPagesToExtract; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items
          .map(item => item.str)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();

        if (pageText.length > 0) {
          extractedPages.push({ pageNum: i, text: pageText });
          totalWordCount += pageText.split(/\s+/).length;
          totalCharCount += pageText.length;
        }

        setExtractProgress(Math.round((i / maxPagesToExtract) * 100));
      }

      setPagesData(extractedPages);
      setPdfStats({
        totalPages: numPages,
        totalWords: totalWordCount,
        textLength: totalCharCount,
      });

      addRecentFile({ tool: 'chat_pdf', name: f.name, size: f.size });
      bumpLocalJob();

      const initialGreeting = extractedPages.length === 0
        ? `⚠️ **Notice:** No selectable text found in **${f.name}**. It may be a scanned image PDF. You can still ask questions, or run **Offline OCR** to extract text first.`
        : `👋 **Hello!** I've analyzed **${f.name}** (${numPages} pages, ~${totalWordCount.toLocaleString()} words).\n\nAsk me any question, or select a quick action below to get started!`;

      setMessages([{ role: 'assistant', content: initialGreeting }]);

      // Auto-initialize local engine if selected
      if (engineType === 'local' && webgpuSupported) {
        initLocalEngine(selectedLocalModel);
      }
    } catch (err) {
      setError('Failed to extract text from PDF: ' + err.message);
    } finally {
      setExtracting(false);
    }
  };

  // 2. Initialize Local WebLLM Engine
  const initLocalEngine = async (modelId) => {
    if (engine && selectedLocalModel === modelId && localEngineReady) return;
    setLoadingLocalAI(true);
    setLocalEngineReady(false);
    setProgressText('Loading WebGPU shader pipelines...');
    setProgressPct(5);

    try {
      const newEngine = await CreateMLCEngine(modelId, {
        initProgressCallback: (progress) => {
          setProgressText(progress.text);
          if (progress.progress !== undefined) {
            setProgressPct(Math.round(progress.progress * 100));
          }
        },
      });

      setEngine(newEngine);
      setLocalEngineReady(true);
      await logUserAction(user, 'chat_pdf', { status: 'local_engine_ready', model: modelId });
    } catch (err) {
      setError('Local WebGPU engine error: ' + err.message + '. Try switching to Cloud API or Smart Extractor.');
      setEngineType('extractor');
    } finally {
      setLoadingLocalAI(false);
    }
  };

  // 3. Smart Document Context Search (RAG)
  const buildContextForQuery = (query) => {
    if (!pagesData.length) return 'No document text available.';

    const fullDocText = pagesData.map(p => `[Page ${p.pageNum}]\n${p.text}`).join('\n\n');

    // If document is short (<10,000 chars), provide entire document text
    if (fullDocText.length <= 10000) {
      return `DOCUMENT: ${file?.name || 'Document'} (${pdfStats.totalPages} pages)\n\nFULL TEXT:\n${fullDocText}`;
    }

    // Keyword & Relevance scoring for long documents
    const queryTerms = query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 2 && !['the', 'and', 'for', 'that', 'this', 'with', 'from', 'what', 'when', 'where', 'which', 'explain', 'summarize', 'about'].includes(t));

    const isSummaryQuery = /summar|overview|key point|takeaway|about|explain/i.test(query);

    const scoredPages = pagesData.map(p => {
      const lowerText = p.text.toLowerCase();
      let score = 0;

      if (isSummaryQuery) {
        // Prioritize first 2 pages and last page for summaries
        if (p.pageNum <= 2) score += 10;
        if (p.pageNum === pagesData.length) score += 8;
      }

      for (const term of queryTerms) {
        const matches = (lowerText.match(new RegExp(term, 'g')) || []).length;
        score += matches * 2;
      }

      return { ...p, score };
    });

    scoredPages.sort((a, b) => b.score - a.score);
    const topPages = scoredPages.slice(0, 5).sort((a, b) => a.pageNum - b.pageNum);

    const relevantSections = topPages.map(p => `--- PAGE ${p.pageNum} ---\n${p.text}`).join('\n\n');

    return `DOCUMENT: ${file?.name || 'Document'} (${pdfStats.totalPages} pages total, ~${pdfStats.totalWords} words)\n\nRELEVANT EXCERPTS:\n${relevantSections}`;
  };

  // 4. Handle Sending User Messages
  const handleSend = async (userPrompt) => {
    const textToSend = (userPrompt || input).trim();
    if (!textToSend || isTyping) return;

    setInput('');
    setError('');
    setIsTyping(true);

    const newMessages = [...messages, { role: 'user', content: textToSend }];
    setMessages(newMessages);

    try {
      const context = buildContextForQuery(textToSend);

      const systemPrompt = `You are an expert Document Intelligence Assistant for OM PDF.
Analyze the provided document context and answer the user's questions with high accuracy, clarity, and depth.

GUIDELINES:
1. Base your answer on the provided DOCUMENT CONTEXT. Cite page numbers whenever referencing facts (e.g. "[Page 2]").
2. Use clean markdown formatting with bullet points, bold key terms, numbered steps, and concise paragraphs.
3. If asked to summarize, provide a high-level executive summary followed by key takeaways.
4. If information is not in the document, state clearly that it is not covered.
5. Never hallucinate or fabricate facts.

${context}`;

      // Mode 1: Local WebGPU Engine
      if (engineType === 'local') {
        if (!engine || !localEngineReady) {
          throw new Error('Local AI engine is still loading. Please wait a moment.');
        }

        // Build valid turn sequence (excluding welcome message, starting with user)
        const validHistory = newMessages
          .filter(m => m !== messages[0]) // skip initial greeting
          .map(m => ({ role: m.role, content: m.content }));

        const mlcMessages = [
          { role: 'system', content: systemPrompt },
          ...validHistory,
        ];

        setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

        const chunks = await engine.chat.completions.create({
          messages: mlcMessages,
          temperature: 0.3,
          stream: true,
        });

        let accumulatedReply = '';
        for await (const chunk of chunks) {
          accumulatedReply += chunk.choices[0]?.delta.content || '';
          setMessages(prev => {
            const copy = [...prev];
            copy[copy.length - 1].content = accumulatedReply;
            return copy;
          });
        }
      }
      // Mode 2: Cloud API (Gemini / OpenAI / Groq)
      else if (engineType === 'cloud') {
        if (!apiKey.trim()) {
          throw new Error(`Please enter your ${cloudProvider.toUpperCase()} API key in the sidebar.`);
        }

        setMessages(prev => [...prev, { role: 'assistant', content: 'Connecting to Cloud AI...' }]);

        let replyText = '';

        if (cloudProvider === 'gemini') {
          // Google Gemini 2.0 / 1.5 Flash API
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey.trim()}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [{ text: `${systemPrompt}\n\nUSER QUESTION: ${textToSend}` }]
                }
              ],
              generationConfig: { temperature: 0.3 }
            })
          });

          if (!res.ok) {
            const errJson = await res.json().catch(() => ({}));
            throw new Error(errJson.error?.message || `Gemini API error (HTTP ${res.status})`);
          }

          const data = await res.json();
          replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
        } else {
          // OpenAI / Groq / OpenRouter OpenAI-Compatible Endpoint
          const endpoint = cloudProvider === 'groq'
            ? 'https://api.groq.com/openai/v1/chat/completions'
            : cloudProvider === 'openrouter'
            ? 'https://openrouter.ai/api/v1/chat/completions'
            : 'https://api.openai.com/v1/chat/completions';

          const modelName = cloudProvider === 'groq'
            ? 'llama-3.3-70b-versatile'
            : cloudProvider === 'openrouter'
            ? 'meta-llama/llama-3.2-3b-instruct:free'
            : 'gpt-4o-mini';

          const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey.trim()}`,
            },
            body: JSON.stringify({
              model: modelName,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: textToSend }
              ],
              temperature: 0.3,
            })
          });

          if (!res.ok) {
            const errJson = await res.json().catch(() => ({}));
            throw new Error(errJson.error?.message || `API error (HTTP ${res.status})`);
          }

          const data = await res.json();
          replyText = data.choices?.[0]?.message?.content || 'No response generated.';
        }

        setMessages(prev => {
          const copy = [...prev];
          copy[copy.length - 1].content = replyText;
          return copy;
        });
      }
      // Mode 3: Smart Local Extractor (Offline Search & Key Insights)
      else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Analyzing document locally...' }]);

        const replyText = runSmartLocalExtraction(textToSend, pagesData, pdfStats);

        setMessages(prev => {
          const copy = [...prev];
          copy[copy.length - 1].content = replyText;
          return copy;
        });
      }

      await logUserAction(user, 'chat_pdf_query', { engine: engineType });
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `❌ **Error:** ${err.message}\n\n*Tip: You can switch to Cloud API in the sidebar or use the Smart Extractor.*` }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  // Instant Client-Side Semantic/Keyword Extractor Fallback
  const runSmartLocalExtraction = (query, pages, stats) => {
    const qLower = query.toLowerCase();

    if (/summar|overview|about/i.test(qLower)) {
      const firstPagesText = pages.slice(0, 3).map(p => p.text).join(' ').substring(0, 1500);
      return `### 📄 Document Summary: ${file?.name || 'Document'}\n\n- **Total Pages:** ${stats.totalPages}\n- **Total Words:** ~${stats.totalWords.toLocaleString()}\n\n**Overview Excerpt:**\n${firstPagesText}...\n\n*(Note: Running in Smart Extractor mode. Enable WebGPU or enter a Free Gemini API key in the sidebar for generative reasoning).*`;
    }

    if (/date|deadline|when/i.test(qLower)) {
      const dateRegex = /\b(?:\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}|\d{4})\b/gi;
      const foundDates = [];
      pages.forEach(p => {
        const matches = p.text.match(dateRegex);
        if (matches) {
          matches.forEach(m => foundDates.push(`- **${m}** (Found on Page ${p.pageNum})`));
        }
      });

      return foundDates.length > 0
        ? `### 📅 Detected Dates & Timestamps:\n\n${foundDates.slice(0, 12).join('\n')}`
        : `No explicit dates were detected in this document.`;
    }

    if (/number|figure|price|amount|total|cost|\$/i.test(qLower)) {
      const numRegex = /\b(?:\$\s?\d+(?:,\d{3})*(?:\.\d{2})?|\d+(?:\.\d+)?%|\d+(?:,\d{3})+(?:\.\d+)?)\b/g;
      const foundNumbers = [];
      pages.forEach(p => {
        const matches = p.text.match(numRegex);
        if (matches) {
          matches.forEach(m => foundNumbers.push(`- **${m}** (Page ${p.pageNum})`));
        }
      });

      return foundNumbers.length > 0
        ? `### 📊 Key Figures & Metrics Found:\n\n${foundNumbers.slice(0, 15).join('\n')}`
        : `No key financial or numeric statistics found.`;
    }

    // Default Keyword Search Matcher
    const keywords = qLower.split(/\s+/).filter(k => k.length > 2);
    const matches = [];
    pages.forEach(p => {
      const sentences = p.text.split(/[.!?]+/);
      sentences.forEach(s => {
        if (keywords.some(k => s.toLowerCase().includes(k))) {
          matches.push(`> "...${s.trim()}..." — **[Page ${p.pageNum}]**`);
        }
      });
    });

    if (matches.length > 0) {
      return `### 🔍 Relevant Excerpts Found for "${query}":\n\n${matches.slice(0, 5).join('\n\n')}`;
    }

    return `I searched all ${stats.totalPages} pages, but could not find a direct match for "${query}". Try searching for specific keywords or switch to WebGPU AI in the sidebar.`;
  };

  // Helper to copy markdown or text
  const copyMessage = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(index);
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  // Helper for text-to-speech read aloud
  const speakMessage = (text) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[#*`_>[\]]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    window.speechSynthesis.speak(utterance);
  };

  // Sidebar Configuration & Status Content
  const sidebarContent = (
    <>
      <p className="ux-section-label">AI Engine Mode</p>

      <div className="chat-engine-tabs">
        <button
          className={`chat-engine-tab ${engineType === 'local' ? 'active' : ''}`}
          onClick={() => {
            setEngineType('local');
            if (file && !localEngineReady && !loadingLocalAI) {
              initLocalEngine(selectedLocalModel);
            }
          }}
        >
          🔒 Local WebGPU
        </button>
        <button
          className={`chat-engine-tab ${engineType === 'cloud' ? 'active' : ''}`}
          onClick={() => setEngineType('cloud')}
        >
          ⚡ Cloud API
        </button>
        <button
          className={`chat-engine-tab ${engineType === 'extractor' ? 'active' : ''}`}
          onClick={() => setEngineType('extractor')}
        >
          🔍 Smart Search
        </button>
      </div>

      {/* Local WebGPU Mode Details */}
      {engineType === 'local' && (
        <div className="chat-model-card">
          <div className="chat-model-title">
            <span>Model:</span>
            <span style={{ color: localEngineReady ? '#10b981' : '#f59e0b', fontSize: '0.82rem' }}>
              {localEngineReady ? '🟢 Ready' : loadingLocalAI ? '⏳ Loading' : '⚪ Standby'}
            </span>
          </div>

          <select
            value={selectedLocalModel}
            onChange={(e) => {
              setSelectedLocalModel(e.target.value);
              if (file) initLocalEngine(e.target.value);
            }}
            disabled={loadingLocalAI}
            style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
          >
            {LOCAL_MODELS.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>

          {loadingLocalAI && (
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                <span>Downloading weights...</span>
                <span>{progressPct}%</span>
              </div>
              <div className="chat-progress-bar">
                <div className="chat-progress-fill" style={{ width: `${progressPct}%` }} />
              </div>
              <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{progressText}</p>
            </div>
          )}

          {!webgpuSupported && (
            <div style={{ marginTop: 10, padding: 8, background: 'rgba(239, 68, 68, 0.1)', borderRadius: 6, color: '#ef4444', fontSize: '0.78rem' }}>
              ⚠️ WebGPU is not supported in this browser. Please use Cloud API or Smart Search.
            </div>
          )}

          <p style={{ margin: '10px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
            <strong>100% Private:</strong> Model executes entirely in your browser memory via WebGPU. Zero text sent to cloud.
          </p>
        </div>
      )}

      {/* Cloud API Key Mode */}
      {engineType === 'cloud' && (
        <div className="chat-model-card">
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 6 }}>Provider:</label>
          <select
            value={cloudProvider}
            onChange={(e) => setCloudProvider(e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-primary)', fontSize: '0.85rem', marginBottom: 10 }}
          >
            <option value="gemini">Google Gemini (Free & Recommended)</option>
            <option value="groq">Groq (Ultra-Fast Llama 3.3 70B)</option>
            <option value="openai">OpenAI (GPT-4o-mini)</option>
            <option value="openrouter">OpenRouter (Free / Multi-Model)</option>
          </select>

          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: 6 }}>
            {cloudProvider === 'gemini' ? 'Gemini API Key:' : `${cloudProvider.toUpperCase()} API Key:`}
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Paste your API key here..."
            style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-primary)', fontSize: '0.85rem', boxSizing: 'border-box' }}
          />

          <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            🔑 Keys are stored strictly in your local browser storage. Get a free Gemini key at <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>aistudio.google.com</a>.
          </p>
        </div>
      )}

      {/* Smart Extractor Mode */}
      {engineType === 'extractor' && (
        <div className="chat-model-card">
          <div className="chat-model-title">
            <span>Instant Search & Summary:</span>
            <span style={{ color: '#10b981', fontSize: '0.82rem' }}>🟢 Active</span>
          </div>
          <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
            Instant client-side keyword and semantic search across all pages with zero model download and zero setup.
          </p>
        </div>
      )}

      {/* Document Stats */}
      {file && (
        <div style={{ marginTop: 16, padding: 12, background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border)', fontSize: '0.82rem' }}>
          <p style={{ margin: '0 0 6px', fontWeight: 700, color: 'var(--text-primary)' }}>Document Info</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', marginBottom: 4 }}>
            <span>Pages Analyzed:</span>
            <strong>{pdfStats.totalPages}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', marginBottom: 4 }}>
            <span>Word Count:</span>
            <strong>~{pdfStats.totalWords.toLocaleString()}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
            <span>File Size:</span>
            <strong>{formatBytes(file.size)}</strong>
          </div>
        </div>
      )}

      {error && <div className="alert alert-error" style={{ marginTop: 12 }}><span>{error}</span></div>}
    </>
  );

  return (
    <ToolPageLayout
      title="Chat with PDF"
      subtitle="Ask questions, summarize chapters, and extract data with in-browser AI that keeps documents 100% private."
      icon="🤖"
      sidebarContent={sidebarContent}
      actionDisabled={true}
    >
      <ToolSeoHead toolKey="chatPdf" />

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        style={{ display: 'none' }}
        onChange={(e) => loadFile(e.target.files)}
      />

      {!file ? (
        <DropZone
          onFiles={loadFile}
          label="Drop a PDF to start chatting"
          hint="Supports multi-page contracts, textbooks, manuals, and reports. 100% private."
        />
      ) : (
        <div className="chat-pdf-container">
          {/* Top Header */}
          <div className="chat-header">
            <div className="chat-file-meta">
              <span className="chat-file-icon">📄</span>
              <div>
                <p className="chat-file-title">{file.name}</p>
                <p className="chat-file-sub">
                  {pdfStats.totalPages} pages • {formatBytes(file.size)} • {engineType === 'local' ? 'WebGPU AI' : engineType === 'cloud' ? `${cloudProvider.toUpperCase()} Cloud` : 'Smart Extractor'}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="ux-btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                onClick={() => setMessages([messages[0]])}
              >
                Clear Chat
              </button>
              <button
                className="ux-btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                onClick={() => fileInputRef.current?.click()}
              >
                Change PDF
              </button>
            </div>
          </div>

          {/* Quick Prompt Action Chips */}
          <div className="chat-prompt-chips">
            <button className="chat-prompt-chip" onClick={() => handleSend("Summarize this document in detail with an executive summary and main findings.")}>
              📝 Summarize Document
            </button>
            <button className="chat-prompt-chip" onClick={() => handleSend("What are the top 5 key takeaways and conclusions from this PDF?")}>
              🎯 5 Key Takeaways
            </button>
            <button className="chat-prompt-chip" onClick={() => handleSend("Extract all important dates, deadlines, and timeline events mentioned in this document.")}>
              📅 Dates & Deadlines
            </button>
            <button className="chat-prompt-chip" onClick={() => handleSend("List all key financial numbers, metrics, statistics, and figures with their context.")}>
              📊 Numbers & Stats
            </button>
            <button className="chat-prompt-chip" onClick={() => handleSend("Generate 3 critical study questions and answers based on this text.")}>
              ❓ 3 Study Q&As
            </button>
          </div>

          {/* Messages Area */}
          <div className="chat-messages-area">
            {extracting && (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                <p style={{ margin: '0 0 10px', fontWeight: 600 }}>Extracting pages & building index ({extractProgress}%)...</p>
                <div className="chat-progress-bar" style={{ maxWidth: 300, margin: '0 auto' }}>
                  <div className="chat-progress-fill" style={{ width: `${extractProgress}%` }} />
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className={`chat-msg-wrapper ${msg.role}`}>
                <div className={`chat-avatar ${msg.role}`}>
                  {msg.role === 'user' ? '👤' : '🤖'}
                </div>
                <div className={`chat-bubble ${msg.role}`}>
                  <div
                    className="chat-markdown"
                    dangerouslySetInnerHTML={{
                      __html: marked.parse(msg.content || '', { breaks: true, gfm: true })
                    }}
                  />
                  {msg.role === 'assistant' && msg.content && (
                    <div className="chat-bubble-actions">
                      <button className="chat-action-btn" onClick={() => copyMessage(msg.content, idx)}>
                        {copyFeedback === idx ? '✓ Copied' : '📋 Copy'}
                      </button>
                      <button className="chat-action-btn" onClick={() => speakMessage(msg.content)}>
                        🔊 Read Aloud
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="chat-msg-wrapper assistant">
                <div className="chat-avatar assistant">🤖</div>
                <div className="chat-bubble assistant" style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>
                  Analyzing document and generating response...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Chat Input Bar */}
          <div className="chat-input-container">
            <form
              className="chat-input-form"
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
            >
              <input
                type="text"
                className="chat-text-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything about this PDF (e.g., 'What is the main conclusion on page 4?')..."
                disabled={isTyping}
              />
              <button
                type="submit"
                className="chat-send-btn"
                disabled={!input.trim() || isTyping}
              >
                <span>Send</span>
                <span>→</span>
              </button>
            </form>
          </div>
        </div>
      )}

      <ToolSeoContent toolKey="chatPdf" />
    </ToolPageLayout>
  );
}
