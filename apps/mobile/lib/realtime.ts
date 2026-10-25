import * as React from 'react';
import { io, type Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { API_URL, tokenStore } from './api';

let socket: Socket | null = null;

function getSocket(): Socket | null {
  const token = tokenStore.getAccessToken();
  if (!token) return null;
  if (!socket) {
    socket = io(API_URL, { auth: { token }, transports: ['websocket'] });
    tokenStore.subscribe(() => {
      const t = tokenStore.getAccessToken();
      if (!socket) return;
      if (!t) return socket.disconnect();
      socket.auth = { token: t };
      if (!socket.connected) socket.connect();
    });
  }
  return socket;
}

/** Invalide des requêtes quand un signal temps réel arrive (même contrat que le web). */
export function useRealtimeInvalidation(event: string, queryKeys: readonly (readonly unknown[])[]) {
  const qc = useQueryClient();
  const keys = JSON.stringify(queryKeys);
  React.useEffect(() => {
    const s = getSocket();
    if (!s) return;
    const handler = () => (JSON.parse(keys) as unknown[][]).forEach((k) => void qc.invalidateQueries({ queryKey: k }));
    s.on(event, handler);
    return () => {
      s.off(event, handler);
    };
  }, [event, keys, qc]);
}
