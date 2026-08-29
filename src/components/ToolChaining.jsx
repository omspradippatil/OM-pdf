import { useNavigate } from 'react-router-dom';
import { saveSession } from '../services/sessionRecovery';
import '../styles/ToolChaining.css';

const CHAINABLE_TOOLS = [
  { key: 'compress', name: 'Compress', icon: '🗜️', path: '/compress-pdf', desc: 'Reduce file size' },
  { key: 'draw_sign', name: 'Sign & Draw', icon: '✍️', path: '/draw-sign-pdf', desc: 'Add signature stamp' },
  { key: 'page_numbers', name: 'Page Numbers', icon: '🔢', path: '/page-numbers', desc: 'Add footer numbering' },
  { key: 'protect', name: 'Protect', icon: '🔒', path: '/protect-pdf', desc: 'Encrypt with password' },
  { key: 'chat_pdf', name: 'Chat AI', icon: '🤖', path: '/chat-pdf', desc: 'Ask questions with AI' },
];

export default function ToolChaining({ lastBytes, lastName, currentTool }) {
  const navigate = useNavigate();

  if (!lastBytes || !lastName) return null;

  const availableTools = CHAINABLE_TOOLS.filter(t => t.key !== currentTool);

  const handleChainTo = async (tool) => {
    try {
      const file = new File([lastBytes], lastName, { type: 'application/pdf' });
      // Save to IndexedDB session for the target tool so it auto-loads on mount
      const sessionKey = `${tool.key}_session`;
      await saveSession(sessionKey, [file], { source: currentTool, chained: true });
      navigate(tool.path);
    } catch (err) {
      console.error('Failed to chain tool:', err);
      navigate(tool.path);
    }
  };

  return (
    <div className="tool-chaining-container">
      <p className="tool-chaining-title">
        <span>⚡ Quick Next Steps:</span>
        <span className="tool-chaining-sub">Continue editing without re-uploading</span>
      </p>
      <div className="tool-chaining-grid">
        {availableTools.map(t => (
          <button
            key={t.key}
            type="button"
            className="tool-chaining-btn"
            onClick={() => handleChainTo(t)}
            title={t.desc}
          >
            <span className="chain-icon">{t.icon}</span>
            <span className="chain-name">{t.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
