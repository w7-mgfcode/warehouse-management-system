import { test as setup } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

/**
 * Authentication setup for Playwright tests
 * Creates storage states for different user roles
 * These files are reused across tests to avoid repeated logins
 */

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const authFile = {
  admin: path.join(__dirname, '../../playwright/.auth/admin.json'),
  manager: path.join(__dirname, '../../playwright/.auth/manager.json'),
  warehouse: path.join(__dirname, '../../playwright/.auth/warehouse.json'),
  viewer: path.join(__dirname, '../../playwright/.auth/viewer.json'),
};

// Ensure auth directory exists
const authDir = path.dirname(authFile.admin);
if (!fs.existsSync(authDir)) {
  fs.mkdirSync(authDir, { recursive: true });
}

/**
 * Setup admin user authentication
 */
setup('authenticate as admin', async ({ page }) => {
  await page.goto('http://localhost:5173/login');

  // Fill login form with admin credentials
  await page.getByLabel('Felhasználónév').fill('admin');
  await page.getByLabel('Jelszó').fill('Admin123!');
  await page.getByRole('button', { name: 'Bejelentkezés' }).click();

  // Wait for redirect to dashboard
  await page.waitForURL('http://localhost:5173/dashboard');

  // Save auth state
  await page.context().storageState({ path: authFile.admin });
});

/**
 * Setup warehouse user authentication
 * Note: Requires seeded warehouse user in database
 */
setup('authenticate as warehouse user', async ({ page }) => {
  await page.goto('http://localhost:5173/login');

  // Fill login form with warehouse credentials
  await page.getByLabel('Felhasználónév').fill('warehouse');
  await page.getByLabel('Jelszó').fill('Warehouse123!');
  await page.getByRole('button', { name: 'Bejelentkezés' }).click();

  // Wait for redirect to dashboard
  await page.waitForURL('http://localhost:5173/dashboard');

  // Save auth state
  await page.context().storageState({ path: authFile.warehouse });
});
