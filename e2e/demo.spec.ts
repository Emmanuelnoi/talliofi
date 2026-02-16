import { expect, test } from '@playwright/test';

test.describe('Demo mode', () => {
  test('loads demo data and shows populated pages across navigation', async ({
    page,
  }) => {
    await page.goto('/demo?preset=heavy');
    await page.waitForURL(/\/$/);

    await expect(
      page.getByRole('heading', { level: 1, name: 'Dashboard' }),
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByText(/Demo Financial Plan \(heavy\)/i),
    ).toBeVisible();

    await page.getByRole('link', { name: 'Expenses' }).first().click();
    await page.waitForURL('**/expenses');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Expenses' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Actions for Rent/i }).first(),
    ).toBeVisible();

    await page.getByRole('link', { name: 'Goals' }).first().click();
    await page.waitForURL('**/goals');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Goals' }),
    ).toBeVisible();
    await expect(page.getByText('Emergency Fund')).toBeVisible();

    await page.getByRole('link', { name: 'Reports' }).first().click();
    await page.waitForURL('**/reports');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Reports' }),
    ).toBeVisible();
    await expect(page.getByText('Spending by Category')).toBeVisible();
    await expect(page.getByText('Top Expenses', { exact: true })).toBeVisible();
  });
});
