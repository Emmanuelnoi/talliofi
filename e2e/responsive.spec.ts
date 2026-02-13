import { test, expect } from '@playwright/test';
import { completeOnboarding } from './fixtures';

test.describe('Responsive layout (mobile)', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('onboarding renders at mobile width', async ({ page }) => {
    await page.goto('/onboarding');

    // Verify step indicator is visible
    await expect(page.getByText('What is your gross income?')).toBeVisible();
    await expect(
      page.getByRole('progressbar', { name: 'Onboarding progress' }),
    ).toHaveAttribute('aria-valuenow', '1');

    // Verify the income form is accessible
    await expect(page.locator('#grossIncomeDollars')).toBeVisible();

    // Verify the page header is visible
    await expect(page.getByText('Talliofi')).toBeVisible();
  });

  test('completes onboarding at mobile size', async ({ page }) => {
    await completeOnboarding(page);

    // Should be on dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    // Check page title (h1) specifically
    await expect(
      page.getByRole('heading', { level: 1, name: 'Dashboard' }),
    ).toBeVisible();
  });

  test('shows mobile bottom navigation after onboarding', async ({ page }) => {
    await completeOnboarding(page);

    // The bottom navigation should be visible on mobile
    const mobileNav = page.getByRole('navigation', {
      name: 'Mobile navigation',
    });
    await expect(mobileNav).toBeVisible();

    // Verify bottom nav items
    await expect(mobileNav.getByText('Dashboard')).toBeVisible();
    await expect(mobileNav.getByText('Expenses')).toBeVisible();
    await expect(mobileNav.getByText('Goals')).toBeVisible();
    await expect(mobileNav.getByText('History')).toBeVisible();
    await expect(mobileNav.getByText('Settings')).toBeVisible();
  });

  test('navigates between pages using bottom nav', async ({ page }) => {
    await completeOnboarding(page);

    const mobileNav = page.getByRole('navigation', {
      name: 'Mobile navigation',
    });

    // Navigate to Expenses
    await mobileNav.getByText('Expenses').click();
    await page.waitForURL('**/expenses');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Expenses' }),
    ).toBeVisible();

    // Navigate to Goals
    await mobileNav.getByText('Goals').click();
    await page.waitForURL('**/goals');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Goals' }),
    ).toBeVisible();

    // Navigate to Settings
    await mobileNav.getByText('Settings').click();
    await page.waitForURL('**/settings');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Settings' }),
    ).toBeVisible();

    // Navigate back to Dashboard
    await mobileNav.getByText('Dashboard').click();
    await page.waitForURL('**/dashboard');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Dashboard' }),
    ).toBeVisible();
  });

  test('pages render correctly at narrow width', async ({ page }) => {
    await completeOnboarding(page);

    // Dashboard should not overflow horizontally
    const body = page.locator('body');
    const bodyBox = await body.boundingBox();
    expect(bodyBox).not.toBeNull();
    expect(bodyBox!.width).toBeLessThanOrEqual(375);

    // Navigate to expenses and verify layout
    const mobileNav = page.getByRole('navigation', {
      name: 'Mobile navigation',
    });
    await mobileNav.getByText('Expenses').click();
    await page.waitForURL('**/expenses');

    // Page header (h1) should be visible and not clipped
    const pageTitle = page.getByRole('heading', { level: 1, name: 'Expenses' });
    await expect(pageTitle).toBeVisible();
    await expect(pageTitle).toBeInViewport();
  });
});

test.describe('Responsive layout (desktop)', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('shows sidebar navigation on desktop', async ({ page }) => {
    await completeOnboarding(page);

    // The desktop sidebar should be visible
    await expect(page.getByText('Navigation')).toBeVisible();

    // Bottom nav should be hidden on desktop (md:hidden class)
    const mobileNav = page.getByRole('navigation', {
      name: 'Mobile navigation',
    });
    await expect(mobileNav).toBeHidden();
  });
});
