import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('http://localhost:4173/');
  await expect(page).toHaveTitle(/OM PDF/);
});

test('can navigate to merge pdf tool', async ({ page }) => {
  await page.goto('http://localhost:4173/');
  // The home page has a card for Merge PDF
  await page.click('text=Merge PDF');
  await expect(page).toHaveURL(/.*merge-pdf/);
});
