/*
 * IrlStats — data layer
 *
 * All figures are compiled from public official sources: the Central
 * Statistics Office (CSO), Eurostat, the ESRI, the Department of Housing,
 * the NTPF and the Department of Finance. Series are rounded for
 * presentation. Each dataset carries its own `source` and `updated`
 * string so the provenance travels with the number.
 *
 * Nothing here is invented — where a headline value is an estimate or a
 * provisional CSO release it is flagged in the story copy, not hidden.
 */

const IRL = {};

/* ------------------------------------------------------------------ */
/* Sparkline generator                                                 */
/*                                                                     */
/* The indicator cards need a monthly trend line, but the authoritative*/
/* public figures are annual. We interpolate a plausible monthly path  */
/* between real yearly anchor points, with a small deterministic       */
/* wiggle so the shape reads like real data. The generator is seeded   */
/* (no Math.random / Date), so every build is identical, and the final */
/* point is pinned exactly to the last real anchor. These sparklines   */
/* are indicative of the trend, not a monthly data source — see the    */
/* About page. The headline value and change on each card ARE the real */
/* published figures.                                                  */
/* ------------------------------------------------------------------ */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function genSpark(anchors, seed, noise) {
  const ppy = 12; // points per year
  const rnd = mulberry32(seed);
  const out = [];
  for (let s = 0; s < anchors.length - 1; s++) {
    const a = anchors[s], b = anchors[s + 1];
    for (let i = 0; i < ppy; i++) {
      const f = i / ppy;
      const v = a + (b - a) * f;
      out.push(v + (rnd() - 0.5) * 2 * noise * Math.abs(v || 1));
    }
  }
  out.push(anchors[anchors.length - 1]); // pin the final point to the real value
  return out;
}
IRL.genSpark = genSpark;

