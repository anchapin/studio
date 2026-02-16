import { test, expect } from '@playwright/test';

test.describe('Deck Builder', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/deck-builder');
  });

  test('should load the deck builder page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText(/Deck/i);
  });

  test('should show card search input', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"], input[type="text"]').first();
    await expect(searchInput).toBeVisible();
  });

  test('should have format selector', async ({ page }) => {
    // Look for format-related elements
    const formatSelectors = page.locator('select, [role="combobox"]');
    const count = await formatSelectors.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should show deck list section', async ({ page }) => {
    // Look for any list or table that would contain deck cards
    const deckListArea = page.locator('ul, table, [class*="deck"], [data-testid="deck-list"]');
    await expect(deckListArea.first()).toBeVisible();
  });
});
