import { test, expect } from '@playwright/test';
import { apiCouple, uiLogin } from './fixtures';

test('« On fait quoi ? » : quatre choix, propositions du catalogue, ajout à l\'agenda partagé', async ({ browser, request }) => {
  const { a, b } = await apiCouple(request);
  const ctxA = await browser.newContext();
  const pageA = await ctxA.newPage();
  await uiLogin(pageA, a.email);

  await pageA.getByRole('button', { name: 'On fait quoi ?' }).first().click();
  const dialog = pageA.getByRole('dialog');
  await dialog.getByRole('radio', { name: 'Ce soir' }).click();
  await dialog.getByRole('radio', { name: 'À deux' }).click();
  await dialog.getByRole('radio', { name: 'Petit budget' }).click();
  await dialog.getByRole('button', { name: 'Détente' }).click();
  await dialog.getByRole('button', { name: 'Voir les idées' }).click();
  await expect(dialog.getByText('Suggestions du catalogue')).toBeVisible();
  const firstIdea = dialog.locator('li').first();
  const title = (await firstIdea.locator('h3').textContent())!.trim();
  await firstIdea.getByRole('button', { name: "Ajouter à l'agenda" }).click();
  await dialog.getByRole('button', { name: 'Confirmer' }).click();
  await expect(dialog.getByText("C'est noté dans votre agenda.")).toBeVisible();
  await dialog.getByRole('link', { name: "Voir l'agenda" }).click();
  await expect(pageA).toHaveURL(/\/agenda/);

  // B voit l'événement partagé et l'invitation.
  const ctxB = await browser.newContext();
  const pageB = await ctxB.newPage();
  await uiLogin(pageB, b.email);
  await expect(pageB.getByText(title)).toBeVisible();
  await ctxA.close();
  await ctxB.close();
});
