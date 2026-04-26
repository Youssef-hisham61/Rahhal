import { useState, useEffect, useCallback } from 'react';
import { useT } from '../hooks/useT';
import { useToast } from '../hooks/useToast';
import api from '../utils/api';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Input from '../components/Input';
import Badge from '../components/Badge';
import Toast from '../components/Toast';

const BRANCH_COLORS = { green: '#22c55e', orange: '#f97316', blue: '#3b82f6' };
const COLOR_OPTIONS = ['green', 'orange', 'blue'];

function getScreenSize() {
  if (window.innerWidth <= 768) return 'mobile';
  if (window.innerWidth <= 1100) return 'tablet';
  return 'desktop';
}

function parseJwtRole() {
  const token = localStorage.getItem('access_token');
  if (!token) return 'worker';
  try {
    return JSON.parse(decodeURIComponent(escape(atob(token.split('.')[1])))).role || 'worker';
  } catch { return 'worker'; }
}

// ── Color swatch picker ──────────────────────────────────────────
function ColorPicker({ value, onChange, usedColors, t }) {
  return (
    <div>
      <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '10px', fontFamily: "'Cairo', sans-serif" }}>
        {t('branches.color')}
      </div>
      <div style={{ display: 'flex', gap: '12px' }}>
        {COLOR_OPTIONS.map((c) => {
          const hex = BRANCH_COLORS[c];
          const used = usedColors.includes(c);
          const selected = value === c;
          return (
            <button
              key={c}
              type="button"
              disabled={used}
              onClick={() => !used && onChange(c)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 14px',
                borderRadius: '8px',
                border: selected ? `2px solid var(--accent)` : '1px solid var(--border2)',
                background: selected ? 'var(--btn-hover)' : 'transparent',
                cursor: used ? 'not-allowed' : 'pointer',
                opacity: used ? 0.4 : 1,
                transition: 'border 0.15s, background 0.15s',
                fontFamily: "'Cairo', sans-serif",
              }}
            >
              <span style={{ width: 28, height: 28, borderRadius: '50%', background: hex, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {selected && <span style={{ color: '#fff', fontSize: '14px', fontWeight: 700 }}>✓</span>}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{t(`branches.color.${c}`)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Create / Edit store form ─────────────────────────────────────
function StoreForm({ store, onSave, onClose, usedColors, showToast, t }) {
  const [name, setName]     = useState(store?.name    || '');
  const [nameEn, setNameEn] = useState(store?.name_en || '');
  const [color, setColor]   = useState(store?.color   || '');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState({});

  const validate = () => {
    const e = {};
    if (!name.trim())   e.name   = t('branches.name_ar');
    if (!nameEn.trim()) e.nameEn = t('branches.name_en');
    if (!color)         e.color  = t('branches.color');
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoading(true);
    try {
      if (store) {
        await api.patch(`/stores/${store.id}`, { name, name_en: nameEn, color });
      } else {
        await api.post('/stores', { name, name_en: nameEn, color });
      }
      onSave();
    } catch (err) {
      showToast(err.response?.data?.message_ar || t('toast.error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const colorsInUse = store
    ? usedColors.filter((c) => c !== store.color)
    : usedColors;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <Input
        label={t('branches.name_ar')}
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name ? t('common.required') : ''}
      />
      <Input
        label={t('branches.name_en')}
        value={nameEn}
        onChange={(e) => setNameEn(e.target.value)}
        error={errors.nameEn ? t('common.required') : ''}
      />
      <ColorPicker value={color} onChange={setColor} usedColors={colorsInUse} t={t} />
      {errors.color && (
        <span style={{ fontSize: '12px', color: '#c0392b', fontFamily: "'Cairo', sans-serif" }}>
          {t('common.required')}
        </span>
      )}
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px', direction: 'ltr' }}>
        <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant="primary" loading={loading} onClick={handleSubmit}>{t('common.save')}</Button>
      </div>
    </div>
  );
}

// ── Archive confirmation ─────────────────────────────────────────
function ArchiveModal({ store, affectedUsers, onConfirm, onClose, loading, t }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {affectedUsers.length > 0 ? (
        <>
          <div
            style={{
              background: 'rgba(249,115,22,0.08)',
              border: '0.5px solid rgba(249,115,22,0.3)',
              borderRadius: '8px',
              padding: '12px 14px',
              fontSize: '13px',
              color: 'var(--text)',
              fontFamily: "'Cairo', sans-serif",
            }}
          >
            {t('branches.affected_users', { count: affectedUsers.length })}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
            {affectedUsers.map((u) => (
              <div
                key={u.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 12px',
                  background: 'var(--bg)',
                  borderRadius: '6px',
                  border: '0.5px solid var(--border)',
                }}
              >
                <Badge
                  color={u.role === 'worker' ? 'orange' : 'gray'}
                  label={t(`role.${u.role}`)}
                />
                <span style={{ flex: 1, fontSize: '14px', fontWeight: 600, color: 'var(--text)', fontFamily: "'Cairo', sans-serif" }}>
                  {u.name_ar}
                </span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p style={{ fontSize: '14px', color: 'var(--text)', fontFamily: "'Cairo', sans-serif" }}>
          {t('branches.archive_confirm')}
        </p>
      )}

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px', direction: 'ltr' }}>
        <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant="danger" loading={loading} onClick={onConfirm}>{t('common.archive')}</Button>
      </div>
    </div>
  );
}

// ── Branch card ──────────────────────────────────────────────────
function BranchCard({ store, activeUserCount, isOwner, onEdit, onArchive, t }) {
  const colorHex = BRANCH_COLORS[store.color] || '#888';
  const archived = store.archived;

  return (
    <div
      style={{
        background: 'var(--bg2)',
        border: '0.5px solid var(--border2)',
        borderRight: `4px solid ${colorHex}`,
        borderRadius: '10px',
        padding: '20px',
        opacity: archived ? 0.5 : 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      {/* Names */}
      <div>
        <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)', fontFamily: "'Cairo', sans-serif" }}>
          {store.name}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '3px', fontFamily: "'Cairo', sans-serif" }}>
          {store.name_en}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
          <span style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text)', fontFamily: "'Cairo', sans-serif", lineHeight: 1 }}>
            {store.warehouse_count ?? 0}
          </span>
          <span style={{ fontSize: '12px', color: 'var(--dim)', fontFamily: "'Cairo', sans-serif" }}>
            {t('branches.warehouses_count')}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
          <span style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text)', fontFamily: "'Cairo', sans-serif", lineHeight: 1 }}>
            {activeUserCount}
          </span>
          <span style={{ fontSize: '12px', color: 'var(--dim)', fontFamily: "'Cairo', sans-serif" }}>
            {t('branches.users_count')}
          </span>
        </div>
      </div>

      {/* Actions (ownerOnly, only on non-archived) */}
      {isOwner && !archived && (
        <div style={{ display: 'flex', gap: '8px', direction: 'ltr' }}>
          <Button variant="ghost" size="sm" onClick={() => onEdit(store)}>{t('common.edit')}</Button>
          <Button variant="danger" size="sm" onClick={() => onArchive(store)}>{t('common.archive')}</Button>
        </div>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────
export default function Branches() {
  const t = useT();
  const role = parseJwtRole();
  const [screen, setScreen] = useState(getScreenSize);
  const [stores, setStores]           = useState([]);
  const [users, setUsers]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [createOpen, setCreateOpen]   = useState(false);
  const [editStore, setEditStore]     = useState(null);
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [archiving, setArchiving]     = useState(false);
  const { toasts, showToast } = useToast();

  useEffect(() => {
    const onResize = () => setScreen(getScreenSize());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [storesRes, usersRes] = await Promise.all([
        api.get('/stores'),
        api.get('/users'),
      ]);
      setStores(storesRes.data);
      setUsers(usersRes.data);
    } catch {
      showToast(t('error.server'), 'error');
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchData(); }, [fetchData]);

  // Owner-only gate
  if (role !== 'owner') {
    return (
      <div style={{ color: 'var(--muted)', fontSize: '14px', fontFamily: "'Cairo', sans-serif", padding: '8px 0' }}>
        {t('common.unauthorized')}
      </div>
    );
  }

  const isOwner = role === 'owner';
  const gridCols = screen === 'mobile' ? '1fr' : screen === 'tablet' ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)';

  // Colors already used by non-archived stores (for swatch disabling)
  const usedColors = stores.filter((s) => !s.archived).map((s) => s.color);

  // Active user count per store
  const userCountByStore = {};
  users.forEach((u) => {
    if (u.store_id && u.active) {
      userCountByStore[u.store_id] = (userCountByStore[u.store_id] || 0) + 1;
    }
  });

  // Affected users for archive confirmation
  const affectedUsers = archiveTarget
    ? users.filter((u) => u.store_id === archiveTarget.id && ['worker', 'viewer'].includes(u.role) && u.active)
    : [];

  const handleArchiveConfirm = async () => {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      await api.patch(`/stores/${archiveTarget.id}/archive`);
      showToast(t('toast.success'), 'success');
      setArchiveTarget(null);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message_ar || t('toast.error'), 'error');
    } finally {
      setArchiving(false);
    }
  };

  return (
    <>
      {/* Action row */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
        <Button variant="primary" onClick={() => setCreateOpen(true)}>
          {t('branches.add')}
        </Button>
      </div>

      {/* Loading */}
      {loading ? (
        <div style={{ color: 'var(--dim)', fontSize: '14px', fontFamily: "'Cairo', sans-serif" }}>
          {t('common.loading')}
        </div>
      ) : stores.length === 0 ? (
        <div style={{ color: 'var(--dim)', fontSize: '14px', fontFamily: "'Cairo', sans-serif" }}>
          {t('common.no_data')}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '16px' }}>
          {stores.map((store) => (
            <BranchCard
              key={store.id}
              store={store}
              activeUserCount={userCountByStore[store.id] || 0}
              isOwner={isOwner}
              onEdit={setEditStore}
              onArchive={setArchiveTarget}
              t={t}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title={t('branches.add')}
        size="md"
      >
        <StoreForm
          store={null}
          usedColors={usedColors}
          showToast={showToast}
          t={t}
          onClose={() => setCreateOpen(false)}
          onSave={() => { setCreateOpen(false); showToast(t('toast.success'), 'success'); fetchData(); }}
        />
      </Modal>

      {/* Edit modal */}
      <Modal
        isOpen={!!editStore}
        onClose={() => setEditStore(null)}
        title={t('branches.edit')}
        size="md"
      >
        {editStore && (
          <StoreForm
            store={editStore}
            usedColors={usedColors}
            showToast={showToast}
            t={t}
            onClose={() => setEditStore(null)}
            onSave={() => { setEditStore(null); showToast(t('toast.success'), 'success'); fetchData(); }}
          />
        )}
      </Modal>

      {/* Archive confirmation modal */}
      <Modal
        isOpen={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        title={t('branches.archive')}
        size="sm"
      >
        {archiveTarget && (
          <ArchiveModal
            store={archiveTarget}
            affectedUsers={affectedUsers}
            loading={archiving}
            t={t}
            onClose={() => setArchiveTarget(null)}
            onConfirm={handleArchiveConfirm}
          />
        )}
      </Modal>

      <Toast toasts={toasts} />
    </>
  );
}
