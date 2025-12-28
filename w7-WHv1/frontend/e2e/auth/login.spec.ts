import { test, expect } from '@playwright/test';

/**
 * Authentication E2E Tests
 * Tests login functionality with Hungarian UI validation
 */
test.describe('Authentication - Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('successful login redirects to dashboard', async ({ page }) => {
    // Fill login form using Hungarian labels
    await page.getByLabel('Felhasználónév').fill('admin');
    await page.getByLabel('Jelszó').fill('Admin123!');
    await page.getByRole('button', { name: 'Bejelentkezés' }).click();

    // Wait for navigation and verify Hungarian dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByRole('heading', { name: 'Irányítópult' })).toBeVisible();

    // Verify user menu shows admin username
    await expect(page.getByText('admin')).toBeVisible();
  });

  test('invalid credentials show Hungarian error message', async ({ page }) => {
    // Fill login form with wrong credentials
    await page.getByLabel('Felhasználónév').fill('wrong');
    await page.getByLabel('Jelszó').fill('wrong');
    await page.getByRole('button', { name: 'Bejelentkezés' }).click();

    // Verify Hungarian error message (exact text from backend i18n)
    await expect(
      page.locator('text=Érvénytelen felhasználónév vagy jelszó')
    ).toBeVisible();

    // Verify still on login page
    await expect(page).toHaveURL('/login');
  });

  test('empty form shows validation errors', async ({ page }) => {
    // Click submit without filling form
    await page.getByRole('button', { name: 'Bejelentkezés' }).click();

    // Verify Hungarian validation messages
    await expect(page.locator('text=A felhasználónév megadása kötelező')).toBeVisible();
    await expect(page.locator('text=A jelszó megadása kötelező')).toBeVisible();
  });

  test('login form has correct Hungarian labels', async ({ page }) => {
    // Verify all form elements have Hungarian text
    await expect(page.getByLabel('Felhasználónév')).toBeVisible();
    await expect(page.getByLabel('Jelszó')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Bejelentkezés' })).toBeVisible();
  });
});
