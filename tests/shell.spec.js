import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { visit } from './helpers.js';

const ON_AIR = { name: 'on air', time: '03:20', path: '/' };
const OFF_AIR = { name: 'off air', time: '12:00', path: '/' };
const RERUN = { name: 'rerun', time: '12:00', path: '/?rerun=09' };

// axe is mostly state- and width-independent, so check every state at desktop width
// and only the tightest layout (off air) on mobile.
const LAYOUTS = [
  { width: 1440, height: 900, states: [ON_AIR, OFF_AIR, RERUN] },
  { width: 390, height: 844, states: [OFF_AIR] },
];

test('layout: axe is clean, nothing overflows, and the guide/definition order flips off air', async ({
  page,
}) => {
  const top = (sel) =>
    page.locator(sel).evaluate((n) => n.getBoundingClientRect().top);

  for (const { width, height, states } of LAYOUTS) {
    await page.setViewportSize({ width, height });
    for (const state of states) {
      await test.step(`${width}px, ${state.name}`, async () => {
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
    await test.step(`${width}px, block order`, async () => {
      await visit(page, '03:20');
      expect(await top('.definition')).toBeLessThan(await top('.guide'));
      await visit(page, '12:00');
      expect(await top('.guide')).toBeLessThan(await top('.definition'));
    });
  }
});

test('mobile: header links, tap targets and the tape button fit the screen', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await visit(page, '12:00');

  await expect(page.getByRole('link', { name: 'TV GUIDE' })).toBeVisible();
  await expect(
    page.getByRole('link', { name: /CHIBIMUERE\.COM/ }),
  ).toBeVisible();

  const box = (sel) =>
    page.locator(sel).evaluate((n) => n.getBoundingClientRect().toJSON());
  const crt = await box('.crt');
  const tape = await box('.tape');
  expect(tape.top).toBeGreaterThanOrEqual(crt.top);
  expect(tape.bottom).toBeLessThanOrEqual(crt.bottom);

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

test('on air: header, guide, LED and self-hosted fonts', async ({ page }) => {
  const hosts = new Set();
  const fontFiles = [];
  page.on('request', (req) => {
    const url = new URL(req.url());
    hosts.add(url.host);
    if (url.pathname.endsWith('.woff2')) fontFiles.push(url.pathname);
  });
  await visit(page, '03:20');

  await test.step('header', async () => {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      '怪電波 Kaidenpa',
    );
    expect(await page.locator('.site-nav a').allTextContents()).toEqual([
      'TV GUIDE',
      'CHIBIMUERE.COM ↗',
    ]);
    await expect(page.getByRole('link', { name: 'TV GUIDE' })).toHaveAttribute(
      'href',
      '#listings',
    );
    await expect(page.locator('#listings')).toBeAttached();
  });

  // The 500 ms announce debounce is unit-tested in src/led.test.js.
  await test.step('guide and LED', async () => {
    const tuned = page.locator('.guide-item[aria-current="true"]');
    await expect(tuned).toContainText('Emergency Alert');
    await expect(tuned.locator('.guide-badge-live')).toContainText('ON AIR');
    await expect(page.locator('.guide-lost')).toContainText('signal lost');
    await expect(page.locator('.led-digits')).toHaveText('03');
    await expect(page.locator('.led [aria-live="polite"]')).toHaveText(
      'Channel 3: Emergency Alert',
    );
  });

  await test.step('fonts are self-hosted and applied', async () => {
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
