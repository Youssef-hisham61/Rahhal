function Spinner() {
  return (
    <span
      style={{
        display: 'inline-block',
        width: '12px',
        height: '12px',
        border: '2px solid rgba(255,255,255,0.35)',
        borderTopColor: 'currentColor',
        borderRadius: '50%',
        animation: 'spin 0.6s linear infinite',
        flexShrink: 0,
      }}
    />
  );
}

const VARIANTS = {
  primary: { background: 'var(--accent)', color: '#fff', border: 'none' },
  ghost:   { background: 'transparent', color: 'var(--text)', border: '0.5px solid var(--border2)' },
  danger:  { background: 'transparent', color: '#c0392b', border: '0.5px solid #c0392b' },
};

const HOVER_BG = {
  primary: 'var(--accent-hover)',
  ghost:   'var(--btn-hover)',
  danger:  'rgba(192,57,43,0.08)',
};

const SIZES = {
  sm: { padding: '5px 12px', fontSize: '13px' },
  md: { padding: '8px 16px', fontSize: '14px' },
};

export default function Button({ variant = 'primary', size = 'md', onClick, disabled, loading, children, style: extra, type = 'button' }) {
  const v = VARIANTS[variant] || VARIANTS.primary;
  const s = SIZES[size] || SIZES.md;
  const inactive = disabled || loading;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={inactive}
      style={{
        ...v,
        ...s,
        borderRadius: '6px',
        fontFamily: "'Cairo', sans-serif",
        fontWeight: 600,
        cursor: inactive ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        transition: 'background 0.15s, opacity 0.15s',
        whiteSpace: 'nowrap',
        ...extra,
      }}
      onMouseEnter={(e) => {
        if (inactive) return;
        e.currentTarget.style.background = HOVER_BG[variant] || HOVER_BG.primary;
      }}
      onMouseLeave={(e) => {
        if (inactive) return;
        e.currentTarget.style.background = v.background;
      }}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}
