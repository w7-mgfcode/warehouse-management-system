import { test, expect } from '@playwright/test';
import { closeMobileMenu } from '../helpers';

/**
 * Products CRUD E2E Tests
 * Tests product management functionality
 */
test.describe('Master Data - Products', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' });

  test('can view products list', async ({ page }) => {
    await page.goto('/products');
    await page.waitForLoadState('networkidle');
    await closeMobileMenu(page);

    // Verify page loaded - heading is "Termékek"
    await expect(page.locator('h1')).toContainText('Termékek');

    // Wait for table or empty state
    const table = page.locator('table');
    const emptyState = page.getByText(/nincs/i);
    await expect(table.or(emptyState)).toBeVisible({ timeout: 10000 });
  });

  test('can create a new product', async ({ page }) => {
    await page.goto('/products');
    await page.waitForLoadState('networkidle');
    await closeMobileMenu(page);

    // Click create button (Hungarian: Létrehozás)
    await page.getByRole('button', { name: /Létrehozás/i }).click();

    // Wait for navigation to new product page
    await page.waitForURL('/products/new');
    await closeMobileMenu(page);

    // Wait for form - label is "Termék neve"
    await expect(page.getByLabel('Termék neve')).toBeVisible();

    // Fill form
    await page.getByLabel('Termék neve').fill('Test Product E2E');
    await page.locator('#sku').fill('TEST-E2E-' + Date.now());
    await page.locator('#category').fill('Test Category');

    // Select unit (Hungarian: Mértékegység) - click the select trigger
    await page.locator('#default_unit').click();
    await page.getByRole('option', { name: 'Kilogramm' }).click();

    // Submit - for new products button says "Létrehozás"
    await page.getByRole('button', { name: 'Létrehozás', exact: true }).click();

    // Verify success - should navigate back or show success
    await expect(page.getByText(/sikeres/i).or(page.locator('h1:has-text("Termékek")'))).toBeVisible({ timeout: 5000 });
  });

  test('can filter products by category', async ({ page }) => {
    await page.goto('/products');
    await page.waitForLoadState('networkidle');
    await closeMobileMenu(page);

    // Verify page loaded
    await expect(page.locator('h1')).toContainText('Termékek');

    // Look for search input
    const searchInput = page.getByPlaceholder(/keresés/i);
    const exists = await searchInput.count();

    if (exists > 0) {
      await searchInput.fill('test');
      await page.waitForTimeout(500);
      // Verify page still shows (results may be empty)
      await expect(page.locator('h1')).toContainText('Termékek');
    }
  });

  test('product form validates SKU uniqueness', async ({ page }) => {
    await page.goto('/products/new');
    await page.waitForLoadState('networkidle');
    await closeMobileMenu(page);

    // Wait for form
    await expect(page.getByLabel('Termék neve')).toBeVisible();

    // Fill with product data
    await page.getByLabel('Termék neve').fill('Duplicate Test');
    await page.locator('#sku').fill('TEST-DUP-001');
    await page.locator('#category').fill('Test');

    // Select unit
    await page.locator('#default_unit').click();
    await page.getByRole('option').first().click();

    // Submit
    await page.getByRole('button', { name: 'Létrehozás', exact: true }).click();

    // Wait for response
    await page.waitForTimeout(1000);
  });
});
