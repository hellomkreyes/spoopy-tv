import { expect } from '@playwright/test';

// Clock is pinned with Playwright's fake timers; timezoneId comes from the config
// (America/Toronto). 2026-06-15 is a plain EDT day, so local = UTC-4.
export const at = (time) =>
  new Date(`2026-06-15T${time.length === 5 ? `${time}:00` : time}-04:00`);

/** Load `path` at a fake local time. Resolves to the list of console errors. */
export async function visit(page, time, path = '/') {
  const errors = [];
  page.on(
    'console',
    (msg) => msg.type() === 'error' && errors.push(msg.text()),
  );
  await page.clock.install({ time: at(time) });
  await page.goto(path);
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true');
  return errors;
}

/** visit(), then freeze the clock so only runFor() moves time. */
export async function boot(page, time = '03:20:03', path = '/') {
  const errors = await visit(page, time, path);
  const now = await page.evaluate(() => Date.now());
  await page.clock.pauseAt(new Date(now + 50));
  return errors;
}
