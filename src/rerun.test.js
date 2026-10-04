import { describe, expect, it } from 'vitest';
import { frozenNow, parseRerun } from './rerun.js';

describe('parseRerun', () => {
  it.each([
    ['?foo=1', null],
    ['?rerun', '09'],
    ['?rerun=04', '04'],
    ['?rerun=4', '04'],
    ['?rerun=SO', 'so'],
    ['?rerun=<script>', '09'],
  ])('%j -> %j', (search, expected) => {
    expect(parseRerun(search)).toBe(expected);
  });
});

describe('frozenNow', () => {
  it('pins to 04:20 local on the same day', () => {
    const now = new Date(2026, 5, 15, 13, 37, 12);
    expect(frozenNow(now)).toEqual(new Date(2026, 5, 15, 4, 20));
  });
});
