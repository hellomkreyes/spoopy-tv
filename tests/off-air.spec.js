import { test, expect } from '@playwright/test';

// Clock is pinned with Playwright's fake timers; timezoneId comes from the config
// (America/Toronto). 2026-06-15 is a plain EDT day, so local = UTC-4.
const at = (hhmm) => new Date(`2026-06-15T${hhmm}:00-04:00`);

async function visit(page, hhmm, path = '/') {
  const errors = [];
  page.on(
    'console',
    (msg) => msg.type() === 'error' && errors.push(msg.text()),
  );
  await page.clock.install({ time: at(hhmm) });
  await page.goto(path);
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true');
  return errors;
}

test.describe('off air', () => {
  test('noon shows the test card, countdown and tape rack', async ({
    page,
  }) => {
    const errors = await visit(page, '12:00');
    await expect(page.getByRole('heading', { name: 'OFF AIR' })).toBeVisible();
    await expect(page.locator('.countdown')).toHaveText('12:00:00');
    await expect(page.getByText('Broadcast resumes at 00:00')).toBeAttached();
    await expect(
      page.getByRole('button', { name: /PLAY THE HAUNTED TAPE · 04:20 AM/ }),
    ).toBeVisible();
    await expect(page.locator('.guide-item')).toHaveCount(7);
    await expect(page.locator('.led-digits')).toHaveText('– –');
    await expect(page.locator('.led [aria-live="polite"]')).toHaveText(
      'Off air',
    );
    expect(errors).toEqual([]);
  });

  test('04:44 is off air, 04:43 is the sign-off, 04:42 is on air', async ({
    page,
  }) => {
    await visit(page, '04:44');
    await expect(page.getByRole('heading', { name: 'OFF AIR' })).toBeVisible();
    await visit(page, '04:43');
    await expect(page.getByRole('heading', { name: /SIGN-OFF/ })).toBeVisible();
    await visit(page, '04:42');
    await expect(
      page.getByRole('heading', { name: /ON AIR · CH 09/ }),
    ).toBeVisible();
  });

  test('countdown ticks', async ({ page }) => {
    await visit(page, '23:59');
    await expect(page.locator('.countdown')).toHaveText('00:01:00');
    await page.clock.runFor(5000);
    await expect(page.locator('.countdown')).toHaveText('00:00:55');
  });

  test('flips to on air at midnight without a reload', async ({ page }) => {
    await visit(page, '23:59');
    await page.clock.runFor(61_000);
    await expect(
      page.getByRole('heading', { name: /ON AIR · CH 03/ }),
    ).toBeVisible();
  });
});

test.describe('haunted tape', () => {
  test('the tape button starts Sky Watch and freezes the clock at 04:20', async ({
    page,
  }) => {
    await visit(page, '12:00');
    await page.getByRole('button', { name: /PLAY THE HAUNTED TAPE/ }).click();
    await expect(
      page.getByRole('heading', { name: 'CH 09 · Sky Watch' }),
    ).toBeFocused();
    await expect(page.locator('.rerun-bug')).toHaveText('● RERUN');
    await expect(page.locator('.rerun-clock')).toHaveText('04:20 AM');
    await expect(page).toHaveURL(/\?rerun=09$/);
    await expect(
      page.locator('.guide-item[aria-current="true"]'),
    ).toContainText('Sky Watch');
  });

  test('plain ?rerun works at any hour, even on air', async ({ page }) => {
    await visit(page, '01:00', '/?rerun');
    await expect(
      page.getByRole('heading', { name: 'CH 09 · Sky Watch' }),
    ).toBeVisible();
  });

  test('?rerun=04 and ?rerun=so pick their channels', async ({ page }) => {
    await visit(page, '12:00', '/?rerun=04');
    await expect(
      page.getByRole('heading', { name: 'CH 04 · Hypnosis Test Pattern' }),
    ).toBeVisible();
    await page.goto('/?rerun=so');
    await expect(
      page.getByRole('heading', { name: /SIGN-OFF · Luna Pie/ }),
    ).toBeVisible();
  });

  test('every rack row starts its tape, including the 04:43 sign-off', async ({
    page,
  }) => {
    await visit(page, '12:00');
    await page.locator('.guide-item[data-ch="03"]').click();
    await expect(
      page.getByRole('heading', { name: 'CH 03 · Emergency Alert' }),
    ).toBeVisible();
    await page.locator('.guide-item[data-ch="so"]').click();
    await expect(page).toHaveURL(/\?rerun=so$/);
  });

  test('the sign-off tape ejects to the off-air card after 60 s', async ({
    page,
  }) => {
    await visit(page, '12:00', '/?rerun=so');
    await page.clock.runFor(59_000);
    await expect(page.getByRole('heading', { name: /SIGN-OFF/ })).toBeVisible();
    await page.clock.runFor(2000);
    await expect(page.getByRole('heading', { name: 'OFF AIR' })).toBeVisible();
    await expect(page).not.toHaveURL(/rerun/);
  });

  test('EJECT returns to the off-air card', async ({ page }) => {
    await visit(page, '12:00', '/?rerun');
    await page.getByRole('button', { name: 'EJECT TAPE' }).click();
    await expect(page.getByRole('heading', { name: 'OFF AIR' })).toBeVisible();
  });

  test('the frozen clock ignores real time passing', async ({ page }) => {
    await visit(page, '04:42', '/?rerun=09');
    await page.clock.runFor(120_000); // real clock passes 04:44
    await expect(
      page.getByRole('heading', { name: 'CH 09 · Sky Watch' }),
    ).toBeVisible();
    await expect(page.locator('.rerun-clock')).toHaveText('04:20 AM');
  });

  test('reduced motion removes the tracking wobble', async ({ browser }) => {
    const wobble = async (reducedMotion) => {
      const ctx = await browser.newContext({
        reducedMotion,
        timezoneId: 'America/Toronto',
      });
      const page = await ctx.newPage();
      await page.goto('/?rerun');
      const name = await page
        .locator('.rerun > .rerun-top')
        .evaluate((n) => window.getComputedStyle(n).animationName);
      await ctx.close();
      return name;
    };
    expect(await wobble('no-preference')).toBe('tracking');
    expect(await wobble('reduce')).toBe('none');
  });
});
