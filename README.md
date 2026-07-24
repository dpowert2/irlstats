# IrlStats — Ireland by the numbers

An independent **data-journalism hub for Ireland**, in the spirit of a
newspaper data section (e.g. [The Times' data page](https://www.thetimes.com/data)).
It presents the numbers shaping the country — housing, the economy,
population, migration, health and climate — as clean, interactive charts
built on official published statistics.

**The state of the nation** — the landing page leads with a scannable grid of
16 national-indicator cards (house prices, rents, homelessness, inflation,
unemployment, corporation tax, emissions, migration, the price of a pint…),
each a big current value with a coloured change and a mini area-sparkline whose
recent slice is tinted **green when the trend is improving, red when it's
worsening** — the signature format of a newspaper data section.

**Live sections**

- **Housing** — property price index (national & Dublin), new-home completions vs need
- **Economy** — GDP vs modified GNI*, the corporation-tax windfall
- **Society** — population since 1841, migration flows
- **Prices & climate** — inflation (HICP), greenhouse-gas emissions vs the 2030 ceiling
- **Health** — hospital outpatient waiting lists
- Three long-form deep-dive articles + an about/methodology page

## Design

- Editorial landing page modelled on a newspaper data section: headline
  stat ticker, a lead story, a story-card grid, then themed deep-dive bands.
- **Interactive, theme-aware SVG charts** — line, column and stacked-column —
  with hover crosshairs, tooltips, sparing direct labels and a data-table
  view on every chart.
- Full **light / dark mode** with a persisted toggle.
- Chart colours use a **colour-blind-safe categorical palette** (validated),
  and series colours are CSS custom properties so charts re-theme automatically.

## Data & sources

Every figure is compiled from a named official source — the **CSO**,
**Eurostat**, the **EPA**, the **NTPF** and the **Department of Finance** —
and rounded for presentation. Each dataset in `js/data.js` carries its own
`source` and `updated` string, surfaced beneath every chart. Figures are
illustrative of the public releases and, where provisional, are flagged in
the copy. See `about.html` for full methodology.

## Keeping it current

The page refreshes itself from official releases — it isn't a frozen snapshot:

- **`scripts/update-data.mjs`** fetches the latest figures from the **CSO
  PxStat open-data API** (JSON-stat 2.0), computes each indicator's current
  value, change and trend, and writes **`data/live.json`** + **`data/live.js`**.
- **`.github/workflows/update-data.yml`** runs it on a schedule (weekday
  mornings, when CSO releases land) and commits the result if anything changed.
- **`.github/workflows/deploy.yml`** publishes the site to **GitHub Pages** on
  every push — including those automated data commits — so the live page tracks
  new stats with no manual step.
- **`js/data.js`** overlays `window.IRL_LIVE` (from `data/live.js`) on top of
  its curated defaults: a live series wins; anything without a machine-readable
  source falls back to the curated value. The "last refreshed" date is shown
  under the indicator grid.

The updater is **fail-safe** — a series it can't fetch keeps its previous value,
so a bad run produces no diff rather than breaking the page.

Which series map to which CSO table is declared in **`scripts/sources.mjs`**.
To add or fix one:

```sh
# see a table's real dimensions/categories, then adjust the selector
node scripts/update-data.mjs --inspect MUM01

# dry-run against local sample files instead of the live API
CSO_SAMPLE_DIR=scripts/samples BUILD_DATE=2025-06-04 node scripts/update-data.mjs
```

### Enabling it on your repo

1. Push to `main`.
2. In **Settings → Pages**, set *Source* to **GitHub Actions**.
3. The deploy workflow publishes the site; the update workflow keeps it fresh.
   Trigger the first data refresh manually from the **Actions** tab
   (*Update data → Run workflow*) if you don't want to wait for the schedule.

## Structure

```
index.html            # the data hub landing page
about.html            # methodology, sources & how updates work
stories/              # deep-dive articles (housing, population, economy)
styles.css            # editorial styling + chart theming
js/
  data.js             # curated datasets + live-overlay merge
  charts.js           # dependency-free SVG charting engine
  app.js              # page wiring (indicator grid, story grid, charts)
data/
  live.json           # generated: canonical live snapshot
  live.js             # generated: window.IRL_LIVE wrapper the page loads
scripts/
  update-data.mjs     # fetch CSO API → regenerate data/live.*
  sources.mjs         # which series map to which CSO matrix
  jsonstat.mjs        # JSON-stat 2.0 reader
  samples/            # sample API responses for offline testing
.github/workflows/
  update-data.yml     # scheduled refresh from the CSO
  deploy.yml          # publish to GitHub Pages
```

## Running

It's a fully static, dependency-free site — no build step, no external
requests. Open `index.html` directly, or serve the folder:

```sh
python3 -m http.server 8000
# then visit http://localhost:8000
```
