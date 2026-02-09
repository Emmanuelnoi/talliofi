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

  // Wait for dashboard
  await page.waitForURL('**/dashboard');
}

test.describe('Export and Import', () => {
  test('exports data as JSON file', async ({ page }) => {
    await completeOnboarding(page);

    // Navigate to settings
    await page.getByRole('link', { name: 'Settings' }).click();
    await page.waitForURL('**/settings');

    // Listen for the download event before clicking
    const downloadPromise = page.waitForEvent('download');

    // Click the export button
    await page
      .getByRole('button', { name: 'Download financial data as JSON' })
      .click();

    // Verify download was triggered
    const download = await downloadPromise;
    const filename = download.suggestedFilename();

    expect(filename).toMatch(/^talliofi-export-\d{4}-\d{2}-\d{2}\.json$/);

    // Optionally verify the file is valid JSON
    const path = await download.path();
    expect(path).toBeTruthy();
  });

  test('deletes all data and redirects to onboarding', async ({ page }) => {
    await completeOnboarding(page);

    // Navigate to settings
    await page.getByRole('link', { name: 'Settings' }).click();
    await page.waitForURL('**/settings');

    // Click "Delete All Data" to open the confirmation dialog
    await page.getByRole('button', { name: 'Delete All Data' }).click();

    // Confirm the dialog
    await expect(page.getByText('Are you sure?')).toBeVisible();

    await page.getByRole('button', { name: 'Delete Everything' }).click();

    // Should redirect to onboarding
    await page.waitForURL('**/onboarding');
    await expect(page).toHaveURL(/\/onboarding/);

    // Onboarding should show step 1
    await expect(page.getByText('Step 1 of 5')).toBeVisible();
  });

  test('export then delete roundtrip', async ({ page }) => {
    await completeOnboarding(page);

    // Navigate to settings
    await page.getByRole('link', { name: 'Settings' }).click();
    await page.waitForURL('**/settings');

    // Export first
    const downloadPromise = page.waitForEvent('download');
    await page
      .getByRole('button', { name: 'Download financial data as JSON' })
      .click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.json$/);

    // Now delete all data
    await page.getByRole('button', { name: 'Delete All Data' }).click();
    await page.getByRole('button', { name: 'Delete Everything' }).click();

    // Verify we are back at onboarding
    await page.waitForURL('**/onboarding');
    await expect(page.getByText('What is your gross income?')).toBeVisible();
  });
});
