import { test, expect } from '@playwright/test';
import { API, apiUser } from './fixtures';

test.use({ baseURL: 'http://localhost:3300' });

test('admin : connexion réservée, création et publication d\'une question, compteurs', async ({ page, request }) => {
  // Un utilisateur standard est refusé.
  const plain = await apiUser(request, 'Standard');
  await page.goto('/connexion');
  await page.getByLabel('E-mail').fill(plain.email);
  await page.getByLabel('Mot de passe').fill('UnMotDePasse!Solide');
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page.getByRole('alert').filter({ hasText: /droits/ })).toContainText(/droits d.administration/);

  // Le compte admin seedé accède au CMS.
  await page.getByLabel('E-mail').fill('admin@demo.local');
  await page.getByLabel('Mot de passe').fill('Demo!EntreNous2026');
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page).toHaveURL(/tableau-de-bord/);
  await page.getByRole('link', { name: 'Contenus' }).click();
  await expect(page).toHaveURL(/contenus\/questions/);

  const text = `Question e2e ${Date.now()} ?`;
  await page.getByRole('button', { name: 'Créer' }).click();
  await page.getByLabel('Question', { exact: true }).fill(text);
  await page.getByLabel('Catégorie (code)').fill('humor');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await page.getByPlaceholder('Rechercher').fill('Question e2e');
  await expect(page.getByText(text)).toBeVisible();
  await expect(page.getByText('DRAFT').first()).toBeVisible();
  await page.getByRole('button', { name: 'Publier' }).first().click();
  await expect(page.getByText('PUBLISHED').first()).toBeVisible();

  // Le contenu publié est bien compté côté API.
  const counts = await request.get(`${API}/admin/content/counts`, { headers: { Authorization: `Bearer ${(await (await request.post(`${API}/auth/login`, { headers: { 'X-Client-Platform': 'ios' }, data: { email: 'admin@demo.local', password: 'Demo!EntreNous2026' } })).json()).tokens.accessToken}` } });
  expect(((await counts.json()) as { questions: { PUBLISHED: number } }).questions.PUBLISHED).toBeGreaterThan(0);
});
