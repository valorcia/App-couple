import { test, expect } from '@playwright/test';
import { apiCouple, uiLogin } from './fixtures';

test('quotidien : liste de courses partagée, tâche attribuée, projet avec gabarit', async ({ browser, request }) => {
  const { a, b } = await apiCouple(request);
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();
  await uiLogin(pageA, a.email);
  await uiLogin(pageB, b.email);

  // --- Courses : A crée une liste et un article, B le coche, A le voit coché.
  await pageA.goto('/quotidien');
  await pageA.getByRole('button', { name: 'Nouvelle liste' }).first().click();
  await pageA.getByLabel('Nom de la liste').fill('Courses du samedi');
  await pageA.getByRole('button', { name: 'Créer la liste' }).click();
  await expect(pageA.getByRole('heading', { name: 'Courses du samedi' })).toBeVisible();
  await pageA.getByRole('textbox', { name: 'Article', exact: true }).fill('Tomates');
  await pageA.getByLabel('Quantité').fill('1 kg');
  await pageA.getByRole('button', { name: 'Ajouter un article' }).click();
  await expect(pageA.getByText('Tomates')).toBeVisible();

  await pageB.goto('/quotidien');
  await expect(pageB.getByRole('heading', { name: 'Courses du samedi' })).toBeVisible();
  await pageB.getByRole('checkbox', { name: 'Cocher Tomates' }).click();
  await expect(pageB.getByText('Coché par Camille')).toBeVisible();
  // Propagation temps réel vers A (sans rechargement).
  await expect(pageA.getByText('Coché par Camille')).toBeVisible();

  // --- Tâches : A attribue une tâche à Camille ; B la termine.
  await pageA.goto('/quotidien?tab=tasks');
  await pageA.getByRole('button', { name: 'Nouvelle tâche' }).first().click();
  await pageA.getByLabel('Titre').fill('Appeler le plombier');
  await pageA.getByRole('button', { name: 'Camille' }).click();
  await pageA.getByRole('button', { name: 'Ajouter la tâche' }).click();
  await expect(pageA.getByText('Appeler le plombier')).toBeVisible();

  await pageB.goto('/quotidien?tab=tasks');
  await pageB.getByRole('checkbox', { name: 'Marquer « Appeler le plombier » comme terminée' }).click();
  await expect(pageB.getByText('Rien à faire pour le moment.')).toBeVisible();
  await pageB.getByRole('button', { name: 'Terminées' }).click();
  await expect(pageB.getByText('Appeler le plombier')).toBeVisible();

  // --- Projets : gabarit voyage, étape cochée, note partagée, lien de B.
  await pageA.goto('/quotidien?tab=projects');
  await pageA.getByRole('button', { name: 'Nouveau projet' }).first().click();
  await pageA.getByLabel('Type de projet').selectOption('trip');
  await pageA.getByLabel('Nom du projet').fill('Lisbonne au printemps');
  await pageA.getByLabel('Budget (€)').fill('1500');
  await pageA.getByRole('button', { name: 'Créer le projet' }).click();
  await pageA.getByRole('link', { name: /Lisbonne au printemps/ }).click();
  await expect(pageA).toHaveURL(/\/projets\//);
  await expect(pageA.getByText('0/7 étapes')).toBeVisible();
  await pageA.getByRole('checkbox', { name: 'Étape : Choisir la destination et les dates' }).click();
  await expect(pageA.getByText('1/7 étapes')).toBeVisible();
  await pageA.getByRole('textbox', { name: 'Notes partagées' }).fill('Vols repérés à 90 €.');
  await pageA.getByRole('button', { name: 'Ajouter la note' }).click();
  await expect(pageA.getByText('Vols repérés à 90 €.')).toBeVisible();

  await pageB.goto(pageA.url());
  await expect(pageB.getByRole('heading', { name: 'Lisbonne au printemps' })).toBeVisible();
  await expect(pageB.getByText('Vols repérés à 90 €.')).toBeVisible();
  await expect(pageB.getByText('14 % réalisé')).toBeVisible();

  await ctxA.close();
  await ctxB.close();
});
