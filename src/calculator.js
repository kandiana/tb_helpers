export const MAX_TALENT_BUDGET = 25;

export const TRIALS = [
  {
    id: 'chimera', name: 'Chimera', subtitle: 'Raids', maxGoals: 35, maxPrizes: 15,
    defaultGoals: 35, talentIncrement: 25, defaultClan: 50, maxClan: 100,
    prizes: (goals) => Math.min(Math.trunc((Math.min(goals, 15) + 2) / 3) + Math.trunc((Math.max(goals - 15, 0) + 1) / 2), 15),
  },
  {
    id: 'basilisk', name: 'Basilisk', subtitle: 'Hero', maxGoals: 21, maxPrizes: 15,
    defaultGoals: 21, talentIncrement: 25, defaultClan: 50, maxClan: 100,
    prizes: (goals) => Math.min(Math.trunc((Math.min(goals, 10) + 1) / 2) + Math.max(goals - 10, 0), 15),
  },
  {
    id: 'lava', name: 'Lava fountain', subtitle: 'Fountains', maxGoals: 21, maxPrizes: 15,
    defaultGoals: 21, talentIncrement: 25, defaultClan: 50, maxClan: 100,
    prizes: (goals) => Math.min(Math.trunc((Math.min(goals - 1, 10) + 1) / 2) + Math.max(goals - 11, 0), 15),
  },
  {
    id: 'tartaros', name: 'Tartaros', subtitle: 'Crypts', maxGoals: 20, maxPrizes: 15,
    defaultGoals: 20, talentIncrement: 25, defaultClan: 50, maxClan: 100,
    prizes: (goals) => Math.min(Math.trunc((Math.min(goals, 10) + 1) / 2) + Math.max(goals - 10, 0), 15),
  },
  {
    id: 'briareus', name: 'Briareus', subtitle: '3 captains', maxGoals: 80, maxPrizes: 40,
    defaultGoals: 80, talentIncrement: 15, defaultClan: 45, maxClan: 60,
    prizes: (goals) => Math.min(Math.trunc((goals + 1) / 2), 40),
  },
];

export const BASE_POINTS_BY_LEVEL = [225, 225, 225, 350, 500, 750, 1100, 1650, 3000];

export function ceilBonusPoints(basePoints, clicks, incrementPercent, clanPercent) {
  // Percentages are represented in hundredths of a percent to avoid binary float
  // artifacts around exact whole points (for example, 315.00000000000006).
  const clanHundredths = Math.round(Number(clanPercent) * 100);
  const percentHundredths = clicks * incrementPercent * 100 + clanHundredths;
  return Math.ceil((basePoints * percentHundredths) / 10000);
}

export function calculateAllocation({ level, goals, clanPercents }) {
  const base = BASE_POINTS_BY_LEVEL[level - 1];
  const details = TRIALS.map((trial, index) => ({
    ...trial,
    goals: Number(goals[index]),
    clanPercent: Number(clanPercents[index]),
    prizesEarned: trial.prizes(Number(goals[index])),
  }));
  let best = null;
  let optimalCount = 0;

  // Enumerate all 5^5 allocations. Keep ties deterministic by retaining the
  // first lexicographic allocation after preferring lower talent cost.
  for (let a = 0; a <= 4; a += 1) {
    for (let b = 0; b <= 4; b += 1) {
      for (let c = 0; c <= 4; c += 1) {
        for (let d = 0; d <= 4; d += 1) {
          for (let e = 0; e <= 4; e += 1) {
            const clicks = [a, b, c, d, e];
            const spent = clicks.reduce((sum, value) => sum + value * value, 0);
            if (spent > MAX_TALENT_BUDGET) continue;
            const pointsByTrial = details.map((trial, index) => trial.prizesEarned * (
              base + ceilBonusPoints(base, clicks[index], trial.talentIncrement, trial.clanPercent)
            ));
            const total = pointsByTrial.reduce((sum, value) => sum + value, 0);
            if (!best || total > best.total || (total === best.total && spent < best.spent)) {
              best = { clicks, spent, pointsByTrial, total };
              optimalCount = 1;
            } else if (total === best.total && spent === best.spent) {
              optimalCount += 1;
            }
          }
        }
      }
    }
  }
  return { ...best, details, base, optimalCount };
}

export function validateInputs({ level, goals, clanPercents }) {
  const errors = [];
  if (!Number.isInteger(Number(level)) || Number(level) < 1 || Number(level) > 9) {
    errors.push('Choose a guards level from 1 to 9.');
  }
  TRIALS.forEach((trial, index) => {
    const goalRaw = String(goals[index] ?? '').trim();
    const clanRaw = String(clanPercents[index] ?? '').trim();
    const goal = Number(goalRaw);
    const clan = Number(clanRaw);
    if (!goalRaw || !Number.isInteger(goal) || goal < 0 || goal > trial.maxGoals) {
      errors.push(`${trial.name}: goals must be a whole number from 0 to ${trial.maxGoals}.`);
    }
    if (!clanRaw || !Number.isFinite(clan) || clan < 0 || clan > trial.maxClan || !/^\d+(?:[.,]\d{1,2})?$/.test(clanRaw)) {
      errors.push(`${trial.name}: clan bonus must be 0–${trial.maxClan}% with up to 2 decimal places.`);
    }
  });
  return errors;
}
