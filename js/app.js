/*
 * IrlStats — page wiring
 * Renders the theme toggle, the headline stat ticker, the story-card grid
 * and every chart the current page asks for.
 */
(function () {
  "use strict";

  /* ---- Theme toggle (persisted) --------------------------------- */
  const root = document.documentElement;
  const saved = localStorage.getItem("irlstats-theme");
  if (saved) root.setAttribute("data-theme", saved);
  const btn = document.getElementById("themeBtn");
  if (btn) {
    btn.addEventListener("click", () => {
      const isDark =
        root.getAttribute("data-theme") === "dark" ||
        (!root.hasAttribute("data-theme") &&
          window.matchMedia("(prefers-color-scheme: dark)").matches);
      const next = isDark ? "light" : "dark";
      root.setAttribute("data-theme", next);
      localStorage.setItem("irlstats-theme", next);
    });
  }

  if (typeof IRL === "undefined" || typeof IrlChart === "undefined") return;

  /* ---- "Last refreshed" stamp ----------------------------------- */
  const stamp = document.getElementById("lastUpdated");
  if (stamp && IRL.lastUpdated) stamp.textContent = formatDate(IRL.lastUpdated);

  function formatDate(s) {
    // ISO date -> "24 Jul 2026"; anything else passes through unchanged
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    if (!m) return s;
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return Number(m[3]) + " " + months[Number(m[2]) - 1] + " " + m[1];
  }

  /* ---- Indicator sparkline grid --------------------------------- */
  const indGrid = document.getElementById("indicatorGrid");
  if (indGrid && IRL.indicators) {
    IRL.indicators.forEach((d) => indGrid.appendChild(IrlChart.sparkCard(d)));
  }

  /* ---- Headline ticker (optional) ------------------------------- */
  const ticker = document.getElementById("ticker");
  if (ticker) {
    IRL.headline.forEach((d) => ticker.appendChild(IrlChart.statTile(d)));
  }

  /* ---- Story grid ----------------------------------------------- */
  const grid = document.getElementById("storyGrid");
  if (grid) {
    IRL.stories.forEach((story) => {
      const isLead = story.size === "lead";
      const card = document.createElement("div");
      card.className = "card" + (isLead ? " card--lead" : "");

      const inner = document.createElement("div");
      inner.className = "card__inner";

      const text = document.createElement("div");
      text.className = "card__text";
      text.innerHTML =
        '<div class="card__kicker">' + story.kicker + "</div>" +
        '<h3 class="card__title">' + story.title + "</h3>" +
        '<p class="card__dek">' + story.dek + "</p>";
      const more = document.createElement("a");
      if (story.href) {
        more.className = "card__more";
        more.href = story.href;
        more.innerHTML = "Read the full story →";
      } else {
        more.className = "card__more card__more--muted";
        more.href = "#";
        more.innerHTML = "Chart · " + story.kicker;
        more.addEventListener("click", (e) => e.preventDefault());
      }
      text.appendChild(more);

      const chartHost = document.createElement("div");
      const chartId = "grid-" + story.chart;
      chartHost.id = chartId;

      if (isLead) {
        inner.appendChild(text);
        inner.appendChild(chartHost);
        card.appendChild(inner);
      } else {
        card.appendChild(text);
        card.appendChild(chartHost);
      }
      grid.appendChild(card);

      renderChart(chartId, story.chart, false);
    });
  }

  /* ---- Standalone figure charts on the page --------------------- */
  [
    "economy", "population", "migration", "houseprices",
    "completions", "inflation", "emissions", "waiting",
  ].forEach((key) => {
    const host = document.getElementById("chart-" + key);
    if (host) {
      renderChart("chart-" + key, key, true);
      const src = document.getElementById("src-" + key);
      if (src && IRL[key]) {
        src.innerHTML = "<strong>Source:</strong> " + IRL[key].source +
          " · Updated " + IRL[key].updated;
      }
    }
  });

  /* ---- Chart factory -------------------------------------------- */
  function renderChart(hostId, key, full) {
    const host = document.getElementById(hostId);
    const ds = IRL[key];
    if (!host || !ds) return;

    const cfg = {
      xLabels: ds.xLabels,
      series: ds.series,
      yFormat: ds.yFormat,
      zeroLine: ds.zeroLine,
      target: ds.target,
      annotations: full ? ds.annotations : null,
      netFrom: ds.netFrom,
    };

    // migration is a stacked column with a net line; others are lines
    if (key === "migration") {
      cfg.type = "column";
      cfg.stacked = true;
    } else if (key === "completions" || key === "waiting") {
      cfg.type = "column";
    } else {
      cfg.type = "line";
    }

    IrlChart.render(host, cfg);
  }
})();
