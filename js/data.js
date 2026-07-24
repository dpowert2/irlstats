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
