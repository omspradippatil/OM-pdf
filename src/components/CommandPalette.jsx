import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { TOOLS } from '../constants/tools';
import '../styles/CommandPalette.css';

const STATIC_PAGES = [
  { key: 'all_tools', title: 'All Tools Directory', desc: 'Browse all 45+ PDF tools', path: '/tools', icon: '🧰', category: 'Pages' },
  { key: 'ilovepdf_alt', title: 'iLovePDF Alternative', desc: '100% Private zero-upload alternative', path: '/ilovepdf-alternative', icon: '🛡️', category: 'Alternatives' },
  { key: 'smallpdf_alt', title: 'Smallpdf Alternative', desc: 'Unlimited free alternative without paywalls', path: '/smallpdf-alternative', icon: '⚡', category: 'Alternatives' },
  { key: 'blog', title: 'Blog & Guides', desc: 'Read PDF guides and security tips', path: '/blog', icon: '📰', category: 'Pages' },
  { key: 'how_it_works', title: 'How It Works', desc: 'Learn about zero-upload WASM architecture', path: '/how-it-works', icon: '⚙️', category: 'Pages' },
  { key: 'privacy', title: 'Privacy Policy', desc: 'Zero data retention policy', path: '/privacy', icon: '🔒', category: 'Pages' },
  { key: 'feedback', title: 'Send Feedback', desc: 'Suggest new tools or report bugs', path: '/feedback', icon: '💬', category: 'Pages' },
];

export default function CommandPalette({ isOpen, onClose, onToggleTheme }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const handleClose = useCallback(() => {
    setQuery('');
    setSelectedIndex(0);
    onClose();
  }, [onClose]);

  // Focus input when palette opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Global hotkey listener (Cmd+K / Ctrl+K / /)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) handleClose();
        else if (window.__openCommandPalette) window.__openCommandPalette();
      } else if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  // Filtered results
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Default recommended / popular items
      const popular = TOOLS.slice(0, 6).map(t => ({
        ...t,
        type: 'tool',
      }));
      const pages = STATIC_PAGES.slice(0, 3).map(p => ({
        ...p,
        type: 'page',
      }));
      return [...popular, ...pages];
    }

    const matchedTools = TOOLS.filter(t => 
      t.title.toLowerCase().includes(q) ||
      t.desc.toLowerCase().includes(q) ||
      (t.category && t.category.toLowerCase().includes(q))
    ).map(t => ({ ...t, type: 'tool' }));

    const matchedPages = STATIC_PAGES.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.desc.toLowerCase().includes(q)
    ).map(p => ({ ...p, type: 'page' }));

    const actions = [];
    if ('dark mode light theme toggle'.includes(q)) {
      actions.push({
        key: 'toggle_theme',
        title: 'Toggle Dark / Light Theme',
        desc: 'Switch color theme',
        icon: '🌓',
        type: 'action',
        action: () => {
          if (onToggleTheme) onToggleTheme();
          handleClose();
        }
      });
    }

    return [...matchedTools, ...matchedPages, ...actions];
  }, [query, onToggleTheme, handleClose]);

  const handleSelect = (item) => {
    if (!item) return;
    if (item.type === 'action' && item.action) {
      item.action();
    } else if (item.path) {
      navigate(item.path);
      handleClose();
    }
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % (results.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + results.length) % (results.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="cmd-palette-backdrop" onClick={handleClose}>
      <div className="cmd-palette-modal" onClick={e => e.stopPropagation()}>
        {/* Search input bar */}
        <div className="cmd-search-bar">
          <span className="cmd-search-icon">🔍</span>
          <input
            ref={inputRef}
            type="text"
            className="cmd-search-input"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder="Search 45+ PDF tools, pages, or actions..."
          />
          <span className="cmd-esc-badge">ESC</span>
        </div>

        {/* Results List */}
        <div className="cmd-results-list">
          {results.length === 0 ? (
            <div className="cmd-empty">
              No matching tools or pages found for &ldquo;{query}&rdquo;.
            </div>
          ) : (
            results.map((item, idx) => (
              <div
                key={item.key || item.path || idx}
                className={`cmd-item ${idx === selectedIndex ? 'selected' : ''}`}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <div className="cmd-item-left">
                  <div className="cmd-item-icon">{item.icon || '📄'}</div>
                  <div className="cmd-item-info">
                    <span className="cmd-item-title">{item.title}</span>
                    <span className="cmd-item-desc">{item.desc}</span>
                  </div>
                </div>
                <span className="cmd-item-badge">
                  {item.category || (item.type === 'tool' ? 'Tool' : item.type === 'page' ? 'Page' : 'Action')}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="cmd-footer">
          <div className="cmd-footer-shortcuts">
            <span><span className="cmd-kbd">↑</span><span className="cmd-kbd">↓</span> navigate</span>
            <span><span className="cmd-kbd">↵</span> select</span>
            <span><span className="cmd-kbd">esc</span> close</span>
          </div>
          <span>OM PDF Spotlight</span>
        </div>
      </div>
    </div>
  );
}
