'use client';
import * as React from 'react';
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AuthResponseDto, MeDto } from '@couple/types';
import { api, tokenStore } from './api';

interface Ctx {
  user: MeDto | null | undefined;
  isLoading: boolean;
  setSession: (r: AuthResponseDto) => void;
  logout: () => Promise<void>;
}
const AuthContext = React.createContext<Ctx | null>(null);

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(() => new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 10_000 } } }));
  return <QueryClientProvider client={client}><AuthProvider>{children}</AuthProvider></QueryClientProvider>;
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const [booted, setBooted] = React.useState(false);
  const [, force] = React.useReducer((x: number) => x + 1, 0);
  React.useEffect(() => tokenStore.subscribe(force), []);
  React.useEffect(() => {
    (async () => {
      if (!tokenStore.getAccessToken()) await api.refresh();
      setBooted(true);
    })();
  }, []);
  const hasToken = !!tokenStore.getAccessToken();
  const me = useQuery({ queryKey: ['me'], queryFn: () => api.get<MeDto>('/me'), enabled: booted && hasToken });
  const value = React.useMemo<Ctx>(
    () => ({
      user: !booted ? undefined : !hasToken ? null : me.data ?? (me.isError ? null : undefined),
      isLoading: !booted || (hasToken && me.isPending),
      setSession: (r) => {
        tokenStore.setAccessToken(r.tokens.accessToken);
        qc.setQueryData(['me'], r.user);
      },
      logout: async () => {
        try {
          await api.post('/auth/logout', {});
        } finally {
          tokenStore.setAccessToken(null);
          qc.clear();
        }
      },
    }),
    [booted, hasToken, me.data, me.isError, me.isPending, qc],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export const useAuth = () => {
  const c = React.useContext(AuthContext);
  if (!c) throw new Error('useAuth hors Providers');
  return c;
};
