import { expect, test } from 'bun:test';

import {
  describeDreamCuratorWorkflow,
  nextDreamCuratorRunAt,
} from '../src/engine/DreamCuratorSchedule.js';

test('dream curator schedule describes manual, interval, daily, and continuous workflows', () => {
  expect(describeDreamCuratorWorkflow({ mode: 'manual' }).trigger).toBe('operator_runs_cogmem_memory_dream');
  expect(describeDreamCuratorWorkflow({ mode: 'interval', intervalMs: 21_600_000 }).trigger).toContain('21600000ms');
  expect(describeDreamCuratorWorkflow({ mode: 'daily', dailyTimes: ['03:30', '15:30'], timezone: 'Asia/Tokyo' }).trigger)
    .toContain('03:30, 15:30 Asia/Tokyo');
  expect(describeDreamCuratorWorkflow({ mode: 'continuous', continuousIdleMs: 120_000 }).trigger)
    .toContain('idle for 120000ms');
});

test('dream curator schedule computes next interval and daily runs without starting a daemon', () => {
  const now = Date.parse('2026-06-08T01:20:00.000Z');
  expect(nextDreamCuratorRunAt({
    mode: 'interval',
    intervalMs: 60_000,
    lastRunAt: now - 30_000,
  }, now)).toBe(now + 30_000);

  expect(nextDreamCuratorRunAt({
    mode: 'daily',
    dailyTimes: ['01:00', '03:00'],
    timezone: 'UTC',
  }, now)).toBe(Date.parse('2026-06-08T03:00:00.000Z'));

  expect(nextDreamCuratorRunAt({ mode: 'manual' }, now)).toBeUndefined();
});
