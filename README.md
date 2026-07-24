# IrlStats — Ireland by the numbers

An independent **data-journalism hub for Ireland**, in the spirit of a
newspaper data section (e.g. [The Times' data page](https://www.thetimes.com/data)).
It presents the numbers shaping the country — housing, the economy,
population, migration, health and climate — as clean, interactive charts
built on official published statistics.

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

## Structure

```
index.html            # the data hub landing page
about.html            # methodology & sources
stories/
  housing.html        # deep dive: house prices & supply
  population.html     # deep dive: population & migration
  economy.html        # deep dive: GDP vs GNI*
styles.css            # editorial styling + chart theming
js/
  data.js             # all datasets, each with its source
  charts.js           # dependency-free SVG charting engine
  app.js              # page wiring (ticker, story grid, charts)
```

## Running

It's a fully static, dependency-free site — no build step, no external
requests. Open `index.html` directly, or serve the folder:

```sh
python3 -m http.server 8000
# then visit http://localhost:8000
```
