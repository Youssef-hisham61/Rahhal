import { useTranslation } from 'react-i18next';
import { usePresenceStore } from '../store/presenceStore';

function parseJwtRole(token) {
  try {
    const payload = JSON.parse(
      atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')),
    );
    return payload.role;
  } catch {
    return null;
  }
}

const DOT_COLOR = {
  green: 'bg-green-500',
  orange: 'bg-orange-500',
  blue: 'bg-blue-500',
};

function formatTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function PresencePanel() {
  const { t } = useTranslation();
  const { onlineUsers, lastUpdated, isStale } = usePresenceStore();

  const token = localStorage.getItem('access_token');
  const role = parseJwtRole(token);

  if (!['owner', 'admin'].includes(role)) return null;

  return (
    <div className="p-4 rounded-xl bg-white shadow-sm border border-gray-100">
      <h2 className="text-base font-semibold mb-3 text-gray-800">
        {t('presence.online_users')} ({onlineUsers.length})
      </h2>

      {isStale && (
        <div className="mb-3 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
          {t('presence.offline_banner')}: {formatTime(lastUpdated)}
        </div>
      )}

      {onlineUsers.length === 0 && !isStale ? (
        <p className="text-sm text-gray-400">{t('presence.no_users')}</p>
      ) : (
        <ul className="space-y-2">
          {onlineUsers.map((user) => {
            const isAdminUser = ['owner', 'admin'].includes(user.role);
            const dotClass = DOT_COLOR[user.store_color] || 'bg-gray-400';
            const minutes = Math.max(
              0,
              Math.floor((Date.now() - new Date(user.connectedAt)) / 60000),
            );

            return (
              <li
                key={user.userId}
                className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50"
              >
                <span
                  className={`mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${dotClass}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {user.name_ar}
                    </span>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {t(`role.${user.role}`)}
                    </span>
                  </div>
                  {isAdminUser ? (
                    <p className="text-xs text-gray-400">—</p>
                  ) : (
                    <>
                      <p className="text-xs font-medium text-gray-600">
                        {user.store_name || '—'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {user.warehouse_name || '—'}
                      </p>
                    </>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {t('presence.connected_since', { minutes })}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
