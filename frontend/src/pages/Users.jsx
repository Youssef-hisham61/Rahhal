import { useState, useEffect, useCallback, useRef } from 'react';
import { useT } from '../hooks/useT';
import { useSettingsStore } from '../store/settingsStore';
import { useToast } from '../hooks/useToast';
import api from '../utils/api';
import Button from '../components/Button';
import Drawer from '../components/Drawer';
import Modal from '../components/Modal';
import Input from '../components/Input';
import Badge from '../components/Badge';
import Toast from '../components/Toast';

const BRANCH_COLORS = { green: '#22c55e', orange: '#f97316', blue: '#3b82f6' };

const ROLE_BADGE_COLOR = { owner: 'blue', admin: 'blue', worker: 'orange', viewer: 'gray' };

function parseJwtPayload() {
  const token = localStorage.getItem('access_token');
  if (!token) return {};
  try {
    return JSON.parse(decodeURIComponent(escape(atob(token.split('.')[1]))));
  } catch { return {}; }
}

// ── Warehouse dropdown helper ────────────────────────────────────
async function fetchWarehousesFlat() {
  const storesRes = await api.get('/stores');
  const active = storesRes.data.filter((s) => !s.archived);
  const details = await Promise.all(active.map((s) => api.get(`/stores/${s.id}`)));
  return details.flatMap((res) =>
    (res.data.warehouses || [])
      .filter((w) => !w.archived)
      .map((w) => ({
        id: w.id,
        name: w.name,
        name_en: w.name_en,
        store_name: res.data.name,
        store_color: res.data.color,
      })),
  );
}

