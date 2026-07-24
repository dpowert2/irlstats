#!/usr/bin/env node
/*
 * IrlStats data updater.
 *
 * Fetches the latest official figures from the CSO PxStat open-data API for
 * every series declared in scripts/sources.mjs, and writes:
 *   - data/live.json  — canonical machine-readable snapshot (source of truth)
 *   - data/live.js    — a `window.IRL_LIVE = {…}` wrapper the page loads
 *
 * Design goals:
 *   - Fail-safe: any series that can't be fetched/parsed keeps its previous
 *     value from data/live.json. A totally failed run produces no diff.
 *   - Deterministic output so git only sees real changes.
 *   - No dependencies — plain Node 18+/22 (global fetch, ESM).
 *
 * Usage:
 *   node scripts/update-data.mjs                 # fetch live and write files
 *   node scripts/update-data.mjs --inspect MUM01 # print a matrix's dimensions
 *   CSO_SAMPLE_DIR=./samples node scripts/update-data.mjs   # read local files
 *                                                # (./samples/<MATRIX>.json)
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readSeries, categories, timeDimensionId } from "./jsonstat.mjs";
import { SOURCES } from "./sources.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DATA_DIR = join(ROOT, "data");
const LIVE_JSON = join(DATA_DIR, "live.json");
const LIVE_JS = join(DATA_DIR, "live.js");

const API =
  "https://ws.cso.ie/public/api.restful/PxStat.Data.Cube_API.ReadDataset/" +
  "%MATRIX%/JSON-stat/2.0/en";

const log = (...a) => console.log(...a);
const warn = (...a) => console.warn("  ⚠", ...a);

/* ---- fetch or load a matrix ------------------------------------- */
async function loadMatrix(matrix) {
  const sampleDir = process.env.CSO_SAMPLE_DIR;
  if (sampleDir) {
    const p = resolve(sampleDir, matrix + ".json");
    if (!existsSync(p)) throw new Error("no sample file " + p);
    return JSON.parse(readFileSync(p, "utf8"));
  }
  const url = API.replace("%MATRIX%", encodeURIComponent(matrix));
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${matrix}`);
  const body = await res.json();
  // PxStat may wrap the dataset; normalise to a JSON-stat dataset object.
  if (body && body.class === "dataset") return body;
  if (body && body.result && body.result.class === "dataset") return body.result;
  if (body && body.dataset) return body.dataset;
  return body;
}

/* ---- turn a source + dataset into a live entry ------------------ */
function buildEntry(src, ds) {
  let { periods, labels, values } = readSeries(ds, src.select || {});

  // drop trailing nulls (unreleased periods)
  while (values.length && values[values.length - 1] == null) {
    values.pop(); periods.pop(); labels.pop();
  }
  if (src.scale) values = values.map((v) => (v == null ? null : v * src.scale));

  // optional derivation (e.g. index -> year-on-year %)
  if (src.derive === "yoy") {
    const lag = src.freq === "monthly" ? 12 : src.freq === "quarterly" ? 4 : 1;
    const yoy = values.map((v, i) =>
      i >= lag && v != null && values[i - lag] != null
        ? (v / values[i - lag] - 1) * 100
        : null
    );
    // realign: keep periods where yoy is defined
    const start = yoy.findIndex((v) => v != null);
    values = yoy.slice(start);
    periods = periods.slice(start);
    labels = labels.slice(start);
  }

  const clean = values.filter((v) => v != null);
  if (!clean.length) throw new Error("no values after parsing");

  const latest = values[values.length - 1];
  const lagN = src.deltaLag || 1;
  const prevIdx = values.length - 1 - lagN;
  const prev = prevIdx >= 0 ? values[prevIdx] : null;

  let deltaVal = prev == null ? null : latest - prev;
  let deltaStr = "";
  if (deltaVal != null) {
    deltaStr =
      src.deltaMode === "pct"
        ? src.delta((prev !== 0 ? (latest / prev - 1) * 100 : 0))
        : src.delta(deltaVal);
  }
  const dir = deltaVal == null ? null : deltaVal > 0 ? "up" : deltaVal < 0 ? "down" : "flat";
  const good =
    dir == null ? null : src.goodWhen === "up" ? dir === "up" : dir === "down";

  const window = src.window || 60;
  const series = values.slice(-window).map((v) => (v == null ? 0 : Number(v.toFixed(4))));

  return {
    value: src.value(latest),
    delta: deltaStr,
    dir,
    good,
    values: series,
    updated: labels[labels.length - 1] || periods[periods.length - 1] || "",
    source: src.source,
  };
}

/* ---- inspect helper --------------------------------------------- */
async function inspect(matrix) {
  const ds = await loadMatrix(matrix);
  log(`\nMatrix ${matrix}: ${ds.label || ""}`);
  const timeId = timeDimensionId(ds);
  for (const dimId of ds.id) {
    const cats = categories(ds, dimId);
    const tag = dimId === timeId ? " (TIME)" : "";
    log(`\n  ${dimId}${tag} — ${cats.length} categories`);
    if (dimId === timeId) {
      log(`    ${cats[0].code} … ${cats[cats.length - 1].code}`);
    } else {
      cats.slice(0, 12).forEach((c) => log(`    ${c.code}  ${c.label}`));
      if (cats.length > 12) log(`    … +${cats.length - 12} more`);
    }
  }
}

/* ---- main ------------------------------------------------------- */
async function main() {
  const args = process.argv.slice(2);
  if (args[0] === "--inspect") {
    await inspect(args[1]);
    return;
  }

  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  const prev = existsSync(LIVE_JSON)
    ? JSON.parse(readFileSync(LIVE_JSON, "utf8"))
    : { series: {} };

  const series = { ...(prev.series || {}) };
  let updated = 0, failed = 0;

  for (const src of SOURCES) {
    try {
      const ds = await loadMatrix(src.matrix);
      const entry = buildEntry(src, ds);
      series[src.key] = entry;
      updated++;
      log(`  ✓ ${src.key.padEnd(14)} ${entry.value}  (${entry.delta || "—"})  · ${entry.updated}`);
    } catch (err) {
      failed++;
      warn(`${src.key.padEnd(14)} ${err.message} — keeping previous value`);
    }
  }

  // stamp: use the newest per-series `updated` label, plus a build date passed
  // in via BUILD_DATE (the workflow sets this) so we never call Date() in a way
  // that produces noisy diffs on no-op runs.
  const buildDate = process.env.BUILD_DATE || prev.generated || "";
  const out = {
    generated: buildDate,
    note: "Auto-updated from official sources; series absent here use curated values in js/data.js.",
    series,
  };

  const json = JSON.stringify(out, null, 2) + "\n";
  writeFileSync(LIVE_JSON, json);
  writeFileSync(
    LIVE_JS,
    "/* Generated by scripts/update-data.mjs — do not edit by hand. */\n" +
      "window.IRL_LIVE = " + JSON.stringify(out, null, 2) + ";\n"
  );

  log(`\nDone: ${updated} updated, ${failed} skipped. Wrote data/live.json + data/live.js`);
  if (process.env.CSO_SAMPLE_DIR) {
    log(`(sample mode — read from ${process.env.CSO_SAMPLE_DIR}: ${readdirSync(process.env.CSO_SAMPLE_DIR).join(", ")})`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
