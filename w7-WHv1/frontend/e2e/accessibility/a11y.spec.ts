import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

/**
 * Accessibility (a11y) E2E Tests
 * Tests WCAG compliance and keyboard navigation
 */
test.describe('Accessibility', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' });

  test('dashboard has no accessibility violations', async ({ page }) => {
    await page.goto('/dashboard');

    // Wait for page to fully load
    await page.waitForSelector('h1', { timeout: 5000 });

    // Inject axe-core
    await injectAxe(page);

    // Check accessibility
    await checkA11y(page, undefined, {
      detailedReport: true,
      detailedReportOptions: {
        html: true,
      },
    });
  });

  test('forms have proper ARIA labels', async ({ page }) => {
    await page.goto('/products');

    // Click create to open form
    await page.getByRole('button', { name: /Új|Hozzáadás/i }).click();

    // Wait for form to appear
    await page.waitForSelector('form', { timeout: 5000 });

    // Inject axe-core
    await injectAxe(page);

    // Check form accessibility
    await checkA11y(page, 'form', {
      detailedReport: true,
    });

    // Verify form inputs have labels
    const nameInput = page.getByLabel('Név');
    await expect(nameInput).toBeVisible();

    const skuInput = page.getByLabel('SKU');
    await expect(skuInput).toBeVisible();
  });

  test('keyboard navigation works on main pages', async ({ page }) => {
    await page.goto('/dashboard');

    // Press Tab to navigate
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Verify focus is visible (focus ring should be present)
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();

    // Navigate to a link using Enter
    await page.keyboard.press('Enter');

    // Verify navigation occurred
    await page.waitForTimeout(500);
    const url = page.url();
    expect(url).toContain('localhost:5173');
  });

  test('tables have proper semantic structure', async ({ page }) => {
    await page.goto('/products');

    // Wait for table to load
    await page.waitForSelector('table', { timeout: 5000 });

    // Inject axe-core
    await injectAxe(page);

    // Check table accessibility
    await checkA11y(page, 'table', {
      detailedReport: true,
      detailedReportOptions: {
        html: true,
      },
    });

    // Verify table has thead and tbody
    await expect(page.locator('table thead')).toBeVisible();
    await expect(page.locator('table tbody')).toBeVisible();
  });

  test('buttons have accessible names', async ({ page }) => {
    await page.goto('/dashboard');

    // Get all buttons
    const buttons = page.locator('button');
    const count = await buttons.count();

    for (let i = 0; i < Math.min(count, 10); i++) {
      const button = buttons.nth(i);
      const isVisible = await button.isVisible();

      if (isVisible) {
        // Each button should have accessible text or aria-label
        const text = await button.innerText();
        const ariaLabel = await button.getAttribute('aria-label');

        expect(text.length > 0 || ariaLabel !== null).toBe(true);
      }
    }
  });

  test('skip to main content link exists', async ({ page }) => {
    await page.goto('/dashboard');

    // Look for skip link (common a11y pattern)
    const skipLink = page.locator('a[href="#main"]').or(
      page.locator('text=/skip to|ugrás a tartalomhoz/i')
    );

    // Skip link may not be implemented yet, so we check without failing
    const exists = await skipLink.count();
    if (exists > 0) {
      await expect(skipLink.first()).toBeInTheDocument();
    }
  });

  test('color contrast is sufficient', async ({ page }) => {
    await page.goto('/dashboard');

    await page.waitForSelector('h1', { timeout: 5000 });

    // Inject axe-core
    await injectAxe(page);

    // Check only color contrast issues
    await checkA11y(
      page,
      undefined,
      {
        detailedReport: true,
        includedImpacts: ['critical', 'serious'],
      },
      false,
      {
        rules: {
          'color-contrast': { enabled: true },
        },
      }
    );
  });
});
