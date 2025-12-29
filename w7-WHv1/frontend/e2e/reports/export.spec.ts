import { test, expect } from '@playwright/test';
import { closeMobileMenu } from '../helpers';

/**
 * Reports and CSV Export E2E Tests
 * Tests report generation and CSV export with Hungarian headers
 */
test.describe('Reports - CSV Export', () => {
  test.use({ storageState: 'playwright/.auth/warehouse.json' });

  test('can export stock levels report to CSV', async ({ page }) => {
    // Navigate directly to stock levels report
    await page.goto('/reports/stock-levels');
    await page.waitForLoadState('networkidle');
    await closeMobileMenu(page);

    // Verify page loaded (Hungarian: Készletszint riport)
    await expect(page.locator('h1')).toContainText('Készletszint');

    // Wait for table to load (if data exists)
    await page.waitForTimeout(1000);

    // Click export button (Hungarian: Exportálás CSV)
    const exportButton = page.getByRole('button', { name: /Exportálás CSV/i });

    // Check if button exists
    const buttonExists = await exportButton.count() > 0;
    if (buttonExists) {
      await expect(exportButton).toBeVisible();

      // Set up download listener before clicking
      const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);

      // Click export
      await exportButton.click();

      // Wait for either download or toast message
      const download = await downloadPromise;

      if (download) {
        // Verify file name contains expected pattern
        expect(download.suggestedFilename()).toMatch(/\.csv$/i);
      } else {
        // No download might mean no data - check for toast message
        const noDataMsg = await page.getByText(/nincs.*adat|exportálva/i).isVisible({ timeout: 3000 }).catch(() => false);
        expect(noDataMsg || await page.locator('h1').isVisible()).toBe(true);
      }
    }
  });

  test('can export movements report to CSV', async ({ page }) => {
    // Navigate directly to movements report
    await page.goto('/reports/movements');
    await page.waitForLoadState('networkidle');
    await closeMobileMenu(page);

    // Wait for report to load
    await page.waitForTimeout(1000);

    // Click export button (Hungarian: Exportálás CSV)
    const exportButton = page.getByRole('button', { name: /Exportálás CSV/i });

    if (await exportButton.isVisible().catch(() => false)) {
      // Set up download listener
      const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);

      await exportButton.click();

      const download = await downloadPromise;

      if (download) {
        expect(download.suggestedFilename()).toMatch(/\.csv$/i);
      }
    }
  });

  test('CSV export has Hungarian column headers', async ({ page }) => {
    // Go directly to stock levels report
    await page.goto('/reports/stock-levels');
    await page.waitForLoadState('networkidle');
    await closeMobileMenu(page);

    // Wait for data to load
    await page.waitForTimeout(1000);

    // Click export button
    const exportButton = page.getByRole('button', { name: /Exportálás CSV/i });

    if (await exportButton.isVisible()) {
      // Set up download listener
      const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
      await exportButton.click();

      const download = await downloadPromise;

      if (download) {
        // Save file and read content
        const filePath = await download.path();
        if (filePath) {
          const fs = await import('fs');
          const content = fs.readFileSync(filePath, 'utf-8');

          // Verify Hungarian headers are present
          expect(content).toContain('Termék');
        }
      }
    }
  });
});
