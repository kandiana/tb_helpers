import test from 'node:test';
import assert from 'node:assert/strict';
import { BASE_POINTS_BY_LEVEL, calculateAllocation, ceilBonusPoints, MAX_TALENT_BUDGET, TRIALS, validateInputs } from '../src/calculator.js';

const defaults = () => ({ level: 5, goals: TRIALS.map((trial) => trial.defaultGoals), clanPercents: TRIALS.map((trial) => trial.defaultClan) });

test('sheet defaults yield the expected 98,000 point allocation', () => {
  const result = calculateAllocation(defaults());
  assert.equal(result.total, 98000);
  assert.deepEqual(result.clicks, [2, 2, 2, 2, 3]);
  assert.deepEqual(result.pointsByTrial, [15000, 15000, 15000, 15000, 38000]);
  assert.equal(result.spent, 25);
});

test('all guard levels use the sheet base point values', () => {
  const input = defaults();
  for (let level = 1; level <= 9; level += 1) {
    const result = calculateAllocation({ ...input, level });
    assert.equal(result.base, BASE_POINTS_BY_LEVEL[level - 1]);
    assert.equal(result.total, [44120, 44120, 44120, 68600, 98000, 147000, 215600, 323400, 588000][level - 1]);
  }
});

test('prize formulas respect thresholds, zero goals, and Briareus half steps', () => {
  const at = (id, goals) => TRIALS.find((trial) => trial.id === id).prizes(goals);
  assert.deepEqual([0, 1, 2, 3, 15, 16, 35].map((goals) => at('chimera', goals)), [0, 1, 1, 1, 5, 6, 15]);
  assert.deepEqual([0, 1, 2, 10, 11, 21].map((goals) => at('basilisk', goals)), [0, 1, 1, 5, 6, 15]);
  assert.deepEqual([0, 1, 2, 10, 11, 12, 21].map((goals) => at('lava', goals)), [0, 0, 1, 5, 5, 6, 15]);
  assert.deepEqual([0, 1, 2, 10, 11, 20].map((goals) => at('tartaros', goals)), [0, 1, 1, 5, 6, 15]);
  assert.deepEqual([0, 1, 2, 3, 79, 80].map((goals) => at('briareus', goals)), [0, 1, 1, 2, 40, 40]);
});

test('bonus rounding is exact at integer boundaries and decimal clan rates', () => {
  assert.equal(ceilBonusPoints(350, 2, 25, 25), 263);
  assert.equal(ceilBonusPoints(500, 0, 25, 63), 315);
  assert.equal(ceilBonusPoints(500, 0, 25, 62.01), 311);
});

test('zero prizes choose zero clicks; Briareus max goals shift a click toward another trial', () => {
  const zero = calculateAllocation({ level: 5, goals: [0, 0, 0, 0, 0], clanPercents: [0, 0, 0, 0, 0] });
  assert.equal(zero.total, 0);
  assert.deepEqual(zero.clicks, [0, 0, 0, 0, 0]);
  const full = calculateAllocation(defaults());
  const reducedBriareus = calculateAllocation({ ...defaults(), goals: [35, 21, 21, 20, 40] });
  assert.equal(reducedBriareus.total, 79375);
  assert.deepEqual(reducedBriareus.clicks, [2, 2, 2, 3, 2]);
  assert.equal(full.spent, 25);
});

test('exhaustive result matches an independent optimizer over deterministic randomized cases', () => {
  let seed = 17;
  const random = (limit) => { seed = (seed * 16807) % 2147483647; return seed % limit; };
  for (let sample = 0; sample < 20; sample += 1) {
    const input = {
      level: random(9) + 1,
      goals: TRIALS.map((trial) => random(trial.maxGoals + 1)),
      clanPercents: TRIALS.map((trial) => random(trial.maxClan * 100 + 1) / 100),
    };
    const result = calculateAllocation(input);
    let oracle = -1;
    for (let code = 0; code < 3125; code += 1) {
      let rest = code;
      const clicks = Array.from({ length: 5 }, () => { const value = rest % 5; rest = Math.floor(rest / 5); return value; });
      if (clicks.reduce((sum, value) => sum + value * value, 0) > MAX_TALENT_BUDGET) continue;
      const base = BASE_POINTS_BY_LEVEL[input.level - 1];
      const total = TRIALS.reduce((sum, trial, index) => {
        const prizes = trial.prizes(input.goals[index]);
        const bonus = Math.ceil(base * (clicks[index] * trial.talentIncrement + input.clanPercents[index]) / 100 - 1e-10);
        return sum + prizes * (base + bonus);
      }, 0);
      oracle = Math.max(oracle, total);
    }
    assert.equal(result.total, oracle, `sample ${sample}`);
    assert.ok(result.spent <= MAX_TALENT_BUDGET);
  }
});

test('invalid blank, fractional, out of range, and over-precision values are rejected', () => {
  const input = defaults();
  assert.equal(validateInputs(input).length, 0);
  assert.ok(validateInputs({ ...input, goals: ['', 21, 21, 20, 80] }).some((error) => error.includes('Chimera')));
  assert.ok(validateInputs({ ...input, goals: [35.5, 21, 21, 20, 80] }).some((error) => error.includes('whole number')));
  assert.ok(validateInputs({ ...input, clanPercents: [100.01, 50, 50, 50, 45] }).some((error) => error.includes('Chimera')));
  assert.ok(validateInputs({ ...input, clanPercents: [50.001, 50, 50, 50, 45] }).some((error) => error.includes('2 decimal')));
});
