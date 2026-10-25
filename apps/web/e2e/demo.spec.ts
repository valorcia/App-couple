import { test, expect } from '@playwright/test';
import { API } from './fixtures';

test('mode démo : parcours complet sans aucun appel à l’API', async ({ page }) => {
  const apiCalls: string[] = [];
  let inDemo = false;
  // Toute requête vers l'API est interceptée et refusée : la démo doit fonctionner sans serveur.
  // (Hors démo, la page de connexion tente légitimement un /auth/refresh : non compté.)
  await page.route(`${API}/**`, (route) => { if (inDemo) apiCalls.push(route.request().url()); void route.abort(); });

  await page.goto('/connexion');
  await page.getByRole('button', { name: 'Explorer la démo' }).click();
  await page.waitForURL(/\/accueil/);
  inDemo = true;
  await expect(page.getByRole('status')).toContainText('Mode démo');
  await expect(page.getByText('Camille').first()).toBeVisible();

  // Question du jour : réponse puis révélation du partenaire simulé.
  await page.getByRole('textbox', { name: 'Question du jour' }).fill('Le soleil sur la table du petit-déjeuner.');
  await page.getByRole('button', { name: 'Répondre' }).click();
  await expect(page.getByText('Ton message avant ma réunion.')).toBeVisible();

  // Agenda : l'événement partagé est visible, l'événement « Occupé » du partenaire n'a pas de titre.
  await page.goto('/agenda');
  await expect(page.getByText('Appel vidéo avec les parents').first()).toBeVisible();

  // Jeux : lancer un dilemme et jouer une manche.
  await page.goto('/jouer');
  await page.getByRole('button', { name: 'Jouer' }).nth(2).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Lancer une partie' }).click();
  await page.waitForURL(/\/jouer\//);
  await page.getByRole('button', { name: 'Sans téléphone' }).click();
  await expect(page.getByText(/Même choix|Deux avis/)).toBeVisible();

  // Quotidien : cocher un article.
  await page.goto('/quotidien');
  await page.getByRole('checkbox', { name: 'Cocher Tomates' }).click();
  await expect(page.getByText(/Coché par Alex/)).toBeVisible();
  await page.goto('/quotidien?tab=projects');
  await expect(page.getByText('Lisbonne au printemps')).toBeVisible();

  // Défis, Intimité, Premium, Notifications : les pages se chargent avec des données.
  await page.goto('/defis');
  await expect(page.getByRole('button', { name: /Le mot caché/ }).first()).toBeVisible();
  await page.goto('/intimite');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.goto('/premium');
  await expect(page.getByText('Premium Couple').first()).toBeVisible();
  await page.goto('/notifications');
  await expect(page.getByText('Week-end à Honfleur').first()).toBeVisible();

  // Rechargement : la démo persiste (localStorage).
  await page.reload();
  await expect(page.getByRole('status')).toContainText('Mode démo');

  // Sortie de la démo : retour à la connexion, aucune requête API n'a été émise pendant tout le parcours.
  expect(apiCalls).toEqual([]);
  inDemo = false;
  await page.getByRole('button', { name: 'Quitter la démo' }).click();
  await page.waitForURL(/\/connexion/);
});
