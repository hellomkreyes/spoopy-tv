import { test, expect } from '@playwright/test';
import { visit } from './helpers.js';

// Structural hooks only (classes, data-ch, data-focus, LED digits). Headings,
// button labels and on-screen text are copy, so they are not matched here.
const title = (page) => page.locator('#screen [data-focus]');
const tuned = (page) => page.locator('.guide-item[aria-current="true"]');
const led = (page) => page.locator('.led-digits');

test('off air: test card, ticking countdown, tape rack and LED', async ({
  page,
}) => {
  const errors = await visit(page, '12:00');
  await expect(page.locator('.test-card')).toBeVisible();
  await expect(title(page)).toBeVisible();
  await expect(page.locator('.view-count')).toBeAttached();
  await expect(page.locator('.tape')).toBeVisible();
  await expect(page.locator('.guide-item')).toHaveCount(7);
  await expect(led(page)).toHaveText('– –');
  await expect(page.locator('.led [aria-live="polite"]')).not.toBeEmpty();
  await expect(page.locator('.countdown')).toHaveText('12:00:00');
  await page.clock.runFor(5000);
  await expect(page.locator('.countdown')).toHaveText('11:59:55');
  expect(errors).toEqual([]);
});

test('clock: 04:42 on air, 04:43 sign-off, 04:44 off air, midnight without a reload', async ({
  page,
}) => {
  await visit(page, '04:42');
  await expect(led(page)).toHaveText('09');
  await expect(tuned(page)).toHaveAttribute('data-ch', '09');

  await visit(page, '04:43');
  await expect(led(page)).toHaveText('SO');
  // The sign-off has no live guide row, only a rack row, so check the screen instead.
  await expect(page.locator('#screen [data-focus]')).toBeVisible();

  await visit(page, '04:44');
  await expect(page.locator('.test-card')).toBeVisible();
  await expect(led(page)).toHaveText('– –');

  await visit(page, '23:59');
  await page.clock.fastForward(61_000);
  await expect(led(page)).toHaveText('03');
  await expect(tuned(page)).toHaveAttribute('data-ch', '03');
});

test('tape: the button plays Sky Watch at a frozen 04:20, EJECT returns to the card', async ({
  page,
}) => {
  await visit(page, '12:00');
  await page.locator('.tape').click();
  await expect(title(page)).toBeFocused();
  await expect(led(page)).toHaveText('09');
  await expect(page.locator('.rerun-bug')).toHaveText(/\S/);
  await expect(page.locator('.rerun-clock')).toHaveText('04:20 AM');
  await expect(page).toHaveURL(/\?rerun=09$/);
  await expect(tuned(page)).toHaveAttribute('data-ch', '09');

  await page.locator('.eject').click();
  await expect(page.locator('.test-card')).toBeVisible();
  await expect(page).not.toHaveURL(/rerun/);
});

test('rerun links and rack rows: plain, numbered, sign-off, any hour', async ({
  page,
}) => {
  await visit(page, '01:00', '/?rerun'); // plain ?rerun works even on air
  await expect(led(page)).toHaveText('09');

  await visit(page, '12:00', '/?rerun=04');
  await expect(led(page)).toHaveText('04');

  await page.locator('.guide-item[data-ch="03"]').click();
  await expect(led(page)).toHaveText('03');
  await page.locator('.guide-item[data-ch="so"]').click(); // the 04:43 row too
  await expect(led(page)).toHaveText('SO');
  await expect(page).toHaveURL(/\?rerun=so$/);
});

test('rerun clock: the sign-off tape ejects after 60 s, and real time does not move 04:20', async ({
  page,
}) => {
  await visit(page, '12:00', '/?rerun=so');
  await page.clock.fastForward(59_000);
  await expect(led(page)).toHaveText('SO');
  await page.clock.fastForward(2000);
  await expect(page.locator('.test-card')).toBeVisible();
  await expect(page).not.toHaveURL(/rerun/);

  await visit(page, '04:42', '/?rerun=09');
  await page.clock.fastForward(120_000); // the real clock passes 04:44
  await expect(led(page)).toHaveText('09');
  await expect(page.locator('.rerun-clock')).toHaveText('04:20 AM');
});

test('reduced motion removes the tracking wobble', async ({ browser }) => {
  // Add the entry class by hand so the CSS rule can be read deterministically
  // (the real class clears itself when the 600 ms animation ends).
  const wobble = async (reducedMotion) => {
    const ctx = await browser.newContext({
      reducedMotion,
      timezoneId: 'America/Toronto',
    });
    const page = await ctx.newPage();
    await page.goto('/?rerun');
    const name = await page.locator('.crt-content').evaluate((n) => {
      n.classList.add('is-tuning');
      return window.getComputedStyle(n.firstElementChild).animationName;
    });
    await ctx.close();
    return name;
  };
  expect(await wobble('no-preference')).toBe('tracking');
  expect(await wobble('reduce')).toBe('none');
});
