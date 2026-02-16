import type { Page } from '@playwright/test';

/**
 * Completes the onboarding wizard with a default plan configuration
 * so tests can start from a usable dashboard state.
 */
export async function completeOnboarding(page: Page): Promise<void> {
  await page.goto('/onboarding');

  // Step 1: Income
  await page.locator('#grossIncomeDollars').fill('5000');
  await page.locator('#incomeFrequency').click();
  await page.getByRole('option', { name: 'Monthly', exact: true }).click();
  await page.getByRole('button', { name: /continue to taxes/i }).click();

  // Step 2: Taxes
  await page.locator('#effectiveRate').fill('25');
  await page.getByRole('button', { name: /continue to template/i }).click();

  // Step 3: Template
  await page.getByRole('button', { name: /continue to buckets/i }).click();

  // Step 4: Buckets
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

  // Step 5: Expenses
  await page.getByRole('button', { name: /^skip$/i }).click();

  // Step 6: Summary
  await page.getByRole('button', { name: /create plan/i }).click();

  // Wait for dashboard
  await page.waitForURL(/\/$/);
}
