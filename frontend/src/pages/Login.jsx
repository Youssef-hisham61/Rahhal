import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { useSettingsStore } from '../store/settingsStore';

const BRANCH_COLORS = { green: '#22c55e', orange: '#f97316', blue: '#3b82f6' };

const LANG_OPTIONS = [
  { value: 'ar',  label: 'عربي' },
  { value: 'en',  label: 'EN' },
  { value: 'bi',  label: 'ع·EN' },
];

function getScreenSize() {
  if (window.innerWidth <= 768) return 'mobile';
  if (window.innerWidth <= 1100) return 'tablet';
  return 'desktop';
}

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { theme, language, setTheme, setLanguage } = useSettingsStore();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [shakeKey, setShakeKey] = useState(0);
  const [shaking, setShaking]   = useState(false);
  const [branches, setBranches] = useState([]);
  const [screen, setScreen]     = useState(getScreenSize);

  useEffect(() => {
    const onResize = () => setScreen(getScreenSize());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    axios.get('/api/stores/public').then((r) => setBranches(r.data)).catch(() => {});
  }, []);

  const triggerShake = () => {
    setShaking(true);
    setShakeKey((k) => k + 1);
    setTimeout(() => setShaking(false), 500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('/api/auth/login', { email, password });
      localStorage.setItem('access_token', res.data.access_token);
      localStorage.setItem('refresh_token', res.data.refresh_token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      navigate('/');
    } catch {
      setError(t('login.error'));
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = () => setTheme(theme === 'cream' ? 'dark' : 'cream');

  // ── Grid columns ──────────────────────────────────────────────
  const gridCols = screen === 'mobile' ? '1fr' : screen === 'tablet' ? '1fr 360px' : '1fr 420px';
  const gridRows = screen === 'mobile' ? 'auto 1fr' : undefined;

  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    fontSize: 'clamp(14px, 0.9vw, 16px)',
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--text)',
    outline: 'none',
    transition: 'border-color 0.2s',
    fontFamily: "'Cairo', sans-serif",
    direction: 'ltr',
  };

  const labelStyle = {
    display: 'block',
    fontSize: 'clamp(12px, 0.8vw, 15px)',
    color: 'var(--muted)',
    marginBottom: '6px',
    direction: 'rtl',
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: gridCols,
        gridTemplateRows: gridRows,
        minHeight: '100vh',
        width: '100%',
      }}
    >
      {/* ══ HERO ══════════════════════════════════════════════════ */}
      <div
        style={{
          position: 'relative',
          background: 'var(--bg)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: screen === 'mobile' ? '40px 28px' : 'clamp(48px, 6vw, 80px)',
          overflow: 'hidden',
          direction: 'rtl',
        }}
      >
        {/* Watermark */}
        <span
          style={{
            position: 'absolute',
            bottom: '-60px',
            right: '-20px',
            fontSize: 'clamp(300px, 38vw, 560px)',
            fontWeight: 900,
            color: 'var(--watermark)',
            lineHeight: 1,
            pointerEvents: 'none',
            userSelect: 'none',
            zIndex: 0,
          }}
        >
          ر
        </span>

        {/* Brand */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div
            className="animate-slide-right"
            style={{
              fontSize: screen === 'mobile' ? 'clamp(64px, 18vw, 96px)' : 'clamp(100px, 13vw, 200px)',
              fontWeight: 900,
              fontFamily: "'Cairo', sans-serif",
              color: 'var(--text)',
              lineHeight: 1,
              letterSpacing: '-4px',
              textAlign: 'right',
              animationDelay: '0.08s',
            }}
          >
            {t('app.name')}
          </div>
          <div
            className="animate-slide-right"
            style={{
              fontSize: 'clamp(14px, 1.2vw, 20px)',
              letterSpacing: '0.22em',
              color: 'var(--muted)',
              marginTop: '20px',
              textAlign: 'right',
              animationDelay: '0.20s',
            }}
          >
            {t('login.subtitle_en')}
          </div>
        </div>

        {/* Branch list */}
        <div className="animate-slide-right" style={{ position: 'relative', zIndex: 1, animationDelay: '0.32s' }}>
          {branches.length > 0 && (
            <>
              <div
                style={{
                  width: '40px',
                  height: '0.5px',
                  background: 'var(--border2)',
                  marginBottom: '16px',
                }}
              />
              <div
                style={{
                  display: 'flex',
                  flexDirection: screen === 'mobile' ? 'row' : 'column',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                {branches.map((b) => (
                  <div
                    key={b.id}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: BRANCH_COLORS[b.color] || '#888',
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 'clamp(13px, 1vw, 16px)',
                        color: 'var(--branch-name)',
                      }}
                    >
                      {b.name}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ══ FORM SIDE ═════════════════════════════════════════════ */}
      <div
        style={{
          background: 'var(--bg2)',
          borderRight: screen === 'mobile' ? 'none' : '0.5px solid var(--border)',
          borderTop: screen === 'mobile' ? '0.5px solid var(--border)' : 'none',
          padding: `clamp(40px, 5vh, 80px) clamp(36px, 4vw, 72px)`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          direction: 'rtl',
        }}
      >
        {/* ── Top controls ── */}
        <div
          className="animate-slide-in"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 'clamp(32px, 4vh, 56px)',
            animationDelay: '0.12s',
          }}
        >
          {/* Lang toggle — right in RTL */}
          <div
            style={{
              display: 'flex',
              gap: '2px',
              background: 'var(--bg)',
              borderRadius: '8px',
              padding: '3px',
              border: '0.5px solid var(--border2)',
            }}
          >
            {LANG_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setLanguage(opt.value)}
                style={{
                  padding: '4px 10px',
                  fontSize: '13px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: "'Cairo', sans-serif",
                  background: language === opt.value ? 'var(--accent)' : 'transparent',
                  color: language === opt.value ? '#fff' : 'var(--muted)',
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Theme toggle pill — left in RTL */}
          <div
            onClick={toggleTheme}
            role="switch"
            aria-checked={theme === 'dark'}
            style={{
              width: '36px',
              height: '20px',
              borderRadius: '10px',
              background: theme === 'dark' ? 'var(--accent)' : 'var(--border2)',
              position: 'relative',
              cursor: 'pointer',
              transition: 'background 0.2s',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '3px',
                left: '3px',
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                background: '#fff',
                transition: 'transform 0.2s',
                transform: theme === 'dark' ? 'translateX(16px)' : 'translateX(0)',
              }}
            />
          </div>
        </div>

        {/* ── Heading ── */}
        <div>
          <h1
            className="animate-slide-up"
            style={{
              fontSize: 'clamp(24px, 2.5vw, 40px)',
              fontWeight: 700,
              color: 'var(--text)',
              lineHeight: 1.2,
              animationDelay: '0.24s',
            }}
          >
            {t('login.welcome')}
          </h1>
          <p
            className="animate-slide-up"
            style={{
              fontSize: 'clamp(13px, 1vw, 17px)',
              color: 'var(--dim)',
              marginTop: '8px',
              animationDelay: '0.30s',
            }}
          >
            {t('login.subtitle')}
          </p>
        </div>

        {/* ── Form ── */}
        <form
          key={shakeKey}
          onSubmit={handleSubmit}
          className={shaking ? 'animate-shake' : ''}
          style={{
            marginTop: '32px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
        >
          {/* Email */}
          <div className="animate-slide-up" style={{ animationDelay: '0.36s' }}>
            <label style={labelStyle}>{t('login.email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = 'var(--focus)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>

          {/* Password */}
          <div className="animate-slide-up" style={{ animationDelay: '0.42s' }}>
            <label style={labelStyle}>{t('login.password')}</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={{ ...inputStyle, paddingLeft: '52px' }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--focus)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--dim)',
                  fontSize: '13px',
                  fontFamily: "'Cairo', sans-serif",
                  padding: '2px 4px',
                  whiteSpace: 'nowrap',
                }}
              >
                {showPass ? t('login.hide') : t('login.show')}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                fontSize: '13px',
                color: '#e05555',
                background: 'rgba(224,85,85,0.08)',
                border: '1px solid rgba(224,85,85,0.2)',
                borderRadius: '8px',
                padding: '10px 14px',
              }}
            >
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="animate-slide-up"
            style={{
              width: '100%',
              padding: '13px',
              fontSize: 'clamp(14px, 0.9vw, 16px)',
              fontWeight: 600,
              fontFamily: "'Cairo', sans-serif",
              background: loading ? 'var(--dim)' : 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
              marginTop: '4px',
              animationDelay: '0.48s',
            }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = 'var(--accent-hover)'; }}
            onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = 'var(--accent)'; }}
          >
            {loading ? '...' : t('login.submit')}
          </button>
        </form>

        {/* ── Footer ── */}
        <p
          className="animate-slide-up"
          style={{
            fontSize: 'clamp(12px, 0.75vw, 14px)',
            color: 'var(--foot)',
            textAlign: 'center',
            marginTop: '28px',
            animationDelay: '0.54s',
          }}
        >
          {t('login.footer')}
        </p>
      </div>
    </div>
  );
}
