import { Page } from '@playwright/test';

/**
 * Close any mobile menu dialogs that may be open
 */
export async function closeMobileMenu(page: Page): Promise<void> {
  // Wait a moment for any dialogs to appear
  await page.waitForTimeout(500);

  // Close mobile menu dialog if present
  const closeButton = page.getByRole('button', { name: 'Close' });
  if (await closeButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    await closeButton.click();
    await page.waitForTimeout(300);
  }
}

/**
 * Wait for page to be ready (loaded and any dialogs closed)
 */
export async function waitForPageReady(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await closeMobileMenu(page);
}
