import assert from 'node:assert/strict';
import test from 'node:test';
import { weeklyGradeAverages } from './grade-statistics.js';

test('groups scores normalized to 20 by Monday-starting week and averages each group', () => {
  const averages = weeklyGradeAverages([
    { date: '2026-03-02', value: '12', outOf: '20' },
    { date: '2026-03-06', value: '8', outOf: '10' },
    { date: '2026-03-09', value: '18', outOf: '20' }
  ]);

  assert.deepEqual(averages, [
    { start: '2026-03-02', average: 14 },
    { start: '2026-03-09', average: 18 }
  ]);
});

test('ignores grades with invalid dates or scores', () => {
  assert.deepEqual(weeklyGradeAverages([
    { date: '2026-02-30', value: '18', outOf: '20' },
    { date: '2026-03-02', value: 'x', outOf: '20' },
    { date: '', value: '16', outOf: '20' }
  ]), []);
});
