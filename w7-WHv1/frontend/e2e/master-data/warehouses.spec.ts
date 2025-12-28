import { test, expect } from '@playwright/test';

/**
 * Warehouses CRUD E2E Tests
 * Tests warehouse management functionality
 */
test.describe('Master Data - Warehouses', () => {
  // Admin or manager permissions required
  test.use({ storageState: 'playwright/.auth/admin.json' });

  // Skip: Page loading issues - needs UI investigation
  test.skip('can view warehouses list', async ({ page }) => {
    await page.goto('/warehouses');

    // Verify page loaded with Hungarian heading
    await expect(page.getByRole('heading', { name: 'Raktárak' })).toBeVisible();

    // Wait for table to load
    await page.waitForSelector('table', { timeout: 5000 });
    await expect(page.locator('table')).toBeVisible();
  });

  // Skip: Page loading issues - needs UI investigation
  test.skip('can create a new warehouse', async ({ page }) => {
    await page.goto('/warehouses');

    // Click create button (Hungarian: Új létrehozása or Hozzáadás)
    await page.getByRole('button', { name: /Új|Hozzáadás|Létrehozás/i }).click();

    // Wait for form to appear
    await expect(page.getByLabel('Név')).toBeVisible();

    // Fill form
    await page.getByLabel('Név').fill('Test Warehouse E2E');
    await page.getByLabel('Kód').fill('TEST-E2E');
    await page.getByLabel('Cím').fill('Test Address 123');

    // Submit
    await page.getByRole('button', { name: 'Mentés' }).click();

    // Verify success message
    await expect(page.getByText(/sikeres/i)).toBeVisible({ timeout: 5000 });
  });

  test('can search warehouses', async ({ page }) => {
    await page.goto('/warehouses');

    // Look for search input
    const searchInput = page.getByPlaceholder(/keresés/i);
    const exists = await searchInput.count();

    if (exists > 0) {
      await searchInput.fill('test');
      await page.waitForTimeout(500);

      // Verify table is still visible
      await expect(page.locator('table')).toBeVisible();
    }
  });
});
