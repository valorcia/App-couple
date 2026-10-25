'use client';
import * as React from 'react';
import { io, type Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { API_URL, tokenStore } from './api';
import { isDemo } from './demo/mode';

let socket: Socket | null = null;

function getSocket(): Socket | null {
  const token = tokenStore.getAccessToken();
  if (!token || isDemo()) return null;
  if (!socket) {
    socket = io(API_URL, { auth: { token }, transports: ['websocket'], autoConnect: true });
    tokenStore.subscribe(() => {
      const t = tokenStore.getAccessToken();
      if (!socket) return;
      if (!t) {
        socket.disconnect();
        return;
      }
      socket.auth = { token: t };
      if (!socket.connected) socket.connect();
    });
  }
  return socket;
}

/** Invalide des requêtes TanStack Query quand un signal temps réel arrive. */
export function useRealtimeInvalidation(event: string, queryKeys: readonly (readonly unknown[])[]) {
  const qc = useQueryClient();
  React.useEffect(() => {
    const s = getSocket();
    if (!s) return;
    const handler = () => queryKeys.forEach((k) => void qc.invalidateQueries({ queryKey: [...k] }));
    s.on(event, handler);
    return () => {
      s.off(event, handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, qc, JSON.stringify(queryKeys)]);
}