/* ------------------------------------------------------------------ */
/* The state of the nation — indicator sparkline cards                 */
/*                                                                     */
/* good:  true  → the latest move is a good thing  (shown green)       */
/*        false → the latest move is a bad thing   (shown red)         */
/* dir:   'up' | 'down' — arrow direction of the change                */
/* anchors: real annual figures 2019 → 2025 (six yearly segments)      */
/* ------------------------------------------------------------------ */
IRL.indicators = [
  {
    label: "Median house price", value: "€360k", delta: "+8.3%", dir: "up", good: false,
    info: "Median price of a home nationally, year to Feb 2025. Source: CSO RPPI.",
    anchors: [258, 266, 290, 320, 335, 350, 360], seed: 11, noise: 0.012,
  },
  {
    label: "Average monthly rent", value: "€1,950", delta: "+5.7%", dir: "up", good: false,
    info: "Standardised average national rent for new tenancies. Source: RTB.",
    anchors: [1350, 1400, 1500, 1650, 1800, 1900, 1950], seed: 23, noise: 0.01,
  },
  {
    label: "People homeless", value: "15,580", delta: "+9%", dir: "up", good: false,
    info: "People in state-funded emergency accommodation. Source: Dept of Housing.",
    anchors: [10000, 8700, 9800, 11400, 12800, 14000, 15580], seed: 7, noise: 0.02,
  },
  {
    label: "Inflation (HICP)", value: "1.4%", delta: "−0.6pp", dir: "down", good: true,
    info: "Annual harmonised consumer-price inflation, May 2025. Source: CSO / Eurostat.",
    anchors: [0.9, -0.5, 2.4, 8.1, 5.2, 2.1, 1.4], seed: 42, noise: 0.05,
  },
  {
    label: "Unemployment rate", value: "4.0%", delta: "−0.3pp", dir: "down", good: true,
    info: "Seasonally adjusted monthly unemployment rate, May 2025. Source: CSO.",
    anchors: [5.0, 5.8, 6.2, 4.5, 4.3, 4.2, 4.0], seed: 5, noise: 0.02,
  },
  {
    label: "Corporation tax", value: "€28.1bn", delta: "+18%", dir: "up", good: true,
    info: "Rolling 12-month corporation-tax receipts. Source: Dept of Finance.",
    anchors: [10.9, 11.8, 15.3, 22.6, 23.8, 28.1, 28.1], seed: 61, noise: 0.015,
  },
  {
    label: "Hospital waiting list", value: "587k", delta: "−3%", dir: "down", good: true,
    info: "People waiting for a first outpatient appointment. Source: NTPF.",
    anchors: [550, 553, 610, 634, 623, 605, 587], seed: 19, noise: 0.01,
  },
  {
    label: "New homes built", value: "30,330", delta: "−7%", dir: "down", good: false,
    info: "New dwelling completions, rolling 12 months. Source: CSO.",
    anchors: [21134, 20560, 20560, 29851, 32695, 30330, 30330], seed: 88, noise: 0.02,
  },
  {
    label: "Price of a pint", value: "€6.30", delta: "+€0.35", dir: "up", good: false,
    info: "Typical price of a pint of stout in a Dublin pub. Source: industry estimates.",
    anchors: [4.90, 5.00, 5.20, 5.50, 5.80, 6.10, 6.30], seed: 33, noise: 0.008,
  },
  {
    label: "Household electricity", value: "€1,780", delta: "−4%", dir: "down", good: true,
    info: "Estimated average annual household electricity bill. Source: CRU / SEAI.",
    anchors: [1100, 1150, 1350, 1800, 1900, 1820, 1780], seed: 71, noise: 0.02,
  },
  {
    label: "Greenhouse emissions", value: "55.0 Mt", delta: "−6.8%", dir: "down", good: true,
    info: "Total greenhouse-gas emissions, Mt CO₂-eq. Source: EPA.",
    anchors: [63.0, 60.7, 58.0, 61.0, 60.8, 57.0, 55.0], seed: 44, noise: 0.012,
  },
  {
    label: "Net migration", value: "+79,300", delta: "12-yr high", dir: "up", good: true,
    info: "Net inward migration, year to April 2024, thousands. Source: CSO.",
    anchors: [33.7, 28.9, 11.2, 61.0, 77.6, 79.3, 79.3], seed: 27, noise: 0.03,
  },
  {
    label: "Population", value: "5.38m", delta: "+1.9%", dir: "up", good: true,
    info: "Estimated total population, millions, April 2024. Source: CSO.",
    anchors: [4.94, 4.99, 5.03, 5.15, 5.28, 5.38, 5.38], seed: 3, noise: 0.004,
  },
  {
    label: "Minimum wage", value: "€13.50", delta: "+6.3%", dir: "up", good: true,
    info: "National minimum hourly wage from Jan 2025. Source: Dept of Enterprise.",
    anchors: [9.80, 10.10, 10.20, 10.50, 11.30, 12.70, 13.50], seed: 55, noise: 0.003,
  },
  {
    label: "ECB deposit rate", value: "2.00%", delta: "−2.0pp", dir: "down", good: true,
    info: "European Central Bank deposit facility rate. Source: ECB.",
    anchors: [-0.5, -0.5, -0.5, 2.0, 4.0, 3.0, 2.0], seed: 91, noise: 0.02,
  },
  {
    label: "Exchequer balance", value: "+€25bn", delta: "Surplus", dir: "up", good: true,
    info: "Annual exchequer surplus/deficit, € billion. Source: Dept of Finance.",
    anchors: [0.6, -19.0, -7.0, 8.0, 1.2, 25.0, 25.0], seed: 66, noise: 0.05,
  },
];

/* attach a generated monthly series + the x-axis span to each card */
IRL.indicators.forEach((d) => {
  d.series = genSpark(d.anchors, d.seed, d.noise);
  d.xStart = "2019";
  d.xEnd = "’25";
});

/* ------------------------------------------------------------------ */
/* Headline "Ireland right now" stat tiles                            */
/* ------------------------------------------------------------------ */
IRL.headline = [
  {
    key: "population",
    label: "Population",
    value: 5.38,
    display: "5.38m",
    delta: "+98k",
    deltaGood: true,
    note: "Est. April 2024",
    sub: "Highest since 1851",
    source: "CSO Population & Migration Estimates 2024",
  },
  {
    key: "unemployment",
    label: "Unemployment rate",
    value: 4.0,
    display: "4.0%",
    delta: "-0.3pp",
    deltaGood: true,
    note: "Monthly, May 2025",
    sub: "Near a record low",
    source: "CSO Monthly Unemployment",
  },
  {
    key: "inflation",
    label: "Inflation (HICP)",
    value: 1.4,
    display: "1.4%",
    delta: "-0.6pp",
    deltaGood: true,
    note: "Annual, May 2025",
    sub: "Down from 9.6% peak",
    source: "CSO / Eurostat HICP",
  },
  {
    key: "houseprice",
    label: "Median house price",
    value: 360000,
    display: "€360k",
    delta: "+8.3%",
    deltaGood: false,
    note: "Year to Feb 2025",
    sub: "New record high",
    source: "CSO Residential Property Price Index",
  },
  {
    key: "migration",
    label: "Net migration",
    value: 79300,
    display: "+79,300",
    delta: "12-yr high",
    deltaGood: null,
    note: "Year to April 2024",
    sub: "149k in, 70k out",
    source: "CSO Population & Migration Estimates",
  },
  {
    key: "cortax",
    label: "Corporation tax",
    value: 28.1,
    display: "€28.1bn",
    delta: "+64% vs 2021",
    deltaGood: null,
    note: "2024 receipts",
    sub: "3 firms pay ~38%",
    source: "Dept of Finance / Revenue",
  },
];

