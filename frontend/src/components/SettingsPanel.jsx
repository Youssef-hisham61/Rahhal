import { useTranslation } from 'react-i18next';
import { useT } from '../hooks/useT';
import { useSettingsStore } from '../store/settingsStore';

const BG_SWATCHES = [
  { label: 'غامق',  color: '#0a0a0a', dark: true },
  { label: 'ليلي',  color: '#0d1117', dark: true },
  { label: 'دافئ',  color: '#14120f', dark: true },
  { label: 'كريمي', color: '#f0ead8', dark: false },
  { label: 'أبيض',  color: '#ffffff', dark: false },
];

const SIDEBAR_SWATCHES = [
  '#e8e0cc',
  '#0a0a0a',
  '#1a1a2e',
  '#1a2e1a',
];

function Toggle({ on, onToggle }) {
  return (
    <div className={`toggle-track ${on ? 'on' : ''}`} onClick={onToggle} role="switch" aria-checked={on}>
      <div className="toggle-thumb" />
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '28px' }}>
      <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '14px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
      <span style={{ fontSize: '14px', color: 'var(--text)', flexShrink: 0 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>{children}</div>
    </div>
  );
}

export default function SettingsPanel({ isOpen, onClose }) {
  const t = useT();
  const { i18n } = useTranslation();
  const arT = (key) => i18n.getFixedT('ar')(key);
  const {
    theme, bgColor, accentHue, sidebarColor,
    density, fontSize, language, numberFormat,
    showClock, rowHover, sidebarCollapsible,
    setTheme, setAccentHue, setSidebarColor,
    setDensity, setFontSize, setLanguage, setNumberFormat,
    toggleShowClock, toggleRowHover, toggleSidebarCollapsible,
  } = useSettingsStore();

  const optionBtn = (active) => ({
    padding: '6px 14px',
    fontSize: '13px',
    borderRadius: '6px',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    background: active ? 'var(--accent)' : 'transparent',
    color: active ? '#fff' : 'var(--muted)',
    cursor: 'pointer',
    fontFamily: "'Cairo', sans-serif",
    transition: 'all 0.15s',
  });

  return (
    <>
      {isOpen && <div className="settings-overlay" onClick={onClose} />}

      <div className={`settings-panel ${isOpen ? 'open' : ''}`}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>{t('settings.title')}</span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--dim)', padding: '4px', borderRadius: '6px', lineHeight: 1 }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--btn-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>

          {/* ── Appearance ── */}
          <Section title={t('settings.appearance')}>
            {/* Background */}
            <div>
              <div style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '10px' }}>{t('settings.bg')}</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {BG_SWATCHES.map((sw) => {
                  const active = bgColor === sw.color || (!bgColor && sw.color === '#f0ead8' && theme === 'cream') || (!bgColor && sw.color === '#0a0a0a' && theme === 'dark');
                  return (
                    <button
                      key={sw.color}
                      onClick={() => setTheme(sw.dark ? 'dark' : 'cream', sw.color)}
                      title={sw.label}
                      style={{
                        width: 28, height: 28,
                        borderRadius: '50%',
                        background: sw.color,
                        border: active ? '2px solid var(--accent)' : '2px solid var(--border)',
                        cursor: 'pointer',
                        outline: active ? '2px solid var(--accent)' : 'none',
                        outlineOffset: '2px',
                        transition: 'outline 0.15s',
                      }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Accent hue */}
            <div>
              <div style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '10px' }}>{t('settings.accent')}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="range" min={0} max={360} value={accentHue}
                  onChange={(e) => setAccentHue(Number(e.target.value))}
                  style={{ flex: 1, accentColor: `hsl(${accentHue}, 55%, 30%)` }}
                />
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: `hsl(${accentHue}, 55%, 30%)`, flexShrink: 0, border: '1px solid var(--border)' }} />
              </div>
            </div>

            {/* Sidebar color */}
            <div>
              <div style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '10px' }}>{t('settings.sidebar_color')}</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {SIDEBAR_SWATCHES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setSidebarColor(c)}
                    style={{
                      width: 28, height: 28,
                      borderRadius: '50%',
                      background: c,
                      border: sidebarColor === c ? '2px solid var(--accent)' : '2px solid var(--border)',
                      cursor: 'pointer',
                      outline: sidebarColor === c ? '2px solid var(--accent)' : 'none',
                      outlineOffset: '2px',
                    }}
                  />
                ))}
              </div>
            </div>
          </Section>

          {/* ── Density & Size ── */}
          <Section title={t('settings.density')}>
            <Row label={t('settings.density_label')}>
              <div style={{ display: 'flex', gap: '4px' }}>
                {['compact', 'normal', 'comfortable'].map((d) => (
                  <button key={d} style={optionBtn(density === d)} onClick={() => setDensity(d)}>
                    {t(`settings.${d}`)}
                  </button>
                ))}
              </div>
            </Row>

            <div>
              <div style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '8px' }}>
                {t('settings.font_size')} — {fontSize}px
              </div>
              <input
                type="range" min={13} max={19} value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent)' }}
              />
              <div style={{ fontSize: `${fontSize}px`, color: 'var(--text)', marginTop: '10px', padding: '8px 12px', background: 'var(--bg)', borderRadius: '6px', border: '1px solid var(--border)', direction: 'rtl' }}>
                {arT('app.name')} — {arT('nav.inventory')}
              </div>
            </div>
          </Section>

          {/* ── Language & Numbers ── */}
          <Section title={t('settings.language')}>
            <Row label={t('settings.language_label')}>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[['ar', 'عربي'], ['en', 'English'], ['bi', 'ع·EN']].map(([val, lbl]) => (
                  <button key={val} style={optionBtn(language === val)} onClick={() => setLanguage(val)}>
                    {lbl}
                  </button>
                ))}
              </div>
            </Row>

            <Row label={t('settings.numbers')}>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button style={optionBtn(numberFormat === 'arabic')} onClick={() => setNumberFormat('arabic')}>٠١٢٣</button>
                <button style={optionBtn(numberFormat === 'western')} onClick={() => setNumberFormat('western')}>0123</button>
              </div>
            </Row>
          </Section>

          {/* ── Preferences ── */}
          <Section title={t('settings.prefs')}>
            <Row label={t('settings.clock')}>
              <Toggle on={showClock} onToggle={toggleShowClock} />
            </Row>
            <Row label={t('settings.row_hover')}>
              <Toggle on={rowHover} onToggle={toggleRowHover} />
            </Row>
            <Row label={t('settings.collapsible')}>
              <Toggle on={sidebarCollapsible} onToggle={toggleSidebarCollapsible} />
            </Row>
          </Section>

        </div>
      </div>
    </>
  );
}
