import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/talliofi/i);
});

test('redirects to onboarding when no plan exists', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/onboarding/);
});

test('onboarding shows income step first', async ({ page }) => {
  await page.goto('/onboarding');
  await expect(page.getByText('Income', { exact: true })).toBeVisible();
  await expect(page.getByText('Step 1 of 5')).toBeVisible();
});
