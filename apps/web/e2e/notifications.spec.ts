import { test, expect } from '@playwright/test';
import { API, apiCouple, uiLogin } from './fixtures';

test('notifications : centre, badge non lus et réglages', async ({ browser, request }) => {
  const { a, b } = await apiCouple(request);
  // A invite B à un événement via l'API : B reçoit une notification « Nouvelle invitation ».
  const start = new Date(Date.now() + 3 * 86_400_000).toISOString();
  const end = new Date(Date.now() + 3 * 86_400_000 + 3_600_000).toISOString();
  const ev = await request.post(`${API}/calendar/events`, { headers: a.headers, data: { title: 'Brunch', startAt: start, endAt: end, invitePartner: true } });
  expect(ev.ok()).toBeTruthy();

  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await uiLogin(page, b.email);
  await expect(page.getByLabel(/Notifications \(\d+\)/).first()).toBeVisible();
  await page.getByLabel(/Notifications \(\d+\)/).first().click();
  await expect(page).toHaveURL(/\/notifications/);
  await expect(page.getByText('Nouvelle invitation')).toBeVisible();
  await page.getByRole('button', { name: 'Tout marquer comme lu' }).click();
  await expect(page.getByLabel('Notifications', { exact: true }).first()).toBeVisible();

  // Réglages : désactiver le push des suggestions et définir des heures silencieuses.
  await page.goto('/profil/notifications');
  await page.getByLabel('Push Suggestions').click();
  await page.getByLabel('De').fill('22:00');
  await page.getByLabel('À').fill('08:00');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByText('Préférences enregistrées.')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Push Suggestions')).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByLabel('De')).toHaveValue('22:00');
  await ctx.close();
});
