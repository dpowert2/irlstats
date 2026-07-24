/*
 * Source map: which IrlStats series are refreshed automatically, and how.
 *
 * Each entry maps one `key` (matching an indicator/dataset key in js/data.js)
 * to a CSO PxStat matrix and a recipe for turning the returned JSON-stat cube
 * into a single time series. Anything NOT listed here stays as the curated
 * value baked into js/data.js — nothing breaks, it just isn't auto-updated.
 *
 * Selectors use regex matches against category codes OR labels so they keep
 * working if the CSO tweaks a code. If the CSO renames a matrix or restructures
 * a table, that series simply fails to update and the previous value is kept;
 * run `node scripts/update-data.mjs --inspect <MATRIX>` to see a table's real
 * dimensions and fix the selector here.
 *
 * NOTE: matrix codes and selectors below are the author's best-known mappings.
 * The first CI run reports, per series, whether it resolved cleanly; adjust any
 * that don't. The pipeline is intentionally fail-safe, so a wrong code degrades
 * to the curated fallback rather than breaking the page.
 */

// formatting helpers -------------------------------------------------
const pct1 = (v) => v.toFixed(1) + "%";
const pct2 = (v) => v.toFixed(2) + "%";
const signPp = (d) => (d >= 0 ? "+" : "−") + Math.abs(d).toFixed(1) + "pp";
const signPct = (d) => (d >= 0 ? "+" : "−") + Math.abs(d).toFixed(1) + "%";
const commas = (v) => Math.round(v).toLocaleString("en-IE");

export const SOURCES = [
  {
    key: "unemployment",
    matrix: "MUM01",
    // Monthly Unemployment. Pick the rate for all persons, all ages.
    select: {
      STATISTIC: { match: /unemploy.*rate|rate.*unemploy/i },
      Sex: { match: /both|all persons|all/i },
      "Age Group": { match: /all ages|15\s*-\s*74|total|both/i },
    },
    freq: "monthly",
    window: 78,
    value: pct1,
    delta: signPp,
    deltaLag: 12,
    goodWhen: "down",
    source: "CSO Monthly Unemployment (MUM01)",
  },
  {
    key: "inflation",
    // CPM20 replaced CPM01 in Feb 2026 (ECOICOP Ver. 2). Consumer Price Index
    // by commodity group; we compute the annual (YoY) rate from the all-items
    // index ourselves, so this works from the raw index series.
    matrix: "CPM20",
    select: {
      STATISTIC: { match: /consumer price index|^cpi|all items/i },
      "Commodity Group": { match: /all items|all-items/i },
    },
    freq: "monthly",
    derive: "yoy", // convert the index series into a YoY % series
    window: 78,
    value: pct1,
    delta: signPp,
    deltaLag: 1,
    goodWhen: "down",
    source: "CSO Consumer Price Index (CPM01), YoY",
  },
  {
    key: "population",
    matrix: "PEA01",
    // Annual population estimate, both sexes, all ages. Value in millions.
    select: {
      STATISTIC: { match: /population/i },
      Sex: { match: /both|all/i },
      Age: { match: /all ages|total/i },
    },
    freq: "annual",
    window: 15,
    scale: 1e-6,
    value: (v) => v.toFixed(2) + "m",
    delta: signPct,
    deltaMode: "pct",
    deltaLag: 1,
    goodWhen: "up",
    source: "CSO Population Estimates (PEA01)",
  },
];

export const HELP = { pct1, pct2, commas };
