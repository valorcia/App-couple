import type { APIRequestContext, Page } from '@playwright/test';

export const API = 'http://localhost:4100';
export const PASSWORD = 'UnMotDePasse!Solide';
export const unique = (p: string) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@e2e.local`;

export async function latestMail(request: APIRequestContext, to: string, contains: string) {
  for (let i = 0; i < 20; i++) {
    const res = await request.get(`${API}/dev/mailbox`, { params: { to } });
    const { items } = (await res.json()) as { items: { text: string }[] };
    const found = items.find((m) => m.text.includes(contains));
    if (found) return found.text;
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Aucun e-mail pour ${to} contenant ${contains}`);
}

/** Crée un compte vérifié via l'API (client « ios » : jetons dans le corps). */
export async function apiUser(request: APIRequestContext, displayName: string) {
  const email = unique(displayName.toLowerCase());
  const reg = await request.post(`${API}/auth/register`, { headers: { 'X-Client-Platform': 'ios' }, data: { email, password: PASSWORD, displayName, acceptTerms: true } });
  if (!reg.ok()) throw new Error(`register ${reg.status()} ${await reg.text()}`);
  const { tokens, user } = (await reg.json()) as { tokens: { accessToken: string }; user: { id: string } };
  const text = await latestMail(request, email, 'verifier-email?token=');
  const token = /token=([A-Za-z0-9_-]+)/.exec(text)![1];
  await request.post(`${API}/auth/verify-email`, { data: { token } });
  return { email, userId: user.id, accessToken: tokens.accessToken, headers: { Authorization: `Bearer ${tokens.accessToken}` } };
}

export async function apiCouple(request: APIRequestContext) {
  const a = await apiUser(request, 'Alex');
  const b = await apiUser(request, 'Camille');
  const created = await request.post(`${API}/couples`, { headers: a.headers, data: {} });
  const code = ((await created.json()) as { pendingInvitation: { code: string } }).pendingInvitation.code;
  const joined = await request.post(`${API}/couples/join`, { headers: b.headers, data: { code } });
  if (!joined.ok()) throw new Error(`join ${joined.status()}`);
  return { a, b };
}

export async function uiLogin(page: Page, email: string) {
  await page.goto('/connexion');
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.waitForURL(/\/accueil/);
}
