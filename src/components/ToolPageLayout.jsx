
import React, { useEffect } from 'react';

/**
 * ToolPageLayout — Premium SaaS Shell:
 *
 *  ┌─────────────────────────────┬────────────────┐
 *  │  Left: Workspace            │  Right Sidebar │
 *  │  (scrollable area)          │  (fixed + line)│
 *  │                             │                │
 *  │                             │  [ Title ]     │
 *  │                             │                │
 *  │  (Grid / Previews)          │  [ Controls ]  │
 *  │                             │  ──────────────│
 *  │                [ + ] (add)  │  [ BIG BTN ]   │
 *  └─────────────────────────────┴────────────────┘
 */
export default function ToolPageLayout({
  icon,
  title,
  subtitle,
  children,
  sidebarContent  = null,
  actionButton    = null,
  actionLabel     = null,
  onAction        = null,
  actionDisabled  = false,
  actionLoading   = false,
  headerAction    = null,
  onAddMore       = null,
}) {
  
  // Lock global scrolling and hide footer when tool layout is active
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const footer = document.querySelector('footer');
    if (footer) footer.style.display = 'none';
    
    return () => {
      document.body.style.overflow = '';
      if (footer) footer.style.display = '';
    };
  }, []);

  return (
    <div className="ux-shell">

      {/* ── Privacy Banner ── */}
      <div className="ux-privacy-banner">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="ux-banner-strong">100% local — zero uploads.</span>
        Your files never leave this device.
      </div>

      {/* ── Workspace Shell ── */}
      <div className="ux-workspace-shell">

        {/* ══ LEFT: Workspace Area ══ */}
        <div className="ux-workspace">
          
          {/* Scrollable Content */}
          <div className="ux-workspace-scroll">
            {children}
          </div>

          {/* Floating Add Button - TRULY FIXED relative to workspace */}
          {onAddMore && (
            <button className="ux-floating-add" onClick={onAddMore} title="Add more files">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>

        {/* ══ RIGHT: Sidebar Controls ══ */}
        <aside className="ux-sidebar">

          {/* Sidebar header */}
          <div className="ux-sidebar-header">
            <h1 className="ux-sidebar-title">
              <span className="ux-sidebar-icon">{icon}</span>
              {title}
            </h1>
            {subtitle && <p className="ux-sidebar-subtitle">{subtitle}</p>}
          </div>

          {/* Scrollable Body (Settings/Results) */}
          <div className="ux-sidebar-body">
            {sidebarContent}
          </div>

          {/* Fixed Footer (BIG Action Button) */}
          <div className="ux-sidebar-footer">
            {actionButton || (actionLabel && (
              <button
                className="ux-action-btn"
                onClick={onAction}
                disabled={actionDisabled || actionLoading}
              >
                {actionLoading ? actionLoading : actionLabel}
                {!actionLoading && (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ marginLeft:10 }}>
                    <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            ))}
            <p className="ux-action-privacy">🔒 Processed in your browser</p>
          </div>

        </aside>
      </div>
    </div>
  );
}
