import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const blogRoot = path.resolve(scriptDir, "..");
const housingRoot = process.env.HOUSING_LAB_PATH
  ? path.resolve(process.env.HOUSING_LAB_PATH)
  : path.resolve(blogRoot, "../../../Data Engineering practice/uk-housing-lab");
const outputDir = path.join(
  blogRoot,
  "src/assets/images/housing-simulation"
);

const colours = {
  ink: "#172033",
  muted: "#64748b",
  grid: "#dbe3ee",
  panel: "#f8fafc",
  actual: "#2563eb",
  simulated: "#f97316",
  rules: "#64748b",
  clef: "#7c3aed",
  rate: "#0f766e",
  mortgage: "#d97706",
  holdout: "#fff1f2",
  holdoutInk: "#be123c",
};

const xml = value =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const line = (x1, y1, x2, y2, attrs = "") =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${attrs}/>`;

const text = (value, x, y, attrs = "") =>
  `<text x="${x}" y="${y}" ${attrs}>${xml(value)}</text>`;

const scale = (domainMin, domainMax, rangeMin, rangeMax) => value => {
  if (domainMax === domainMin) return (rangeMin + rangeMax) / 2;
  return (
    rangeMin +
    ((value - domainMin) / (domainMax - domainMin)) * (rangeMax - rangeMin)
  );
};

const pathFor = (values, xScale, yScale) =>
  values
    .map(
      (value, index) =>
        `${index === 0 ? "M" : "L"}${xScale(index).toFixed(2)},${yScale(value).toFixed(2)}`
    )
    .join(" ");

const ticks = (min, max, count = 4) => {
  const span = max - min || 1;
  const rough = span / count;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const residual = rough / magnitude;
  const step = (residual >= 5 ? 10 : residual >= 2 ? 5 : residual >= 1 ? 2 : 1) * magnitude;
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const values = [];
  for (let value = start; value <= end + step / 2; value += step) {
    values.push(Number(value.toFixed(8)));
  }
  return values;
};

const svgDocument = ({ width, height, title: titleValue, description, body }) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="chart-title chart-description">
  <title id="chart-title">${xml(titleValue)}</title>
  <desc id="chart-description">${xml(description)}</desc>
  <rect width="${width}" height="${height}" rx="20" fill="#ffffff"/>
  <style>
    text { font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; fill: ${colours.ink}; }
    .title { font-size: 34px; font-weight: 700; letter-spacing: -0.7px; }
    .subtitle { font-size: 16px; fill: ${colours.muted}; }
    .panel-title { font-size: 21px; font-weight: 700; }
    .label { font-size: 14px; fill: ${colours.muted}; }
    .value { font-size: 17px; font-weight: 700; }
    .tick { font-size: 12px; fill: ${colours.muted}; }
  </style>
  ${body}
</svg>
`;

function parseCsv(raw) {
  const [headerLine, ...lines] = raw.trim().split(/\r?\n/);
  const headers = headerLine.split(",");
  return lines.map(row =>
    Object.fromEntries(
      row.split(",").map((value, index) => [headers[index], value])
    )
  );
}

function legendItem(label, colour, x, y) {
  return `${line(x, y - 5, x + 28, y - 5, `stroke="${colour}" stroke-width="4" stroke-linecap="round"`)}${text(label, x + 38, y, 'class="label"')}`;
}

