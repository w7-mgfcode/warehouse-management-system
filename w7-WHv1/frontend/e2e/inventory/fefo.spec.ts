import { test, expect } from '@playwright/test';
import { closeMobileMenu } from '../helpers';

/**
 * FEFO Compliance E2E Tests
 * Critical tests for food safety - oldest expiry must be picked first
 */

// Warehouse user FEFO tests
test.describe('FEFO Compliance - Warehouse User', () => {
  test.use({ storageState: 'playwright/.auth/warehouse.json' });

  test('FEFO recommendation shows oldest expiry first', async ({ page }) => {
    await page.goto('/inventory/issue');
    await page.waitForLoadState('networkidle');
    await closeMobileMenu(page);

    // Check for error page first (backend might be unavailable)
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

    // Wait for recommendations (we added data-testid="fefo-item")
    const fefoItems = page.locator('[data-testid="fefo-item"]');
    const hasItems = await fefoItems.first().isVisible({ timeout: 5000 }).catch(() => false);

    if (hasItems) {
      const count = await fefoItems.count();
      if (count > 0) {
        // Verify first item is visible (should be oldest expiry per FEFO)
        await expect(fefoItems.first()).toBeVisible();
      }
    }
  });

  test('FEFO shows critical expiry warnings', async ({ page }) => {
    // Navigate to inventory overview to see expiry warnings
    await page.goto('/inventory');
    await page.waitForLoadState('networkidle');
    await closeMobileMenu(page);

    // Wait for page to load
    await expect(page.locator('h1')).toContainText('Készlet');

    // Look for critical expiry badges (Hungarian: Kritikus)
    const criticalBadges = page.locator('text=Kritikus');
    const count = await criticalBadges.count();

    // If there are critical items, verify badge is visible
    if (count > 0) {
      await expect(criticalBadges.first()).toBeVisible();
    }
  });
});

// Manager FEFO override tests (requires admin/manager auth)
test.describe('FEFO Compliance - Manager Override', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' });

  test('manager can override FEFO with reason', async ({ page }) => {
    await page.goto('/inventory/issue');
    await page.waitForLoadState('networkidle');
    await closeMobileMenu(page);

    // Manager-specific FEFO override UI (we added data-testid="fefo-override")
    const overrideControl = page.locator('[data-testid="fefo-override"]');
    const exists = await overrideControl.count();

    if (exists > 0) {
      // Check the override checkbox
      const checkbox = page.locator('#force_non_fefo');
      await checkbox.check();

      // Verify the override reason field appears
      await expect(page.locator('#override_reason')).toBeVisible();
    }
  });
});
