import React, { useState } from 'react';
import SEO from '../components/SEO';
import { db, collection, addDoc, serverTimestamp } from '../firebase';
import { useAuth } from '../context/AuthContext';

const SendIcon = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

export default function Feedback() {
  const { user } = useAuth();
  const [feedback, setFeedback] = useState('');
  const [type, setType] = useState('suggestion');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0); // 60s cooldown in ms


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!feedback.trim() || sending) return;
    
    // Client-side rate limiting check
    const now = Date.now();
    if (now < cooldown) {
      const wait = Math.ceil((cooldown - now) / 1000);
      setError(`Please wait ${wait}s before sending another message.`);
      return;
    }

    if (feedback.length > 3000) {
      setError('Message too long. Max 3000 characters.');
      return;
    }

    setSending(true);
    setError('');

    try {
      await addDoc(collection(db, 'feedback'), {
        message: feedback,
        type: type,
        uid: user?.uid || 'anonymous',
        email: user?.email || 'anonymous',
        createdAt: serverTimestamp(),
        userAgent: navigator.userAgent,
        page: 'feedback-page'
      });
      setSent(true);
      setFeedback('');
      setCooldown(Date.now() + 60000); // 60s cooldown
    } catch (err) {
      console.error('Feedback failed:', err);
      setError('Failed to send feedback. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="content-page">
      <SEO
        title="Send Feedback — OM PDF"
        description="Share your thoughts, report bugs, or suggest features for OM PDF."
        url="https://om-pdf.netlify.app/feedback"
        noindex
      />

      <div className="content-page-inner" style={{ maxWidth: '600px' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '16px' }}>Send Feedback</h1>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '40px' }}>
          Help us make OM PDF better. Whether it's a bug report, a feature suggestion, or just a thank you, we'd love to hear from you.
        </p>

        {sent ? (
          <div className="feedback-success-card" style={{ textAlign: 'center', padding: '40px', background: 'var(--bg-hover)', borderRadius: '24px', border: '1px solid var(--success-light)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🎉</div>
            <h2 style={{ color: 'var(--success)', marginBottom: '12px' }}>Thank You!</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Your feedback has been received. We appreciate your support!</p>
            <button className="ux-btn-primary" style={{ marginTop: '24px' }} onClick={() => setSent(false)}>Send another message</button>
          </div>
        ) : (
          <form className="feedback-page-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="ux-field">
              <label className="ux-label">What kind of feedback is this?</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                {['suggestion', 'bug', 'other'].map(t => (
                  <button
                    key={t}
                    type="button"
                    className={`ux-chip ${type === t ? 'active' : ''}`}
                    style={{ 
                      padding: '12px', 
                      borderRadius: '12px', 
                      border: '1px solid var(--border)',
                      background: type === t ? 'var(--primary)' : 'var(--bg-hover)',
                      color: type === t ? 'white' : 'var(--text-primary)',
                      fontWeight: 600,
                      textTransform: 'capitalize',
                      cursor: 'pointer'
                    }}
                    onClick={() => setType(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="ux-field">
              <label className="ux-label" htmlFor="feedbackMsg">Your Message</label>
              <textarea
                id="feedbackMsg"
                className="ux-input"
                style={{ minHeight: '180px', paddingTop: '16px', resize: 'vertical' }}
                placeholder="Describe your experience or suggest a feature..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                maxLength={3000}
                required
                disabled={sending}
              />
              <div style={{ display:'flex', justifyContent:'flex-end', marginTop:'8px' }}>
                <span style={{ fontSize:'0.75rem', color: feedback.length > 2800 ? 'var(--error)' : 'var(--text-muted)' }}>
                  {feedback.length} / 3000
                </span>
              </div>
            </div>

            {error && <div className="alert alert-error" style={{ margin: 0 }}><span>❌ {error}</span></div>}

            <button type="submit" className="ux-action-btn" disabled={sending || !feedback.trim()} style={{ width: '100%', height: '56px' }}>
              {sending ? (
                <span style={{ display:'flex', alignItems:'center', gap:8, justifyContent: 'center' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ animation:'spin 1s linear infinite' }}>
                    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                  Sending…
                </span>
              ) : (
                <span style={{ display:'flex', alignItems:'center', gap:10, justifyContent: 'center' }}>
                  <SendIcon size={20} />
                  Submit Feedback
                </span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
