import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// 2026-06-15 is a plain EDT day (local = UTC-4); America/Toronto comes from the config.
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

const SIZES = [
  { name: '1440', width: 1440, height: 900 },
  { name: '390', width: 390, height: 844 },
];

const ON_AIR = { name: 'on air', time: '03:20', path: '/' };
const OFF_AIR = { name: 'off air', time: '12:00', path: '/' };
const RERUN = { name: 'rerun', time: '12:00', path: '/?rerun=09' };
// axe is state- and width-independent for most rules, so check every state once
// at desktop width and only the tightest layout (off air) on mobile.
const AXE_STATES = { 1440: [ON_AIR, OFF_AIR, RERUN], 390: [OFF_AIR] };

for (const size of SIZES) {
  test.describe(`TV shell at ${size.name}px`, () => {
    test.use({ viewport: { width: size.width, height: size.height } });

    for (const state of AXE_STATES[size.name]) {
      test(`${state.name}: axe is clean, nothing overflows sideways`, async ({
        page,
      }) => {
        const errors = await visit(page, state.time, state.path);
        const results = await new AxeBuilder({ page }).analyze();
        expect(results.violations).toEqual([]);
        const overflow = await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        );
        expect(overflow).toBeLessThanOrEqual(0);
        expect(errors).toEqual([]);
      });
    }

    test('guide sits below the definition on air and above it off air', async ({
      page,
    }) => {
      await visit(page, '03:20');
      const y = (sel) =>
        page.locator(sel).evaluate((n) => n.getBoundingClientRect().top);
      const liveDef = await y('.definition');
      const liveGuide = await y('.guide');
      expect(liveDef).toBeLessThan(liveGuide);

      await visit(page, '12:00');
      const offDef = await y('.definition');
      const offGuide = await y('.guide');
      expect(offGuide).toBeLessThan(offDef);
    });
  });
}

test.describe('TV shell at 390px only', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('TV GUIDE and CHIBIMUERE.COM are both visible in the header', async ({
    page,
  }) => {
    await visit(page, '12:00');
    await expect(page.getByRole('link', { name: 'TV GUIDE' })).toBeVisible();
    await expect(
      page.getByRole('link', { name: /CHIBIMUERE\.COM/ }),
    ).toBeVisible();
  });

  test('the Haunted Tape button sits fully inside the screen', async ({
    page,
  }) => {
    await visit(page, '12:00');
    const box = (sel) =>
      page.locator(sel).evaluate((n) => n.getBoundingClientRect().toJSON());
    const crt = await box('.crt');
    const tape = await box('.tape');
    expect(tape.top).toBeGreaterThanOrEqual(crt.top);
    expect(tape.bottom).toBeLessThanOrEqual(crt.bottom);
  });

  test('buttons are at least 44px tall', async ({ page }) => {
    await visit(page, '12:00');
    const small = await page.locator('button:visible').evaluateAll((nodes) =>
      nodes
        .map((n) => ({
          text: n.textContent.trim().slice(0, 30),
          h: n.getBoundingClientRect().height,
        }))
        .filter((b) => b.h < 44),
    );
    expect(small).toEqual([]);
  });
});

test.describe('TV shell', () => {
  test('header shows the wordmark, an h1 and only the nav links we have targets for', async ({
    page,
  }) => {
    await visit(page, '12:00');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      '怪電波 Kaidenpa',
    );
    const links = await page.locator('.site-nav a').allTextContents();
    expect(links).toEqual(['TV GUIDE', 'CHIBIMUERE.COM ↗']);
    await expect(page.getByRole('link', { name: 'TV GUIDE' })).toHaveAttribute(
      'href',
      '#listings',
    );
    await expect(page.locator('#listings')).toBeAttached();
  });

  // The 500 ms debounce itself is unit-tested in src/led.test.js.
  test('on air: the guide marks the live show and the LED announces it', async ({
    page,
  }) => {
    await visit(page, '03:20');
    const live = page.locator('.guide-row[aria-current="true"]');
    await expect(live).toContainText('Emergency Alert');
    await expect(live).toContainText('ON AIR');
    await expect(page.locator('.guide-lost')).toContainText('signal lost');
    await expect(page.locator('.led-digits')).toHaveText('03');
    await expect(page.locator('.led [aria-live="polite"]')).toHaveText(
      'Channel 3: Emergency Alert',
    );
  });

  test('fonts are self-hosted: no third-party requests, subsets load and apply', async ({
    page,
  }) => {
    const hosts = new Set();
    const fontFiles = [];
    page.on('request', (req) => {
      const url = new URL(req.url());
      hosts.add(url.host);
      if (url.pathname.endsWith('.woff2')) fontFiles.push(url.pathname);
    });
    await visit(page, '12:00');
    await page.evaluate(() => document.fonts.ready);
    expect([...hosts]).toEqual(['localhost:4173']);
    expect(fontFiles.length).toBeGreaterThan(0);
    const loaded = await page.evaluate(() =>
      [...document.fonts]
        .filter((f) => f.status === 'loaded')
        .map((f) => f.family.replace(/"/g, '')),
    );
    expect(loaded).toEqual(
      expect.arrayContaining([
        'Dela Gothic One',
        'DotGothic16',
        'Zen Kaku Gothic New',
      ]),
    );
  });
});
