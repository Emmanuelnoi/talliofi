import { chromium, devices } from '@playwright/test';
import fs from 'node:fs/promises';

const baseUrl = 'http://127.0.0.1:4173';
const outDir = '/tmp/talliofi-ui-audit';
const routes = [
  '/dashboard',
  '/income',
  '/taxes',
  '/buckets',
  '/expenses',
  '/goals',
  '/net-worth',
  '/history',
  '/reports',
  '/settings',
  '/plans',
];

await fs.mkdir(outDir, { recursive: true });

async function completeOnboarding(page) {
  await page.goto(`${baseUrl}/onboarding`, { waitUntil: 'networkidle' });

  await page.locator('#grossIncomeDollars').fill('5000');
  await page.locator('#incomeFrequency').click();
  await page.getByRole('option', { name: 'Monthly', exact: true }).click();
  await page.getByRole('button', { name: /continue to taxes/i }).click();

  await page.locator('#effectiveRate').fill('25');
  await page.getByRole('button', { name: /continue to template/i }).click();

  await page.getByRole('button', { name: /continue to buckets/i }).click();

  const bucketName = page.locator('#buckets\\.0\\.name');
  await bucketName.waitFor();
  if ((await bucketName.inputValue()).trim() === '') {
    await bucketName.fill('Essentials');
  }
  await page.getByRole('button', { name: /continue to expenses/i }).click();

  await page.getByRole('button', { name: /^skip$/i }).click();
  await page.getByRole('button', { name: /create plan/i }).click();
  await page.waitForURL('**/dashboard', { timeout: 15000 });
}

function safeName(route) {
  return route.replace(/^\//, '').replace(/\//g, '-');
}

async function runDesktopWalkthrough() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  const consoleErrors = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  await completeOnboarding(page);

  const report = [];
  for (const route of routes) {
    await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' });
    const currentUrl = page.url();
    const h1 = page.getByRole('heading', { level: 1 }).first();
    const heading = (await h1.isVisible().catch(() => false))
      ? ((await h1.textContent())?.trim() ?? '(empty heading)')
      : '(no visible h1)';

    await page.screenshot({
      path: `${outDir}/desktop-${safeName(route)}.png`,
      fullPage: true,
    });

    report.push({ route, currentUrl, heading });
  }

  await fs.writeFile(
    `${outDir}/desktop-report.json`,
    JSON.stringify({ report, consoleErrors }, null, 2),
    'utf8',
  );

  await browser.close();
}

async function runMobileWalkthrough() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await context.newPage();

  await completeOnboarding(page);

  await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'networkidle' });
  await page.screenshot({
    path: `${outDir}/mobile-dashboard.png`,
    fullPage: true,
  });

  const nav = page.getByRole('navigation', { name: 'Mobile navigation' });
  const navVisible = await nav.isVisible().catch(() => false);
  const labels = [];

  if (navVisible) {
    const anchors = nav.locator('a');
    const count = await anchors.count();
    for (let i = 0; i < count; i++) {
      const txt = (await anchors.nth(i).innerText()).trim();
      if (txt) labels.push(txt.replace(/\s+/g, ' '));
    }
  }

  await fs.writeFile(
    `${outDir}/mobile-report.json`,
    JSON.stringify({ navVisible, labels }, null, 2),
    'utf8',
  );

  await browser.close();
}

await runDesktopWalkthrough();
await runMobileWalkthrough();
console.log(`Artifacts written to ${outDir}`);
