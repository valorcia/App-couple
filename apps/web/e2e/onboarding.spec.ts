import { test, expect, type Page, type APIRequestContext } from '@playwright/test';

const API = 'http://localhost:4100';
const PASSWORD = 'UnMotDePasse!Solide';
const unique = (p: string) => `${p}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@e2e.local`;

async function latestMail(request: APIRequestContext, to: string, contains: string) {
  for (let i = 0; i < 20; i++) {
    const res = await request.get(`${API}/dev/mailbox`, { params: { to } });
    const { items } = (await res.json()) as { items: { text: string }[] };
    const found = items.find((m) => m.text.includes(contains));
    if (found) return found.text;
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Aucun e-mail pour ${to} contenant ${contains}`);
}

function debug(page: Page) {
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log(`[browser:${m.type()}]`, m.text()); });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  page.on('response', (r) => { if (r.url().startsWith(API) && r.status() >= 400) console.log('[api]', r.status(), r.request().method(), r.url()); });
}

async function register(page: Page, request: APIRequestContext, name: string) {
  debug(page);
  const email = unique(name.toLowerCase());
  await page.goto('/inscription');
  await page.getByLabel('Prénom ou pseudonyme').fill(name);
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(PASSWORD);
  await page.getByText("J'accepte les").locator('..').locator('input[type=checkbox]').check();
  await page.getByRole('button', { name: 'Créer mon compte' }).click();
  await expect(page).toHaveURL(/\/verifier-email/);
  await expect(page.getByText(email)).toBeVisible();

  const text = await latestMail(request, email, 'verifier-email?token=');
  const link = /https?:\/\/\S+verifier-email\?token=[A-Za-z0-9_-]+/.exec(text)![0];
  await page.goto(link);
  await expect(page.getByText('Adresse confirmée')).toBeVisible();
  await expect(page).toHaveURL(/\/couple/, { timeout: 15_000 });
  return email;
}

test('inscription → vérification → invitation → association du partenaire', async ({ browser, request }) => {
  const ctxA = await browser.newContext();
  const pageA = await ctxA.newPage();
  await register(pageA, request, 'Alex');

  // Alex crée l'espace et obtient un code.
  await pageA.getByRole('button', { name: 'Inviter mon partenaire' }).click();
  await pageA.getByRole('button', { name: 'Générer un code' }).click();
  const codeEl = pageA.locator('span[aria-label^="Code"]');
  await expect(codeEl).toBeVisible();
  const code = (await codeEl.textContent())!.trim();
  expect(code).toMatch(/^[A-Z0-9]{8}$/);

  // L'accueil signale l'attente du partenaire.
  await pageA.goto('/accueil');
  await expect(pageA.getByText("Votre partenaire n'a pas encore rejoint votre espace.")).toBeVisible();

  // Camille rejoint avec le code.
  const ctxB = await browser.newContext();
  const pageB = await ctxB.newPage();
  await register(pageB, request, 'Camille');
  await pageB.getByRole('button', { name: "J'ai un code" }).click();
  await pageB.getByLabel("Code d'invitation").fill(code.toLowerCase());
  await pageB.getByRole('button', { name: 'Rejoindre' }).click();
  await expect(pageB).toHaveURL(/\/accueil/);
  await expect(pageB.getByRole('heading', { name: /Camille/ })).toBeVisible();
  await expect(pageB.getByText(/Alex/)).toBeVisible();

  // Côté Alex, le partenaire apparaît.
  await pageA.goto('/couple');
  await expect(pageA.getByText('Alex & Camille')).toBeVisible();

  // Mauvais code → message d'erreur, sans association.
  const ctxC = await browser.newContext();
  const pageC = await ctxC.newPage();
  await register(pageC, request, 'Hugo');
  await pageC.getByRole('button', { name: "J'ai un code" }).click();
  await pageC.getByLabel("Code d'invitation").fill('ZZZZZZZZ');
  await pageC.getByRole('button', { name: 'Rejoindre' }).click();
  await expect(pageC.getByRole('alert').filter({ hasText: /invitation/ })).toContainText("Code d'invitation invalide");

  // Déconnexion / reconnexion : la session est restaurée via le cookie de refresh.
  await pageA.reload();
  await expect(pageA.getByText('Alex & Camille')).toBeVisible();
  await ctxA.close();
  await ctxB.close();
  await ctxC.close();
});

test('connexion refusée avec un mauvais mot de passe', async ({ page }) => {
  await page.goto('/connexion');
  await page.getByLabel('Adresse e-mail').fill('inconnu@e2e.local');
  await page.getByLabel('Mot de passe', { exact: true }).fill('mauvais-mot-de-passe');
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page.getByRole('alert').filter({ hasText: /mot de passe/ })).toContainText('E-mail ou mot de passe incorrect');
});
