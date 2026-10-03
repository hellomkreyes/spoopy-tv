import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('page boots and has no axe violations', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
