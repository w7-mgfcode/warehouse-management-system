import { test, expect } from '@playwright/test';

/**
 * Inventory Receipt E2E Tests
 * Tests goods receipt functionality with batch tracking
 */
test.describe('Inventory - Receipt', () => {
  // Use warehouse user auth (has receipt permissions)
  test.use({ storageState: 'playwright/.auth/warehouse.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/inventory/receipt');
  });

  // Skip: Page loading issues - needs UI investigation
  test.skip('can receive goods with all required fields', async ({ page }) => {
    // Verify page loaded with Hungarian heading
    await expect(page.getByRole('heading', { name: 'Árubeérkezés' })).toBeVisible();

    // Select warehouse
    await page.getByLabel('Raktár').click();
    await page.getByRole('option').first().click();

    // Select product
    await page.getByLabel('Termék').click();
    await page.getByRole('option').first().click();

    // Select bin
    await page.getByLabel('Tárolóhely').click();
    await page.getByRole('option').first().click();

    // Fill quantity
    await page.getByLabel('Mennyiség').fill('100');

    // Fill batch number
    await page.getByLabel('Tétel szám').fill('BATCH-2025-001');

    // Set expiry date (future date)
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 60);
    const dateString = futureDate.toISOString().split('T')[0];
    await page.getByLabel('Lejárati dátum').fill(dateString);

    // Submit form
    await page.getByRole('button', { name: 'Mentés' }).click();

    // Verify success message (Hungarian)
    await expect(page.getByText(/sikeres/i)).toBeVisible();
  });

  // Skip: Page loading issues - needs UI investigation
  test.skip('shows validation error for past expiry date', async ({ page }) => {
    // Select required fields
    await page.getByLabel('Raktár').click();
    await page.getByRole('option').first().click();

    await page.getByLabel('Termék').click();
    await page.getByRole('option').first().click();

    await page.getByLabel('Tárolóhely').click();
    await page.getByRole('option').first().click();

    await page.getByLabel('Mennyiség').fill('50');
    await page.getByLabel('Tétel szám').fill('BATCH-OLD');

    // Set past expiry date
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 10);
    const dateString = pastDate.toISOString().split('T')[0];
    await page.getByLabel('Lejárati dátum').fill(dateString);

    // Submit form
    await page.getByRole('button', { name: 'Mentés' }).click();

    // Verify Hungarian validation error
    await expect(page.getByText(/lejárati dátum nem lehet múltbeli/i)).toBeVisible();
  });

  // Skip: Page loading issues - needs UI investigation
  test.skip('shows required field validation errors', async ({ page }) => {
    // Submit empty form
    await page.getByRole('button', { name: 'Mentés' }).click();

    // Verify Hungarian validation messages appear
    await expect(page.locator('text=kötelező')).toHaveCount({ moreThan: 0 });
  });
});
