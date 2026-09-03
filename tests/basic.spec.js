import { test, expect } from '@playwright/test';

test('has title and brand', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/OM PDF/);
});

test('can navigate to merge pdf tool', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Merge PDF');
  await expect(page).toHaveURL(/.*merge-pdf/);
});

test('can open and search in Command Palette', async ({ page }) => {
  await page.goto('/');
  // Click search button
  await page.click('.nav-search-btn');
  // Check modal is visible
  await expect(page.locator('.cmd-palette-modal')).toBeVisible();
  // Type in search
  await page.fill('.cmd-search-input', 'compress');
  await expect(page.locator('.cmd-results-list')).toContainText('Compress PDF');
});

test('can navigate to competitor alternative page', async ({ page }) => {
  await page.goto('/ilovepdf-alternative');
  await expect(page).toHaveTitle(/iLovePDF Alternative/i);
  await expect(page.locator('h1')).toContainText('Alternative to iLovePDF');
});

test('renders compact modern footer cleanly', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const footer = page.locator('footer.footer-v2');
  await expect(footer).toBeVisible();
  await footer.screenshot({ path: '/Users/om/.gemini/antigravity/brain/929b4a58-3cfc-4b81-bb75-c8c055cebf16/footer-preview.png' });
});
