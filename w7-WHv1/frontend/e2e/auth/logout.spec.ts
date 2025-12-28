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

    // Verify logged in
    await expect(page.getByRole('heading', { name: 'Irányítópult' })).toBeVisible();

    // Open user menu
    await page.getByRole('button', { name: 'admin' }).click();

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

    // Logout
    await page.getByRole('button', { name: 'admin' }).click();
    await page.getByRole('menuitem', { name: 'Kijelentkezés' }).click();

    // Verify no auth token in local storage
    const authStore = await page.evaluate(() => localStorage.getItem('auth-storage'));
    expect(authStore).toBeNull();
  });
});
