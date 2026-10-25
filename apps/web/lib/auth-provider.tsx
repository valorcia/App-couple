'use client';
import * as React from 'react';
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AuthResponseDto, MeDto } from '@couple/types';
import { api, tokenStore } from './api';

interface AuthContextValue {
  user: MeDto | null | undefined; // undefined = en cours de résolution
  isLoading: boolean;
  setSession: (res: AuthResponseDto) => void;
  logout: (everywhere?: boolean) => Promise<void>;
  refetch: () => Promise<unknown>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: (count, err) => count < 2 && !(err as { status?: number }).status } },
  });
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(makeQueryClient);
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [booted, setBooted] = React.useState(false);

  // Au chargement : tente un refresh via le cookie httpOnly pour restaurer la session.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!tokenStore.getAccessToken()) await api.refresh();
      if (!cancelled) setBooted(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const [, force] = React.useReducer((x: number) => x + 1, 0);
  React.useEffect(() => tokenStore.subscribe(force), []);
  const hasToken = !!tokenStore.getAccessToken();

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get<MeDto>('/me'),
    enabled: booted && hasToken,
    retry: false,
  });

  // Callbacks stables (identité constante) pour pouvoir figurer dans des dépendances d'effets.
  const setSession = React.useCallback(
    (res: AuthResponseDto) => {
      tokenStore.setAccessToken(res.tokens.accessToken);
      queryClient.setQueryData(['me'], res.user);
    },
    [queryClient],
  );
  const logout = React.useCallback(
    async (everywhere = false) => {
      try {
        await api.post('/auth/logout', { everywhere });
      } finally {
        tokenStore.setAccessToken(null);
        queryClient.clear();
      }
    },
    [queryClient],
  );
  const refetch = React.useCallback(() => queryClient.invalidateQueries({ queryKey: ['me'] }), [queryClient]);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      user: !booted ? undefined : !hasToken ? null : meQuery.data ?? (meQuery.isError ? null : undefined),
      isLoading: !booted || (hasToken && meQuery.isPending),
      setSession,
      logout,
      refetch,
    }),
    [booted, hasToken, meQuery.data, meQuery.isError, meQuery.isPending, setSession, logout, refetch],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth hors AppProviders');
  return ctx;
}
