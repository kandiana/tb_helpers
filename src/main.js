import { createApp, computed, reactive } from 'vue/dist/vue.esm-bundler.js';
import { BASE_POINTS_BY_LEVEL, calculateAllocation, TRIALS, validateInputs } from './calculator.js';
import './style.css';

const app = createApp({
  setup() {
    const level = reactive({ value: '5' });
    const rows = reactive(TRIALS.map((trial) => ({
      goals: String(trial.defaultGoals),
      clan: String(trial.defaultClan),
    })));
    const values = computed(() => ({
      level: Number(level.value),
      goals: rows.map((row) => row.goals),
      clanPercents: rows.map((row) => row.clan),
    }));
    const errors = computed(() => validateInputs(values.value));
    const result = computed(() => errors.value.length ? null : calculateAllocation(values.value));
    const basePoints = computed(() => BASE_POINTS_BY_LEVEL[Number(level.value) - 1] || 0);
    const number = (value) => new Intl.NumberFormat('en-US').format(value);
    const bonusBreakdown = (trial, clanPercent, clicks) => {
      const talent = clicks * trial.talentIncrement;
      const total = Number((Number(clanPercent) + talent).toFixed(2));
      return { talent: `${talent}%`, total: `${total}%` };
    };
    return { level, rows, errors, result, basePoints, number, bonusBreakdown, trials: TRIALS };
  },
  template: `
    <main class="page-shell">
      <header class="topbar">
        <a class="brand" href="#" aria-label="TB Helpers home"><span class="brand-mark">TB</span><span>helpers</span></a>
        <span class="local-chip">Local calculator</span>
      </header>

      <section class="intro" aria-labelledby="page-title">
        <p class="eyebrow">OLYMPUS · FIVE TRIALS</p>
        <h1 id="page-title">Points planner</h1>
        <p class="intro-copy">Enter expected goals and clan bonus for each trial. The planner finds the highest scoring talent allocation within your 25-point budget.</p>
      </section>

      <div class="planner-grid">
      <div class="input-column">
      <section class="settings-card" aria-label="Calculator inputs">
        <div class="settings-heading">
          <div><span class="section-kicker">01</span><h2>Your setup</h2></div>
          <span class="live-note">Updates as you type</span>
        </div>
        <label class="level-control" for="guards-level">
          <span class="field-label">Guards level</span>
          <select id="guards-level" v-model="level.value" aria-describedby="guards-help">
            <option v-for="n in 9" :key="n" :value="String(n)">Level {{ n }}</option>
          </select>
          <span id="guards-help" class="field-hint">{{ number(basePoints) }} base points per prize</span>
        </label>

        <div class="trials-heading">
          <div><h3>Expected results</h3><p>Expected goals for each trial.</p></div>
          <div class="col-labels"><span>Goals</span><span>Clan bonus</span></div>
        </div>
        <div class="trial-list">
          <div v-for="(trial, index) in trials" :key="trial.id" class="trial-row">
            <div class="trial-name"><span class="trial-index">0{{ index + 1 }}</span><div><strong>{{ trial.name }}</strong><small>{{ trial.subtitle }} · max {{ trial.maxGoals }}</small></div></div>
            <label class="input-wrap"><span class="sr-only">{{ trial.name }} expected goals</span><input type="number" min="0" :max="trial.maxGoals" step="1" inputmode="numeric" v-model="rows[index].goals" :aria-label="trial.name + ' expected goals'"><span class="input-suffix">/ {{ trial.maxGoals }}</span></label>
            <label class="input-wrap clan-wrap"><span class="sr-only">{{ trial.name }} clan points bonus percent</span><input type="number" min="0" :max="trial.maxClan" step="0.01" inputmode="decimal" v-model="rows[index].clan" :aria-label="trial.name + ' clan points bonus percent'"><span class="input-suffix">%</span><small class="limit-note">up to {{ trial.maxClan }}%</small></label>
          </div>
        </div>
      </section>

      <section v-if="errors.length" class="error-card" aria-live="polite" role="alert">
        <strong>Check your entries</strong><ul><li v-for="error in errors" :key="error">{{ error }}</li></ul>
      </section>
      </div>

      <section v-if="result" class="result-card" aria-live="polite" aria-label="Predicted points">
        <div class="result-topline"><div><span class="section-kicker">02 · BEST ALLOCATION</span><h2>Predicted points</h2></div><span class="optimal-tag">{{ result.optimalCount }} {{ result.optimalCount === 1 ? 'best allocation' : 'best allocations' }}</span></div>
        <div class="total-line"><strong>{{ number(result.total) }}</strong><span>points</span></div>
        <div class="budget-row"><div class="budget-label"><span>Talent points used</span><strong>{{ result.spent }} <span>/ 25</span></strong></div><div class="budget-track" role="progressbar" :aria-valuenow="result.spent" aria-valuemin="0" aria-valuemax="25" aria-label="Talent points used"><span :style="{ width: (result.spent / 25 * 100) + '%' }"></span></div><small>{{ 25 - result.spent }} talent {{ 25 - result.spent === 1 ? 'point' : 'points' }} left</small></div>
        <div class="allocation-heading"><div><h3>Allocation by trial</h3><p>Planner checked all 3,125 combinations.</p></div><span class="talent-key"><i></i>Talent clicks</span></div>
        <div class="allocation-list">
          <div v-for="(trial, index) in result.details" :key="trial.id" class="allocation-row">
            <div class="alloc-trial"><strong>{{ trial.name }}</strong><small>{{ trial.prizesEarned }} {{ trial.prizesEarned === 1 ? 'prize' : 'prizes' }} · {{ bonusBreakdown(trial, rows[index].clan, result.clicks[index]).talent }} talent · {{ bonusBreakdown(trial, rows[index].clan, result.clicks[index]).total }} total</small></div>
            <div class="click-pills" :aria-label="result.clicks[index] + ' talent clicks'"><span class="click-number">{{ result.clicks[index] }}</span><span class="click-label">clicks</span></div>
            <div class="allocation-value"><small>{{ result.clicks[index] }}² = {{ result.clicks[index] ** 2 }} talent points</small><strong class="trial-points">{{ number(result.pointsByTrial[index]) }}</strong></div>
          </div>
        </div>
        <div class="calculation-foot"><span>Base {{ number(result.base) }} points · 1 prize</span><span>Each trial rounds bonus up to a whole point</span></div>
      </section>
      </div>

      <details class="notes-card"><summary>Calculation notes</summary><div class="notes-body"><p>Results use goals and clan bonuses for one five-trial run. The planner exhaustively checks each trial at 0–4 clicks and selects the highest total under the 25-point squared-click budget. If totals tie, it uses fewer talent points, then the first allocation in trial order.</p><p>Base points at guard levels 3 and 4 were confirmed by the sheet's author. Other level values follow the sheet's remembered or researched values. Lava fountain reference: 5 fountains reach 11 goals; 6 fountains reach 18, with all 21 goals at 6.5.</p><p class="source-link">Source snapshot, read October 5, 2026 · <a href="https://docs.google.com/spreadsheets/d/1FLaHp70AgEva7e7jR6R5byp3yFG8mh1A9u5YlWpEpyA/edit?gid=1270829081" target="_blank" rel="noreferrer">Open reference sheet ↗</a></p></div></details>
      <footer>Olympus points planner</footer>
    </main>
  `,
});

app.mount('#app');
