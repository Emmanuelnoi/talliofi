import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * Completes the onboarding wizard with a single "Essentials" bucket
 * so the rest of the tests have a plan to work with.
 */
async function completeOnboarding(page: Page): Promise<void> {
  await page.goto('/onboarding');

  // Step 1: Income
  await page.locator('#grossIncomeDollars').fill('5000');
  await page.locator('#incomeFrequency').click();
  await page.getByRole('option', { name: 'Monthly', exact: true }).click();
  await page.getByRole('button', { name: 'Continue' }).click();

  // Step 2: Taxes
  await page.locator('#effectiveRate').fill('25');
  await page.getByRole('button', { name: 'Continue' }).click();

  // Step 3: Buckets
  await page.locator('#buckets\\.0\\.name').fill('Essentials');
  await page.locator('#buckets\\.0\\.targetPercentage').fill('50');
  await page.getByRole('button', { name: 'Continue' }).click();

  // Step 4: Skip expenses
  await page.getByRole('button', { name: 'Skip' }).click();

  // Step 5: Create plan
  await page.getByRole('button', { name: 'Create plan' }).click();

  // Wait for dashboard to be fully loaded
  await page.waitForURL('**/dashboard');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Dashboard' }),
  ).toBeVisible();
}

test.describe('Expenses page', () => {
  test('shows empty state when no expenses exist', async ({ page }) => {
    await completeOnboarding(page);

    // Navigate to expenses
    await page.getByRole('link', { name: 'Expenses' }).click();
    await page.waitForURL('**/expenses');

    // Wait for page to load with proper content (not the "complete onboarding" state)
    await expect(
      page.getByText('Track and manage your recurring expenses'),
    ).toBeVisible({ timeout: 10000 });

    // Verify empty state
    await expect(page.getByText('No expenses yet')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Add your first expense' }),
    ).toBeVisible();
  });

  test('adds a new expense from the page header button', async ({ page }) => {
    await completeOnboarding(page);

    // Navigate to expenses
    await page.getByRole('link', { name: 'Expenses' }).click();
    await page.waitForURL('**/expenses');

    // Wait for page to be ready
    await expect(
      page.getByText('Track and manage your recurring expenses'),
    ).toBeVisible({ timeout: 10000 });

    // Click "Add expense" button in page header
    await page.getByRole('button', { name: 'Add expense' }).click();

    // Fill out the expense form in the sheet
    await page.locator('#expense-name').fill('Rent');

    // Fill amount - the MoneyInput might be a custom component
    const amountInput = page.locator('#expense-amount');
    await amountInput.fill('1500');

    // Select frequency
    await page.locator('#expense-frequency').click();
    await page.getByRole('option', { name: 'Monthly', exact: true }).click();

    // Select category
    await page.locator('#expense-category').click();
    await page.getByRole('option', { name: 'Housing' }).click();

    // Select bucket
    await page.locator('#expense-bucket').click();
    await page.getByRole('option', { name: 'Essentials' }).click();

    // Submit the form
    await page.getByRole('button', { name: 'Add expense' }).click();

    // Wait for the sheet to close and the expense to appear in the list
    await expect(
      page.locator('.truncate.font-medium', { hasText: 'Rent' }),
    ).toBeVisible();
    await expect(
      page.locator('span', { hasText: 'Housing' }).first(),
    ).toBeVisible();
  });

  test('adds expense from empty state action button', async ({ page }) => {
    await completeOnboarding(page);

    // Navigate to expenses
    await page.getByRole('link', { name: 'Expenses' }).click();
    await page.waitForURL('**/expenses');

    // Wait for page to be ready
    await expect(
      page.getByText('Track and manage your recurring expenses'),
    ).toBeVisible({ timeout: 10000 });

    // Click action in empty state
    await page.getByRole('button', { name: 'Add your first expense' }).click();

    // Fill the form
    await page.locator('#expense-name').fill('Groceries');
    await page.locator('#expense-amount').fill('400');

    // Select frequency
    await page.locator('#expense-frequency').click();
    await page.getByRole('option', { name: 'Monthly', exact: true }).click();

    // Select category
    await page.locator('#expense-category').click();
    await page.getByRole('option', { name: 'Groceries' }).click();

    // Select bucket
    await page.locator('#expense-bucket').click();
    await page.getByRole('option', { name: 'Essentials' }).click();

    // Submit
    await page.getByRole('button', { name: 'Add expense' }).click();

    // Verify it appears in the list
    await expect(
      page.locator('.truncate.font-medium', { hasText: 'Groceries' }),
    ).toBeVisible();
  });

  test('expense is reflected on the dashboard', async ({ page }) => {
    await completeOnboarding(page);

    // Navigate to expenses and add one
    await page.getByRole('link', { name: 'Expenses' }).click();
    await page.waitForURL('**/expenses');

    // Wait for page to be ready
    await expect(
      page.getByText('Track and manage your recurring expenses'),
    ).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: 'Add expense' }).click();
    await page.locator('#expense-name').fill('Internet');
    await page.locator('#expense-amount').fill('80');

    await page.locator('#expense-frequency').click();
    await page.getByRole('option', { name: 'Monthly', exact: true }).click();

    await page.locator('#expense-category').click();
    await page.getByRole('option', { name: 'Utilities' }).click();

    await page.locator('#expense-bucket').click();
    await page.getByRole('option', { name: 'Essentials' }).click();

    await page.getByRole('button', { name: 'Add expense' }).click();

    // Wait for expense to be saved
    await expect(page.getByText('Internet')).toBeVisible();

    // Navigate to dashboard
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await page.waitForURL('**/dashboard');

    // Dashboard should reflect the expense data
    await expect(
      page.getByRole('heading', { level: 1, name: 'Dashboard' }),
    ).toBeVisible();
  });
});
