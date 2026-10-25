import { test, expect } from '@playwright/test';
import { apiCouple, uiLogin } from './fixtures';

test('page Premium : offres configurées, paiement indisponible sans clés, statut dans le profil', async ({ browser, request }) => {
  const { a } = await apiCouple(request);
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await uiLogin(page, a.email);
  await page.goto('/premium');
  await expect(page.getByRole('heading', { name: 'Premium Couple' })).toBeVisible();
  await expect(page.getByText("Vous utilisez l'offre gratuite.")).toBeVisible();
  // Les deux offres seedées sont listées avec leur prix ; sans clé Stripe, aucun bouton de paiement n'est présenté comme fonctionnel.
  await expect(page.getByText('4,99')).toBeVisible();
  await expect(page.getByText('29,99')).toBeVisible();
  await expect(page.getByText('Paiement en ligne bientôt disponible.').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Choisir cette offre' })).toHaveCount(0);
  await page.goto('/profil');
  await expect(page.getByText("Vous utilisez l'offre gratuite.")).toBeVisible();
  await ctx.close();
});
