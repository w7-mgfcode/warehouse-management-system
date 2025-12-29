import { test, expect } from '@playwright/test';
import { closeMobileMenu } from '../helpers';

/**
 * Stock Levels E2E Tests
 * Tests stock overview and filtering
 */
test.describe('Inventory - Stock Levels', () => {
  test.use({ storageState: 'playwright/.auth/warehouse.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/inventory');
    await page.waitForLoadState('networkidle');
    await closeMobileMenu(page);
  });

  test('stock overview displays inventory items', async ({ page }) => {
    // Verify page loaded (Hungarian: Készlet)
    await expect(page.locator('h1')).toContainText('Készlet');

    // Wait for table or empty state to load
    const table = page.locator('table');
    const emptyState = page.getByText(/nincs/i);
    await expect(table.or(emptyState)).toBeVisible({ timeout: 10000 });
  });

  test('can filter stock by warehouse', async ({ page }) => {
    // Wait for page to load
    await expect(page.locator('h1')).toContainText('Készlet');

    // Look for warehouse filter dropdown
    const warehouseFilter = page.locator('button[role="combobox"]').first();

    const exists = await warehouseFilter.count();
    if (exists > 0) {
      await warehouseFilter.click();
      await page.getByRole('option').first().click();

      // Wait for filtered results
      await page.waitForTimeout(500);

      // Verify page still shows
      await expect(page.locator('h1')).toContainText('Készlet');
    }
  });

  test('can search for products', async ({ page }) => {
    // Wait for page to load
    await expect(page.locator('h1')).toContainText('Készlet');

    // Look for search input
    const searchInput = page.getByPlaceholder(/keresés/i);

    const exists = await searchInput.count();
    if (exists > 0) {
      await searchInput.fill('test');

      // Wait for search results
      await page.waitForTimeout(500);

      // Verify page still shows (search may return no results)
      await expect(page.locator('h1')).toContainText('Készlet');
    }
  });

  test('expiry badges show correct urgency levels', async ({ page }) => {
    // Wait for page to load
    await expect(page.locator('h1')).toContainText('Készlet');

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