function timeSeriesPanel({
  x,
  y,
  width,
  height,
  title: panelTitle,
  series,
  xLabels,
  yMin,
  yMax,
  holdoutStart,
  holdoutLabel,
  verticalMarkers = [],
}) {
  const plotX = x + 66;
  const plotY = y + 42;
  const plotWidth = width - 86;
  const plotHeight = height - 84;
  const xScale = scale(0, series[0].values.length - 1, plotX, plotX + plotWidth);
  const yScale = scale(yMin, yMax, plotY + plotHeight, plotY);
  const yTicks = ticks(yMin, yMax, 4).filter(value => value >= yMin && value <= yMax);
  let output = text(panelTitle, x, y + 20, 'class="panel-title"');

  if (holdoutStart !== undefined) {
    const startX = xScale(holdoutStart);
    output += `<rect x="${startX}" y="${plotY}" width="${plotX + plotWidth - startX}" height="${plotHeight}" fill="${colours.holdout}"/>`;
    if (holdoutLabel) {
      output += text(
        holdoutLabel,
        plotX + plotWidth - 8,
        plotY + plotHeight - 10,
        `font-size="12" font-weight="700" fill="${colours.holdoutInk}" text-anchor="end"`
      );
    }
  }

  for (const tick of yTicks) {
    const tickY = yScale(tick);
    output += line(
      plotX,
      tickY,
      plotX + plotWidth,
      tickY,
      `stroke="${colours.grid}" stroke-width="1"`
    );
    output += text(
      Number.isInteger(tick) ? tick : tick.toFixed(1),
      plotX - 12,
      tickY + 4,
      'class="tick" text-anchor="end"'
    );
  }

  for (const { index, label } of xLabels) {
    const tickX = xScale(index);
    output += line(
      tickX,
      plotY + plotHeight,
      tickX,
      plotY + plotHeight + 5,
      `stroke="${colours.grid}"`
    );
    output += text(
      label,
      tickX,
      plotY + plotHeight + 22,
      'class="tick" text-anchor="middle"'
    );
  }

  for (const marker of verticalMarkers) {
    const markerX = xScale(marker.index);
    output += line(
      markerX,
      plotY,
      markerX,
      plotY + plotHeight,
      `stroke="${marker.colour}" stroke-width="1.5" stroke-dasharray="5 5"`
    );
    output += text(
      marker.label,
      markerX + 7,
      plotY + 18 + (marker.offset ?? 0),
      `font-size="12" font-weight="700" fill="${marker.colour}"`
    );
  }

  for (const item of series) {
    output += `<path d="${pathFor(item.values, xScale, yScale)}" fill="none" stroke="${item.colour}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`;
  }

  output += line(
    plotX,
    plotY + plotHeight,
    plotX + plotWidth,
    plotY + plotHeight,
    `stroke="${colours.ink}" stroke-width="1"`
  );
  return output;
}

function buildFitChart(rows) {
  const metrics = [
    {
      title: "House-price index",
      actual: rows.map(row => Number(row.target_price_index)),
      simulated: rows.map(row => Number(row.simulated_price_index)),
    },
    {
      title: "Completed-sales index",
      actual: rows.map(row => Number(row.target_sales_index)),
      simulated: rows.map(row => Number(row.simulated_sales_index)),
    },
    {
      title: "Mortgage-approvals index",
      actual: rows.map(row => Number(row.target_approvals_index)),
      simulated: rows.map(row => Number(row.simulated_approvals_index)),
    },
  ];
  const yearLabels = rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => row.month.endsWith("-01"))
    .map(({ row, index }) => ({ index, label: row.month.slice(0, 4) }));
  let body = text(
    "The model misses 2024 sales and approvals",
    54,
    52,
    'class="title"'
  );
  body += text(
    "Parameters were fitted to 2015–2023. The shaded 2024 period was not used during fitting.",
    54,
    82,
    'class="subtitle"'
  );
  body += legendItem("Actual UK data", colours.actual, 54, 111);
  body += legendItem("Simulation", colours.simulated, 225, 111);

  metrics.forEach((metric, index) => {
    const allValues = [...metric.actual, ...metric.simulated];
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const padding = (max - min) * 0.08 || 1;
    body += timeSeriesPanel({
      x: 54,
      y: 132 + index * 252,
      width: 1012,
      height: 226,
      title: metric.title,
      series: [
        { values: metric.actual, colour: colours.actual },
        { values: metric.simulated, colour: colours.simulated },
      ],
      xLabels: yearLabels,
      yMin: Math.max(0, min - padding),
      yMax: max + padding,
      holdoutStart: rows.findIndex(row => row.sample === "holdout"),
      holdoutLabel: index === 0 ? "2024 holdout" : undefined,
    });
  });

  return svgDocument({
    width: 1120,
    height: 900,
    title: "Historical UK housing data compared with the fitted simulation",
    description:
      "Three time-series charts compare actual and simulated house prices, completed sales and mortgage approvals from 2015 to 2024. The simulation diverges materially in the 2024 holdout period.",
    body,
  });
}

