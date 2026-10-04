import { describe, expect, it } from 'vitest';
import { frozenNow, parseRerun } from './rerun.js';

describe('rerun', () => {
  it('parses ?rerun: null without it, the default for bad values, padded and case-insensitive ids', () => {
    const rows = [
      ['?foo=1', null],
      ['?rerun', '09'],
      ['?rerun=04', '04'],
      ['?rerun=4', '04'],
      ['?rerun=SO', 'so'],
      ['?rerun=<script>', '09'],
    ];
    for (const [search, expected] of rows) {
      expect(parseRerun(search), search).toBe(expected);
    }
  });

  it('pins the frozen clock to 04:20 local on the same day', () => {
    const now = new Date(2026, 5, 15, 13, 37, 12);
    expect(frozenNow(now)).toEqual(new Date(2026, 5, 15, 4, 20));
  });
});
