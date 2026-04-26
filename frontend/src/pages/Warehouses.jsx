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

function parseJwtPayload() {
  const token = localStorage.getItem('access_token');
  if (!token) return {};
  try {
    return JSON.parse(decodeURIComponent(escape(atob(token.split('.')[1]))));
  } catch { return {}; }
}

// ── Warehouse form ─────────────────────────────────────────────────
function WarehouseForm({ warehouse, stores, onSave, onClose, showToast, t }) {
  const isEdit = !!warehouse;
  const [name, setName]     = useState(warehouse?.name    || '');
  const [nameEn, setNameEn] = useState(warehouse?.name_en || '');
  const [storeId, setStoreId] = useState(
    warehouse?.store_id != null ? String(warehouse.store_id) : (stores[0] ? String(stores[0].id) : '')
  );
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState({});

  const validate = () => {
    const e = {};
    if (!name.trim())   e.name   = true;
    if (!nameEn.trim()) e.nameEn = true;
    if (!storeId)       e.storeId = true;
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoading(true);
    try {
      if (isEdit) {
        await api.put(`/warehouses/${warehouse.id}`, { name, name_en: nameEn });
      } else {
        await api.post('/warehouses', { name, name_en: nameEn, store_id: storeId });
      }
      onSave();
    } catch (err) {
      showToast(err.response?.data?.error?.ar || t('toast.error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <Input
        label={t('warehouse.name_ar')}
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name ? t('common.required') : ''}
      />
      <Input
        label={t('warehouse.name_en')}
        value={nameEn}
        onChange={(e) => setNameEn(e.target.value)}
        error={errors.nameEn ? t('common.required') : ''}
      />
      <div>
        <label
          style={{
            display: 'block',
            fontSize: '13px',
            color: 'var(--muted)',
            marginBottom: '6px',
            fontFamily: "'Cairo', sans-serif",
          }}
        >
          {t('label.branch')}
        </label>
        <select
          disabled={isEdit}
          value={storeId}
          onChange={(e) => setStoreId(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            background: isEdit ? 'var(--bg)' : 'var(--bg2)',
            border: `0.5px solid ${errors.storeId ? '#c0392b' : 'var(--border2)'}`,
            borderRadius: '6px',
            color: isEdit ? 'var(--muted)' : 'var(--text)',
            fontFamily: "'Cairo', sans-serif",
            fontSize: '14px',
            cursor: isEdit ? 'not-allowed' : 'pointer',
            outline: 'none',
          }}
        >
          {stores.map((s) => (
            <option key={s.id} value={String(s.id)}>{s.name}</option>
          ))}
        </select>
        {errors.storeId && (
          <span style={{ fontSize: '12px', color: '#c0392b', fontFamily: "'Cairo', sans-serif", marginTop: '4px', display: 'block' }}>
            {t('common.required')}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px', direction: 'ltr' }}>
        <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant="primary" loading={loading} onClick={handleSubmit}>{t('common.save')}</Button>
      </div>
    </div>
  );
}

// ── Archive confirmation ───────────────────────────────────────────
function ArchiveConfirm({ onConfirm, onClose, loading, t }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <p style={{ fontSize: '14px', color: 'var(--text)', fontFamily: "'Cairo', sans-serif", margin: 0 }}>
        {t('warehouse.archive.confirm')}
      </p>
      <div
        style={{
          background: 'rgba(239,68,68,0.08)',
          border: '0.5px solid rgba(239,68,68,0.3)',
          borderRadius: '8px',
          padding: '10px 14px',
          fontSize: '13px',
          color: 'var(--text)',
          fontFamily: "'Cairo', sans-serif",
        }}
      >
        {t('warehouse.archive.warning')}
      </div>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', direction: 'ltr' }}>
        <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant="danger" loading={loading} onClick={onConfirm}>{t('common.archive')}</Button>
      </div>
    </div>
  );
}

// ── Warehouse row card ─────────────────────────────────────────────
function WarehouseCard({ warehouse, isAdmin, onEdit, onLock, onArchive, t }) {
  const { locked, archived } = warehouse;
  return (
    <div
      style={{
        background: 'var(--bg)',
        border: '0.5px solid var(--border)',
        borderRadius: '8px',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        opacity: archived ? 0.55 : 1,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text)', fontFamily: "'Cairo', sans-serif" }}>
          {warehouse.name}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px', fontFamily: "'Cairo', sans-serif" }}>
          {warehouse.name_en}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {archived ? (
          <Badge color="gray" label={t('badge.archived')} />
        ) : locked ? (
          <Badge color="red" label={t('badge.locked')} />
        ) : (
          <Badge color="green" label={t('badge.active')} />
        )}

        {isAdmin && !archived && (
          <>
            <Button variant="ghost" size="sm" onClick={() => onEdit(warehouse)}>
              {t('common.edit')}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onLock(warehouse)}>
              {locked ? t('warehouse.unlock') : t('warehouse.lock')}
            </Button>
            <Button variant="danger" size="sm" onClick={() => onArchive(warehouse)}>
              {t('common.archive')}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Store group with header ────────────────────────────────────────
function StoreGroup({ store, warehouses, isAdmin, onEdit, onLock, onArchive, t }) {
  const colorHex = BRANCH_COLORS[store.color] || '#888';
  return (
    <div style={{ marginBottom: '28px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '12px',
          paddingRight: '12px',
          borderRight: `4px solid ${colorHex}`,
        }}
      >
        <span style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text)', fontFamily: "'Cairo', sans-serif" }}>
          {store.name}
        </span>
        <span style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: "'Cairo', sans-serif" }}>
          {store.name_en}
        </span>
        <span
          style={{
            marginRight: 'auto',
            fontSize: '12px',
            color: 'var(--muted)',
            background: 'var(--bg2)',
            border: '0.5px solid var(--border)',
            borderRadius: '20px',
            padding: '2px 10px',
            fontFamily: "'Cairo', sans-serif",
          }}
        >
          {warehouses.length}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {warehouses.length === 0 ? (
          <div style={{ fontSize: '13px', color: 'var(--muted)', padding: '10px 4px', fontFamily: "'Cairo', sans-serif" }}>
            {t('common.no_data')}
          </div>
        ) : (
          warehouses.map((wh) => (
            <WarehouseCard
              key={wh.id}
              warehouse={wh}
              isAdmin={isAdmin}
              onEdit={onEdit}
              onLock={onLock}
              onArchive={onArchive}
              t={t}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────
export default function Warehouses() {
  const t = useT();
  const { role } = parseJwtPayload();
  const isAdmin = ['owner', 'admin'].includes(role);

  const [stores, setStores]       = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filterStoreId, setFilterStoreId] = useState('');
  const [showArchived, setShowArchived]   = useState(false);

  const [createOpen, setCreateOpen]     = useState(false);
  const [editWarehouse, setEditWarehouse] = useState(null);
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [archiving, setArchiving]         = useState(false);

  const { toasts, showToast } = useToast();

  useEffect(() => {
    api.get('/stores/public').then((res) => setStores(res.data)).catch(() => {});
  }, []);

  const fetchWarehouses = useCallback(async () => {
    setLoading(true);
    try {
      const url = filterStoreId ? `/warehouses?store_id=${filterStoreId}` : '/warehouses';
      const res = await api.get(url);
      setWarehouses(res.data.data || []);
    } catch {
      showToast(t('error.server'), 'error');
    } finally {
      setLoading(false);
    }
  }, [filterStoreId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchWarehouses(); }, [fetchWarehouses]);

  const handleLock = async (wh) => {
    try {
      const res = await api.put(`/warehouses/${wh.id}/lock`);
      const updated = res.data.data;
      setWarehouses((prev) => prev.map((w) => (w.id === wh.id ? updated : w)));
      showToast(updated.locked ? t('warehouse.toast.locked') : t('warehouse.toast.unlocked'), 'success');
    } catch (err) {
      showToast(err.response?.data?.error?.ar || t('toast.error'), 'error');
    }
  };

  const handleArchiveConfirm = async () => {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      await api.put(`/warehouses/${archiveTarget.id}/archive`);
      showToast(t('warehouse.toast.archived'), 'success');
      setArchiveTarget(null);
      fetchWarehouses();
    } catch (err) {
      showToast(err.response?.data?.error?.ar || t('toast.error'), 'error');
    } finally {
      setArchiving(false);
    }
  };

  const visible = showArchived ? warehouses : warehouses.filter((w) => !w.archived);

  const groups = stores
    .map((s) => ({ store: s, warehouses: visible.filter((w) => String(w.store_id) === String(s.id)) }))
    .filter(({ store, warehouses: whs }) => {
      if (filterStoreId) return String(store.id) === String(filterStoreId);
      return isAdmin || whs.length > 0;
    });

  return (
    <>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <select
          value={filterStoreId}
          onChange={(e) => setFilterStoreId(e.target.value)}
          style={{
            padding: '7px 12px',
            background: 'var(--bg2)',
            border: '0.5px solid var(--border2)',
            borderRadius: '6px',
            color: 'var(--text)',
            fontFamily: "'Cairo', sans-serif",
            fontSize: '14px',
            cursor: 'pointer',
            minWidth: '160px',
            outline: 'none',
          }}
        >
          <option value="">{t('presence.all_branches')}</option>
          {stores.map((s) => (
            <option key={s.id} value={String(s.id)}>{s.name}</option>
          ))}
        </select>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            fontFamily: "'Cairo', sans-serif",
            fontSize: '14px',
            color: 'var(--text)',
            userSelect: 'none',
          }}
        >
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          {t('warehouse.show_archived')}
        </label>

        <div style={{ flex: 1 }} />

        {isAdmin && (
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            {t('warehouse.create')}
          </Button>
        )}
      </div>

      {/* Groups */}
      {loading ? (
        <div style={{ color: 'var(--muted)', fontSize: '14px', fontFamily: "'Cairo', sans-serif" }}>
          {t('common.loading')}
        </div>
      ) : groups.length === 0 ? (
        <div style={{ color: 'var(--muted)', fontSize: '14px', fontFamily: "'Cairo', sans-serif" }}>
          {t('common.no_data')}
        </div>
      ) : (
        groups.map(({ store, warehouses: whs }) => (
          <StoreGroup
            key={store.id}
            store={store}
            warehouses={whs}
            isAdmin={isAdmin}
            onEdit={setEditWarehouse}
            onLock={handleLock}
            onArchive={setArchiveTarget}
            t={t}
          />
        ))
      )}

      {/* Create modal */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title={t('warehouse.create')} size="md">
        <WarehouseForm
          warehouse={null}
          stores={stores}
          showToast={showToast}
          t={t}
          onClose={() => setCreateOpen(false)}
          onSave={() => { setCreateOpen(false); showToast(t('warehouse.toast.created'), 'success'); fetchWarehouses(); }}
        />
      </Modal>

      {/* Edit modal */}
      <Modal isOpen={!!editWarehouse} onClose={() => setEditWarehouse(null)} title={t('warehouse.edit')} size="md">
        {editWarehouse && (
          <WarehouseForm
            warehouse={editWarehouse}
            stores={stores}
            showToast={showToast}
            t={t}
            onClose={() => setEditWarehouse(null)}
            onSave={() => { setEditWarehouse(null); showToast(t('warehouse.toast.updated'), 'success'); fetchWarehouses(); }}
          />
        )}
      </Modal>

      {/* Archive confirmation */}
      <Modal isOpen={!!archiveTarget} onClose={() => setArchiveTarget(null)} title={t('warehouse.archive')} size="sm">
        {archiveTarget && (
          <ArchiveConfirm
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
