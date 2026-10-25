import { test, expect } from '@playwright/test';
import { apiCouple, uiLogin } from './fixtures';

test('dilemme à deux : réponses cachées puis révélées, et question du jour', async ({ browser, request }) => {
  const { a, b } = await apiCouple(request);
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();
  await uiLogin(pageA, a.email);
  await uiLogin(pageB, b.email);

  // A lance une partie de dilemmes.
  await pageA.goto('/jouer');
  const dilemmaCard = pageA.getByRole('heading', { name: 'Dilemmes' }).locator('..').locator('..');
  await dilemmaCard.getByRole('button', { name: 'Jouer' }).click();
  await pageA.getByRole('button', { name: 'Lancer une partie' }).click();
  await expect(pageA).toHaveURL(/\/jouer\/[0-9a-f-]+/);
  const url = pageA.url();
  await expect(pageA.getByText(/Manche 1 \//)).toBeVisible();

  // A choisit la première option ; B voit la partie « À vous de jouer » sans connaître le choix de A.
  const options = pageA.locator('button.font-display');
  const firstOption = (await options.first().textContent())!.trim();
  await options.first().click();
  await expect(pageA.getByText(/Réponse envoyée/)).toBeVisible();

  await pageB.goto('/jouer');
  await expect(pageB.getByText('À vous de jouer')).toBeVisible();
  await pageB.goto(url);
  await expect(pageB.getByText(/a déjà répondu/)).toBeVisible();
  // Le choix de A n'apparaît pas comme révélé côté B avant sa propre réponse.
  await expect(pageB.getByText('Même choix !')).toHaveCount(0);
  await pageB.locator('button.font-display').first().click();

  // Révélation des deux côtés (B immédiatement, A via le temps réel).
  await expect(pageB.getByText(/Même choix/)).toBeVisible();
  await expect(pageB.getByText(firstOption).first()).toBeVisible();
  await expect(pageA.getByText(/Même choix/)).toBeVisible({ timeout: 15_000 });

  // Question du jour sur l'accueil : A répond, B voit l'attente, B répond → révélation.
  await pageA.goto('/accueil');
  await pageA.getByLabel('Question du jour').fill('Ma réponse à moi');
  await pageA.getByRole('button', { name: 'Répondre' }).click();
  await expect(pageA.getByText(/On attend/)).toBeVisible();
  await pageB.goto('/accueil');
  await expect(pageB.getByText(/a déjà répondu, à vous/)).toBeVisible();
  await expect(pageB.getByText('Ma réponse à moi')).toHaveCount(0);
  await pageB.getByLabel('Question du jour').fill('Et la mienne');
  await pageB.getByRole('button', { name: 'Répondre' }).click();
  await expect(pageB.getByText('Ma réponse à moi')).toBeVisible();
  await expect(pageB.getByText('Et la mienne')).toBeVisible();

  // Depuis la page de jeu, « Continuer » mène à la manche suivante ; un rechargement arrive directement sur la manche courante.
  await pageB.goto(url);
  await expect(pageB.getByText(/Manche 2 \//)).toBeVisible();
  await pageB.screenshot({ path: 'e2e/screenshots/jeu-dilemme.png' });
  await ctxA.close();
  await ctxB.close();
});
