import { test, expect } from '@playwright/test';

test.describe('Onboarding wizard', () => {
  test.describe.serial('complete flow', () => {
    test('fills income step and advances', async ({ page }) => {
      await page.goto('/onboarding');

      // Step 1: Income
      await expect(page.getByText('Step 1 of 5')).toBeVisible();
      await expect(page.getByText('What is your gross income?')).toBeVisible();

      // Fill gross income
      await page.locator('#grossIncomeDollars').fill('5000');

      // Select monthly frequency via Radix Select
      await page.locator('#incomeFrequency').click();
      await page.getByRole('option', { name: 'Monthly', exact: true }).click();

      // Advance
      await page.getByRole('button', { name: 'Continue' }).click();
      await expect(page.getByText('Step 2 of 5')).toBeVisible();
    });

    test('fills tax step and advances', async ({ page }) => {
      await page.goto('/onboarding');

      // Complete step 1 first
      await page.locator('#grossIncomeDollars').fill('5000');
      await page.locator('#incomeFrequency').click();
      await page.getByRole('option', { name: 'Monthly', exact: true }).click();
      await page.getByRole('button', { name: 'Continue' }).click();

      // Step 2: Taxes
      await expect(page.getByText('Step 2 of 5')).toBeVisible();
      await expect(page.getByText('Estimate your taxes')).toBeVisible();

      await page.locator('#effectiveRate').fill('25');
      await page.getByRole('button', { name: 'Continue' }).click();

      await expect(page.getByText('Step 3 of 5')).toBeVisible();
    });

    test('fills buckets step and advances', async ({ page }) => {
      await page.goto('/onboarding');

      // Complete steps 1-2
      await page.locator('#grossIncomeDollars').fill('5000');
      await page.locator('#incomeFrequency').click();
      await page.getByRole('option', { name: 'Monthly', exact: true }).click();
      await page.getByRole('button', { name: 'Continue' }).click();

      await page.locator('#effectiveRate').fill('25');
      await page.getByRole('button', { name: 'Continue' }).click();

      // Step 3: Buckets
      await expect(page.getByText('Step 3 of 5')).toBeVisible();
      await expect(page.getByText('Set up your buckets')).toBeVisible();

      // Fill the first bucket name
      await page.locator('#buckets\\.0\\.name').fill('Essentials');

      // Set target percentage to 50
      await page.locator('#buckets\\.0\\.targetPercentage').fill('50');

      await page.getByRole('button', { name: 'Continue' }).click();
      await expect(page.getByText('Step 4 of 5')).toBeVisible();
    });

    test('skips expenses step', async ({ page }) => {
      await page.goto('/onboarding');

      // Complete steps 1-3
      await page.locator('#grossIncomeDollars').fill('5000');
      await page.locator('#incomeFrequency').click();
      await page.getByRole('option', { name: 'Monthly', exact: true }).click();
      await page.getByRole('button', { name: 'Continue' }).click();

      await page.locator('#effectiveRate').fill('25');
      await page.getByRole('button', { name: 'Continue' }).click();

      await page.locator('#buckets\\.0\\.name').fill('Essentials');
      await page.locator('#buckets\\.0\\.targetPercentage').fill('50');
      await page.getByRole('button', { name: 'Continue' }).click();

      // Step 4: Expenses - skip
      await expect(page.getByText('Step 4 of 5')).toBeVisible();
      await expect(page.getByText('Add recurring expenses')).toBeVisible();

      await page.getByRole('button', { name: 'Skip' }).click();
      await expect(page.getByText('Step 5 of 5')).toBeVisible();
    });
  });

  test('completes full onboarding and reaches dashboard', async ({ page }) => {
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

    // Step 5: Summary - verify data
    await expect(page.getByText('Step 5 of 5')).toBeVisible();
    await expect(page.getByText('Review your plan')).toBeVisible();

    // Verify income summary
    await expect(page.getByText('$5,000')).toBeVisible();
    await expect(page.getByText('Monthly')).toBeVisible();

    // Verify tax summary
    await expect(page.getByText('25%')).toBeVisible();

    // Verify bucket summary
    await expect(page.getByText('Essentials')).toBeVisible();
    await expect(page.getByText('50%')).toBeVisible();

    // Verify expenses skipped
    await expect(page.getByText('No expenses added yet')).toBeVisible();

    // Create the plan
    await page.getByRole('button', { name: 'Create plan' }).click();

    // Should redirect to dashboard
    await page.waitForURL('**/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);

    // Verify dashboard loaded
    // Check page title (h1) specifically
    await expect(
      page.getByRole('heading', { level: 1, name: 'Dashboard' }),
    ).toBeVisible();
  });

  test('can navigate back between steps', async ({ page }) => {
    await page.goto('/onboarding');

    // Step 1: Income
    await page.locator('#grossIncomeDollars').fill('5000');
    await page.locator('#incomeFrequency').click();
    await page.getByRole('option', { name: 'Monthly', exact: true }).click();
    await page.getByRole('button', { name: 'Continue' }).click();

    // Step 2: Verify and go back
    await expect(page.getByText('Step 2 of 5')).toBeVisible();
    await page.getByRole('button', { name: 'Back' }).click();

    // Should be back on step 1
    await expect(page.getByText('Step 1 of 5')).toBeVisible();
    await expect(page.getByText('What is your gross income?')).toBeVisible();
  });
});
