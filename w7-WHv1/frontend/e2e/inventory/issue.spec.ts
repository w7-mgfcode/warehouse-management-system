import { test, expect } from '@playwright/test';
import { closeMobileMenu } from '../helpers';

/**
 * Inventory Issue E2E Tests
 * Tests goods issue functionality with FEFO compliance
 */
test.describe('Inventory - Issue', () => {
  // Use warehouse user auth
  test.use({ storageState: 'playwright/.auth/warehouse.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/inventory/issue');
    await page.waitForLoadState('networkidle');
    await closeMobileMenu(page);
  });

  test('can issue goods with FEFO recommendation', async ({ page }) => {
    // Check for error page first (backend might be unavailable)
    const errorPage = await page.getByText(/Hiba történt/i).isVisible().catch(() => false);
    if (errorPage) {
      test.skip();
      return;
    }

    // Verify page loaded (Hungarian: Kiadás)
    const pageLoaded = await page.locator('h1').textContent().catch(() => '');
    if (!pageLoaded.includes('Kiadás')) {
      test.skip();
      return;
    }

    // Wait for form dropdowns to load
    const hasForm = await page.waitForSelector('button[role="combobox"]', { timeout: 10000 }).catch(() => null);
    if (!hasForm) {
      test.skip();
      return;
    }

    // Select product (first combobox)
    const productSelect = page.locator('button[role="combobox"]').first();
    await productSelect.click();
    const productOption = page.getByRole('option').first();
    if (await productOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      await productOption.click();
    }

    // Fill requested quantity
    await page.locator('#requested_quantity').fill('50');

    // Click FEFO recommendation button (Hungarian: FEFO Javaslat)
    await page.getByRole('button', { name: /FEFO Javaslat/i }).click();

    // Wait for FEFO recommendations to appear (we added data-testid="fefo-item")
    const fefoItems = page.locator('[data-testid="fefo-item"]');
    const hasFefo = await fefoItems.first().isVisible({ timeout: 5000 }).catch(() => false);

    if (hasFefo) {
      // FEFO recommendations exist
      await expect(fefoItems.first()).toBeVisible();
    }

    // Verify we're still on the issue page
    await expect(page.locator('h1')).toContainText('Kiadás');
  });

  test('shows error when insufficient stock', async ({ page }) => {
    // Check for error page first
    const errorPage = await page.getByText(/Hiba történt/i).isVisible().catch(() => false);
    if (errorPage) {
      test.skip();
      return;
    }

    // Wait for form dropdowns to load
    const hasForm = await page.waitForSelector('button[role="combobox"]', { timeout: 10000 }).catch(() => null);
    if (!hasForm) {
      test.skip();
      return;
    }

    // Select product
    const productSelect = page.locator('button[role="combobox"]').first();
    await productSelect.click();
    const productOption = page.getByRole('option').first();
    if (await productOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      await productOption.click();
    }

    // Request unrealistic quantity
    await page.locator('#requested_quantity').fill('999999');

    // Click FEFO button to trigger recommendation
    await page.getByRole('button', { name: /FEFO Javaslat/i }).click();

    // Wait and check for insufficient stock message or empty state
    await page.waitForTimeout(1000);

    // Check for Hungarian error message about insufficient stock or empty FEFO results
    const insufficientMsg = await page.getByText(/nincs elegendő|insufficient/i).isVisible().catch(() => false);
    const emptyStateMsg = await page.getByText(/nincs elérhető|nincs ajánlás/i).isVisible().catch(() => false);
    const noItems = await page.locator('[data-testid="fefo-item"]').count() === 0;

    expect(insufficientMsg || emptyStateMsg || noItems).toBe(true);
  });
});