// ── Filter pill group ────────────────────────────────────────────
function PillGroup({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: '2px', background: 'var(--bg)', borderRadius: '8px', padding: '3px', border: '0.5px solid var(--border2)' }}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          style={{
            padding: '4px 12px',
            fontSize: '13px',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            fontFamily: "'Cairo', sans-serif",
            background: value === opt.value ? 'var(--accent)' : 'transparent',
            color: value === opt.value ? '#fff' : 'var(--muted)',
            transition: 'background 0.15s, color 0.15s',
            whiteSpace: 'nowrap',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ── User form (create + edit) ────────────────────────────────────
function UserForm({ user, warehouses, actorRole, onSave, onClose, showToast, t }) {
  const isEdit = !!user;
  const [nameAr, setNameAr]     = useState(user?.name_ar  || '');
  const [nameEn, setNameEn]     = useState(user?.name_en  || '');
  const [email, setEmail]       = useState(user?.email    || '');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showPwField, setShowPwField] = useState(false);
  const [selectedRole, setSelectedRole] = useState(user?.role || 'worker');
  const [warehouseId, setWarehouseId]   = useState(user?.warehouse_id || '');
  const [loading, setLoading]   = useState(false);
  const [errors, setErrors]     = useState({});

  const availableRoles = actorRole === 'owner'
    ? ['admin', 'worker', 'viewer']
    : ['worker', 'viewer'];

  const needsWarehouse = ['worker', 'viewer'].includes(isEdit ? user?.role : selectedRole);

  const validate = () => {
    const e = {};
    if (!nameAr.trim()) e.nameAr = t('common.required');
    if (!nameEn.trim()) e.nameEn = t('common.required');
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) e.email = t('common.required');
    if (!isEdit && (!password || password.length < 8)) e.password = t('users.password_min');
    if (!isEdit && needsWarehouse && !warehouseId) e.warehouseId = t('common.required');
    if (showPwField && password && password.length < 8) e.newPw = t('users.password_min');
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoading(true);
    try {
      if (isEdit) {
        const updates = {};
        if (nameAr !== user.name_ar) updates.name_ar = nameAr;
        if (nameEn !== user.name_en) updates.name_en = nameEn;
        if (email !== user.email)    updates.email   = email;
        if (Object.keys(updates).length) await api.patch(`/users/${user.id}`, updates);

        if (needsWarehouse && warehouseId && warehouseId !== user.warehouse_id) {
          await api.patch(`/users/${user.id}/warehouse`, { warehouse_id: warehouseId });
        }
        if (showPwField && password) {
          await api.patch(`/users/${user.id}/password`, { new_password: password });
        }
      } else {
        await api.post('/users', {
          name_ar: nameAr,
          name_en: nameEn,
          email,
          password,
          role: selectedRole,
          ...(needsWarehouse ? { warehouse_id: warehouseId } : {}),
        });
      }
      onSave();
    } catch (err) {
      showToast(err.response?.data?.message_ar || t('toast.error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const selectStyle = {
    width: '100%',
    background: 'transparent',
    border: '0.5px solid var(--border2)',
    borderRadius: '6px',
    padding: '10px 14px',
    fontSize: '14px',
    color: 'var(--text)',
    fontFamily: "'Cairo', sans-serif",
    outline: 'none',
    direction: 'rtl',
    cursor: 'pointer',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <Input
        label={t('users.name_ar')}
        value={nameAr}
        onChange={(e) => setNameAr(e.target.value)}
        error={errors.nameAr}
      />
      <Input
        label={t('users.name_en')}
        value={nameEn}
        onChange={(e) => setNameEn(e.target.value)}
        error={errors.nameEn}
      />
      <Input
        label={t('users.email')}
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errors.email}
        autoComplete="off"
      />

      {/* Password (create) or change link (edit) */}
      {!isEdit ? (
        <div style={{ position: 'relative' }}>
          <Input
            label={t('users.password')}
            type={showPass ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowPass((v) => !v)}
            style={{
              position: 'absolute',
              left: '12px',
              bottom: errors.password ? '24px' : '10px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--dim)',
              fontSize: '13px',
              fontFamily: "'Cairo', sans-serif",
            }}
          >
            {showPass ? t('login.hide') : t('login.show')}
          </button>
        </div>
      ) : (
        <div>
          {!showPwField ? (
            <button
              type="button"
              onClick={() => setShowPwField(true)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--accent)',
                fontSize: '13px',
                fontFamily: "'Cairo', sans-serif",
                padding: 0,
                textDecoration: 'underline',
              }}
            >
              {t('users.reset_password')}
            </button>
          ) : (
            <div style={{ position: 'relative' }}>
              <Input
                label={t('users.new_password')}
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.newPw}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                style={{
                  position: 'absolute',
                  left: '12px',
                  bottom: errors.newPw ? '24px' : '10px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--dim)',
                  fontSize: '13px',
                  fontFamily: "'Cairo', sans-serif",
                }}
              >
                {showPass ? t('login.hide') : t('login.show')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Role (only on create) */}
      {!isEdit && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: "'Cairo', sans-serif" }}>
            {t('users.role')}
          </label>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            style={selectStyle}
          >
            {availableRoles.map((r) => (
              <option key={r} value={r}>{t(`role.${r}`)}</option>
            ))}
          </select>
        </div>
      )}

      {/* Warehouse (worker/viewer only) */}
      {(isEdit ? needsWarehouse : ['worker', 'viewer'].includes(selectedRole)) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: "'Cairo', sans-serif" }}>
            {t('users.warehouse')}
          </label>
          <select
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            style={{ ...selectStyle, borderColor: errors.warehouseId ? '#c0392b' : 'var(--border2)' }}
          >
            <option value="">—</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.store_name})
              </option>
            ))}
          </select>
          {errors.warehouseId && (
            <span style={{ fontSize: '12px', color: '#c0392b', fontFamily: "'Cairo', sans-serif" }}>
              {errors.warehouseId}
            </span>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px', direction: 'ltr' }}>
        <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant="primary" loading={loading} onClick={handleSubmit}>{t('common.save')}</Button>
      </div>
    </div>
  );
}

