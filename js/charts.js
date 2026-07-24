/*
 * IrlStats — charting engine
 *
 * A tiny dependency-free SVG chart set: line, column and stacked-column,
 * plus stat tiles. Follows the house data-viz rules:
 *   - series colours come from CSS custom properties (--series-N), so
 *     charts re-theme with light/dark automatically;
 *   - 2px lines, ≥8px end markers with a 2px surface ring, ≤24px columns
 *     with 4px rounded caps and a 2px surface gap between neighbours;
 *   - hairline recessive gridlines, a legend for ≥2 series, sparing
 *     direct end-labels;
 *   - every chart ships a hover crosshair + tooltip and a table view.
 */
(function (global) {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";
  const el = (tag, attrs) => {
    const n = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  };
  const html = (tag, cls, txt) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  };
  const seriesVar = (slot) => `var(--series-${slot})`;

  /* Nice round tick values ---------------------------------------- */
  function niceTicks(min, max, count) {
    const span = max - min || 1;
    const step0 = span / count;
    const mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const norm = step0 / mag;
    let step;
    if (norm < 1.5) step = 1;
    else if (norm < 3) step = 2;
    else if (norm < 7) step = 5;
    else step = 10;
    step *= mag;
    const start = Math.floor(min / step) * step;
    const end = Math.ceil(max / step) * step;
    const ticks = [];
    for (let v = start; v <= end + step * 0.001; v += step) ticks.push(v);
    return ticks;
  }

  /* Shared geometry ------------------------------------------------ */
  const W = 760;
  const H = 380;
  const M = { top: 28, right: 74, bottom: 42, left: 56 };
  const plotW = W - M.left - M.right;
  const plotH = H - M.top - M.bottom;

  function makeSvg() {
    const svg = el("svg", {
      viewBox: `0 0 ${W} ${H}`,
      class: "chart-svg",
      preserveAspectRatio: "xMidYMid meet",
      role: "img",
    });
    return svg;
  }

  function legend(container, series) {
    if (series.length < 2) return;
    const box = html("div", "chart-legend");
    series.forEach((s) => {
      const item = html("div", "chart-legend__item");
      const sw = html("span", "chart-legend__swatch");
      sw.style.background = seriesVar(s.slot);
      if (s.dashed) sw.classList.add("chart-legend__swatch--dashed");
      item.appendChild(sw);
      item.appendChild(html("span", null, s.name.trim()));
      box.appendChild(item);
    });
    container.appendChild(box);
  }

  function tableView(container, cfg) {
    const details = html("details", "chart-table");
    details.appendChild(html("summary", null, "View data table"));
    const wrap = html("div", "chart-table__scroll");
    const table = html("table");
    const thead = html("thead");
    const hr = html("tr");
    hr.appendChild(html("th", null, ""));
    cfg.xLabels.forEach((x) => hr.appendChild(html("th", null, x)));
    thead.appendChild(hr);
    table.appendChild(thead);
    const tb = html("tbody");
    cfg.series.forEach((s) => {
      const tr = html("tr");
      tr.appendChild(html("th", null, s.name.trim()));
      s.values.forEach((v) => tr.appendChild(html("td", null, v == null ? "—" : cfg.yFormat(v))));
      tb.appendChild(tr);
    });
    table.appendChild(tb);
    wrap.appendChild(table);
    details.appendChild(wrap);
    container.appendChild(details);
  }

  /* Tooltip -------------------------------------------------------- */
  function attachTooltip(container) {
    const tip = html("div", "chart-tip");
    tip.style.opacity = "0";
    container.appendChild(tip);
    return {
      show(x, y, rows, title) {
        tip.innerHTML = "";
        tip.appendChild(html("div", "chart-tip__title", title));
        rows.forEach((r) => {
          const row = html("div", "chart-tip__row");
          const sw = html("span", "chart-tip__swatch");
          sw.style.background = seriesVar(r.slot);
          row.appendChild(sw);
          row.appendChild(html("span", "chart-tip__name", r.name.trim()));
          row.appendChild(html("span", "chart-tip__val", r.value));
          tip.appendChild(row);
        });
        const cw = container.clientWidth;
        tip.style.opacity = "1";
        const tw = tip.offsetWidth;
        let left = x - tw / 2;
        left = Math.max(6, Math.min(left, cw - tw - 6));
        tip.style.left = left + "px";
        tip.style.top = Math.max(4, y - tip.offsetHeight - 14) + "px";
      },
      hide() {
        tip.style.opacity = "0";
      },
    };
  }

  /* ---------------------------------------------------------------- */
  /* LINE CHART                                                       */
  /* ---------------------------------------------------------------- */
  function lineChart(container, cfg) {
    container.classList.add("chart");
    const svg = makeSvg();

    const n = cfg.xLabels.length;
    const allVals = cfg.series.flatMap((s) => s.values.filter((v) => v != null));
    let min = Math.min(...allVals);
    let max = Math.max(...allVals);
    if (cfg.zeroLine) min = Math.min(0, min);
    if (cfg.target) { min = Math.min(min, cfg.target.value); max = Math.max(max, cfg.target.value); }
    const ticks = niceTicks(min, max, 5);
    min = ticks[0];
    max = ticks[ticks.length - 1];

    const xAt = (i) => M.left + (n === 1 ? plotW / 2 : (plotW * i) / (n - 1));
    const yAt = (v) => M.top + plotH - (plotH * (v - min)) / (max - min);

    // gridlines + y ticks
    ticks.forEach((t) => {
      const y = yAt(t);
      svg.appendChild(el("line", { x1: M.left, x2: M.left + plotW, y1: y, y2: y, class: "grid" }));
      const lbl = el("text", { x: M.left - 10, y: y + 4, class: "axis-label", "text-anchor": "end" });
      lbl.textContent = cfg.yFormat(t);
      svg.appendChild(lbl);
    });

    // zero emphasis
    if (cfg.zeroLine && min < 0) {
      const y = yAt(0);
      svg.appendChild(el("line", { x1: M.left, x2: M.left + plotW, y1: y, y2: y, class: "axis-baseline" }));
    }

    // target line
    if (cfg.target) {
      const y = yAt(cfg.target.value);
      svg.appendChild(el("line", { x1: M.left, x2: M.left + plotW, y1: y, y2: y, class: "target-line" }));
      const t = el("text", { x: M.left + plotW, y: y - 7, class: "target-label", "text-anchor": "end" });
      t.textContent = cfg.target.label;
      svg.appendChild(t);
    }

    // x ticks
    cfg.xLabels.forEach((x, i) => {
      const t = el("text", { x: xAt(i), y: H - 16, class: "axis-label", "text-anchor": "middle" });
      t.textContent = x;
      svg.appendChild(t);
    });

    // annotations (vertical markers)
    (cfg.annotations || []).forEach((a) => {
      const i = cfg.xLabels.indexOf(a.x);
      if (i < 0) return;
      const x = xAt(i);
      svg.appendChild(el("line", { x1: x, x2: x, y1: M.top, y2: M.top + plotH, class: "annot-line" }));
      const anchor = a.align === "start" ? "start" : "middle";
      const tx = a.align === "start" ? x + 6 : x;
      const t = el("text", { x: tx, y: M.top - 10, class: "annot-label", "text-anchor": anchor });
      t.textContent = a.text;
      svg.appendChild(t);
    });

    // series paths
    cfg.series.forEach((s) => {
      let d = "";
      let started = false;
      s.values.forEach((v, i) => {
        if (v == null) { started = false; return; }
        d += (started ? "L" : "M") + xAt(i) + " " + yAt(v) + " ";
        started = true;
      });
      const path = el("path", { d: d.trim(), class: "series-line", fill: "none", stroke: seriesVar(s.slot) });
      if (s.dashed) path.setAttribute("stroke-dasharray", "6 6");
      svg.appendChild(path);

      // end marker + end label on last non-null point
      let li = -1;
      for (let i = s.values.length - 1; i >= 0; i--) if (s.values[i] != null) { li = i; break; }
      if (li >= 0 && !s.dashed) {
        const cx = xAt(li), cy = yAt(s.values[li]);
        svg.appendChild(el("circle", { cx, cy, r: 4.5, class: "end-dot", fill: seriesVar(s.slot) }));
        const t = el("text", { x: cx + 10, y: cy + 4, class: "end-label", "text-anchor": "start" });
        t.textContent = s.name.trim().length && cfg.series.length > 1
          ? cfg.yFormat(s.values[li])
          : cfg.yFormat(s.values[li]);
        svg.appendChild(t);
      }
    });

    // hover layer
    const focus = el("g", { class: "focus", opacity: "0" });
    const vline = el("line", { y1: M.top, y2: M.top + plotH, class: "crosshair" });
    focus.appendChild(vline);
    const dots = cfg.series.map((s) => {
      const c = el("circle", { r: 4.5, class: "focus-dot", fill: seriesVar(s.slot) });
      focus.appendChild(c);
      return c;
    });
    svg.appendChild(focus);

    const overlay = el("rect", {
      x: M.left, y: M.top, width: plotW, height: plotH, fill: "transparent", class: "overlay",
    });
    svg.appendChild(overlay);

    container.appendChild(svg);
    const tip = attachTooltip(container);

    function onMove(evt) {
      const rect = svg.getBoundingClientRect();
      const scaleX = W / rect.width;
      const px = (evt.clientX - rect.left) * scaleX;
      let i = Math.round(((px - M.left) / plotW) * (n - 1));
      i = Math.max(0, Math.min(n - 1, i));
      const x = xAt(i);
      focus.setAttribute("opacity", "1");
      vline.setAttribute("x1", x);
      vline.setAttribute("x2", x);
      const rows = [];
      cfg.series.forEach((s, si) => {
        const v = s.values[i];
        if (v == null) { dots[si].setAttribute("opacity", "0"); return; }
        dots[si].setAttribute("opacity", "1");
        dots[si].setAttribute("cx", x);
        dots[si].setAttribute("cy", yAt(v));
        rows.push({ name: s.name, slot: s.slot, value: cfg.yFormat(v) });
      });
      const domX = (x / W) * rect.width;
      const topY = Math.min(...cfg.series.map((s) => (s.values[i] == null ? Infinity : yAt(s.values[i]))));
      const domY = (topY / H) * rect.height;
      tip.show(domX, domY, rows, cfg.xLabels[i]);
    }
    overlay.addEventListener("mousemove", onMove);
    overlay.addEventListener("mouseleave", () => { focus.setAttribute("opacity", "0"); tip.hide(); });
    overlay.addEventListener("touchmove", (e) => { if (e.touches[0]) onMove(e.touches[0]); }, { passive: true });

    legend(container, cfg.series);
    tableView(container, cfg);
    return container;
  }

  /* ---------------------------------------------------------------- */
  /* COLUMN CHART (single or stacked)                                 */
  /* ---------------------------------------------------------------- */
  function columnChart(container, cfg) {
    container.classList.add("chart");
    const svg = makeSvg();
    const n = cfg.xLabels.length;
    const stacked = cfg.stacked && cfg.series.length > 1;

    // compute max
    let max;
    if (stacked) {
      max = Math.max(...cfg.xLabels.map((_, i) => cfg.series.reduce((a, s) => a + (s.values[i] || 0), 0)));
    } else {
      max = Math.max(...cfg.series.flatMap((s) => s.values.filter((v) => v != null)));
    }
    if (cfg.target) max = Math.max(max, cfg.target.value);
    const ticks = niceTicks(0, max, 5);
    max = ticks[ticks.length - 1];

    const band = plotW / n;
    const colW = Math.min(24, band * 0.6);
    const gap = 2;
    const yAt = (v) => M.top + plotH - (plotH * v) / max;
    const centre = (i) => M.left + band * i + band / 2;

    ticks.forEach((t) => {
      const y = yAt(t);
      svg.appendChild(el("line", { x1: M.left, x2: M.left + plotW, y1: y, y2: y, class: "grid" }));
      const lbl = el("text", { x: M.left - 10, y: y + 4, class: "axis-label", "text-anchor": "end" });
      lbl.textContent = cfg.yFormat(t);
      svg.appendChild(lbl);
    });

    if (cfg.target) {
      const y = yAt(cfg.target.value);
      svg.appendChild(el("line", { x1: M.left, x2: M.left + plotW, y1: y, y2: y, class: "target-line" }));
      const t = el("text", { x: M.left + plotW, y: y - 7, class: "target-label", "text-anchor": "end" });
      t.textContent = cfg.target.label;
      svg.appendChild(t);
    }

    cfg.xLabels.forEach((x, i) => {
      const t = el("text", { x: centre(i), y: H - 16, class: "axis-label", "text-anchor": "middle" });
      t.textContent = x;
      svg.appendChild(t);
    });

    const baseY = yAt(0);
    cfg.xLabels.forEach((_, i) => {
      if (stacked) {
        let acc = 0;
        cfg.series.forEach((s) => {
          const v = s.values[i] || 0;
          const y0 = yAt(acc);
          const y1 = yAt(acc + v);
          const h = Math.max(0, y0 - y1 - gap);
          const r = el("rect", {
            x: centre(i) - colW / 2, y: y1, width: colW, height: h, rx: 3,
            fill: seriesVar(s.slot), class: "col",
          });
          svg.appendChild(r);
          acc += v;
        });
      } else {
        const s = cfg.series[0];
        const v = s.values[i];
        if (v == null) return;
        const y1 = yAt(v);
        const r = el("rect", {
          x: centre(i) - colW / 2, y: y1, width: colW, height: baseY - y1, rx: 4,
          fill: seriesVar(s.slot), class: "col",
        });
        svg.appendChild(r);
      }
    });

    // optional net line over stacked immigration/emigration
    if (cfg.netFrom && cfg.series.length >= 2) {
      let d = "";
      const netVals = cfg.xLabels.map((_, i) => (cfg.series[0].values[i] || 0) - (cfg.series[1].values[i] || 0));
      const nmax = Math.max(...netVals);
      // draw net as a light marker line scaled to same axis
      netVals.forEach((v, i) => {
        const y = yAt(v);
        d += (i ? "L" : "M") + centre(i) + " " + y + " ";
      });
      svg.appendChild(el("path", { d: d.trim(), class: "net-line", fill: "none", stroke: "var(--series-1)" }));
      netVals.forEach((v, i) => {
        svg.appendChild(el("circle", { cx: centre(i), cy: yAt(v), r: 3.5, class: "end-dot", fill: "var(--series-1)" }));
      });
      const li = netVals.length - 1;
      const t = el("text", { x: centre(li) + 8, y: yAt(netVals[li]) + 4, class: "end-label", "text-anchor": "start" });
      t.textContent = "net " + cfg.yFormat(netVals[li]);
      svg.appendChild(t);
    }

    // hover
    const focus = el("g", { class: "focus", opacity: "0" });
    const hi = el("rect", { class: "col-hi", y: M.top, height: plotH });
    focus.appendChild(hi);
    svg.appendChild(focus);
    container.appendChild(svg);
    const tip = attachTooltip(container);

    const overlay = el("rect", { x: M.left, y: M.top, width: plotW, height: plotH, fill: "transparent" });
    svg.appendChild(overlay);

    function onMove(evt) {
      const rect = svg.getBoundingClientRect();
      const scaleX = W / rect.width;
      const px = (evt.clientX - rect.left) * scaleX;
      let i = Math.floor((px - M.left) / band);
      i = Math.max(0, Math.min(n - 1, i));
      focus.setAttribute("opacity", "1");
      hi.setAttribute("x", M.left + band * i);
      hi.setAttribute("width", band);
      const rows = [];
      cfg.series.forEach((s) => {
        if (s.values[i] == null) return;
        rows.push({ name: s.name, slot: s.slot, value: cfg.yFormat(s.values[i]) });
      });
      if (cfg.netFrom) {
        const net = (cfg.series[0].values[i] || 0) - (cfg.series[1].values[i] || 0);
        rows.push({ name: "Net", slot: 1, value: cfg.yFormat(net) });
      }
      const domX = ((centre(i)) / W) * rect.width;
      tip.show(domX, M.top / H * rect.height + 8, rows, cfg.xLabels[i]);
    }
    overlay.addEventListener("mousemove", onMove);
    overlay.addEventListener("mouseleave", () => { focus.setAttribute("opacity", "0"); tip.hide(); });
    overlay.addEventListener("touchmove", (e) => { if (e.touches[0]) onMove(e.touches[0]); }, { passive: true });

    legend(container, cfg.series);
    tableView(container, cfg);
    return container;
  }

  /* Dispatcher ----------------------------------------------------- */
  function render(container, cfg) {
    container.innerHTML = "";
    const type = cfg.type || (cfg.series.length > 1 && cfg.stacked ? "column" : cfg.chartType || "line");
    if (type === "column") return columnChart(container, cfg);
    return lineChart(container, cfg);
  }

  /* Stat tile ------------------------------------------------------ */
  function statTile(d) {
    const t = html("div", "stat");
    t.appendChild(html("div", "stat__label", d.label));
    t.appendChild(html("div", "stat__value", d.display));
    if (d.delta) {
      const cls = d.deltaGood === true ? "stat__delta stat__delta--good"
        : d.deltaGood === false ? "stat__delta stat__delta--bad"
        : "stat__delta stat__delta--neutral";
      t.appendChild(html("div", cls, d.delta + (d.deltaGood === null ? "" : "")));
    }
    if (d.sub) t.appendChild(html("div", "stat__sub", d.sub));
    if (d.note) t.appendChild(html("div", "stat__note", d.note));
    return t;
  }

  /* ---------------------------------------------------------------- */
  /* SPARKLINE INDICATOR CARD                                         */
  /* ---------------------------------------------------------------- */
  function sparkCard(d) {
    const card = html("article", "ind ind--" + (d.good === false ? "bad" : d.good === true ? "good" : "flat"));

    const head = html("div", "ind__head");
    head.appendChild(html("span", "ind__label", d.label));
    if (d.info) {
      const info = html("button", "ind__info");
      info.type = "button";
      info.setAttribute("aria-label", d.info);
      info.title = d.info;
      info.textContent = "ⓘ";
      head.appendChild(info);
    }
    card.appendChild(head);

    const row = html("div", "ind__row");
    row.appendChild(html("span", "ind__value", d.value));
    if (d.delta) {
      const del = html("span", "ind__delta");
      const arrow = d.dir === "up" ? "↑" : d.dir === "down" ? "↓" : "";
      del.appendChild(html("span", "ind__arrow", arrow));
      del.appendChild(html("span", null, " " + d.delta));
      row.appendChild(del);
    }
    card.appendChild(row);

    // ---- sparkline SVG ----
    const sw = 320, sh = 92;
    const pad = { t: 10, b: 6, l: 2, r: 2 };
    const s = d.series;
    const n = s.length;
    let mn = Math.min(...s), mx = Math.max(...s);
    const range = mx - mn || 1;
    mn -= range * 0.12; mx += range * 0.12;
    const xAt = (i) => pad.l + (i / (n - 1)) * (sw - pad.l - pad.r);
    const yAt = (v) => sh - pad.b - ((v - mn) / (mx - mn)) * (sh - pad.t - pad.b);
    const baseY = sh - pad.b;
    const hi = Math.max(0, n - 12); // highlight the last 12 points (~last year)

    const svg = el("svg", { viewBox: `0 0 ${sw} ${sh}`, class: "spark-svg", preserveAspectRatio: "none" });

    // area fill under the whole line
    let area = "M" + xAt(0) + " " + baseY;
    for (let i = 0; i < n; i++) area += " L" + xAt(i) + " " + yAt(s[i]);
    area += " L" + xAt(n - 1) + " " + baseY + " Z";
    svg.appendChild(el("path", { d: area, class: "spark-area" }));

    // highlight band behind the recent slice
    svg.appendChild(el("rect", {
      x: xAt(hi), y: pad.t - 6, width: sw - xAt(hi) - pad.r, height: sh - pad.t - pad.b + 8,
      class: "spark-band",
    }));

    // historical (grey) segment
    let dh = "";
    for (let i = 0; i <= hi; i++) dh += (i ? "L" : "M") + xAt(i) + " " + yAt(s[i]) + " ";
    svg.appendChild(el("path", { d: dh.trim(), class: "spark-line spark-line--hist", fill: "none" }));

    // recent (coloured) segment
    let dc = "";
    for (let i = hi; i < n; i++) dc += (i === hi ? "M" : "L") + xAt(i) + " " + yAt(s[i]) + " ";
    svg.appendChild(el("path", { d: dc.trim(), class: "spark-line spark-line--now", fill: "none" }));

    // end dot
    svg.appendChild(el("circle", { cx: xAt(n - 1), cy: yAt(s[n - 1]), r: 3, class: "spark-dot" }));

    const sparkWrap = html("div", "ind__spark");
    sparkWrap.appendChild(svg);
    card.appendChild(sparkWrap);

    const axis = html("div", "ind__axis");
    axis.appendChild(html("span", null, d.xStart || ""));
    axis.appendChild(html("span", null, d.xEnd || ""));
    card.appendChild(axis);

    return card;
  }

  global.IrlChart = { render, lineChart, columnChart, statTile, sparkCard };
})(window);
