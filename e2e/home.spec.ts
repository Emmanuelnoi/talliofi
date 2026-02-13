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
  await expect(page.getByText('What is your gross income?')).toBeVisible();
  await expect(
    page.getByRole('progressbar', { name: 'Onboarding progress' }),
  ).toHaveAttribute('aria-valuenow', '1');
});
