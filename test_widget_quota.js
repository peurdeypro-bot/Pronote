import assert from 'node:assert/strict';
import test from 'node:test';
import { consumeWidgetQuota } from './widget-quota.js';

test('allows two requests per rolling minute and returns a retry delay for the third', () => {
  const quotas = new Map();
  const start = Date.UTC(2026, 0, 2, 12, 0, 0);

  assert.deepEqual(consumeWidgetQuota('ip-a', { now: start, quotas }), { allowed: true });
  assert.deepEqual(consumeWidgetQuota('ip-a', { now: start + 20_000, quotas }), { allowed: true });

  const limited = consumeWidgetQuota('ip-a', { now: start + 30_000, quotas });
  assert.equal(limited.allowed, false);
  assert.equal(limited.retryAfter, 30);
  assert.match(limited.error, /Attends une minute/);

  assert.deepEqual(consumeWidgetQuota('ip-a', { now: start + 60_000, quotas }), { allowed: true });
});

test('limits each address to ten requests per UTC day and resets at midnight', () => {
  const quotas = new Map();
  const start = Date.UTC(2026, 0, 2, 0, 1, 0);

  for (let count = 0; count < 10; count += 1) {
    const result = consumeWidgetQuota('ip-a', { now: start + count * 60_001, quotas });
    assert.equal(result.allowed, true, `request ${count + 1} should be allowed`);
  }

  const limited = consumeWidgetQuota('ip-a', { now: start + 10 * 60_001, quotas });
  assert.equal(limited.allowed, false);
  assert.match(limited.error, /Quota quotidien atteint/);
  assert.ok(limited.retryAfter > 0);

  assert.deepEqual(consumeWidgetQuota('ip-a', { now: Date.UTC(2026, 0, 3, 0, 0, 0), quotas }), { allowed: true });
});

test('keeps quotas separate by address and bounds stale in-memory entries', () => {
  const quotas = new Map();
  const start = Date.UTC(2026, 0, 2, 12, 0, 0);
  assert.deepEqual(consumeWidgetQuota('ip-a', { now: start, quotas }), { allowed: true });
  assert.deepEqual(consumeWidgetQuota('ip-b', { now: start, quotas }), { allowed: true });

  quotas.set('old-ip', {
    day: '2025-12-30',
    dailyCount: 10,
    minuteTimestamps: [],
    updatedAt: start - 49 * 60 * 60 * 1000
  });
  consumeWidgetQuota('ip-c', { now: start, quotas });
  assert.equal(quotas.has('old-ip'), false);
});
