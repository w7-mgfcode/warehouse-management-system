import { test, expect } from '@playwright/test';

/**
 * Logout E2E Tests
 * Tests logout functionality and session cleanup
 */
test.describe('Authentication - Logout', () => {
  // Use admin auth state for these tests
  test.use({ storageState: 'playwright/.auth/admin.json' });

  test('user can logout successfully', async ({ page }) => {
    await page.goto('/dashboard');

    // Close any dialog/mobile menu if open
    const closeButton = page.getByRole('button', { name: 'Close' });
    if (await closeButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await closeButton.click();
    }

    // Verify logged in - use h1 directly
    await expect(page.locator('h1')).toContainText('Irányítópult', { timeout: 10000 });

    // Open user menu (uses aria-label from header.tsx)
    await page.getByRole('button', { name: /Felhasználói menü/i }).click();

    // Click logout (Hungarian: Kijelentkezés)
    await page.getByRole('menuitem', { name: 'Kijelentkezés' }).click();

    // Verify redirect to login page
    await expect(page).toHaveURL('/login');

    // Try to access dashboard directly (should redirect to login)
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login');
  });

  test('logout clears authentication state', async ({ page }) => {
    await page.goto('/dashboard');

    // Close any dialog/mobile menu if open
    const closeButton = page.getByRole('button', { name: 'Close' });
    if (await closeButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await closeButton.click();
    }

    // Wait for dashboard to load
    await expect(page.locator('h1')).toContainText('Irányítópult', { timeout: 10000 });

    // Logout (open user menu using aria-label)
    await page.getByRole('button', { name: /Felhasználói menü/i }).click();
    await page.getByRole('menuitem', { name: 'Kijelentkezés' }).click();

    // Wait for logout redirect
    await expect(page).toHaveURL('/login');

    // Verify auth store is cleared (key is 'wms-auth' from auth-store.ts)
    const authStore = await page.evaluate(() => localStorage.getItem('wms-auth'));
    if (authStore) {
      const parsed = JSON.parse(authStore);
      // After logout, state should have null values
      expect(parsed.state.refreshToken).toBeNull();
      expect(parsed.state.isAuthenticated).toBeFalsy();
    }
  });
});
