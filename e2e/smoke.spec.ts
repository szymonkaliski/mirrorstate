import { test, expect } from '@playwright/test';

test('smoke test - app loads', async ({ page }) => {
  await page.goto('/');

  // Check that the main heading is visible (with longer timeout)
  await expect(page.getByRole('heading', { name: 'MirrorState' })).toBeVisible({ timeout: 10000 });

  // Check that counter section exists
  await expect(page.getByText('Counter:')).toBeVisible();

  console.log('✓ Smoke test passed - Playwright is working!');
});
