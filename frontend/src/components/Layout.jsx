import { useState } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import Sidebar from './Sidebar';
import SettingsPanel from './SettingsPanel';

export default function Layout({ children, title = '' }) {
  const { density } = useSettingsStore();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    // direction:'ltr' on the flex container fixes item ordering (main=left, sidebar=right)
    // regardless of document.dir. Content inside uses direction:'rtl' via the inner div.
    <div
      data-density={density}
      style={{ display: 'flex', flexDirection: 'row', direction: 'ltr', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}
    >
      {/* Main content — always left */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, direction: 'rtl' }}>
        {/* Topbar */}
        <div style={{
          flexShrink: 0,
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg)',
          gap: '16px',
        }}>
          <h1 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)', flex: 1 }}>{title}</h1>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px', background: 'var(--bg)' }}>
          {children}
        </div>
      </div>

      {/* Sidebar — always right */}
      <Sidebar onOpenSettings={() => setSettingsOpen(true)} />

      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
