import { test, expect } from '@playwright/test';
import { apiCouple, uiLogin } from './fixtures';

test('agenda partagé : création, visibilité « Occupé », privé invisible, invitation', async ({ browser, request }) => {
  const { a, b } = await apiCouple(request);
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();
  await uiLogin(pageA, a.email);
  await uiLogin(pageB, b.email);

  // A crée un événement partagé avec invitation.
  await pageA.goto('/agenda');
  await pageA.getByRole('button', { name: 'Nouvel événement' }).click();
  await pageA.getByLabel('Titre', { exact: true }).fill('Dîner chez Nadia');
  // Tous les événements sont créés aujourd'hui pour rester dans la vue courante quelle que soit la date d'exécution.
  const start = new Date();
  start.setHours(22, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  const local = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  await pageA.getByLabel('Début').fill(local(start));
  await pageA.getByLabel('Fin').fill(local(new Date(start.getTime() + 90 * 60_000)));
  await pageA.getByLabel('Inviter Camille').click();
  await pageA.getByLabel('Lieu').fill('Lyon');
  await pageA.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(pageA.getByRole('button', { name: /Dîner chez Nadia/ }).first()).toBeVisible();

  // B voit l'événement (temps réel ou rechargement) et peut accepter l'invitation.
  await pageB.goto('/agenda');
  await expect(pageB.getByRole('button', { name: /Dîner chez Nadia/ }).first()).toBeVisible();
  await pageB.getByRole('button', { name: /Dîner chez Nadia/ }).first().click();
  await expect(pageB.getByText('En attente de réponse')).toBeVisible();
  await pageB.getByRole('button', { name: "J'accepte" }).click();
  await expect(pageB.getByText('En attente de réponse')).toBeHidden();

  // A crée un événement « Occupé uniquement » : B ne voit ni titre ni lieu.
  await pageA.getByRole('button', { name: 'Nouvel événement' }).click();
  await pageA.getByLabel('Titre', { exact: true }).fill('Rendez-vous médical confidentiel');
  const busyStart = new Date(start.getTime() - 2 * 3_600_000);
  await pageA.getByLabel('Début').fill(local(busyStart));
  await pageA.getByLabel('Fin').fill(local(new Date(busyStart.getTime() + 3_600_000)));
  await pageA.getByRole('radio', { name: /^Occupé uniquement/ }).check();
  await pageA.getByLabel('Lieu').fill('Cabinet du Dr Martin');
  await pageA.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(pageA.getByRole('button', { name: /Rendez-vous médical/ }).first()).toBeVisible();

  await pageB.reload();
  await expect(pageB.getByRole('button', { name: /^Occupé/ }).first()).toBeVisible();
  await expect(pageB.getByText('Rendez-vous médical')).toHaveCount(0);
  await expect(pageB.getByText('Dr Martin')).toHaveCount(0);

  // A crée un événement privé : totalement invisible pour B.
  await pageA.getByRole('button', { name: 'Nouvel événement' }).click();
  await pageA.getByLabel('Titre', { exact: true }).fill('Préparer la surprise');
  const privStart = new Date(start.getTime() - 4 * 3_600_000);
  await pageA.getByLabel('Début').fill(local(privStart));
  await pageA.getByLabel('Fin').fill(local(new Date(privStart.getTime() + 3_600_000)));
  await pageA.getByRole('radio', { name: /^Privé/ }).check();
  await pageA.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(pageA.getByRole('button', { name: /Préparer la surprise/ }).first()).toBeVisible();
  await pageB.reload();
  await expect(pageB.getByText('Préparer la surprise')).toHaveCount(0);

  // Le tableau de bord de B liste les événements à venir visibles.
  await pageB.goto('/accueil');
  await expect(pageB.getByText('Dîner chez Nadia')).toBeVisible();
  await expect(pageB.getByText('Préparer la surprise')).toHaveCount(0);

  await pageA.goto('/agenda');
  await expect(pageA.getByRole('button', { name: /Dîner chez Nadia/ }).first()).toBeVisible();
  await pageA.screenshot({ path: 'e2e/screenshots/agenda-semaine.png' });
  await ctxA.close();
  await ctxB.close();
});
