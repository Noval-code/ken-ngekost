import { expect, test } from '@playwright/test';

test('owner can sign in and browse properties', async ({ page }) => {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.locator('#email').fill('demo@panggora.my.id');
  await page.locator('#password').fill('DemoPass12345');
  await page.getByRole('button', { name: 'Masuk' }).click();

  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: 'Beranda' })).toBeVisible();

  await page.getByRole('link', { name: 'Properti' }).first().click();
  await expect(page).toHaveURL(/\/properties$/);
  await expect(page.getByRole('heading', { name: 'Properti' })).toBeVisible();
});
