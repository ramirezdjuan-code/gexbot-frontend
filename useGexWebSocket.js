import { useState, useEffect, useRef, useCallback } from 'react';

const WS_URL = process.env.REACT_APP_WS_URL || 'wss://gexbot-backend.onrender.com';

export function useGexWebSocket() {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('connecting');
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const attempts = useRef(0);

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;
      ws.onopen = () => { setStatus('connected'); attempts.current = 0; };
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'GEX_UPDATE' || msg.type === 'CONNECTED') setData(msg.data);
        } catch {}
      };
      ws.onclose = () => {
        setStatus('disconnected');
        const delay = Math.min(1000 * 2 ** attempts.current, 30000);
        attempts.current++;
        reconnectTimer.current = setTimeout(connect, delay);
      };
      ws.onerror = () => { setStatus('error'); ws.close(); };
    } catch {
      reconnectTimer.current = setTimeout(connect, 5000);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => { clearTimeout(reconnectTimer.current); wsRef.current?.close(); };
  }, [connect]);

  return { data, status };
}