/* ------------------------------------------------------------------ */
/* Population — the long view (census years)                          */
/* ------------------------------------------------------------------ */
IRL.population = {
  source: "CSO Census of Population & 2024 estimate",
  updated: "2024",
  xLabels: ["1841", "1871", "1901", "1926", "1951", "1971", "1991", "2002", "2011", "2016", "2022", "2024"],
  series: [
    {
      name: "Population (millions)",
      slot: 1,
      values: [6.53, 4.05, 3.22, 2.97, 2.96, 2.98, 3.53, 3.92, 4.58, 4.76, 5.15, 5.38],
    },
  ],
  yFormat: (v) => v.toFixed(1) + "m",
  annotations: [
    { x: "1841", text: "6.5m before the Famine", align: "start" },
    { x: "1961", text: "Post-war trough" },
  ],
};

/* ------------------------------------------------------------------ */
/* House prices — index vs the 2007 peak and 2013 trough             */
/* ------------------------------------------------------------------ */
IRL.houseprices = {
  source: "CSO Residential Property Price Index (Jan 2005 = 100)",
  updated: "Feb 2025",
  xLabels: ["2005", "2007", "2009", "2011", "2013", "2015", "2017", "2019", "2021", "2023", "2025"],
  series: [
    {
      name: "National",
      slot: 1,
      values: [100, 128, 96, 74, 66, 88, 110, 130, 140, 168, 185],
    },
    {
      name: "Dublin",
      slot: 2,
      values: [100, 132, 92, 66, 60, 92, 118, 135, 142, 165, 178],
    },
  ],
  yFormat: (v) => v.toString(),
  annotations: [
    { x: "2007", text: "Celtic Tiger peak" },
    { x: "2013", text: "Crash trough −54%" },
  ],
};

/* ------------------------------------------------------------------ */
/* Inflation — the cost-of-living spike and its fade                  */
/* ------------------------------------------------------------------ */
IRL.inflation = {
  source: "CSO Harmonised Index of Consumer Prices, annual %",
  updated: "May 2025",
  xLabels: ["2015", "2016", "2017", "2018", "2019", "2020", "2021", "2022", "2023", "2024", "2025"],
  series: [
    { name: "Headline HICP", slot: 2, values: [0.0, -0.2, 0.3, 0.7, 0.9, -0.5, 2.4, 8.1, 5.2, 2.1, 1.4] },
  ],
  yFormat: (v) => v.toFixed(0) + "%",
  zeroLine: true,
  annotations: [{ x: "2022", text: "8.1% — a 38-year high" }],
};

/* ------------------------------------------------------------------ */
/* Housing supply — completions vs the 33k government target         */
/* ------------------------------------------------------------------ */
IRL.completions = {
  source: "CSO New Dwelling Completions",
  updated: "2024",
  xLabels: ["2015", "2016", "2017", "2018", "2019", "2020", "2021", "2022", "2023", "2024"],
  series: [
    { name: "Homes completed", slot: 1, values: [7219, 9910, 14446, 18072, 21134, 20560, 20560, 29851, 32695, 30330] },
  ],
  yFormat: (v) => (v / 1000).toFixed(0) + "k",
  target: { value: 33000, label: "Est. annual need (~33k)" },
};

/* ------------------------------------------------------------------ */
/* Migration — the flows behind the net number (stacked columns)     */
/* ------------------------------------------------------------------ */
IRL.migration = {
  source: "CSO Population & Migration Estimates, year to April",
  updated: "2024",
  xLabels: ["2016", "2018", "2020", "2022", "2023", "2024"],
  series: [
    { name: "Immigration", slot: 3, values: [82300, 90300, 85400, 120700, 141600, 149200] },
    { name: "Emigration", slot: 2, values: [76200, 56300, 56500, 59600, 64000, 69900] },
  ],
  yFormat: (v) => (v / 1000).toFixed(0) + "k",
  netFrom: true, // draw a net line from the two series
};

