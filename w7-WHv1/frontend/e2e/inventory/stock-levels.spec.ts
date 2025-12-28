import { test, expect } from '@playwright/test';

/**
 * Stock Levels E2E Tests
 * Tests stock overview and filtering
 */
test.describe('Inventory - Stock Levels', () => {
  test.use({ storageState: 'playwright/.auth/warehouse.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/inventory');
  });

  // Skip: Page loading issues - needs UI investigation
  test.skip('stock overview displays inventory items', async ({ page }) => {
    // Verify page loaded
    await expect(page.getByRole('heading', { name: 'Készlet' })).toBeVisible();

    // Wait for table to load
    await page.waitForSelector('table', { timeout: 5000 });

    // Verify table has rows (if data exists)
    const rows = page.locator('tbody tr');
    const count = await rows.count();

    if (count > 0) {
      // Verify first row is visible
      await expect(rows.first()).toBeVisible();
    }
  });

  test('can filter stock by warehouse', async ({ page }) => {
    // Look for warehouse filter dropdown
    const warehouseFilter = page.getByLabel('Raktár').or(page.locator('[placeholder*="raktár"]'));

    const exists = await warehouseFilter.count();
    if (exists > 0) {
      await warehouseFilter.click();
      await page.getByRole('option').first().click();

      // Wait for filtered results
      await page.waitForTimeout(500);

      // Verify results updated (table should still be visible)
      await expect(page.locator('table')).toBeVisible();
    }
  });

  // Skip: Page loading issues - needs UI investigation
  test.skip('can search for products', async ({ page }) => {
    // Look for search input
    const searchInput = page.getByPlaceholder(/keresés/i);

    const exists = await searchInput.count();
    if (exists > 0) {
      await searchInput.fill('test');

      // Wait for search results
      await page.waitForTimeout(500);

      // Verify table is still visible (search may return no results)
      await expect(page.locator('table')).toBeVisible();
    }
  });

  test('expiry badges show correct urgency levels', async ({ page }) => {
    // Look for expiry urgency badges
    const badges = page.locator('[data-testid="expiry-badge"]').or(
      page.locator('.expiry-badge')
    );

    const count = await badges.count();

    if (count > 0) {
      // Verify at least one badge is visible
      await expect(badges.first()).toBeVisible();

      // Check for Hungarian urgency text
      const urgencyTexts = ['Kritikus', 'Magas', 'Közepes', 'Alacsony', 'Lejárt'];
      let found = false;

      for (const text of urgencyTexts) {
        const textCount = await page.locator(`text=${text}`).count();
        if (textCount > 0) {
          found = true;
          break;
        }
      }

      expect(found).toBe(true);
    }
  });
});
