import { test, expect } from '@playwright/test';
import { completeOnboarding } from './fixtures';

test.describe('Settings page', () => {
  test.beforeEach(async ({ page }) => {
    await completeOnboarding(page);

    // Navigate to settings via sidebar
    await page.getByRole('link', { name: 'Settings' }).click();
    await page.waitForURL('**/settings');
  });

  test('loads with heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', { level: 1, name: 'Settings' }),
    ).toBeVisible({ timeout: 10000 });
  });

  test('shows data management section', async ({ page }) => {
    // Verify the export and import sections are present
    await expect(page.getByText('Export Data')).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText('Delete All Data')).toBeVisible();
  });

  test('shows activity history section', async ({ page }) => {
    await expect(page.getByText('Activity History')).toBeVisible({
      timeout: 10000,
    });
  });

  test('keyboard shortcuts help dialog', async ({ page }) => {
    // Wait for page to be ready
    await expect(
      page.getByRole('heading', { level: 1, name: 'Settings' }),
    ).toBeVisible({ timeout: 10000 });

    // Press "?" to open keyboard shortcuts dialog
    await page.keyboard.press('?');

    // Verify the dialog appears with the expected title
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await expect(
      dialog.getByText('Keyboard shortcuts', { exact: true }),
    ).toBeVisible();

    // Close with Escape
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
  });

  test('navigate to all main pages from settings', async ({ page }) => {
    await expect(
      page.getByRole('heading', { level: 1, name: 'Settings' }),
    ).toBeVisible({ timeout: 10000 });

    // Dashboard (use .first() to target sidebar link)
    await page.getByRole('link', { name: 'Dashboard' }).first().click();
    await page.waitForURL(/\/$/);

    await expect(
      page.getByRole('heading', { level: 1, name: 'Dashboard' }),
    ).toBeVisible({ timeout: 10000 });

    // Back to settings
    await page.getByRole('link', { name: 'Settings' }).click();
    await page.waitForURL('**/settings');

    // Expenses (use .first() to avoid strict mode error from sidebar + page links)
    await page.getByRole('link', { name: 'Expenses' }).first().click();
    await page.waitForURL('**/expenses');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Expenses' }),
    ).toBeVisible({ timeout: 10000 });

    // Back to settings
    await page.getByRole('link', { name: 'Settings' }).click();
    await page.waitForURL('**/settings');

    // Goals
    await page.getByRole('link', { name: 'Goals' }).first().click();
    await page.waitForURL('**/goals');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Goals' }),
    ).toBeVisible({ timeout: 10000 });

    // Back to settings
    await page.getByRole('link', { name: 'Settings' }).click();
    await page.waitForURL('**/settings');

    // Reports
    await page.getByRole('link', { name: 'Reports' }).first().click();
    await page.waitForURL('**/reports');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Reports' }),
    ).toBeVisible({ timeout: 10000 });
  });
});
