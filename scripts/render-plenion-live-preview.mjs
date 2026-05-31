import { createRequire } from "node:module";
import { readFile, writeFile } from "node:fs/promises";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const dataPath =
  "C:/Users/RemkoVanderVeken/OneDrive - Q-home/Documents/New project/src/data/plenion-report-data.json";
const outPath =
  "C:/Users/RemkoVanderVeken/OneDrive - Q-home/Documents/New project/docs/research/plenion-live-preview.png";

const raw = JSON.parse(await readFile(dataPath, "utf8"));

const euro = new Intl.NumberFormat("nl-BE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const num = new Intl.NumberFormat("en-GB");

const width = 1800;
const height = 2850;

const invoiceTrend = raw.invoices.months.slice(-4);
const maxTrend = Math.max(1, ...invoiceTrend.map((item) => item.netTotal));
const topCustomer = raw.invoices.topCustomers[0];
const topCustomerWidth = topCustomer
  ? Math.max(1, (topCustomer.netTotal / Math.max(1, ...raw.invoices.topCustomers.map((item) => item.netTotal))) * 100)
  : 0;

const sourceCards = [
  ["Invoice XML", raw.sources.invoiceXmlCount, "Dummieboekhouding UBL invoices"],
  ["Work order XML", raw.sources.mobileOrderXmlCount, "PlenionMobile tablet orders"],
  ["Supplier XML", raw.sources.supplierOrderXmlCount, "BUOrderposting requests"]
];

const recentInvoiceRows = raw.invoices.recent.slice(0, 4);
const recentWorkRows = raw.workOrders.recent.slice(0, 4);
const recentSupplierRows = raw.supplierOrders.recent.slice(0, 4);

function rowText(items) {
  return items.join("  |  ");
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

const sourceBlocks = sourceCards
  .map(
    ([label, value, note], i) => `
      <rect x="120" y="${710 + i * 86}" width="520" height="72" rx="20" fill="rgba(255,255,255,0.88)" stroke="rgba(148,163,184,0.2)"/>
      <text x="148" y="${751 + i * 86}" font-size="24" font-weight="800" fill="#0f172a">${escapeXml(label)}</text>
      <text x="604" y="${751 + i * 86}" font-size="24" font-weight="900" fill="#0f172a" text-anchor="end">${num.format(value)}</text>
      <text x="148" y="${774 + i * 86}" font-size="16" fill="#64748b">${escapeXml(note)}</text>
    `
  )
  .join("");

const trendBlocks = invoiceTrend
  .map((item, i) => {
    const y = 710 + i * 82;
    return `
      <text x="760" y="${y + 10}" font-size="20" font-weight="700" fill="#0f172a">${escapeXml(item.month)}</text>
      <text x="1460" y="${y + 10}" font-size="20" font-weight="700" fill="#0f172a" text-anchor="end">${euro.format(item.netTotal)}</text>
      <rect x="760" y="${y + 20}" width="700" height="12" rx="999" fill="rgba(148,163,184,0.17)"/>
      <rect x="760" y="${y + 20}" width="${Math.max(1, (item.netTotal / maxTrend) * 700)}" height="12" rx="999" fill="url(#trendGrad)"/>
    `;
  })
  .join("");

const invoiceRows = recentInvoiceRows
  .map(
    (r, i) => `
      <text x="120" y="${1640 + i * 56}" font-size="18" font-weight="700" fill="#0f172a">#${r.id}</text>
      <text x="280" y="${1640 + i * 56}" font-size="18" fill="#334155">${escapeXml(r.customerName || "Unknown")}</text>
      <text x="820" y="${1640 + i * 56}" font-size="18" fill="#334155">${escapeXml(r.issueDate)}</text>
      <text x="1020" y="${1640 + i * 56}" font-size="18" fill="#334155">${euro.format(r.netAmount)}</text>
      <text x="1250" y="${1640 + i * 56}" font-size="18" fill="#334155">${euro.format(r.grossAmount)}</text>
    `
  )
  .join("");

const workRows = recentWorkRows
  .map(
    (r, i) => `
      <text x="120" y="${2040 + i * 56}" font-size="18" font-weight="700" fill="#0f172a">${escapeXml(r.bonNumber || "N/A")}</text>
      <text x="280" y="${2040 + i * 56}" font-size="18" fill="#334155">${escapeXml(r.customerCode || "Unknown")}</text>
      <text x="560" y="${2040 + i * 56}" font-size="18" fill="#334155">${escapeXml(r.date || "No date")}</text>
      <text x="820" y="${2040 + i * 56}" font-size="18" fill="#334155">${r.durationHours == null ? "N/A" : `${r.durationHours.toFixed(2)} h`}</text>
      <text x="1090" y="${2040 + i * 56}" font-size="18" fill="#334155">${r.workReady ? "Yes" : "No"}</text>
    `
  )
  .join("");

const supplierRows = recentSupplierRows
  .map(
    (r, i) => `
      <text x="120" y="${2500 + i * 56}" font-size="18" font-weight="700" fill="#0f172a">${escapeXml(r.customerOrderId || "N/A")}</text>
      <text x="280" y="${2500 + i * 56}" font-size="18" fill="#334155">${escapeXml(r.orderDate || "No date")}</text>
      <text x="520" y="${2500 + i * 56}" font-size="18" fill="#334155">${escapeXml(r.deliverTo || "Unknown")}</text>
      <text x="1060" y="${2500 + i * 56}" font-size="18" fill="#334155">${r.lineCount}</text>
      <text x="1230" y="${2500 + i * 56}" font-size="18" fill="#334155">${escapeXml(r.customerOrderRef || "No ref")}</text>
    `
  )
  .join("");

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="heroGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#111827"/>
    </linearGradient>
    <linearGradient id="trendGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="100%" stop-color="#0ea5e9"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="24" flood-color="#0f172a" flood-opacity="0.14"/>
    </filter>
  </defs>

  <rect width="100%" height="100%" fill="#edf3f8"/>
  <rect x="60" y="50" width="1680" height="560" rx="34" fill="url(#heroGrad)" filter="url(#shadow)"/>
  <text x="100" y="110" font-size="16" font-weight="800" fill="#c7f9e7" letter-spacing="3">PLENION LIVE SNAPSHOT</text>
  <text x="100" y="200" font-size="56" font-weight="900" fill="#ffffff">Real data extracted from invoice,</text>
  <text x="100" y="266" font-size="56" font-weight="900" fill="#ffffff">work-order, and supplier XML exports.</text>
  <text x="100" y="336" font-size="24" fill="#d2dae7">Snapshot generated from ${raw.sources.invoiceXmlCount} invoice XMLs, ${raw.sources.mobileOrderXmlCount} mobile orders, and ${raw.sources.supplierOrderXmlCount} supplier postings.</text>
  <rect x="100" y="380" width="228" height="52" rx="16" fill="#9ef0cf"/>
  <text x="214" y="414" font-size="21" font-weight="800" fill="#04130c" text-anchor="middle">Open report pack</text>
  <rect x="344" y="380" width="206" height="52" rx="16" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.14)"/>
  <text x="447" y="414" font-size="21" font-weight="800" fill="#ffffff" text-anchor="middle">Inspect data</text>

   <rect x="1090" y="100" width="590" height="260" rx="26" fill="rgba(255,255,255,0.90)" filter="url(#shadow)"/>
   <text x="1114" y="140" font-size="15" font-weight="800" fill="#64748b" letter-spacing="2">INVOICE NET REVENUE</text>
   <text x="1114" y="195" font-size="44" font-weight="900" fill="#0f172a">${escapeXml(euro.format(raw.invoices.netTotal))}</text>
   <text x="1114" y="242" font-size="20" fill="#475569">${num.format(raw.invoices.count)} invoices, ${num.format(raw.invoices.customerCount)} customers</text>
   <text x="1114" y="288" font-size="15" font-weight="800" fill="#64748b" letter-spacing="2">WORK ORDERS</text>
   <text x="1114" y="324" font-size="34" font-weight="900" fill="#0f172a">${num.format(raw.workOrders.count)} / ${num.format(raw.workOrders.completedCount)} complete</text>

  <rect x="1090" y="350" width="280" height="150" rx="26" fill="rgba(255,255,255,0.90)" filter="url(#shadow)"/>
  <rect x="1400" y="350" width="280" height="150" rx="26" fill="rgba(255,255,255,0.90)" filter="url(#shadow)"/>
   <text x="1118" y="392" font-size="15" font-weight="800" fill="#64748b" letter-spacing="2">SUPPLIER POSTINGS</text>
   <text x="1118" y="446" font-size="42" font-weight="900" fill="#0f172a">${num.format(raw.supplierOrders.count)}</text>
   <text x="1428" y="392" font-size="15" font-weight="800" fill="#64748b" letter-spacing="2">AVERAGE JOB</text>
   <text x="1428" y="446" font-size="42" font-weight="900" fill="#0f172a">${raw.workOrders.averageDurationHours.toFixed(2)} h</text>

  <rect x="60" y="650" width="1680" height="250" rx="30" fill="rgba(255,255,255,0.88)" filter="url(#shadow)"/>
  <text x="100" y="704" font-size="26" font-weight="900" fill="#0f172a">Source footprint</text>
  <text x="100" y="740" font-size="18" fill="#64748b">Real XML extracted from the Plenion backup tree</text>
  ${sourceBlocks}

  <rect x="720" y="650" width="1020" height="250" rx="30" fill="rgba(255,255,255,0.88)" filter="url(#shadow)"/>
  <text x="760" y="704" font-size="26" font-weight="900" fill="#0f172a">Invoice revenue trend</text>
  <text x="760" y="740" font-size="18" fill="#64748b">Last extracted months from UBL invoices</text>
  ${trendBlocks}

  <rect x="60" y="940" width="1680" height="470" rx="30" fill="rgba(255,255,255,0.88)" filter="url(#shadow)"/>
  <text x="100" y="995" font-size="26" font-weight="900" fill="#0f172a">Top customers</text>
  <text x="100" y="1030" font-size="18" fill="#64748b">Highest net revenue found in the invoice export</text>
  <text x="120" y="1095" font-size="22" font-weight="800" fill="#0f172a">Customer</text>
  <text x="1460" y="1095" font-size="22" font-weight="800" fill="#0f172a" text-anchor="end">Revenue</text>
  <text x="120" y="1160" font-size="28" font-weight="800" fill="#0f172a">${topCustomer?.name || "Unknown"}</text>
  <text x="1460" y="1160" font-size="28" font-weight="900" fill="#0f172a" text-anchor="end">${topCustomer ? euro.format(topCustomer.netTotal) : "-"}</text>
  <rect x="120" y="1180" width="1340" height="12" rx="999" fill="rgba(148,163,184,0.17)"/>
  <rect x="120" y="1180" width="${(topCustomerWidth / 100) * 1340}" height="12" rx="999" fill="url(#trendGrad)"/>
   <text x="120" y="1255" font-size="18" fill="#64748b">Other notable customers: ${escapeXml(raw.invoices.topCustomers.slice(1, 5).map((c) => c.name).join(", "))}</text>

  <rect x="60" y="1450" width="1680" height="390" rx="30" fill="rgba(255,255,255,0.88)" filter="url(#shadow)"/>
  <text x="100" y="1505" font-size="26" font-weight="900" fill="#0f172a">Recent invoices</text>
  <text x="100" y="1540" font-size="18" fill="#64748b">Newest invoice exports with real customer names and amounts</text>
  <text x="120" y="1600" font-size="18" font-weight="800" fill="#0f172a">Invoice</text>
  <text x="280" y="1600" font-size="18" font-weight="800" fill="#0f172a">Customer</text>
  <text x="820" y="1600" font-size="18" font-weight="800" fill="#0f172a">Date</text>
  <text x="1020" y="1600" font-size="18" font-weight="800" fill="#0f172a">Net</text>
  <text x="1250" y="1600" font-size="18" font-weight="800" fill="#0f172a">Gross</text>
  ${invoiceRows}

  <rect x="60" y="1880" width="1680" height="390" rx="30" fill="rgba(255,255,255,0.88)" filter="url(#shadow)"/>
  <text x="100" y="1935" font-size="26" font-weight="900" fill="#0f172a">Recent work orders</text>
  <text x="100" y="1970" font-size="18" fill="#64748b">Parsed from PlenionMobile tablet orders</text>
  <text x="120" y="2030" font-size="18" font-weight="800" fill="#0f172a">Bon</text>
  <text x="280" y="2030" font-size="18" font-weight="800" fill="#0f172a">Customer</text>
  <text x="560" y="2030" font-size="18" font-weight="800" fill="#0f172a">Date</text>
  <text x="820" y="2030" font-size="18" font-weight="800" fill="#0f172a">Duration</text>
  <text x="1090" y="2030" font-size="18" font-weight="800" fill="#0f172a">Done</text>
  ${workRows}

  <rect x="60" y="2310" width="1680" height="390" rx="30" fill="rgba(255,255,255,0.88)" filter="url(#shadow)"/>
  <text x="100" y="2365" font-size="26" font-weight="900" fill="#0f172a">Recent supplier postings</text>
  <text x="100" y="2400" font-size="18" fill="#64748b">Supplier XML with order references and delivery details</text>
  <text x="120" y="2460" font-size="18" font-weight="800" fill="#0f172a">Order</text>
  <text x="280" y="2460" font-size="18" font-weight="800" fill="#0f172a">Date</text>
  <text x="520" y="2460" font-size="18" font-weight="800" fill="#0f172a">Ship to</text>
  <text x="1060" y="2460" font-size="18" font-weight="800" fill="#0f172a">Lines</text>
  <text x="1230" y="2460" font-size="18" font-weight="800" fill="#0f172a">Reference</text>
  ${supplierRows}
</svg>`;

const png = await sharp(Buffer.from(svg)).png().toBuffer();
await writeFile(outPath, png);
console.log(outPath);
