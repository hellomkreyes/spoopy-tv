import { test, expect } from '@playwright/test';

// 2026-06-15 is a plain EDT day (local = UTC-4); America/Toronto comes from the config.
const at = (hms) => new Date(`2026-06-15T${hms}-04:00`);

/** Load at a fake local time, then freeze the clock so only runFor() moves time. */
async function boot(page, hms = '03:20:03', path = '/') {
  await page.clock.install({ time: at(hms) });
  await page.goto(path);
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true');
  const now = await page.evaluate(() => Date.now());
  await page.clock.pauseAt(new Date(now + 50));
}

const led = (page) => page.locator('.led-digits');
const heading = (page) => page.locator('#screen [data-focus]');
const hook = (page, fn) => page.evaluate((f) => window.__kaidenpa[f](), fn);
// Let a channel change (40 ms cut + 280 ms static) finish.
const settle = (page) => page.clock.runFor(400);

test.describe('channel controller', () => {
  test('holding an arrow key never starts more than 3 cuts in any second', async ({
    page,
  }) => {
    await boot(page);
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press('ArrowDown'); // a held key repeats ~30 times a second
      await page.clock.runFor(100);
    }
    await page.clock.runFor(2000);
    const cuts = await page.evaluate(() => window.__kaidenpa.cuts);
    expect(cuts.length).toBeGreaterThan(5);
    for (const c of cuts) {
      const inWindow = cuts.filter((o) => o.t > c.t - 1000 && o.t <= c.t);
      expect(inWindow.length).toBeLessThanOrEqual(3);
    }
  });

  test('arrow keys, digits and the CH buttons tune; missing channels do nothing', async ({
    page,
  }) => {
    await boot(page);
    await expect(led(page)).toHaveText('03');
    await page.keyboard.press('ArrowUp');
    await settle(page);
    await expect(led(page)).toHaveText('04');
    await page.keyboard.press('ArrowDown');
    await settle(page);
    await expect(led(page)).toHaveText('03');
    await page.keyboard.press('9');
    await settle(page);
    await expect(led(page)).toHaveText('09');
    await expect(heading(page)).toHaveText('CH 09 · Sky Watch');
    for (const key of ['2', '0']) {
      await page.keyboard.press(key); // no CH 02, and CH 00 stays hidden
      await settle(page);
      await expect(led(page)).toHaveText('09');
    }
    await page.getByRole('button', { name: 'Channel up' }).click();
    await settle(page);
    await expect(led(page)).toHaveText('01'); // wraps around
  });

  test('a vertical swipe on the screen changes channel', async ({ page }) => {
    await boot(page);
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
      fire('pointerup', 200); // swipe up = channel up
    });
    await settle(page);
    await expect(led(page)).toHaveText('04');
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
    const cuts = await page.evaluate(() => window.__kaidenpa.cuts);
    expect(cuts.at(-1).burst).toBe(false);

    await page.keyboard.press('Space');
    await expect(page.locator('html')).not.toHaveClass(/is-paused/);
    const resumed = await hook(page, 'progress');
    await page.clock.runFor(1000);
    expect(await hook(page, 'progress')).not.toBe(resumed);
  });

  test('tunes in at the clock position: midnight-synced on air, tape-start in a rerun', async ({
    page,
  }) => {
    await boot(page, '03:20:03'); // 3 s into a 12 s loop
    expect(await hook(page, 'progress')).toBeGreaterThan(0.2);
    expect(await hook(page, 'progress')).toBeLessThan(0.4);
  });

  test('a rerun starts its loop at tape start, not at the frozen 04:20', async ({
    page,
  }) => {
    await boot(page, '12:00:06', '/?rerun=09'); // clock is mid-loop, the tape is not
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
    await expect(
      page.getByRole('button', { name: 'Channel up' }),
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

  test('the CH buttons are disabled off air', async ({ page }) => {
    await boot(page, '12:00:00');
    await expect(
      page.getByRole('button', { name: 'Channel up' }),
    ).toBeDisabled();
    await expect(
      page.getByRole('button', { name: 'Channel down' }),
    ).toBeDisabled();
  });

  test('in a rerun the CH buttons flip between tapes, including the sign-off', async ({
    page,
  }) => {
    await boot(page, '12:00:00', '/?rerun=09');
    await page.getByRole('button', { name: 'Channel up' }).click();
    await settle(page);
    await expect(led(page)).toHaveText('SO');
    await expect(page).toHaveURL(/\?rerun=so$/);
  });
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
    const cuts = await page.evaluate(() => window.__kaidenpa.cuts);
    expect(cuts.every((c) => c.burst === false)).toBe(true);
    await expect(page.locator('.static-layer')).toBeHidden();
  });
});
