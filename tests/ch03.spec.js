import { test, expect } from '@playwright/test';
import { boot } from './helpers.js';
import AxeBuilder from '@axe-core/playwright';

// CH 03 is the cold open (before 03:00), so boot() lands on it at 03:20.
const heading = (page) => page.locator('#screen [data-focus]');

test('CH 03 renders its heading, transcript and decorative Baybayin', async ({
  page,
}) => {
  await boot(page);
  await expect(heading(page)).toHaveText('CH 03 · Emergency Alert');
  await expect(
    page.getByText(
      'Residents of all planes: if you hear your name called three times tonight, do not answer.',
    ),
  ).toBeVisible();

  const baybayin = page.getByRole('img', { name: 'Babala, warning' });
  await expect(baybayin).toHaveAttribute('lang', 'tl-Tglg');
});

test('CH 03 passes axe with its transcript and decoration', async ({ page }) => {
  await boot(page);
  await expect(heading(page)).toBeVisible();
  const results = await new AxeBuilder({ page })
    .include('#screen')
    .analyze();
  expect(results.violations).toEqual([]);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('CH 03 holds on its designed still frame', async ({ page }) => {
    await boot(page);
    await expect(heading(page)).toHaveText('CH 03 · Emergency Alert');
    const first = await page.evaluate(() => window.__kaidenpa.progress());
    await page.clock.runFor(3000);
    const later = await page.evaluate(() => window.__kaidenpa.progress());
    expect(later).toBeCloseTo(first, 5);
  });
});
