import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { TOOLS, CATEGORIES } from '../constants/tools';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

export default function Navbar() {
  const { user, login, logout, authError, setAuthError } = useAuth();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [toolsOpen, setToolsOpen]       = useState(false);
  const [menuOpen, setMenuOpen]         = useState(false);
  const [scrolled, setScrolled]         = useState(false);
  const [theme, setTheme]               = useState(() => localStorage.getItem('om-pdf-theme') || 'light');
  
  const dropRef = useRef(null);
  const toolsRef = useRef(null);

  useEffect(() => {
    document.body.dataset.theme = theme;
    localStorage.setItem('om-pdf-theme', theme);
  }, [theme]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const close = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropdownOpen(false);
      if (toolsRef.current && !toolsRef.current.contains(e.target)) setToolsOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setToolsOpen(false);
    setMenuOpen(false);
    setDropdownOpen(false);
  }, [location]);

  const categorizedTools = Object.entries(CATEGORIES).map(([key, label]) => ({
    label,
    tools: TOOLS.filter(t => t.category === label)
  }));

  return (
    <nav className={`navbar${scrolled ? ' scrolled' : ''}`} id="navbar">
      <div className="nav-container-mega">
        <div className="nav-left">
          {/* Brand */}
          <Link to="/" className="nav-brand" aria-label="OM PDF Home">
            <div className="brand-icon" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M14 2H6C4.9 2 4 2.9 4 4v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8L14 2z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14 2v6h6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="brand-name">OM <span>PDF</span></span>
          </Link>

          {/* Mega Dropdown Toggle */}
          <div className="nav-mega-wrapper" ref={toolsRef}>
            <button 
              className={`nav-link-btn tools-btn ${toolsOpen ? 'active' : ''}`} 
              onClick={() => setToolsOpen(o => !o)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 8 }}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              Tools
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ marginLeft: 6, transition: 'transform 0.2s', transform: toolsOpen ? 'rotate(180deg)' : 'rotate(0)' }}><polyline points="6 9 12 15 18 9"/></svg>
            </button>

            {toolsOpen && (
              <div className="mega-menu-panel">
                <div className="mega-menu-container">
                  {categorizedTools.map((cat, idx) => (
                    <div key={idx} className="mega-menu-column">
                      <h3 className="mega-menu-title">{cat.label}</h3>
                      <div className="mega-menu-links">
                        {cat.tools.map(t => (
                          <Link key={t.key} to={t.path} className="mega-menu-item">
                            <span className="mega-item-icon" style={{ background: `${t.color}15`, color: t.color }}>{t.icon}</span>
                            <span className="mega-item-text">{t.title}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="nav-desktop-links">
            <NavLink to="/compress-pdf" className="nav-link">Compress</NavLink>
            <NavLink to="/convert-pdf"  className="nav-link">Convert</NavLink>
            <NavLink to="/merge-pdf"    className="nav-link">Merge</NavLink>
            <NavLink to="/metadata-editor" className="nav-link">Edit</NavLink>
          </div>
        </div>

        {/* Right actions */}
        <div className="nav-right">
          <button className="theme-toggle" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme">
            {theme === 'dark'
              ? <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2"/><line x1="12" y1="1" x2="12" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="12" y1="21" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="1" y1="12" x2="3" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="21" y1="12" x2="23" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              : <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            }
          </button>

          {user ? (
            <div className="user-profile" ref={dropRef}>
              <button className="user-profile-btn" onClick={() => setDropdownOpen(o => !o)}>
                <img src={user.photoURL || ''} alt="avatar" className="user-avatar" referrerPolicy="no-referrer" />
                <span className="user-name-desktop">{user.displayName?.split(' ')[0]}</span>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              {dropdownOpen && (
                <div className="dropdown-menu">
                  <Link to="/my-files" className="dropdown-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                    My Files
                  </Link>
                  <button className="dropdown-item logout" onClick={logout}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="nav-auth-wrap">
              <button className="btn-nav-login" onClick={login}>
                Log In
              </button>
              {!!authError && (
                <button
                  className="nav-auth-error"
                  onClick={() => setAuthError('')}
                  title={authError}
                  aria-label="Dismiss sign-in error"
                >
                  ⚠️ {String(authError).slice(0, 44)}
                </button>
              )}
            </div>
          )}

          <button className="hamburger" onClick={() => setMenuOpen(o => !o)}>
            <span /><span /><span />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="mobile-menu-panel">
          <div className="mobile-menu-header">
            <span className="mobile-menu-label">Menu</span>
            <button className="btn-close-menu" onClick={() => setMenuOpen(false)}>&times;</button>
          </div>
          <div className="mobile-menu-body">
            {categorizedTools.map((cat, idx) => (
              <div key={idx} className="mobile-cat">
                <div className="mobile-cat-title">{cat.label}</div>
                {cat.tools.map(t => (
                  <Link key={t.key} to={t.path} className="mobile-link" onClick={() => setMenuOpen(false)}>
                    <span className="mobile-item-icon">{t.icon}</span> {t.title}
                  </Link>
                ))}
              </div>
            ))}
            <div className="mobile-auth-section">
              {user 
                ? <button className="mobile-link-btn logout" onClick={logout}>Logout</button>
                : <button className="mobile-link-btn login" onClick={login}><GoogleIcon /> Sign In with Google</button>
              }
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

