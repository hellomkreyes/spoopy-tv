import { test, expect } from '@playwright/test';
import { boot } from './helpers.js';

const led = (page) => page.locator('.led-digits');
const heading = (page) => page.locator('#screen [data-focus]');
const hook = (page, fn) => page.evaluate((f) => window.__kaidenpa[f](), fn);
const cuts = (page) => page.evaluate(() => window.__kaidenpa.cuts);
// Let a channel change (40 ms cut + 280 ms static) finish.
const settle = (page) => page.clock.runFor(400);

test('holding an arrow key never starts more than 3 cuts in any second', async ({
  page,
}) => {
  await boot(page);
  for (let i = 0; i < 30; i++) {
    await page.keyboard.press('ArrowDown'); // a held key repeats ~30 times a second
    await page.clock.runFor(100);
  }
  await page.clock.runFor(2000);
  const log = await cuts(page);
  expect(log.length).toBeGreaterThan(5);
  for (const c of log) {
    const inWindow = log.filter((o) => o.t > c.t - 1000 && o.t <= c.t);
    expect(inWindow.length).toBeLessThanOrEqual(3);
  }
});

test('tuning: arrows, digits, CH buttons, guide rows and swipe', async ({
  page,
}) => {
  await boot(page);
  await expect(led(page)).toHaveText('03');

  await test.step('arrow keys', async () => {
    await page.keyboard.press('ArrowUp');
    await settle(page);
    await expect(led(page)).toHaveText('04');
    await page.keyboard.press('ArrowDown');
    await settle(page);
    await expect(led(page)).toHaveText('03');
  });

  await test.step('digits jump; missing channels and CH 00 do nothing', async () => {
    await page.keyboard.press('9');
    await settle(page);
    await expect(led(page)).toHaveText('09');
    await expect(heading(page)).toHaveText('CH 09 · Sky Watch');
    for (const key of ['2', '0']) {
      await page.keyboard.press(key);
      await settle(page);
      await expect(led(page)).toHaveText('09');
    }
  });

  await test.step('CH button wraps around', async () => {
    await page.getByRole('button', { name: 'Channel up' }).click();
    await settle(page);
    await expect(led(page)).toHaveText('01');
  });

  await test.step('a guide row tunes; ON AIR stays with the clock', async () => {
    const row = page.getByRole('button', { name: /Tune to.*Shadow Play/ });
    await row.click();
    await settle(page);
    await expect(led(page)).toHaveText('07');
    await expect(
      page.locator('.guide-item[aria-current="true"]'),
    ).toContainText('Shadow Play');
    await expect(
      page.locator('.guide-item:has(.guide-badge-live)'),
    ).toContainText('Emergency Alert');
    await expect(
      page.getByRole('button', { name: /Tune to.*Shadow Play/ }),
    ).toBeFocused(); // focus survives the re-render
  });

  await test.step('a vertical swipe up on the screen changes channel up', async () => {
    await page.locator('.crt').evaluate((crt) => {
      const fire = (type, y) =>
        crt.dispatchEvent(
          new PointerEvent(type, {
            pointerType: 'touch',
            clientX: 100,
            clientY: y,
            bubbles: true,
          }),
        );
      fire('pointerdown', 300);
      fire('pointerup', 200);
    });
    await settle(page);
    await expect(led(page)).toHaveText('09');
  });
});

test('Space pauses everything and resumes in sync', async ({ page }) => {
  await boot(page);
  await page.clock.runFor(1000);
  await page.keyboard.press('Space');
  await expect(page.locator('html')).toHaveClass(/is-paused/);
  await expect(page.getByRole('button', { name: 'MOTION' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  const frozen = await hook(page, 'progress');
  await page.clock.runFor(2000);
  expect(await hook(page, 'progress')).toBe(frozen);

  // While paused a flip is a hard cut with no static.
  await page.keyboard.press('ArrowUp');
  await settle(page);
  expect((await cuts(page)).at(-1).burst).toBe(false);

  await page.keyboard.press('Space');
  await expect(page.locator('html')).not.toHaveClass(/is-paused/);
  const resumed = await hook(page, 'progress');
  await page.clock.runFor(1000);
  expect(await hook(page, 'progress')).not.toBe(resumed);
});

test('channels tune in at the clock position: midnight-synced on air, tape-start in a rerun', async ({
  page,
}) => {
  await boot(page, '03:20:03'); // 3 s into a 12 s loop
  expect(await hook(page, 'progress')).toBeGreaterThan(0.2);
  expect(await hook(page, 'progress')).toBeLessThan(0.4);

  await boot(page, '12:00:06', '/?rerun=09'); // the clock is mid-loop, the tape is not
  expect(await hook(page, 'progress')).toBeLessThan(0.1);
});

test('POWER blanks the screen and brings the channel back', async ({
  page,
}) => {
  await boot(page);
  const power = page.getByRole('button', { name: 'POWER' });
  await power.click();
  await expect(page.locator('.crt')).toHaveClass(/is-off/);
  await expect(led(page)).toHaveText('– –');
  await expect(page.locator('#screen > *')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Channel up' })).toBeDisabled();
  await expect(
    page.getByRole('button', { name: /Tune to/ }).first(),
  ).toBeDisabled();
  await power.click();
  await settle(page);
  await expect(page.locator('.crt')).not.toHaveClass(/is-off/);
  await expect(heading(page)).toHaveText('CH 03 · Emergency Alert');
});

test('50 flips leave no extra timelines or channel elements behind', async ({
  page,
}) => {
  await boot(page);
  const baseline = await hook(page, 'timelineCount');
  for (let i = 0; i < 50; i++) {
    await page.keyboard.press('ArrowUp');
    await settle(page);
  }
  expect(await hook(page, 'timelineCount')).toBe(baseline);
  await expect(page.locator('#screen > *')).toHaveCount(1);
});

test('tapes: CH is disabled with none in the deck, and flips between tapes in a rerun', async ({
  page,
}) => {
  await boot(page, '12:00:00');
  await expect(page.getByRole('button', { name: 'Channel up' })).toBeDisabled();
  await expect(
    page.getByRole('button', { name: 'Channel down' }),
  ).toBeDisabled();

  await boot(page, '12:00:00', '/?rerun=09');
  await page.getByRole('button', { name: 'Channel up' }).click();
  await settle(page);
  await expect(led(page)).toHaveText('SO'); // the sign-off is a tape too
  await expect(page).toHaveURL(/\?rerun=so$/);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('channels hold their still frame, with no static and no loop', async ({
    page,
  }) => {
    await boot(page);
    const still = await hook(page, 'stillAt');
    expect(await hook(page, 'progress')).toBeCloseTo(still, 5);
    await page.clock.runFor(2000);
    expect(await hook(page, 'progress')).toBeCloseTo(still, 5);
    await page.keyboard.press('ArrowUp');
    await settle(page);
    await expect(led(page)).toHaveText('04');
    expect(await hook(page, 'progress')).toBeCloseTo(still, 5);
    expect((await cuts(page)).every((c) => c.burst === false)).toBe(true);
    await expect(page.locator('.static-layer')).toBeHidden();
  });
});