function buildHeroChart(rows) {
  const actual = rows.map(row => Number(row.target_price_index));
  const simulated = rows.map(row => Number(row.simulated_price_index));
  const yearLabels = [0, 36, 72, 108].map(index => ({
    index,
    label: rows[index].month.slice(0, 4),
  }));
  let body = text(
    "Trying Cloudflare",
    54,
    150,
    'font-size="48" font-weight="700" letter-spacing="-1"'
  );
  body += text(
    "Clef in a small",
    54,
    208,
    'font-size="48" font-weight="700" letter-spacing="-1"'
  );
  body += text(
    "housing simulation",
    54,
    266,
    'font-size="48" font-weight="700" letter-spacing="-1"'
  );
  body += text(
    "I first used Python for household decisions.",
    54,
    324,
    'class="subtitle"'
  );
  body += text(
    "Then I replaced that policy with a model.",
    54,
    350,
    'class="subtitle"'
  );
  body += legendItem("Actual UK data", colours.actual, 54, 414);
  body += legendItem("Simulation", colours.simulated, 54, 450);
  body += timeSeriesPanel({
    x: 500,
    y: 105,
    width: 646,
    height: 380,
    title: "House-price index",
    series: [
      { values: actual, colour: colours.actual },
      { values: simulated, colour: colours.simulated },
    ],
    xLabels: yearLabels,
    yMin: 92,
    yMax: 158,
    holdoutStart: rows.findIndex(row => row.sample === "holdout"),
    holdoutLabel: "holdout",
  });

  return svgDocument({
    width: 1200,
    height: 600,
    title: "Trying Cloudflare Clef in a small housing simulation",
    description:
      "Article cover showing actual and simulated UK house-price indices from 2015 through the 2024 holdout period.",
    body,
  });
}

function buildEventLoopDiagram() {
  const boxes = [
    {
      x: 30,
      step: "1",
      title: "Calendar",
      lines: ["Starts the month", "and publishes"],
      event: "MonthStarted",
    },
    {
      x: 245,
      step: "2",
      title: "HADES",
      lines: ["Broadcasts the event", "to every process"],
      event: "Observers react",
    },
    {
      x: 460,
      step: "3",
      title: "Households",
      lines: ["Rules or Clef choose", "actions concurrently"],
      event: "HouseholdDecided × N",
    },
    {
      x: 675,
      step: "4",
      title: "Market",
      lines: ["Collects every decision", "then clears the market"],
      event: "Lend + match",
    },
    {
      x: 890,
      step: "5",
      title: "Market",
      lines: ["Records the results", "and publishes"],
      event: "MarketCleared",
    },
  ];
  const boxY = 142;
  const boxWidth = 190;
  const boxHeight = 220;
  let body = `
    <defs>
      <marker id="event-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="${colours.muted}"/>
      </marker>
    </defs>`;
  body += text("One simulated month in HADES", 54, 52, 'class="title"');
  body += text(
    "Processes publish events. HADES broadcasts them; the processes that care about an event react to it.",
    54,
    82,
    'class="subtitle"'
  );

  boxes.forEach((box, index) => {
    body += `<rect x="${box.x}" y="${boxY}" width="${boxWidth}" height="${boxHeight}" rx="14" fill="${colours.panel}" stroke="${colours.grid}" stroke-width="1.5"/>`;
    body += `<circle cx="${box.x + 24}" cy="${boxY + 26}" r="14" fill="${colours.actual}"/>`;
    body += text(
      box.step,
      box.x + 24,
      boxY + 31,
      'font-size="13" font-weight="700" fill="#ffffff" text-anchor="middle"'
    );
    body += text(box.title, box.x + 48, boxY + 33, 'class="panel-title"');
    body += text(box.lines[0], box.x + 18, boxY + 83, 'class="label"');
    body += text(box.lines[1], box.x + 18, boxY + 107, 'class="label"');
    body += `<rect x="${box.x + 18}" y="${boxY + 140}" width="${boxWidth - 36}" height="42" rx="8" fill="#fff7ed" stroke="#fed7aa"/>`;
    body += text(
      box.event,
      box.x + boxWidth / 2,
      boxY + 166,
      'font-size="13" font-weight="700" text-anchor="middle" fill="#9a3412"'
    );
    if (index < boxes.length - 1) {
      body += line(
        box.x + boxWidth + 7,
        boxY + boxHeight / 2,
        boxes[index + 1].x - 8,
        boxY + boxHeight / 2,
        `stroke="${colours.muted}" stroke-width="2" marker-end="url(#event-arrow)"`
      );
    }
  });

  const lastCentre = boxes.at(-1).x + boxWidth / 2;
  const firstCentre = boxes[0].x + boxWidth / 2;
  body += `<path d="M ${lastCentre} ${boxY + boxHeight + 12} V 432 H ${firstCentre} V ${boxY + boxHeight + 13}" fill="none" stroke="${colours.muted}" stroke-width="2" marker-end="url(#event-arrow)"/>`;
  body += text(
    "The calendar schedules the next MonthStarted event. Households also store the result in their short memory.",
    560,
    466,
    'class="subtitle" text-anchor="middle"'
  );

  return svgDocument({
    width: 1120,
    height: 510,
    title: "One simulated month in the HADES event loop",
    description:
      "The calendar publishes MonthStarted, HADES broadcasts it, household processes decide concurrently, the market collects every decision and publishes MarketCleared, then the calendar starts the next month.",
    body,
  });
}

