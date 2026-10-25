import { test, type Page } from '@playwright/test';

const OUT = process.env.SHOT_DIR ?? 'e2e/screenshots';
const PAGES: [string, string][] = [
  ['landing', '/'], ['connexion', '/connexion'], ['accueil', '/accueil'], ['agenda', '/agenda'], ['jouer', '/jouer'], ['defis', '/defis'],
  ['intimite', '/intimite'], ['quotidien', '/quotidien'], ['projets', '/quotidien?tab=projects'], ['notifications', '/notifications'], ['premium', '/premium'], ['profil', '/profil'],
];

async function enterDemo(page: Page) {
  await page.goto('/connexion');
  await page.getByRole('button', { name: 'Explorer la démo' }).click();
  await page.waitForURL(/\/accueil/);
}
async function shot(page: Page, name: string, path: string, theme: 'light' | 'dark', width: number) {
  await page.setViewportSize({ width, height: width < 500 ? 844 : 900 });
  await page.goto(path);
  await page.evaluate((t) => { document.documentElement.setAttribute('data-theme', t); try { localStorage.setItem('en_theme', t); } catch { /* stockage indisponible */ } }, theme);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/${name}-${theme}-${width < 500 ? 'mobile' : 'desktop'}.png`, fullPage: true });
}

test('captures de toutes les pages en mode démo', async ({ page }) => {
  page.on('dialog', (d) => void d.accept());
  await enterDemo(page);
  // Espace Intimité complet : majorité confirmée, espace activé, signal « Ce soir ? » allumé.
  await page.goto('/intimite');
  await page.getByRole('button', { name: 'Je confirme avoir 18 ans ou plus' }).click();
  await page.getByRole('switch', { name: "Activer l'espace pour moi" }).click();
  await page.getByTestId('tonight-card').waitFor();
  await page.getByRole('switch', { name: 'Allumer le signal « Ce soir ? »' }).click();
  await page.waitForTimeout(600);
  // Les cartes du soir : paquet puis carte tirée au niveau Feu, clair et sombre.
  for (const theme of ['light', 'dark'] as const) {
    await shot(page, 'cartes-paquet', '/intimite/cartes', theme, 1280);
    await page.getByRole('radio', { name: /Feu/ }).click();
    await page.getByRole('button', { name: 'Tirer une carte' }).click();
    await page.getByTestId('current-card').waitFor();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT}/cartes-tiree-${theme}-desktop.png`, fullPage: true });
    await page.getByRole('button', { name: 'Terminer la soirée' }).click();
  }
  await shot(page, 'cartes-mobile', '/intimite/cartes', 'dark', 390);
  for (const [name, path] of PAGES) {
    await shot(page, name, path, 'light', 1280);
    await shot(page, name, path, 'dark', 1280);
    await shot(page, name, path, 'light', 390);
  }
  // Une partie en cours (dilemme) pour voir l'écran de jeu.
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/jouer');
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
  await page.getByRole('button', { name: 'Jouer' }).nth(2).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Lancer une partie' }).click();
  await page.waitForURL(/\/jouer\//);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/partie-light-desktop.png`, fullPage: true });
  await page.getByRole('button', { name: 'Sans téléphone' }).click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/partie-revelation-light-desktop.png`, fullPage: true });
});
