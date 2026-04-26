import { useEffect } from 'react';

const WIDTHS = { sm: 400, md: 520, lg: 640 };

export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        zIndex: 1200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="animate-slide-up"
        style={{
          width: '100%',
          maxWidth: WIDTHS[size] || WIDTHS.md,
          background: 'var(--bg2)',
          border: '0.5px solid var(--border2)',
          borderRadius: '10px',
          padding: '24px',
          position: 'relative',
          direction: 'rtl',
        }}
      >
        {/* Title row — title on right, X on left (RTL) */}
        <div style={{ marginBottom: '20px', paddingLeft: '36px' }}>
          <span
            style={{
              fontSize: '16px',
              fontWeight: 700,
              color: 'var(--text)',
              fontFamily: "'Cairo', sans-serif",
            }}
          >
            {title}
          </span>
        </div>

        {/* X close — physical left (RTL end side) */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '22px',
            left: '22px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--dim)',
            fontSize: '16px',
            lineHeight: 1,
            padding: '4px',
            fontFamily: "'Cairo', sans-serif",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--dim)')}
        >
          ✕
        </button>

        {children}
      </div>
    </div>
  );
}
