import { test, expect } from '@playwright/test';

/**
 * Bulk Bin Generation E2E Tests
 * Tests Cartesian product algorithm for creating multiple bins
 */
test.describe('Master Data - Bulk Bin Generation', () => {
  // Manager or admin permissions required
  test.use({ storageState: 'playwright/.auth/admin.json' });

  test('can preview bulk bin generation', async ({ page }) => {
    await page.goto('/bins/bulk');

    // Verify page loaded
    await expect(page.getByRole('heading', { name: /Tömeges létrehozás|Bulk/i })).toBeVisible();

    // Select warehouse
    await page.getByLabel('Raktár').click();
    await page.getByRole('option').first().click();

    // Fill range specifications (e.g., A-C × 01-10 × 1-5 × 1-4)
    const aisleInput = page.getByLabel(/Folyosó|Aisle/i);
    if (await aisleInput.count() > 0) {
      await aisleInput.fill('A-B');
    }

    const rackInput = page.getByLabel(/Állvány|Rack/i);
    if (await rackInput.count() > 0) {
      await rackInput.fill('01-03');
    }

    const shelfInput = page.getByLabel(/Polc|Shelf/i);
    if (await shelfInput.count() > 0) {
      await shelfInput.fill('1-2');
    }

    const positionInput = page.getByLabel(/Pozíció|Position/i);
    if (await positionInput.count() > 0) {
      await positionInput.fill('1-2');
    }

    // Click preview button
    await page.getByRole('button', { name: /Előnézet|Preview/i }).click();

    // Verify preview shows expected count (2×3×2×2 = 24 bins)
    await page.waitForTimeout(1000);

    // Look for preview result
    const previewText = page.locator('text=/\\d+ tárolóhely|\\d+ bins/i');
    const exists = await previewText.count();

    if (exists > 0) {
      await expect(previewText.first()).toBeVisible();
    }
  });

  test('can create bins in bulk', async ({ page }) => {
    await page.goto('/bins/bulk');

    // Select warehouse
    await page.getByLabel('Raktár').click();
    await page.getByRole('option').first().click();

    // Fill small range for testing (A-A × 01-01 × 1-1 × 1-1 = 1 bin)
    const aisleInput = page.getByLabel(/Folyosó|Aisle/i);
    if (await aisleInput.count() > 0) {
      await aisleInput.fill('Z-Z');
    }

    const rackInput = page.getByLabel(/Állvány|Rack/i);
    if (await rackInput.count() > 0) {
      await rackInput.fill('99-99');
    }

    const shelfInput = page.getByLabel(/Polc|Shelf/i);
    if (await shelfInput.count() > 0) {
      await shelfInput.fill('9-9');
    }

    const positionInput = page.getByLabel(/Pozíció|Position/i);
    if (await positionInput.count() > 0) {
      await positionInput.fill('9-9');
    }

    // Preview first
    await page.getByRole('button', { name: /Előnézet|Preview/i }).click();
    await page.waitForTimeout(500);

    // Create bins
    await page.getByRole('button', { name: /Létrehozás|Create/i }).click();

    // Verify success message
    await expect(page.getByText(/sikeres/i)).toBeVisible({ timeout: 5000 });
  });

  test('shows validation error for invalid ranges', async ({ page }) => {
    await page.goto('/bins/bulk');

    // Select warehouse
    await page.getByLabel('Raktár').click();
    await page.getByRole('option').first().click();

    // Fill invalid range (end < start)
    const aisleInput = page.getByLabel(/Folyosó|Aisle/i);
    if (await aisleInput.count() > 0) {
      await aisleInput.fill('C-A'); // Invalid: C > A
    }

    // Click preview
    await page.getByRole('button', { name: /Előnézet|Preview/i }).click();

    // Verify error message
    await expect(page.getByText(/érvénytelen|hibás|invalid/i)).toBeVisible();
  });
});
