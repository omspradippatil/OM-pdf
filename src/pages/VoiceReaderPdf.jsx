import React, { useState, useEffect, useRef } from 'react';
import ToolPageLayout from '../components/ToolPageLayout';
import DropZone from '../components/DropZone';
import ToolSeoHead from '../components/ToolSeoHead';
import ToolSeoContent from '../components/ToolSeoContent';
import { useAuth } from '../context/AuthContext';
import { logUserAction } from '../services/activityLog';
import { bumpLocalJob } from '../services/privacyStats';
import { pdfjsLib } from '../utils/pdfjs';

async function extractTextFromPdf(file) {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf, verbosity: 0 }).promise;
  let allText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map(item => item.str);
    allText += strings.join(' ') + '\\n\\n';
  }
  return allText;
}

export default function VoiceReaderPdf() {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  
  const [text, setText] = useState('');
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const synth = window.speechSynthesis;
  const utteranceRef = useRef(null);

  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = synth.getVoices();
      setVoices(availableVoices);
      if (availableVoices.length > 0 && !selectedVoice) {
        // Try to pick a default English voice
        const engVoice = availableVoices.find(v => v.lang.startsWith('en')) || availableVoices[0];
        setSelectedVoice(engVoice.name);
      }
    };
    
    loadVoices();
    if (synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = loadVoices;
    }
    
    return () => {
      synth.cancel();
    };
  }, []);

  const loadFile = async (raw) => {
    const f = Array.isArray(raw) ? raw[0] : (raw?.[0] || raw);
    if (!f || f.type !== 'application/pdf') { setError('Select a valid PDF.'); return; }
    
    setFile(f); setError(''); setText(''); setWorking(true); synth.cancel(); setIsPlaying(false); setIsPaused(false);
    
    try {
      const extracted = await extractTextFromPdf(f);
      setText(extracted);
      bumpLocalJob();
      await logUserAction(user, 'voice_reader', { tool: 'voice_reader', status: 'success' });
    } catch (err) {
      setError('Extraction failed: ' + err.message);
      await logUserAction(user, 'voice_reader', { tool: 'voice_reader', status: 'error' });
    } finally {
      setWorking(false);
    }
  };

  const handlePlay = () => {
    if (isPaused) {
      synth.resume();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }
    
    if (!text) return;
    
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    if (selectedVoice) {
      const voiceObj = voices.find(v => v.name === selectedVoice);
      if (voiceObj) utterance.voice = voiceObj;
    }
    
    utterance.rate = rate;
    utterance.pitch = pitch;
    
    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };
    
    utteranceRef.current = utterance;
    synth.speak(utterance);
    setIsPlaying(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    if (synth.speaking && !synth.paused) {
      synth.pause();
      setIsPaused(true);
      setIsPlaying(false);
    }
  };

  const handleStop = () => {
    synth.cancel();
    setIsPlaying(false);
    setIsPaused(false);
  };

  const sidebarContent = (
    <>
      <p className="ux-section-label">Voice Controls</p>
      
      <div className="ux-field">
        <label className="ux-label">Voice</label>
        <select className="ux-input" value={selectedVoice} onChange={(e) => setSelectedVoice(e.target.value)}>
          {voices.map(v => (
            <option key={v.name} value={v.name}>
              {v.name} ({v.lang})
            </option>
          ))}
        </select>
      </div>

      <div className="ux-field">
        <div className="ux-range-header">
          <label className="ux-label" style={{ margin:0 }}>Speed</label>
          <span className="ux-range-value">{rate.toFixed(1)}x</span>
        </div>
        <input type="range" className="ux-range" min={0.5} max={2} step={0.1} value={rate} onChange={e => setRate(parseFloat(e.target.value))} />
      </div>

      <div className="ux-field">
        <div className="ux-range-header">
          <label className="ux-label" style={{ margin:0 }}>Pitch</label>
          <span className="ux-range-value">{pitch.toFixed(1)}</span>
        </div>
        <input type="range" className="ux-range" min={0.5} max={2} step={0.1} value={pitch} onChange={e => setPitch(parseFloat(e.target.value))} />
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        {(!isPlaying && !isPaused) || isPaused ? (
          <button className="ux-btn-primary" style={{ flex: 1, margin: 0 }} onClick={handlePlay} disabled={!text}>
            ▶ Play
          </button>
        ) : (
          <button className="ux-btn-secondary" style={{ flex: 1, margin: 0 }} onClick={handlePause}>
            ⏸ Pause
          </button>
        )}
        <button className="ux-btn-secondary" style={{ flex: 1, margin: 0 }} onClick={handleStop} disabled={!isPlaying && !isPaused}>
          ⏹ Stop
        </button>
      </div>

      {error && <div className="alert alert-error" style={{ marginTop:12 }}><span>❌ {error}</span></div>}
    </>
  );

  return (
    <ToolPageLayout
      title="PDF Voice Reader"
      subtitle="Extract and read document text aloud using local text-to-speech engine."
      icon="🔊"
      sidebarContent={sidebarContent}
      actionButton={null}
    >
      <ToolSeoHead toolKey="voiceReader" />

      {!file ? (
        <DropZone onFiles={loadFile} label="Drop a PDF to read" hint="Extracts and reads text offline" />
      ) : (
        <div className="ux-workspace-content" style={{ height:'100%', display:'flex', flexDirection:'column' }}>
          <div className="ux-toolbar-inline" style={{ flexShrink:0 }}>
            <div>
              <h2 style={{ margin:0, fontSize:'1.3rem', fontWeight:800 }}>Extracted Text</h2>
              <p style={{ margin:'4px 0 0', fontSize:'0.8rem', color:'var(--text-muted)' }}>{file.name}</p>
            </div>
            <button className="ux-btn-secondary" onClick={() => { setFile(null); handleStop(); setText(''); }}>Close File</button>
          </div>

          <div style={{ flex:1, padding:20, background:'#fff', borderRadius:16, border:'1px solid var(--border)', overflow:'auto', fontSize: '1.1rem', lineHeight: 1.6, color: '#333', whiteSpace: 'pre-wrap' }}>
            {working ? (
              <p style={{ color: 'var(--text-muted)' }}>Extracting text from document...</p>
            ) : text ? (
              text
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>No text found in this document.</p>
            )}
          </div>
        </div>
      )}

      <ToolSeoContent toolKey="voiceReader" />
    </ToolPageLayout>
  );
}
