import { test, expect } from '@playwright/test';
import { API, apiCouple, uiLogin } from './fixtures';

test('défi à deux : proposer, accepter, valider chacun sa part', async ({ browser, request }) => {
  const { a, b } = await apiCouple(request);
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();
  await uiLogin(pageA, a.email);
  await uiLogin(pageB, b.email);

  await pageA.goto('/defis');
  await pageA.getByRole('button', { name: /Le mot caché/ }).first().click();
  await pageA.getByRole('button', { name: 'Proposer à Camille' }).click();
  await expect(pageA.getByText('En cours').locator('..').getByText('Le mot caché')).toBeVisible();

  await pageB.goto('/defis');
  await pageB.getByRole('button', { name: /Le mot caché/ }).first().click();
  await pageB.getByRole('button', { name: 'On le fait' }).click();
  // La fiche reste ouverte : B valide sa part directement.
  await pageB.getByRole('button', { name: "J'ai fait ma part" }).click();
  await expect(pageB.getByText('En attente de Alex')).toBeVisible();
  await pageB.keyboard.press('Escape');

  // A valide à son tour → réussi ensemble.
  await pageA.reload();
  await pageA.getByRole('button', { name: /Le mot caché/ }).first().click();
  await pageA.getByRole('button', { name: "J'ai fait ma part" }).click();
  await expect(pageA.getByText('Réussi ensemble')).toBeVisible();
  await ctxA.close();
  await ctxB.close();
});

test('Double Secret : activation individuelle, réponses privées, révélation mutuelle', async ({ browser, request }) => {
  const { a, b } = await apiCouple(request);
  for (const u of [a, b]) await request.post(`${API}/me/confirm-adult`, { headers: u.headers, data: { confirm: true } });
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();
  await uiLogin(pageA, a.email);
  await uiLogin(pageB, b.email);

  // A active ; tant que B n'a pas activé, aucun catalogue.
  await pageA.goto('/intimite');
  await pageA.getByLabel("Activer l'espace pour moi").click();
  await expect(pageA.getByText("Camille n'a pas encore activé l'espace")).toBeVisible();
  await expect(pageA.getByText('Double Secret')).toHaveCount(0);

  await pageB.goto('/intimite');
  await pageB.getByLabel("Activer l'espace pour moi").click();
  await expect(pageB.getByText('Double Secret')).toBeVisible();

  // Chacun répond. Les choix de A ne sont pas visibles chez B.
  const item = 'Un petit-déjeuner au lit préparé par l’autre';
  await pageA.reload();
  await expect(pageA.getByText('Double Secret')).toBeVisible();
  await pageA.getByRole('radiogroup', { name: item }).getByRole('radio', { name: 'Oui' }).click();
  await expect(pageA.getByRole('radiogroup', { name: item }).getByRole('radio', { name: 'Oui' })).toHaveAttribute('aria-checked', 'true');

  await pageB.reload();
  await expect(pageB.getByRole('radiogroup', { name: item }).getByRole('radio', { name: 'Oui' })).toHaveAttribute('aria-checked', 'false');
  await expect(pageB.getByText(/envie\(s\) en commun/)).toHaveCount(0);
  await pageB.getByRole('radiogroup', { name: item }).getByRole('radio', { name: 'Oui' }).click();
  await expect(pageB.getByText('Vous avez 1 envie(s) en commun.')).toBeVisible();
  // Le texte de l'envie commune n'est pas encore révélé dans la carte Double Secret.
  await expect(pageB.getByTestId('revealed-list')).toHaveCount(0);

  await pageB.getByRole('button', { name: 'Je veux les découvrir' }).click();
  await expect(pageB.getByText(/Demande envoyée/)).toBeVisible();
  await pageA.reload();
  await expect(pageA.getByText('Camille souhaite découvrir vos points communs.')).toBeVisible();
  await pageA.getByRole('button', { name: 'Je veux les découvrir' }).click();
  await expect(pageA.getByText('Vos envies communes')).toBeVisible();
  await expect(pageA.getByTestId('revealed-list')).toContainText(item);

  await pageA.screenshot({ path: 'e2e/screenshots/double-secret.png' });
  await ctxA.close();
  await ctxB.close();
});
