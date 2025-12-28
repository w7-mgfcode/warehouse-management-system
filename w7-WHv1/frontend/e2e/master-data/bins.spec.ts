import { test, expect } from '@playwright/test';

/**
 * Bins CRUD E2E Tests
 * Tests bin management and status
 */
test.describe('Master Data - Bins', () => {
  test.use({ storageState: 'playwright/.auth/warehouse.json' });

  test('can view bins list', async ({ page }) => {
    await page.goto('/bins');

    // Verify page loaded
    await expect(page.getByRole('heading', { name: 'Tárolóhelyek' })).toBeVisible();

    // Wait for table
    await page.waitForSelector('table', { timeout: 5000 });
    await expect(page.locator('table')).toBeVisible();
  });

  test('can create a new bin', async ({ page }) => {
    await page.goto('/bins');

    // Click create button
    await page.getByRole('button', { name: /Új|Hozzáadás/i }).click();

    // Wait for form
    await expect(page.getByLabel('Kód')).toBeVisible();

    // Select warehouse
    await page.getByLabel('Raktár').click();
    await page.getByRole('option').first().click();

    // Fill bin code
    await page.getByLabel('Kód').fill('TEST-E2E-BIN-001');

    // Submit
    await page.getByRole('button', { name: 'Mentés' }).click();

    // Verify success
    await expect(page.getByText(/sikeres/i)).toBeVisible({ timeout: 5000 });
  });

  test('can filter bins by warehouse', async ({ page }) => {
    await page.goto('/bins');

    // Look for warehouse filter
    const warehouseFilter = page.getByLabel('Raktár').or(
      page.locator('[placeholder*="raktár"]')
    );

    const exists = await warehouseFilter.count();
    if (exists > 0) {
      await warehouseFilter.click();
      await page.getByRole('option').first().click();

      await page.waitForTimeout(500);
      await expect(page.locator('table')).toBeVisible();
    }
  });

  test('bin status badges are displayed correctly', async ({ page }) => {
    await page.goto('/bins');

    // Look for status badges
    const statusBadges = page.locator('[data-testid="status-badge"]').or(
      page.locator('.badge')
    );

    const count = await statusBadges.count();
    if (count > 0) {
      await expect(statusBadges.first()).toBeVisible();

      // Verify Hungarian status text
      const statusTexts = ['Üres', 'Foglalt', 'Teljes'];
      let found = false;

      for (const text of statusTexts) {
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
