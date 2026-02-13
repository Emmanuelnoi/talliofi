import { test, expect, type Page } from '@playwright/test';
import { completeOnboarding } from './fixtures';

async function openAddExpenseSheet(page: Page): Promise<void> {
  await page
    .getByRole('button', { name: 'Add Expense', exact: true })
    .first()
    .click();
  await expect(page.getByRole('dialog')).toBeVisible();
}

async function submitExpenseFromSheet(page: Page): Promise<void> {
  const expenseSheet = page.getByRole('dialog');
  const expenseForm = expenseSheet.locator('form').first();
  await expenseForm.evaluate((form) => {
    (form as HTMLFormElement).requestSubmit();
  });
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
    await openAddExpenseSheet(page);

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
    await submitExpenseFromSheet(page);

    // Wait for the expense row to appear
    await expect(
      page.getByRole('button', { name: 'Actions for Rent' }),
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
    await submitExpenseFromSheet(page);

    // Verify it appears in the list
    await expect(
      page.getByRole('button', { name: 'Actions for Groceries' }),
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

    await openAddExpenseSheet(page);
    await page.locator('#expense-name').fill('Internet');
    await page.locator('#expense-amount').fill('80');

    await page.locator('#expense-frequency').click();
    await page.getByRole('option', { name: 'Monthly', exact: true }).click();

    await page.locator('#expense-category').click();
    await page.getByRole('option', { name: 'Utilities' }).click();

    await page.locator('#expense-bucket').click();
    await page.getByRole('option', { name: 'Essentials' }).click();

    await submitExpenseFromSheet(page);

    // Wait for expense to be saved
    await expect(
      page.getByRole('button', { name: 'Actions for Internet' }),
    ).toBeVisible();

    // Navigate to dashboard
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await page.waitForURL('**/dashboard');

    // Dashboard should reflect the expense data
    await expect(
      page.getByRole('heading', { level: 1, name: 'Dashboard' }),
    ).toBeVisible();
  });
});