// ── Reset password modal ─────────────────────────────────────────
function ResetPasswordModal({ user, onSave, onClose, showToast, t }) {
  const [newPw, setNewPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!newPw || newPw.length < 8) { setError(t('users.password_min')); return; }
    setLoading(true);
    try {
      await api.patch(`/users/${user.id}/password`, { new_password: newPw });
      onSave();
    } catch (err) {
      showToast(err.response?.data?.message_ar || t('toast.error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div style={{ position: 'relative' }}>
        <Input
          label={t('users.new_password')}
          type={showPw ? 'text' : 'password'}
          value={newPw}
          onChange={(e) => { setNewPw(e.target.value); setError(''); }}
          error={error}
          autoComplete="new-password"
        />
        <button
          type="button"
          onClick={() => setShowPw((v) => !v)}
          style={{
            position: 'absolute',
            left: '12px',
            bottom: error ? '24px' : '10px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--dim)',
            fontSize: '13px',
            fontFamily: "'Cairo', sans-serif",
          }}
        >
          {showPw ? t('login.hide') : t('login.show')}
        </button>
      </div>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', direction: 'ltr' }}>
        <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant="primary" loading={loading} onClick={handleSubmit}>{t('common.save')}</Button>
      </div>
    </div>
  );
}

// ── Deactivate confirmation modal ────────────────────────────────
function DeactivateModal({ user, onConfirm, onClose, loading, t }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <p style={{ fontSize: '14px', color: 'var(--text)', fontFamily: "'Cairo', sans-serif" }}>
        {t('users.confirm_deactivate')} — {user.name_ar}
      </p>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', direction: 'ltr' }}>
        <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant="danger" loading={loading} onClick={onConfirm}>{t('users.deactivate')}</Button>
      </div>
    </div>
  );
}

// ── Table cell helpers ───────────────────────────────────────────
const cell = {
  padding: 'var(--cell-pad, 12px 16px)',
  fontSize: '14px',
  color: 'var(--text)',
  fontFamily: "'Cairo', sans-serif",
  verticalAlign: 'middle',
  borderBottom: '0.5px solid var(--border)',
};

const hCell = {
  ...cell,
  fontSize: '12px',
  color: 'var(--muted)',
  fontWeight: 600,
  background: 'var(--bg2)',
  padding: '10px 16px',
};

// ── Main page ────────────────────────────────────────────────────
export default function Users() {
  const t = useT();
  const { rowHover } = useSettingsStore();
  const { id: selfId, role: selfRole } = parseJwtPayload();
  const [users, setUsers]         = useState([]);
  const [online, setOnline]       = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState({ role: 'all', active: 'all', search: '' });
  const [createOpen, setCreateOpen]   = useState(false);
  const [editUser, setEditUser]       = useState(null);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [activateTarget, setActivateTarget]     = useState(null);
  const [resetPwTarget, setResetPwTarget]       = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const { toasts, showToast } = useToast();
  const presenceTimer = useRef(null);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch {
      showToast(t('error.server'), 'error');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchOnline = useCallback(async () => {
    if (!['owner', 'admin'].includes(selfRole)) return;
    try {
      const res = await api.get('/users/online');
      setOnline(res.data.online || []);
    } catch { /* silent */ }
  }, [selfRole]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [usersRes, whFlat] = await Promise.all([
          api.get('/users'),
          fetchWarehousesFlat().catch(() => []),
        ]);
        setUsers(usersRes.data);
        setWarehouses(whFlat);
        if (['owner', 'admin'].includes(selfRole)) {
          const onRes = await api.get('/users/online').catch(() => ({ data: { online: [] } }));
          setOnline(onRes.data.online || []);
        }
      } catch {
        showToast(t('error.server'), 'error');
      } finally {
        setLoading(false);
      }
    };
    init();
    // Refresh presence every 60s
    presenceTimer.current = setInterval(fetchOnline, 60000);
    return () => clearInterval(presenceTimer.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onlineIds = new Set(online.map((u) => u.userId || u.id));

  // Filter logic
  const filtered = users.filter((u) => {
    if (filter.role !== 'all' && u.role !== filter.role) return false;
    if (filter.active === 'active'   && !u.active) return false;
    if (filter.active === 'inactive' && u.active)  return false;
    if (filter.search) {
      const q = filter.search.toLowerCase();
      if (
        !u.name_ar.includes(filter.search) &&
        !u.name_en.toLowerCase().includes(q) &&
        !u.email.toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  const handleDeactivate = async () => {
    if (!deactivateTarget) return;
    setActionLoading(true);
    try {
      await api.patch(`/users/${deactivateTarget.id}/deactivate`);
      showToast(t('toast.success'), 'success');
      setDeactivateTarget(null);
      fetchUsers();
    } catch (err) {
      showToast(err.response?.data?.message_ar || t('toast.error'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivate = async () => {
    if (!activateTarget) return;
    setActionLoading(true);
    try {
      await api.patch(`/users/${activateTarget.id}/activate`);
      showToast(t('toast.success'), 'success');
      setActivateTarget(null);
      fetchUsers();
    } catch (err) {
      showToast(err.response?.data?.message_ar || t('toast.error'), 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const roleFilterOptions = [
    { value: 'all',    label: t('users.filter.all') },
    { value: 'admin',  label: t('role.admin') },
    { value: 'worker', label: t('role.worker') },
    { value: 'viewer', label: t('role.viewer') },
  ];

  const activeFilterOptions = [
    { value: 'all',      label: t('users.filter.all') },
    { value: 'active',   label: t('users.filter.active') },
    { value: 'inactive', label: t('users.filter.inactive') },
  ];

  return (
    <>
      {/* Action + filter row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginBottom: '20px', direction: 'rtl' }}>
        <Button variant="primary" onClick={() => setCreateOpen(true)}>
          {t('users.add')}
        </Button>
        <PillGroup
          options={roleFilterOptions}
          value={filter.role}
          onChange={(v) => setFilter((f) => ({ ...f, role: v }))}
        />
        <PillGroup
          options={activeFilterOptions}
          value={filter.active}
          onChange={(v) => setFilter((f) => ({ ...f, active: v }))}
        />
        <input
          type="text"
          value={filter.search}
          onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value }))}
          placeholder={t('common.search')}
          style={{
            background: 'transparent',
            border: '0.5px solid var(--border2)',
            borderRadius: '8px',
            padding: '7px 12px',
            fontSize: '13px',
            color: 'var(--text)',
            fontFamily: "'Cairo', sans-serif",
            outline: 'none',
            width: '180px',
            direction: 'rtl',
          }}
        />
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ color: 'var(--dim)', fontSize: '14px', fontFamily: "'Cairo', sans-serif" }}>
          {t('common.loading')}
        </div>
      ) : (
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', direction: 'rtl' }}>
            <thead>
              <tr>
                <th style={{ ...hCell, textAlign: 'right' }}>{t('users.name_ar')}</th>
                <th style={{ ...hCell, textAlign: 'right' }}>{t('users.role')}</th>
                <th style={{ ...hCell, textAlign: 'right' }}>{t('users.location')}</th>
                <th style={{ ...hCell, textAlign: 'right' }}>{t('users.status')}</th>
                <th style={{ ...hCell, textAlign: 'center', width: '120px' }}>{t('common.edit')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ ...cell, textAlign: 'center', color: 'var(--dim)' }}>
                    {t('common.no_data')}
                  </td>
                </tr>
              ) : (
                filtered.map((u) => {
                  const isOnline = onlineIds.has(u.id);
                  const canAct = (selfRole === 'owner' && ['admin','worker','viewer'].includes(u.role)) ||
                                 (selfRole === 'admin'  && ['worker','viewer'].includes(u.role));

                  return (
                    <tr
                      key={u.id}
                      style={{ transition: 'background 0.15s' }}
                      onMouseEnter={(e) => { if (rowHover) e.currentTarget.style.background = 'var(--row-hover)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
                    >
                      {/* User */}
                      <td style={cell}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {isOnline && (
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
                          )}
                          <div>
                            <div style={{ fontWeight: 600 }}>{u.name_ar}</div>
                            <div style={{ fontSize: '12px', color: 'var(--muted)', fontFamily: "'Cairo', sans-serif" }}>{u.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td style={cell}>
                        <Badge color={ROLE_BADGE_COLOR[u.role] || 'gray'} label={t(`role.${u.role}`)} />
                      </td>

                      {/* Location */}
                      <td style={cell}>
                        {['admin', 'owner'].includes(u.role) ? (
                          <span style={{ color: 'var(--dim)' }}>—</span>
                        ) : u.store_name ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: BRANCH_COLORS[u.store_color] || '#888', flexShrink: 0 }} />
                            <span style={{ fontSize: '13px' }}>
                              {u.store_name} / {u.warehouse_name}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--dim)' }}>—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td style={cell}>
                        <Badge color={u.active ? 'green' : 'red'} label={u.active ? t('users.active') : t('users.inactive')} />
                      </td>

                      {/* Actions */}
                      <td style={{ ...cell, textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                          {canAct && (
                            <>
                              <button
                                type="button"
                                title={t('common.edit')}
                                onClick={() => setEditUser(u)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dim)', fontSize: '15px', padding: '3px', lineHeight: 1 }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
                                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--dim)')}
                              >
                                ✎
                              </button>

                              {u.active ? (
                                <button
                                  type="button"
                                  title={t('users.deactivate')}
                                  onClick={() => setDeactivateTarget(u)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c0392b', fontSize: '15px', padding: '3px', lineHeight: 1 }}
                                >
                                  ⊘
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  title={t('users.activate')}
                                  onClick={() => setActivateTarget(u)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#22c55e', fontSize: '15px', padding: '3px', lineHeight: 1 }}
                                >
                                  ✓
                                </button>
                              )}

                              {selfRole === 'owner' && (
                                <button
                                  type="button"
                                  title={t('users.reset_password')}
                                  onClick={() => setResetPwTarget(u)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dim)', fontSize: '15px', padding: '3px', lineHeight: 1 }}
                                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
                                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--dim)')}
                                >
                                  🔑
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create drawer */}
      <Drawer isOpen={createOpen} onClose={() => setCreateOpen(false)} title={t('users.add')}>
        <UserForm
          user={null}
          warehouses={warehouses}
          actorRole={selfRole}
          showToast={showToast}
          t={t}
          onClose={() => setCreateOpen(false)}
          onSave={() => { setCreateOpen(false); showToast(t('toast.success'), 'success'); fetchUsers(); }}
        />
      </Drawer>

      {/* Edit drawer */}
      <Drawer isOpen={!!editUser} onClose={() => setEditUser(null)} title={t('users.edit')}>
        {editUser && (
          <UserForm
            user={editUser}
            warehouses={warehouses}
            actorRole={selfRole}
            showToast={showToast}
            t={t}
            onClose={() => setEditUser(null)}
            onSave={() => { setEditUser(null); showToast(t('toast.success'), 'success'); fetchUsers(); }}
          />
        )}
      </Drawer>

      {/* Deactivate modal */}
      <Modal isOpen={!!deactivateTarget} onClose={() => setDeactivateTarget(null)} title={t('users.deactivate')} size="sm">
        {deactivateTarget && (
          <DeactivateModal
            user={deactivateTarget}
            loading={actionLoading}
            t={t}
            onClose={() => setDeactivateTarget(null)}
            onConfirm={handleDeactivate}
          />
        )}
      </Modal>

      {/* Activate modal */}
      <Modal isOpen={!!activateTarget} onClose={() => setActivateTarget(null)} title={t('users.activate')} size="sm">
        {activateTarget && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ fontSize: '14px', color: 'var(--text)', fontFamily: "'Cairo', sans-serif" }}>
              {t('users.confirm_deactivate')} — {activateTarget.name_ar}
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', direction: 'ltr' }}>
              <Button variant="ghost" onClick={() => setActivateTarget(null)}>{t('common.cancel')}</Button>
              <Button variant="primary" loading={actionLoading} onClick={handleActivate}>{t('users.activate')}</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Reset password modal (ownerOnly) */}
      <Modal isOpen={!!resetPwTarget} onClose={() => setResetPwTarget(null)} title={t('users.reset_password')} size="sm">
        {resetPwTarget && (
          <ResetPasswordModal
            user={resetPwTarget}
            showToast={showToast}
            t={t}
            onClose={() => setResetPwTarget(null)}
            onSave={() => { setResetPwTarget(null); showToast(t('toast.success'), 'success'); }}
          />
        )}
      </Modal>

      <Toast toasts={toasts} />
    </>
  );
}