function buildProcessChart(trace) {
  const xLabels = [0, 12, 24, 36, 48, 60, 71].map(index => ({
    index,
    label: String(index),
  }));
  const totals = [
    { label: "Applications", value: trace.reduce((sum, row) => sum + row.applications, 0) },
    { label: "Approvals", value: trace.reduce((sum, row) => sum + row.approvals, 0) },
    { label: "Accepted offers", value: trace.reduce((sum, row) => sum + row.offers, 0) },
    { label: "Completed sales", value: trace.reduce((sum, row) => sum + row.transactions, 0) },
  ];
  let body = text(
    "Why a rate cut does not increase sales straight away",
    54,
    52,
    'class="title"'
  );
  body += text(
    "Average of six simulations with 180 synthetic households. The rate cut starts in month 24.",
    54,
    82,
    'class="subtitle"'
  );
  body += legendItem("Bank Rate", colours.rate, 54, 111);
  body += legendItem("New mortgage rate", colours.mortgage, 190, 111);
  body += timeSeriesPanel({
    x: 54,
    y: 130,
    width: 1012,
    height: 310,
    title: "Rate transmission",
    series: [
      { values: trace.map(row => row.baseRate), colour: colours.rate },
      { values: trace.map(row => row.mortgageRate), colour: colours.mortgage },
    ],
    xLabels,
    yMin: 0,
    yMax: 6.4,
    verticalMarkers: [
      { index: 24, label: "Bank Rate cut", colour: colours.rate },
      {
        index: 26,
        label: "mortgages reprice",
        colour: colours.mortgage,
        offset: 19,
      },
    ],
  });

  body += text(
    "Most applications fail the lending checks",
    54,
    486,
    'class="panel-title"'
  );
  body += text(
    "Only 110 of 1,722 applications were approved.",
    54,
    512,
    'class="subtitle"'
  );
  const maxValue = totals[0].value;
  const barX = 226;
  const maxWidth = 790;
  totals.forEach((item, index) => {
    const y = 548 + index * 62;
    const barWidth = Math.max(5, (item.value / maxValue) * maxWidth);
    body += text(item.label, barX - 18, y + 23, 'class="label" text-anchor="end"');
    body += `<rect x="${barX}" y="${y}" width="${barWidth}" height="34" rx="6" fill="${index === 0 ? colours.actual : colours.simulated}" opacity="${index === 0 ? 0.9 : 0.78}"/>`;
    body += text(
      Math.round(item.value).toLocaleString("en-GB"),
      Math.min(barX + barWidth + 12, 1045),
      y + 23,
      'class="value"'
    );
  });

  return svgDocument({
    width: 1120,
    height: 830,
    title: "How an interest-rate cut moves through the housing transaction process",
    description:
      "A time-series chart shows a two-month lag from the Bank Rate cut to mortgage repricing. A funnel shows 1,722 applications becoming 110 approvals, 47 accepted offers and 44 completed sales.",
    body,
  });
}

function comparisonBars({ x, y, width, title: panelTitle, rules, clef }) {
  const max = Math.max(rules, clef) * 1.12 || 1;
  const yScale = scale(0, max, y + 174, y + 45);
  const barWidth = 80;
  let output = text(panelTitle, x, y + 21, 'class="panel-title"');
  output += line(
    x,
    y + 174,
    x + width,
    y + 174,
    `stroke="${colours.grid}" stroke-width="1"`
  );
  [
    { label: "Rules", value: rules, colour: colours.rules, barX: x + 44 },
    { label: "Clef", value: clef, colour: colours.clef, barX: x + 164 },
  ].forEach(item => {
    const barY = yScale(item.value);
    output += `<rect x="${item.barX}" y="${barY}" width="${barWidth}" height="${y + 174 - barY}" rx="6" fill="${item.colour}"/>`;
    output += text(
      item.value,
      item.barX + barWidth / 2,
      barY - 10,
      'class="value" text-anchor="middle"'
    );
    output += text(
      item.label,
      item.barX + barWidth / 2,
      y + 198,
      'class="label" text-anchor="middle"'
    );
  });
  return output;
}

