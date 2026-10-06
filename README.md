# TB Helpers · Points planner

A local, one-page Vue calculator for planning Olympus points across five trials. It evaluates all 3,125 possible 0–4-click allocations and returns the highest scoring allocation whose squared clicks use no more than 25 talent points.

## Run locally

Requires Node.js 18.17.1 or newer.

```sh
npm install
npm run dev
```

Create a production bundle with `npm run build`. Run the calculation checks with `npm test`.

## Calculation model

- Guards levels 1–9 use base points `[225, 225, 225, 350, 500, 750, 1100, 1650, 3000]` per prize.
- Inputs are expected goals reached and clan points bonus percentage for one set of five trials. Goals must be whole numbers within each trial's maximum. Clan bonus accepts up to two decimal places and cannot exceed that trial's stated limit.
- Talent allocation is 0–4 clicks per trial. Its budget is `sum(clicks²) <= 25`.
- Per-trial points are `prizes × (base points + ROUNDUP(base points × (clicks × talent increment + clan bonus %)))`.
- Prize formulas and maximums are implemented in `src/calculator.js` from the reference sheet snapshot. Ties go to the allocation with fewer talent points used; remaining ties follow trial order.
- Default inputs at level 5 produce 98,000 points with allocation `[2, 2, 2, 2, 3]`.

## Source and assumptions

Source snapshot read October 5, 2026: [Titan Battles calculator sheet](https://docs.google.com/spreadsheets/d/1FLaHp70AgEva7e7jR6R5byp3yFG8mh1A9u5YlWpEpyA/edit?gid=1270829081). Values are copied into the app; it does not sync with the sheet. The sheet notes that base points for guard levels 3 and 4 were confirmed by its author, while the other level values are from memory or research. It also notes the lava fountain thresholds of 5 fountains for 11 goals, 6 for 18, and 6.5 for all 21.
