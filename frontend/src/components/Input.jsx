export default function Input({ label, value, onChange, type = 'text', placeholder, error, disabled, name, autoComplete }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {label && (
        <label
          style={{
            fontSize: '13px',
            color: 'var(--muted)',
            fontFamily: "'Cairo', sans-serif",
          }}
        >
          {label}
        </label>
      )}
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete={autoComplete}
        style={{
          width: '100%',
          background: 'transparent',
          border: `0.5px solid ${error ? '#c0392b' : 'var(--border2)'}`,
          borderRadius: '6px',
          padding: '10px 14px',
          fontSize: '14px',
          color: 'var(--text)',
          fontFamily: "'Cairo', sans-serif",
          outline: 'none',
          transition: 'border-color 0.15s',
          opacity: disabled ? 0.6 : 1,
          direction: 'rtl',
        }}
        onFocus={(e) => {
          if (!error) e.target.style.borderColor = 'var(--focus)';
        }}
        onBlur={(e) => {
          if (!error) e.target.style.borderColor = 'var(--border2)';
        }}
      />
      {error && (
        <span
          style={{
            fontSize: '12px',
            color: '#c0392b',
            fontFamily: "'Cairo', sans-serif",
          }}
        >
          {error}
        </span>
      )}
    </div>
  );
}
