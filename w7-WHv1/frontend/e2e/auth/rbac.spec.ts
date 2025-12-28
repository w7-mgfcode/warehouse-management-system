import { test, expect } from '@playwright/test';

/**
 * Role-Based Access Control (RBAC) E2E Tests
 * Tests that different user roles have correct permissions
 */
test.describe('RBAC - Role-Based Access Control', () => {
  test('admin can access all features', async ({ page }) => {
    test.use({ storageState: 'playwright/.auth/admin.json' });

    await page.goto('/dashboard');

    // Verify admin can see all menu items
    await expect(page.getByRole('link', { name: 'Raktárak' })).toBeVisible(); // Warehouses
    await expect(page.getByRole('link', { name: 'Termékek' })).toBeVisible(); // Products
    await expect(page.getByRole('link', { name: 'Beszállítók' })).toBeVisible(); // Suppliers
    await expect(page.getByRole('link', { name: 'Tárolóhelyek' })).toBeVisible(); // Bins
    await expect(page.getByRole('link', { name: 'Készlet' })).toBeVisible(); // Inventory
    await expect(page.getByRole('link', { name: 'Felhasználók' })).toBeVisible(); // Users (admin only)
  });

  test('warehouse user cannot access admin features', async ({ page }) => {
    test.use({ storageState: 'playwright/.auth/warehouse.json' });

    await page.goto('/dashboard');

    // Verify warehouse user cannot see admin-only menu items
    await expect(page.getByRole('link', { name: 'Felhasználók' })).not.toBeVisible(); // Users

    // Try to access users page directly (should be blocked or redirect)
    await page.goto('/users');

    // Should show access denied or redirect to dashboard
    // Exact behavior depends on RoleGuard implementation
    const url = page.url();
    expect(url === '/dashboard' || url === '/403').toBeTruthy();
  });

  test('warehouse user can access inventory features', async ({ page }) => {
    test.use({ storageState: 'playwright/.auth/warehouse.json' });

    await page.goto('/dashboard');

    // Verify warehouse user can see inventory features
    await expect(page.getByRole('link', { name: 'Készlet' })).toBeVisible();

    // Navigate to inventory receipt
    await page.getByRole('link', { name: 'Készlet' }).click();
    await page.getByRole('link', { name: 'Árubeérkezés' }).click();

    // Verify can access the page
    await expect(page).toHaveURL(/\/inventory\/receipt/);
    await expect(page.getByRole('heading', { name: 'Árubeérkezés' })).toBeVisible();
  });
});
