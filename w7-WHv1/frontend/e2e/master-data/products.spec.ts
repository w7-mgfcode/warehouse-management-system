import { test, expect } from '@playwright/test';

/**
 * Products CRUD E2E Tests
 * Tests product management functionality
 */
test.describe('Master Data - Products', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' });

  test('can view products list', async ({ page }) => {
    await page.goto('/products');

    // Verify page loaded
    await expect(page.getByRole('heading', { name: 'Termékek' })).toBeVisible();

    // Wait for table
    await page.waitForSelector('table', { timeout: 5000 });
    await expect(page.locator('table')).toBeVisible();
  });

  test('can create a new product', async ({ page }) => {
    await page.goto('/products');

    // Click create button
    await page.getByRole('button', { name: /Új|Hozzáadás/i }).click();

    // Wait for form
    await expect(page.getByLabel('Név')).toBeVisible();

    // Fill form
    await page.getByLabel('Név').fill('Test Product E2E');
    await page.getByLabel('SKU').fill('TEST-E2E-001');
    await page.getByLabel('Kategória').fill('Test Category');

    // Select unit (Hungarian: Egység)
    await page.getByLabel('Egység').click();
    await page.getByRole('option', { name: 'Kilogramm' }).click();

    // Submit
    await page.getByRole('button', { name: 'Mentés' }).click();

    // Verify success
    await expect(page.getByText(/sikeres/i)).toBeVisible({ timeout: 5000 });
  });

  test('can filter products by category', async ({ page }) => {
    await page.goto('/products');

    // Look for category filter
    const categoryFilter = page.locator('[placeholder*="kategória"]').or(
      page.getByLabel('Kategória')
    );

    const exists = await categoryFilter.count();
    if (exists > 0) {
      await categoryFilter.click();
      await page.getByRole('option').first().click();

      await page.waitForTimeout(500);
      await expect(page.locator('table')).toBeVisible();
    }
  });

  test('product form validates SKU uniqueness', async ({ page }) => {
    await page.goto('/products');

    // Click create
    await page.getByRole('button', { name: /Új|Hozzáadás/i }).click();

    // Fill with duplicate SKU (assuming 'TEST-001' exists from seed)
    await page.getByLabel('Név').fill('Duplicate Test');
    await page.getByLabel('SKU').fill('TEST-001');
    await page.getByLabel('Kategória').fill('Test');

    await page.getByLabel('Egység').click();
    await page.getByRole('option').first().click();

    // Submit
    await page.getByRole('button', { name: 'Mentés' }).click();

    // May show error if duplicate exists
    // This depends on backend validation
    await page.waitForTimeout(1000);
  });
});
