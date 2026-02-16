import { test, expect, type Page } from '@playwright/test';
import { completeOnboarding } from './fixtures';

async function navigateToGoals(page: Page): Promise<void> {
  await page.getByRole('link', { name: 'Goals' }).click();
  await page.waitForURL('**/goals', { timeout: 10000 });
  await expect(
    page.getByText('Track your savings targets and debt payoff progress'),
  ).toBeVisible({ timeout: 10000 });
}

async function openAddGoalSheet(page: Page): Promise<void> {
  await page
    .getByRole('button', { name: /add goal/i })
    .first()
    .click();
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10000 });
}

async function fillGoalForm(
  page: Page,
  options: { name: string; targetAmount: string },
): Promise<void> {
  const dialog = page.getByRole('dialog');

  // Fill goal name
  await dialog.locator('#goal-name').fill(options.name);

  // Fill target amount — MoneyInput is a custom text input.
  // Clear any existing value, then type the amount.
  const targetInput = dialog.locator('#goal-target');
  await targetInput.click();
  await targetInput.fill(options.targetAmount);
}

async function submitGoalForm(page: Page): Promise<void> {
  const dialog = page.getByRole('dialog');
  const form = dialog.locator('form').first();
  await form.evaluate((f) => {
    (f as HTMLFormElement).requestSubmit();
  });
}

test.describe('Goals page', () => {
  test('shows empty state when no goals exist', async ({ page }) => {
    await completeOnboarding(page);
    await navigateToGoals(page);

    // Verify empty state messaging
    await expect(page.getByText('No goals yet')).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.getByRole('button', { name: 'Create your first goal' }),
    ).toBeVisible();
  });

  test('can create a new goal', async ({ page }) => {
    await completeOnboarding(page);
    await navigateToGoals(page);

    // Open add goal sheet via page header button
    await openAddGoalSheet(page);

    // Fill the form
    await fillGoalForm(page, {
      name: 'Emergency Fund',
      targetAmount: '10000',
    });

    // Submit
    await submitGoalForm(page);

    // Verify the goal appears in the list (actions button uses goal name)
    await expect(
      page.getByRole('button', { name: 'Actions for Emergency Fund' }),
    ).toBeVisible({ timeout: 10000 });
  });

  test('new goal shows 0% progress', async ({ page }) => {
    await completeOnboarding(page);
    await navigateToGoals(page);

    // Create a goal
    await openAddGoalSheet(page);
    await fillGoalForm(page, {
      name: 'Emergency Fund',
      targetAmount: '10000',
    });
    await submitGoalForm(page);

    // Wait for goal card to appear
    await expect(
      page.getByRole('button', { name: 'Actions for Emergency Fund' }),
    ).toBeVisible({ timeout: 10000 });

    // Verify 0% progress is shown on the goal card
    await expect(page.getByText('0%').first()).toBeVisible();

    // Verify $0.00 current amount is displayed
    await expect(page.getByText('$0.00').first()).toBeVisible();

    // Verify the target amount is displayed
    await expect(page.getByText('$10,000.00').first()).toBeVisible();
  });

  test('can navigate between goals and dashboard', async ({ page }) => {
    await completeOnboarding(page);

    // Navigate to goals
    await navigateToGoals(page);
    await expect(
      page.getByRole('heading', { name: 'Goals' }).first(),
    ).toBeVisible();

    // Navigate back to dashboard
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await page.waitForURL(/\/$/, { timeout: 10000 });
    await expect(
      page.getByRole('heading', { level: 1, name: 'Dashboard' }),
    ).toBeVisible({ timeout: 10000 });

    // Navigate to goals again to verify both routes are stable
    await navigateToGoals(page);
    await expect(
      page.getByRole('heading', { name: 'Goals' }).first(),
    ).toBeVisible();
  });
});
