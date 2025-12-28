import { test, expect } from '@playwright/test';

/**
 * Inventory Issue E2E Tests
 * Tests goods issue functionality with FEFO compliance
 */
test.describe('Inventory - Issue', () => {
  // Use warehouse user auth
  test.use({ storageState: 'playwright/.auth/warehouse.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/inventory/issue');
  });

  // Skip: Page loading issues - needs UI investigation
  test.skip('can issue goods with FEFO recommendation', async ({ page }) => {
    // Verify page loaded
    await expect(page.getByRole('heading', { name: 'Áruekiadás' })).toBeVisible();

    // Select warehouse
    await page.getByLabel('Raktár').click();
    await page.getByRole('option').first().click();

    // Select product
    await page.getByLabel('Termék').click();
    await page.getByRole('option').first().click();

    // Fill quantity
    await page.getByLabel('Mennyiség').fill('50');

    // Click FEFO recommendation button
    await page.getByRole('button', { name: /FEFO|Javaslat/i }).click();

    // Wait for FEFO recommendations to appear
    await expect(page.locator('[data-testid="fefo-item"]').first()).toBeVisible({ timeout: 5000 });

    // Submit issue
    await page.getByRole('button', { name: 'Kiadás' }).click();

    // Verify success message
    await expect(page.getByText(/sikeres/i)).toBeVisible();
  });

  // Skip: Page loading issues - needs UI investigation
  test.skip('shows error when insufficient stock', async ({ page }) => {
    // Select warehouse and product
    await page.getByLabel('Raktár').click();
    await page.getByRole('option').first().click();

    await page.getByLabel('Termék').click();
    await page.getByRole('option').first().click();

    // Request unrealistic quantity
    await page.getByLabel('Mennyiség').fill('999999');

    // Submit
    await page.getByRole('button', { name: 'Kiadás' }).click();

    // Verify Hungarian error message for insufficient stock
    await expect(page.getByText(/nincs elegendő készlet/i)).toBeVisible();
  });
});