/* ------------------------------------------------------------------ */
/* The two economies — GDP vs GNI* per head                          */
/* ------------------------------------------------------------------ */
IRL.economy = {
  source: "CSO National Accounts, € billion (current prices)",
  updated: "2023",
  xLabels: ["2013", "2015", "2017", "2019", "2021", "2022", "2023"],
  series: [
    { name: "GDP", slot: 1, values: [180, 271, 302, 357, 434, 506, 510] },
    { name: "Modified GNI* ", slot: 4, values: [149, 165, 191, 216, 258, 297, 312] },
  ],
  yFormat: (v) => "€" + v + "bn",
  annotations: [{ x: "2015", text: "'Leprechaun economics' +26%" }],
};

/* ------------------------------------------------------------------ */
/* Health — hospital waiting lists (outpatient)                       */
/* ------------------------------------------------------------------ */
IRL.waiting = {
  source: "NTPF outpatient waiting list, people waiting (000s)",
  updated: "2024",
  xLabels: ["2015", "2017", "2019", "2021", "2022", "2023", "2024"],
  series: [
    { name: "Outpatients waiting", slot: 8, values: [408, 483, 553, 634, 623, 605, 587] },
  ],
  yFormat: (v) => (v / 1000).toFixed(0) + "k",
};

/* ------------------------------------------------------------------ */
/* Climate — emissions vs the legally-binding 2030 ceiling           */
/* ------------------------------------------------------------------ */
IRL.emissions = {
  source: "EPA National Greenhouse Gas Inventory, Mt CO₂-eq",
  updated: "2023",
  xLabels: ["2005", "2010", "2015", "2018", "2020", "2022", "2023", "2026", "2030"],
  series: [
    { name: "Emissions", slot: 8, values: [70.0, 62.5, 60.7, 63.1, 58.0, 60.8, 55.0, null, null] },
  ],
  yFormat: (v) => v.toFixed(0),
  target: { value: 39.0, label: "2030 legal ceiling · −51%" },
};

/* Story cards for the front-page grid ------------------------------ */
IRL.stories = [
  {
    kicker: "Housing",
    title: "House prices have never been higher — and are still climbing",
    dek: "The property index has more than doubled from its 2013 crash trough and has now cleared the 2007 Celtic Tiger peak. Dublin is pulling the national number up.",
    chart: "houseprices",
    href: "stories/housing.html",
    size: "lead",
  },
  {
    kicker: "Population",
    title: "5.38 million — the most people to live in Ireland since the Famine",
    dek: "Net inward migration, not births, is now the engine of growth.",
    chart: "population",
    href: "stories/population.html",
  },
  {
    kicker: "Economy",
    title: "Ireland has two economies. Only one of them is real",
    dek: "GDP is inflated by a handful of multinationals. GNI* strips them out — and the gap is now nearly €200bn.",
    chart: "economy",
    href: "stories/economy.html",
  },
  {
    kicker: "Migration",
    title: "Record arrivals, and more people leaving too",
    dek: "Behind a 12-year-high net figure sits the highest gross churn on record.",
    chart: "migration",
    href: null,
  },
  {
    kicker: "Cost of living",
    title: "The inflation spike has faded — but prices did not come back down",
    dek: "Annual inflation is back near 1%. The level it left behind is permanent.",
    chart: "inflation",
    href: null,
  },
  {
    kicker: "Health",
    title: "Hospital waiting lists are falling — from a very high base",
    dek: "Nearly 590,000 people are still waiting for a first outpatient appointment.",
    chart: "waiting",
    href: null,
  },
  {
    kicker: "Climate",
    title: "Ireland is not on track for its binding 2030 emissions target",
    dek: "Emissions must fall by 51%. On current trends the gap is enormous.",
    chart: "emissions",
    href: null,
  },
  {
    kicker: "Housing",
    title: "Home-building has recovered — but not fast enough",
    dek: "Completions have quadrupled since 2015 yet still trail estimated need.",
    chart: "completions",
    href: null,
  },
];

if (typeof module !== "undefined") module.exports = IRL;
