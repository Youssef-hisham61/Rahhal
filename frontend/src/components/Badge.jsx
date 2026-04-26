const COLOR_MAP = {
  green:  '#22c55e',
  orange: '#f97316',
  blue:   '#3b82f6',
  red:    '#c0392b',
  gray:   '#9ca3af',
};

export default function Badge({ color = 'gray', label }) {
  const hex = COLOR_MAP[color] || COLOR_MAP.gray;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        direction: 'rtl',
        fontFamily: "'Cairo', sans-serif",
      }}
    >
      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
        {label}
      </span>
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: hex,
          flexShrink: 0,
        }}
      />
    </span>
  );
}
