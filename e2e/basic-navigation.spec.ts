import { test, expect } from '@playwright/test';

test.describe('Basic Navigation', () => {
  test('should load the dashboard', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Planar Nexus/i);
  });

  test('should navigate to deck builder', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Deck Builder');
    await expect(page).toHaveURL(/.*deck-builder/);
  });

  test('should navigate to single player', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Single Player');
    await expect(page).toHaveURL(/.*single-player/);
  });

  test('should navigate to multiplayer', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Multiplayer');
    await expect(page).toHaveURL(/.*multiplayer/);
  });

  test('should navigate to deck coach', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Deck Coach');
    await expect(page).toHaveURL(/.*deck-coach/);
  });
});
