import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('page boots with no console errors (CSP) and no axe violations', async ({
  page,
}) => {
  const errors = [];
  page.on(
    'console',
    (msg) => msg.type() === 'error' && errors.push(msg.text()),
  );
  page.on('pageerror', (err) => errors.push(err.message));
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
  expect(errors).toEqual([]);
});
