import { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useT } from '../hooks/useT';
import { useSettingsStore } from '../store/settingsStore';

function parseJwtPayload(token) {
  if (!token) return null;
  try {
    return JSON.parse(decodeURIComponent(escape(atob(token.split('.')[1]))));
  } catch {
    return null;
  }
}

const NAV_GROUPS = [
  {
    labelKey: 'nav.group.main',
    items: [
      { to: '/',               icon: '⊞', key: 'nav.dashboard' },
      { to: '/notifications',  icon: '◎', key: 'nav.notifications', badge: true },
    ],
  },
  {
    labelKey: 'nav.group.ops',
    items: [
      { to: '/inventory',   icon: '▤', key: 'nav.inventory' },
      { to: '/requests',    icon: '↗', key: 'nav.requests' },
      { to: '/transfers',   icon: '⇄', key: 'nav.transfers' },
      { to: '/shipments',   icon: '⊡', key: 'nav.shipments' },
      { to: '/returns',     icon: '↩', key: 'nav.returns' },
    ],
  },
  {
    labelKey: 'nav.group.admin',
    adminOnly: true,
    items: [
      { to: '/settings/users',      icon: '●', key: 'nav.users' },
      { to: '/settings/branches',   icon: '◈', key: 'nav.branches' },
      { to: '/settings/warehouses', icon: '▣', key: 'nav.warehouses' },
      { to: '/settings/products',   icon: '◧', key: 'nav.products' },
      { to: '/settings/categories', icon: '◨', key: 'nav.categories' },
      { to: '/reports',             icon: '▦', key: 'nav.reports' },
    ],
  },
];

function Clock() {
  const [time, setTime] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    };
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span style={{ fontSize: '13px', color: 'var(--dim)', fontVariantNumeric: 'tabular-nums' }}>
      {time}
    </span>
  );
}

export default function Sidebar({ onOpenSettings, isRtl = true }) {
  const t = useT();
  const location = useLocation();
  const navigate = useNavigate();
  const { sidebarWidth, sidebarCollapsible, showClock, setSidebarWidth } = useSettingsStore();

  const [width, setWidth] = useState(sidebarWidth);
  const widthRef = useRef(width);
  widthRef.current = width;

  const collapsed = sidebarCollapsible && width < 200;
  const renderWidth = collapsed ? 56 : width;

  const token = localStorage.getItem('access_token');
  const payload = parseJwtPayload(token);
  const role = payload?.role || 'worker';
  const nameAr = payload?.name_ar || '';
  const avatarLetter = nameAr.charAt(0) || '?';

  const isAdminRole = ['owner', 'admin'].includes(role);

  const handleLogout = async () => {
    const accessToken = localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');
    try {
      await axios.post('/api/auth/logout',
        { refresh_token: refreshToken },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
    } catch {
      // proceed regardless
    } finally {
      localStorage.clear();
      navigate('/login');
    }
  };

  // Drag to resize — delta direction depends on which side the sidebar is on
  const handleDragStart = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = widthRef.current;

    const onMove = (ev) => {
      const delta = isRtl ? startX - ev.clientX : ev.clientX - startX;
      const next = Math.max(180, Math.min(320, startW + delta));
      setWidth(next);
    };

    const onUp = () => {
      setSidebarWidth(widthRef.current);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const groupLabelStyle = {
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--dim)',
    letterSpacing: '0.08em',
    padding: '16px 12px 6px',
    textTransform: 'uppercase',
  };

  const footerBtnBase = {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: collapsed ? 'center' : 'flex-start',
    gap: '8px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    borderRadius: '8px',
    fontFamily: "'Cairo', sans-serif",
    transition: 'background 0.15s, color 0.15s',
  };

  return (
    <div
      style={{
        width: renderWidth,
        flexShrink: 0,
        height: '100%',
        background: 'var(--sidebar-bg)',
        ...(isRtl
          ? { borderLeft: '1px solid var(--sidebar-border)' }
          : { borderRight: '1px solid var(--sidebar-border)' }),
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        transition: 'width 0.2s cubic-bezier(0.22,1,0.36,1)',
      }}
    >
      {/* Drag handle — inner edge */}
      <div
        style={{
          position: 'absolute',
          ...(isRtl ? { left: 0 } : { right: 0 }),
          top: 0,
          width: '4px',
          height: '100%',
          cursor: 'col-resize',
          zIndex: 10,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.opacity = '0.4'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = ''; e.currentTarget.style.opacity = ''; }}
        onMouseDown={handleDragStart}
      />

      {/* Logo */}
      <div style={{ padding: collapsed ? '20px 0' : '20px 16px', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', borderBottom: '1px solid var(--sidebar-border)', flexShrink: 0 }}>
        <span style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text)' }}>
          {collapsed ? 'ر' : t('app.name')}
        </span>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '8px' }}>
        {NAV_GROUPS.map((group) => {
          if (group.adminOnly && !isAdminRole) return null;
          return (
            <div key={group.labelKey}>
              {!collapsed && (
                <div style={groupLabelStyle}>{t(group.labelKey)}</div>
              )}
              {group.items.map((item) => {
                const isActive = item.to === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.to);
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    title={collapsed ? t(item.key) : undefined}
                    className={`nav-item ${isActive ? 'active' : ''} ${collapsed ? 'collapsed' : ''}`}
                    style={{
                      textDecoration: 'none',
                      display: 'flex',
                      // Override CSS border-right for LTR active state
                      ...(isActive && !isRtl
                        ? { borderRight: 'none', borderLeft: '2px solid var(--accent)' }
                        : {}),
                    }}
                  >
                    <span style={{ fontSize: '16px', flexShrink: 0, width: collapsed ? undefined : '20px', textAlign: 'center' }}>
                      {item.icon}
                    </span>
                    {!collapsed && (
                      <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {t(item.key)}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ flexShrink: 0, borderTop: '1px solid var(--sidebar-border)', padding: collapsed ? '12px 0' : '12px' }}>
        {showClock && !collapsed && (
          <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'center' }}>
            <Clock />
          </div>
        )}

        {/* User info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: collapsed ? 'center' : 'flex-start' }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'var(--accent)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '14px', fontWeight: 700, flexShrink: 0,
          }}>
            {avatarLetter}
          </div>
          {!collapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {nameAr}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--dim)' }}>
                {t(`role.${role}`)}
              </div>
            </div>
          )}
        </div>

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          title={t('nav.settings')}
          style={{
            ...footerBtnBase,
            marginTop: '10px',
            padding: collapsed ? '8px 0' : '8px 10px',
            color: 'var(--dim)',
            fontSize: '14px',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--btn-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
        >
          <span style={{ fontSize: '16px' }}>⚙</span>
          {!collapsed && <span>{t('nav.settings')}</span>}
        </button>

        {/* Logout button */}
        <button
          onClick={handleLogout}
          title={t('action.logout')}
          style={{
            ...footerBtnBase,
            marginTop: '4px',
            padding: collapsed ? '6px 0' : '6px 10px',
            color: 'var(--muted)',
            fontSize: '13px',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--muted)')}
        >
          <span style={{ fontSize: '14px' }}>↪</span>
          {!collapsed && <span>{t('action.logout')}</span>}
        </button>
      </div>
    </div>
  );
}
