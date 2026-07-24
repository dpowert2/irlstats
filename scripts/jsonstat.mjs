/*
 * Minimal JSON-stat 2.0 reader.
 *
 * The CSO's PxStat API returns datasets in JSON-stat 2.0. A dataset is an
 * n-dimensional cube flattened into a single `value` array in row-major order
 * over the dimensions listed in `id` (with lengths in `size`). This reader
 * pulls out a single 1-D time series: you fix every non-time dimension to one
 * category and it returns the values along the time dimension, in order.
 *
 * Spec: https://json-stat.org/full/
 */

/** Return the id of the time dimension (from `role.time`, else a TLIST dim). */
export function timeDimensionId(ds) {
  if (ds.role && Array.isArray(ds.role.time) && ds.role.time.length) return ds.role.time[0];
  const tl = ds.id.find((d) => /TLIST/i.test(d) || /^time$/i.test(d));
  if (!tl) throw new Error("no time dimension found");
  return tl;
}

/** Ordered list of {code,label,index} for a dimension's categories. */
export function categories(ds, dimId) {
  const dim = ds.dimension[dimId];
  if (!dim) throw new Error("unknown dimension: " + dimId);
  const idx = dim.category.index;
  const labels = (dim.category && dim.category.label) || {};
  let entries;
  if (Array.isArray(idx)) {
    entries = idx.map((code, i) => ({ code, index: i }));
  } else {
    entries = Object.keys(idx).map((code) => ({ code, index: idx[code] }));
  }
  entries.sort((a, b) => a.index - b.index);
  return entries.map((e) => ({ code: e.code, index: e.index, label: labels[e.code] || e.code }));
}

/**
 * Read one time series.
 * @param ds      JSON-stat dataset object
 * @param select  { [dimId]: code } for every non-time dimension with size > 1.
 *                Dimensions of size 1 may be omitted. A dimension may also be
 *                selected by a predicate {match:/regex/} against code or label.
 * @returns { periods: string[], labels: string[], values: (number|null)[] }
 */
export function readSeries(ds, select = {}) {
  const ids = ds.id;
  const sizes = ds.size;
  const timeId = timeDimensionId(ds);

  // row-major strides
  const strides = new Array(ids.length);
  strides[ids.length - 1] = 1;
  for (let i = ids.length - 2; i >= 0; i--) strides[i] = strides[i + 1] * sizes[i + 1];

  // resolve the fixed index for each non-time dimension
  const fixed = {};
  ids.forEach((dimId, di) => {
    if (dimId === timeId) return;
    const cats = categories(ds, dimId);
    if (sizes[di] === 1) { fixed[dimId] = cats[0].index; return; }
    // A selection may be keyed by the raw dimension id (e.g. "C02076V03371")
    // OR by its human label (e.g. "Age Group"). Real CSO datasets id their
    // dimensions by opaque codes, so match on the label too, case-insensitively.
    const dimLabel = (ds.dimension[dimId] && ds.dimension[dimId].label) || dimId;
    let sel = select[dimId];
    if (sel == null) sel = select[dimLabel];
    if (sel == null) {
      const k = Object.keys(select).find(
        (key) => key.toLowerCase() === String(dimLabel).toLowerCase()
      );
      if (k) sel = select[k];
    }
    if (sel == null) {
      throw new Error(
        `dimension "${dimId}" ("${dimLabel}", size ${sizes[di]}) needs a selection`
      );
    }
    let hit;
    if (typeof sel === "object" && sel.match instanceof RegExp) {
      hit = cats.find((c) => sel.match.test(c.code) || sel.match.test(c.label));
    } else {
      hit = cats.find((c) => c.code === sel);
    }
    if (!hit) throw new Error(`no category "${sel}" in dimension "${dimId}"`);
    fixed[dimId] = hit.index;
  });

  const timeCats = categories(ds, timeId);
  const timeDi = ids.indexOf(timeId);

  const periods = [], labels = [], values = [];
  for (const t of timeCats) {
    let flat = 0;
    ids.forEach((dimId, di) => {
      const idx = di === timeDi ? t.index : fixed[dimId];
      flat += idx * strides[di];
    });
    const v = ds.value[flat];
    periods.push(t.code);
    labels.push(t.label);
    values.push(v == null ? null : Number(v));
  }
  return { periods, labels, values };
}
