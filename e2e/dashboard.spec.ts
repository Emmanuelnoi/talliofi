import { test, expect } from '@playwright/test';
import { completeOnboarding } from './fixtures';

test.describe('Dashboard', () => {
  test('shows page heading', async ({ page }) => {
    await completeOnboarding(page);

    await expect(
      page.getByRole('heading', { level: 1, name: 'Dashboard' }),
    ).toBeVisible({ timeout: 15000 });
  });

  test('displays income summary', async ({ page }) => {
    await completeOnboarding(page);

    await expect(
      page.getByRole('heading', { level: 1, name: 'Dashboard' }),
    ).toBeVisible({ timeout: 15000 });

    // The onboarding fixture sets $5,000 monthly income (formatMoney includes decimals)
    await expect(page.getByText('$5,000.00')).toBeVisible();
    await expect(
      page.getByText('Monthly income after estimated tax.'),
    ).toBeVisible();
  });

  test('shows key numbers grid', async ({ page }) => {
    await completeOnboarding(page);

    await expect(
      page.getByRole('heading', { level: 1, name: 'Dashboard' }),
    ).toBeVisible({ timeout: 15000 });

    // Key numbers grid shows income, expenses, surplus/deficit, savings rate
    await expect(page.getByText('Net Income').first()).toBeVisible();
    await expect(page.getByText('Savings Rate')).toBeVisible();
  });

  test('renders expense chart area', async ({ page }) => {
    await completeOnboarding(page);

    await expect(
      page.getByRole('heading', { level: 1, name: 'Dashboard' }),
    ).toBeVisible({ timeout: 15000 });

    // With no expenses added, the donut chart shows its empty state
    await expect(page.getByText('No expenses recorded')).toBeVisible();
  });

  test('sidebar navigation links work from dashboard', async ({ page }) => {
    await completeOnboarding(page);

    await expect(
      page.getByRole('heading', { level: 1, name: 'Dashboard' }),
    ).toBeVisible({ timeout: 15000 });

    // Navigate to Expenses
    await page.getByRole('link', { name: 'Expenses' }).first().click();
    await page.waitForURL('**/expenses');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Expenses' }),
    ).toBeVisible();

    // Navigate to Goals
    await page.getByRole('link', { name: 'Goals' }).first().click();
    await page.waitForURL('**/goals');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Goals' }),
    ).toBeVisible();

    // Navigate back to Dashboard
    await page.getByRole('link', { name: 'Dashboard' }).first().click();
    await page.waitForURL(/\/$/);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Dashboard' }),
    ).toBeVisible();
  });

  test('loads correctly after page refresh', async ({ page }) => {
    await completeOnboarding(page);

    await expect(
      page.getByRole('heading', { level: 1, name: 'Dashboard' }),
    ).toBeVisible({ timeout: 15000 });

    // Refresh the page — IndexedDB data should persist
    await page.reload();

    await expect(
      page.getByRole('heading', { level: 1, name: 'Dashboard' }),
    ).toBeVisible({ timeout: 15000 });

    // Verify plan data survived the refresh
    await expect(page.getByText('$5,000.00')).toBeVisible();
  });
});
