import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
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

const INITIAL_DELAY = 3000;
const MAX_DELAY = 30000;

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const { isStale, setOnlineUsers, markStale } = usePresenceStore();
  const wsRef = useRef(null);
  const retryDelay = useRef(INITIAL_DELAY);
  const retryTimer = useRef(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    function connect() {
      if (!isMounted.current) return;

      const token = localStorage.getItem('access_token');
      const role = parseJwtRole(token);
      const ws = new WebSocket(`ws://${window.location.host}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        retryDelay.current = INITIAL_DELAY;
        ws.send(JSON.stringify({ type: 'auth', token }));
      };

      ws.onmessage = async (event) => {
        let msg;
        try {
          msg = JSON.parse(event.data);
        } catch {
          return;
        }

        if (msg.type === 'connected') {
          // connection confirmed, awaiting auth_ok
        } else if (msg.type === 'presence_update') {
          if (['owner', 'admin'].includes(role)) {
            try {
              const res = await axios.get('/api/users/online', {
                headers: { Authorization: `Bearer ${token}` },
              });
              setOnlineUsers(res.data.online);
            } catch {
              // keep cached data
            }
          }
        } else {
          console.log('[ws]', msg);
        }
      };

      ws.onerror = () => {
        ws.close();
      };

      ws.onclose = () => {
        setIsConnected(false);
        markStale();
        if (isMounted.current) {
          retryTimer.current = setTimeout(() => {
            retryDelay.current = Math.min(retryDelay.current * 2, MAX_DELAY);
            connect();
          }, retryDelay.current);
        }
      };
    }

    connect();

    return () => {
      isMounted.current = false;
      clearTimeout(retryTimer.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.close();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { isConnected, isStale };
}
