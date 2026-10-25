import * as React from 'react';
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AuthResponseDto, MeDto } from '@couple/types';
import { api, tokenStore } from './api';
import { unregisterPush } from './push';
import { logoutPurchases } from './purchases';

interface AuthContextValue {
  user: MeDto | null | undefined;
  isLoading: boolean;
  setSession: (res: AuthResponseDto) => Promise<void>;
  logout: () => Promise<void>;
  refetch: () => Promise<unknown>;
}
const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } }));
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [booted, setBooted] = React.useState(false);
  const [, force] = React.useReducer((x: number) => x + 1, 0);
  React.useEffect(() => tokenStore.subscribe(force), []);
  React.useEffect(() => {
    (async () => {
      await api.refresh();
      setBooted(true);
    })();
  }, []);
  const hasToken = !!tokenStore.getAccessToken();
  const me = useQuery({ queryKey: ['me'], queryFn: () => api.get<MeDto>('/me'), enabled: booted && hasToken, retry: false });

  const setSession = React.useCallback(
    async (res: AuthResponseDto) => {
      tokenStore.setAccessToken(res.tokens.accessToken);
      if (res.tokens.refreshToken) await tokenStore.setRefreshToken(res.tokens.refreshToken);
      queryClient.setQueryData(['me'], res.user);
    },
    [queryClient],
  );
  const logout = React.useCallback(async () => {
    await unregisterPush();
    await logoutPurchases();
    try {
      const refreshToken = await tokenStore.getRefreshToken();
      await api.post('/auth/logout', { refreshToken: refreshToken ?? undefined });
    } finally {
      tokenStore.setAccessToken(null);
      await tokenStore.setRefreshToken(null);
      queryClient.clear();
    }
  }, [queryClient]);
  const refetch = React.useCallback(() => queryClient.invalidateQueries({ queryKey: ['me'] }), [queryClient]);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      user: !booted ? undefined : !hasToken ? null : me.data ?? (me.isError ? null : undefined),
      isLoading: !booted || (hasToken && me.isPending),
      setSession,
      logout,
      refetch,
    }),
    [booted, hasToken, me.data, me.isError, me.isPending, setSession, logout, refetch],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth hors AppProviders');
  return ctx;
}
