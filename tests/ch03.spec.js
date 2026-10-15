import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { boot, visit } from './helpers.js';

// CH 03 is the cold open (before 03:00), so boot() lands on it at 03:20.
// These checks are structural (ids, roles, attributes), not copy matches, so
// wording can change without breaking them.
const led = (page) => page.locator('.led-digits');
const heading = (page) => page.locator('#screen [data-focus]');
const decorativeWord = (page) => page.locator('#screen [role="img"][lang]');

test('CH 03 is on air: LED shows 03, heading is an H2', async ({
  page,
}) => {
  await boot(page);
  await expect(led(page)).toHaveText('03');
  await expect(heading(page)).toBeVisible();
  expect(await heading(page).evaluate((n) => n.tagName)).toBe('H2');
});

test('CH 03 decorative Baybayin is labelled and tagged as Tagalog', async ({
  page,
}) => {
  await boot(page);
  const word = decorativeWord(page);
  await expect(word).toHaveAttribute('lang', 'tl-Tglg');
  await expect(word).toHaveAttribute('aria-label', /.+/);
});

test('CH 03 passes axe', async ({ page }) => {
  // Not boot(): it pauses the fake clock, and axe waits on timers, so it would hang.
  await visit(page, '03:20');
  await expect(heading(page)).toBeVisible();
  const results = await new AxeBuilder({ page }).include('#screen').analyze();
  expect(results.violations).toEqual([]);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('CH 03 holds on its designed still frame', async ({ page }) => {
    await boot(page);
    await expect(led(page)).toHaveText('03');
    const first = await page.evaluate(() => window.__kaidenpa.progress());
    await page.clock.runFor(3000);
    const later = await page.evaluate(() => window.__kaidenpa.progress());
    expect(later).toBeCloseTo(first, 5);
  });
});
