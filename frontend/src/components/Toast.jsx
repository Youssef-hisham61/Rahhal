const BORDER_COLORS = {
  success: '#22c55e',
  error:   '#c0392b',
  warning: '#f97316',
};

export default function Toast({ toasts }) {
  if (!toasts.length) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="animate-slide-up"
          style={{
            background: 'var(--bg2)',
            border: '0.5px solid var(--border2)',
            borderLeft: `3px solid ${BORDER_COLORS[toast.type] || BORDER_COLORS.success}`,
            borderRadius: '8px',
            padding: '12px 16px',
            fontSize: '14px',
            color: 'var(--text)',
            fontFamily: "'Cairo', sans-serif",
            maxWidth: '320px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
            direction: 'rtl',
          }}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
