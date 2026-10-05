import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock window and document before importing controller
vi.stubGlobal('window', {
  matchMedia: () => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn() }),
});

vi.stubGlobal('document', {
  addEventListener: vi.fn(),
  hidden: false,
  createElement: () => ({ appendChild: vi.fn() }),
});

// Mock motion.js
vi.mock('./motion.js', () => ({
  gsap: {
    context: vi.fn((fn, el) => {
      const ctx = { revert: vi.fn() };
      fn();
      return ctx;
    }),
    globalTimeline: {
      getChildren: vi.fn(() => []),
      pause: vi.fn(),
      play: vi.fn(),
    },
  },
  isPaused: vi.fn(() => false),
  isReduced: vi.fn(() => false),
  onMotionChange: vi.fn((fn) => {
    fn({ paused: false, reduced: false });
  }),
  togglePaused: vi.fn(),
}));

// Mock channels
vi.mock('./channels/index.js', () => ({
  loadChannel: vi.fn().mockResolvedValue({
    build: vi.fn().mockReturnValue({
      timeline: {
        progress: vi.fn().mockReturnValue(0),
        play: vi.fn(),
        pause: vi.fn(),
      },
      loopMs: 12000,
      stillAt: 0.5,
    }),
    data: {},
  }),
}));

// Mock other imports
vi.mock('./flipQueue.js', () => ({
  createFlipQueue: vi.fn((fn) => ({
    request: vi.fn(async (action) => fn(action)),
    clear: vi.fn(),
    size: 0,
  })),
}));

vi.mock('./guide.js', () => ({
  renderGuide: vi.fn().mockReturnValue({ appendChild: vi.fn() }),
}));

vi.mock('./offAirView.js', () => ({
  renderOffAir: vi.fn().mockReturnValue(vi.fn()),
}));

vi.mock('./rerunOverlay.js', () => ({
  renderRerunOverlay: vi.fn().mockReturnValue(vi.fn()),
}));

vi.mock('./rerun.js', () => ({
  listings: [
    { ch: '01', start: '03:00', title: 'Spirit Weather Report' },
    { ch: '03', start: '03:15', title: 'Emergency Alert' },
    { ch: '04', start: '03:33', title: 'Hypnosis Test Pattern' },
    { ch: '06', start: '03:45', title: 'The 3AM Advice Line' },
    { ch: '07', start: '03:52', title: 'Shadow Play' },
    { ch: '09', start: '04:00', title: 'Sky Watch' },
    { ch: 'so', start: '04:43', title: 'Luna Pie · Opening Theme' },
  ],
}));

vi.mock('./shell.json', () => ({
  default: {
    static: {
      channel: 'CH {ch}',
      signOff: 'SIGN-OFF',
    },
  },
}));

import { createController } from './channelController.js';

describe('controller events', () => {
  let controller;
  let shell;
  let fx;
  let eventHandlers;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    // Mock shell
    shell = {
      controls: {
        up: { addEventListener: vi.fn(), disabled: false },
        down: { addEventListener: vi.fn(), disabled: false },
        motion: { addEventListener: vi.fn() },
        power: { addEventListener: vi.fn() },
      },
      screen: {
        classList: { remove: vi.fn(), add: vi.fn() },
        replaceChildren: vi.fn(),
        contains: () => false,
        querySelector: () => null,
        addEventListener: vi.fn(),
      },
      overlay: { replaceChildren: vi.fn() },
      guide: { replaceChildren: vi.fn(), contains: () => false },
      led: {
        set: vi.fn(),
      },
      staticLayer: { label: {} },
      setMode: vi.fn(),
      setPowerOn: vi.fn(),
      setMotionPaused: vi.fn(),
    };

    // Mock fx
    fx = {
      burst: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn(),
    };

    // Track event handlers
    eventHandlers = {
      tune: [],
      staticStart: [],
      staticEnd: [],
      power: [],
      signOff: [],
      pause: [],
      resume: [],
    };

    controller = createController({ shell, fx });

    // Subscribe to all events
    for (const event of Object.keys(eventHandlers)) {
      controller.events[event]((payload) => {
        eventHandlers[event].push(payload);
      });
    }
  });

  it('emits tune event with ch and lang when tuning', async () => {
    // Initialize with on-air clock state
    controller.clockChanged({
      state: 'on-air',
      listing: { ch: '03', title: 'Emergency Alert' },
    });
    await controller.init(null);
    await vi.runAllTimersAsync();

    // Clear previous events
    eventHandlers.tune.length = 0;

    // Simulate tuning to a channel
    controller.flip(1);
    await vi.runAllTimersAsync();

    const tuneEvents = eventHandlers.tune.filter((e) => e.ch);
    expect(tuneEvents.length).toBeGreaterThan(0);
    expect(tuneEvents[0]).toHaveProperty('ch');
    expect(tuneEvents[0]).toHaveProperty('lang');
  });

  it('emits power event with on flag when power toggles', async () => {
    controller.clockChanged({
      state: 'on-air',
      listing: { ch: '03', title: 'Emergency Alert' },
    });
    await controller.init(null);
    await vi.runAllTimersAsync();

    // Clear previous events
    eventHandlers.power.length = 0;

    controller.togglePower();
    await vi.runAllTimersAsync();

    expect(eventHandlers.power.length).toBeGreaterThan(0);
    const lastPowerEvent = eventHandlers.power[eventHandlers.power.length - 1];
    expect(lastPowerEvent).toHaveProperty('on');
  });

  it('tune event includes correct lang for Japanese channels', async () => {
    controller.clockChanged({
      state: 'on-air',
      listing: { ch: '03', title: 'Emergency Alert' },
    });
    await controller.init(null);
    await vi.runAllTimersAsync();

    // Clear previous events
    eventHandlers.tune.length = 0;

    // Tune to a Japanese channel
    controller.tuneDigit(1);
    await vi.runAllTimersAsync();

    const tuneEvents = eventHandlers.tune.filter((e) => e.ch === '01');
    expect(tuneEvents.length).toBeGreaterThan(0);
    expect(tuneEvents[0].lang).toBe('ja');
  });

  it('tune event includes correct lang for Tagalog channels', async () => {
    controller.clockChanged({
      state: 'on-air',
      listing: { ch: '03', title: 'Emergency Alert' },
    });
    await controller.init(null);
    await vi.runAllTimersAsync();

    // Clear previous events
    eventHandlers.tune.length = 0;

    // Tune to a Tagalog channel
    controller.tuneDigit(4);
    await vi.runAllTimersAsync();

    const tuneEvents = eventHandlers.tune.filter((e) => e.ch === '04');
    expect(tuneEvents.length).toBeGreaterThan(0);
    expect(tuneEvents[0].lang).toBe('tl');
  });

  it('event subscriptions return unsubscribe function', () => {
    const unsub = controller.events.tune(vi.fn());
    expect(typeof unsub).toBe('function');
    unsub();
    // After unsubscribe, new events should not reach that handler
  });

  it('supports multiple subscribers per event', async () => {
    // Create a new controller for this test to have clean event handlers
    const controller2 = createController({ shell, fx });
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    controller2.events.power(handler1);
    controller2.events.power(handler2);

    controller2.clockChanged({
      state: 'on-air',
      listing: { ch: '03', title: 'Emergency Alert' },
    });
    await controller2.init(null);
    await vi.runAllTimersAsync();

    controller2.togglePower();
    await vi.runAllTimersAsync();

    expect(handler1).toHaveBeenCalled();
    expect(handler2).toHaveBeenCalled();
  });
});