function buildAgentChart(rulesRun, clefRun) {
  let body = text(
    "Clef agents submitted more applications in the sandbox",
    54,
    52,
    'class="title"'
  );
  body += text(
    "This 60-household test is separate from the UK data backtest. Both runs use the same seed and scenario.",
    54,
    82,
    'class="subtitle"'
  );
  body += legendItem("Rules", colours.rules, 54, 111);
  body += legendItem("Clef", colours.clef, 159, 111);
  body += comparisonBars({
    x: 54,
    y: 134,
    width: 300,
    title: "Applications",
    rules: rulesRun.summary.applications,
    clef: clefRun.summary.applications,
  });
  body += comparisonBars({
    x: 410,
    y: 134,
    width: 300,
    title: "Approvals",
    rules: rulesRun.summary.approvals,
    clef: clefRun.summary.approvals,
  });
  body += comparisonBars({
    x: 766,
    y: 134,
    width: 300,
    title: "Completed sales",
    rules: rulesRun.summary.transactions,
    clef: clefRun.summary.transactions,
  });

  const monthLabels = [0, 6, 12, 18, 23].map(index => ({
    index,
    label: String(index),
  }));
  body += timeSeriesPanel({
    x: 54,
    y: 382,
    width: 494,
    height: 270,
    title: "Cumulative applications",
    series: [
      { values: rulesRun.trace.map(row => row.applications), colour: colours.rules },
      { values: clefRun.trace.map(row => row.applications), colour: colours.clef },
    ],
    xLabels: monthLabels,
    yMin: 0,
    yMax: Math.max(
      ...rulesRun.trace.map(row => row.applications),
      ...clefRun.trace.map(row => row.applications)
    ) * 1.08,
  });
  body += timeSeriesPanel({
    x: 572,
    y: 382,
    width: 494,
    height: 270,
    title: "Cumulative approvals",
    series: [
      { values: rulesRun.trace.map(row => row.approvals), colour: colours.rules },
      { values: clefRun.trace.map(row => row.approvals), colour: colours.clef },
    ],
    xLabels: monthLabels,
    yMin: 0,
    yMax: Math.max(
      ...rulesRun.trace.map(row => row.approvals),
      ...clefRun.trace.map(row => row.approvals)
    ) * 1.12,
  });

  return svgDocument({
    width: 1120,
    height: 700,
    title: "Rule-based and Clef household decisions in a small sandbox",
    description:
      "Clef creates 285 applications and 21 approvals compared with 228 applications and 11 approvals under the rules. Both simulations complete two sales.",
    body,
  });
}

async function writeChart(name, svg) {
  const svgPath = path.join(outputDir, `${name}.svg`);
  const pngPath = path.join(outputDir, `${name}.png`);
  await fs.writeFile(svgPath, svg.trimStart());
  await sharp(Buffer.from(svg)).png().toFile(pngPath);
}

await fs.mkdir(outputDir, { recursive: true });

const [backtestRaw, experimentRaw, agentRaw] = await Promise.all([
  fs.readFile(
    path.join(housingRoot, "data/report/backtest.csv"),
    "utf8"
  ),
  fs.readFile(path.join(housingRoot, "data/report/experiment.json"), "utf8"),
  fs.readFile(path.join(housingRoot, "data/report/clef-comparison.json"), "utf8"),
]);

const backtest = parseCsv(backtestRaw);
const experiment = JSON.parse(experimentRaw);
const agentStudy = JSON.parse(agentRaw);
const fitSvg = buildFitChart(backtest);
const heroSvg = buildHeroChart(backtest);
const eventLoopSvg = buildEventLoopDiagram();

await Promise.all([
  writeChart("actual-vs-simulation", fitSvg),
  writeChart("transaction-process", buildProcessChart(experiment.scenarios.cut.trace)),
  writeChart(
    "rules-vs-clef",
    buildAgentChart(agentStudy.runs["0"], agentStudy.runs["100"])
  ),
  writeChart("hades-event-loop", eventLoopSvg),
  sharp(Buffer.from(heroSvg)).png().toFile(path.join(outputDir, "image.png")),
]);

console.log(`Generated housing charts in ${outputDir}`);
