import { useEffect } from 'react';

export default function Drawer({ isOpen, onClose, title, children }) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="animate-fade"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            zIndex: 1100,
          }}
        />
      )}

      {/* Drawer panel — slides from physical left */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100%',
          width: 'min(480px, 100vw)',
          background: 'var(--bg2)',
          borderRight: '0.5px solid var(--border2)',
          zIndex: 1101,
          display: 'flex',
          flexDirection: 'column',
          direction: 'rtl',
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {/* Header — X on left, title on right (RTL) */}
        <div
          style={{
            flexShrink: 0,
            padding: '18px 24px',
            borderBottom: '0.5px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            direction: 'ltr',
            gap: '12px',
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--dim)',
              fontSize: '16px',
              lineHeight: 1,
              padding: '4px',
              fontFamily: "'Cairo', sans-serif",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--dim)')}
          >
            ✕
          </button>
          <span
            style={{
              flex: 1,
              textAlign: 'right',
              fontSize: '16px',
              fontWeight: 700,
              color: 'var(--text)',
              fontFamily: "'Cairo', sans-serif",
            }}
          >
            {title}
          </span>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {children}
        </div>
      </div>
    </>
  );
}
