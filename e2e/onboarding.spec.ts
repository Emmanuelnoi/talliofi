import { test, expect, type Page } from '@playwright/test';

async function completeIncomeStep(page: Page): Promise<void> {
  await page.locator('#grossIncomeDollars').fill('5000');
  await page.locator('#incomeFrequency').click();
  await page.getByRole('option', { name: 'Monthly', exact: true }).click();
  await page.getByRole('button', { name: /continue to taxes/i }).click();
}

async function completeTaxStep(page: Page): Promise<void> {
  await page.locator('#effectiveRate').fill('25');
  await page.getByRole('button', { name: /continue to template/i }).click();
}

async function completeTemplateStep(page: Page): Promise<void> {
  await page.getByRole('button', { name: /continue to buckets/i }).click();
}

async function completeBucketsStep(page: Page): Promise<void> {
  const firstBucketNameInput = page.locator('#buckets\\.0\\.name');
  await firstBucketNameInput.waitFor();
  if ((await firstBucketNameInput.inputValue()).trim() === '') {
    await firstBucketNameInput.fill('Essentials');
  }

  const firstBucketPercentInput = page.locator(
    '#buckets\\.0\\.targetPercentage',
  );
  await firstBucketPercentInput.waitFor();
  if ((await firstBucketPercentInput.inputValue()).trim() === '') {
    await firstBucketPercentInput.fill('50');
  }

  await page.getByRole('button', { name: /continue to expenses/i }).click();
}

test.describe('Onboarding wizard', () => {
  test.describe.serial('complete flow', () => {
    test('fills income step and advances', async ({ page }) => {
      await page.goto('/onboarding');

      await expect(page.getByText('What is your gross income?')).toBeVisible();
      await expect(
        page.getByRole('progressbar', { name: 'Onboarding progress' }),
      ).toHaveAttribute('aria-valuenow', '1');

      await completeIncomeStep(page);

      await expect(page.getByText('Estimate your taxes')).toBeVisible();
      await expect(
        page.getByRole('progressbar', { name: 'Onboarding progress' }),
      ).toHaveAttribute('aria-valuenow', '2');
    });

    test('fills tax step and advances', async ({ page }) => {
      await page.goto('/onboarding');

      await completeIncomeStep(page);
      await expect(page.getByText('Estimate your taxes')).toBeVisible();
      await expect(
        page.getByRole('progressbar', { name: 'Onboarding progress' }),
      ).toHaveAttribute('aria-valuenow', '2');

      await completeTaxStep(page);
      await expect(page.getByText('Choose a starting point')).toBeVisible();
      await expect(
        page.getByRole('progressbar', { name: 'Onboarding progress' }),
      ).toHaveAttribute('aria-valuenow', '3');
    });

    test('fills buckets step and advances', async ({ page }) => {
      await page.goto('/onboarding');

      await completeIncomeStep(page);
      await completeTaxStep(page);
      await completeTemplateStep(page);
      await expect(page.getByText('Set up your buckets')).toBeVisible();
      await expect(
        page.getByRole('progressbar', { name: 'Onboarding progress' }),
      ).toHaveAttribute('aria-valuenow', '4');

      await completeBucketsStep(page);
      await expect(page.getByText('Add recurring expenses')).toBeVisible();
      await expect(
        page.getByRole('progressbar', { name: 'Onboarding progress' }),
      ).toHaveAttribute('aria-valuenow', '5');
    });

    test('skips expenses step', async ({ page }) => {
      await page.goto('/onboarding');

      await completeIncomeStep(page);
      await completeTaxStep(page);
      await completeTemplateStep(page);
      await completeBucketsStep(page);
      await expect(page.getByText('Add recurring expenses')).toBeVisible();
      await expect(
        page.getByRole('progressbar', { name: 'Onboarding progress' }),
      ).toHaveAttribute('aria-valuenow', '5');

      await page.getByRole('button', { name: /^skip$/i }).click();
      await expect(page.getByText('Review your plan')).toBeVisible();
      await expect(
        page.getByRole('progressbar', { name: 'Onboarding progress' }),
      ).toHaveAttribute('aria-valuenow', '6');
    });
  });

  test('completes full onboarding and reaches dashboard', async ({ page }) => {
    await page.goto('/onboarding');

    await completeIncomeStep(page);
    await completeTaxStep(page);
    await completeTemplateStep(page);
    await completeBucketsStep(page);
    await page.getByRole('button', { name: /^skip$/i }).click();

    await expect(page.getByText('Review your plan')).toBeVisible();
    await expect(
      page.getByRole('progressbar', { name: 'Onboarding progress' }),
    ).toHaveAttribute('aria-valuenow', '6');

    await expect(page.getByText('$5,000')).toBeVisible();
    await expect(page.getByText('Monthly')).toBeVisible();
    await expect(page.getByText('25%')).toBeVisible();
    await expect(page.getByText('No expenses added yet')).toBeVisible();

    await page.getByRole('button', { name: /create plan/i }).click();

    await page.waitForURL('**/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Dashboard' }),
    ).toBeVisible({ timeout: 15000 });
  });

  test('can navigate back between steps', async ({ page }) => {
    await page.goto('/onboarding');

    await completeIncomeStep(page);
    await expect(page.getByText('Estimate your taxes')).toBeVisible();
    await expect(
      page.getByRole('progressbar', { name: 'Onboarding progress' }),
    ).toHaveAttribute('aria-valuenow', '2');

    await page.getByRole('button', { name: 'Back' }).click();

    await expect(page.getByText('What is your gross income?')).toBeVisible();
    await expect(
      page.getByRole('progressbar', { name: 'Onboarding progress' }),
    ).toHaveAttribute('aria-valuenow', '1');
  });
});
