import { createRequire } from "node:module";
import { writeFile } from "node:fs/promises";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const outPath =
  "C:/Users/RemkoVanderVeken/OneDrive - Q-home/Documents/New project/docs/research/plenion-report-preview.png";

const folders = [
  ["HFSERVER", 8.744],
  ["backup", 4.492],
  ["Update", 2.331],
  ["PLDOCS", 2.096],
  ["PLSERVER", 1.565],
  ["Webservice", 0.007]
];

const reportPack = [
  ["Management dashboard", "Revenue, backlog, project margin and open work orders.", "FAK/L, BON/L, PROJ, KLANT"],
  ["Finance dashboard", "Invoice totals, credits, VAT, overdue balance, margin.", "FAK/L, FAKB/C/D, HFAK*"],
  ["Operations dashboard", "Aging, SLA breaches, task load, technician capacity.", "BON/L, TAAK*, PLANNING, RESOURCE*"],
  ["Stock dashboard", "Stock value, fast movers, supplier consistency.", "VRRD, VRRDL, MAGAZIJNLOCATIE, LEV"],
  ["Compliance dashboard", "Measurements due, overdue certificates, pass rate.", "METING*, WERK*, CONTFAK, CONT_KWAL"]
];

const domains = [
  ["Finance", "92%", "FAK, FAKL, FAKB, FAKC, FAKD", "Ready for invoice mart."],
  ["Work orders", "90%", "BON, BONL, BON_LOG, BONTMP", "Ready for service analytics."],
  ["Projects", "88%", "PROJ, PROJ_RUBR, PROJ_BUDGET, PROJ_PREST", "Ready for margin analysis."],
  ["Stock", "84%", "VRRD, VRRDL, MAGAZIJNLOCATIE, LOT", "Ready for inventory views."],
  ["Master data", "95%", "KLANT, LEV, ARTIKEL, CONTACT", "Ready for dimension build."],
  ["Compliance", "81%", "METING*, WERK*, KPI, STAT*", "Ready for due-date tracking."]
];

const width = 1800;
const height = 2780;
const maxFolder = folders[0][1];

const folderBars = folders
  .map(([name, value], i) => {
    const y = 760 + i * 74;
    return `
      <text x="120" y="${y - 14}" font-size="26" font-weight="700" fill="#0f172a">${name}</text>
      <text x="1530" y="${y - 14}" font-size="24" font-weight="700" fill="#0f172a" text-anchor="end">${value.toFixed(3)} GB</text>
      <rect x="120" y="${y}" width="1380" height="12" rx="999" fill="rgba(148,163,184,0.18)" />
      <rect x="120" y="${y}" width="${Math.max(1, (value / maxFolder) * 1380)}" height="12" rx="999" fill="url(#barGrad)" />
    `;
  })
  .join("");

const reportCards = reportPack
  .map((item, i) => {
    const y = 1310 + i * 74;
    return `
      <rect x="120" y="${y}" width="740" height="58" rx="18" fill="rgba(255,255,255,0.76)" stroke="rgba(148,163,184,0.28)" />
      <text x="146" y="${y + 24}" font-size="21" font-weight="800" fill="#0f172a">${item[0]}</text>
      <text x="146" y="${y + 44}" font-size="18" fill="#475569">${item[1]}</text>
      <text x="822" y="${y + 33}" font-size="17" font-weight="800" fill="#0f172a" text-anchor="end">${item[2]}</text>
    `;
  })
  .join("");

const domainCards = domains
  .map(([name, conf, tables, desc], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 120 + col * 790;
    const y = 1890 + row * 188;
    return `
      <rect x="${x}" y="${y}" width="740" height="170" rx="24" fill="rgba(255,255,255,0.88)" stroke="rgba(148,163,184,0.28)" />
      <text x="${x + 24}" y="${y + 42}" font-size="28" font-weight="800" fill="#0f172a">${name}</text>
      <text x="${x + 716}" y="${y + 42}" font-size="28" font-weight="900" fill="#0f172a" text-anchor="end">${conf}</text>
      <text x="${x + 24}" y="${y + 78}" font-size="20" fill="#64748b">${tables}</text>
      <text x="${x + 24}" y="${y + 128}" font-size="20" fill="#334155">${desc}</text>
    `;
  })
  .join("");

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="heroGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#111827"/>
    </linearGradient>
    <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="100%" stop-color="#0ea5e9"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="24" flood-color="#0f172a" flood-opacity="0.14"/>
    </filter>
  </defs>

  <rect width="100%" height="100%" fill="#edf3f8"/>
  <circle cx="1640" cy="110" r="280" fill="rgba(16,185,129,0.16)"/>
  <circle cx="240" cy="210" r="220" fill="rgba(14,165,233,0.12)"/>

  <rect x="60" y="50" width="1680" height="620" rx="34" fill="url(#heroGrad)" filter="url(#shadow)"/>
  <rect x="60" y="50" width="1680" height="620" rx="34" fill="none" stroke="rgba(255,255,255,0.10)"/>
  <rect x="100" y="98" width="300" height="38" rx="19" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.14)"/>
  <text x="122" y="123" font-size="18" font-weight="800" fill="#c7f9e7" letter-spacing="3">PLENION REPORTING COCKPIT</text>
  <text x="100" y="210" font-size="58" font-weight="900" fill="#ffffff">Turn the Plenion backup</text>
  <text x="100" y="276" font-size="58" font-weight="900" fill="#ffffff">into a PostgreSQL reporting stack.</text>
  <text x="100" y="334" font-size="24" fill="#d2dae7">HFSQL source files, report templates, and document archives</text>
  <text x="100" y="368" font-size="24" fill="#d2dae7">are all present, along with the business tables we need</text>
  <text x="100" y="402" font-size="24" fill="#d2dae7">for the first dashboard pack.</text>

  <rect x="100" y="450" width="200" height="52" rx="16" fill="#9ef0cf"/>
  <text x="200" y="484" font-size="22" font-weight="800" fill="#04130c" text-anchor="middle">View report pack</text>
  <rect x="316" y="450" width="190" height="52" rx="16" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.14)"/>
  <text x="411" y="484" font-size="22" font-weight="800" fill="#ffffff" text-anchor="middle">Warehouse design</text>

  <g filter="url(#shadow)">
    <rect x="1090" y="110" width="590" height="236" rx="26" fill="rgba(255,255,255,0.88)"/>
    <rect x="1114" y="132" width="260" height="24" rx="12" fill="rgba(15,23,42,0.08)"/>
    <text x="1126" y="148" font-size="15" font-weight="800" fill="#64748b" letter-spacing="2">CORE SOURCE SYSTEM</text>
    <text x="1114" y="205" font-size="46" font-weight="900" fill="#0f172a">Tomme_Energie</text>
    <text x="1114" y="250" font-size="20" fill="#475569">HFSQL backup identified from backup/203/backup.info</text>
    <text x="1114" y="300" font-size="15" font-weight="800" fill="#64748b" letter-spacing="2">WAREHOUSE LAYERS</text>
    <text x="1114" y="342" font-size="42" font-weight="900" fill="#0f172a">3</text>
  </g>

  <g filter="url(#shadow)">
    <rect x="1090" y="366" width="280" height="160" rx="26" fill="rgba(255,255,255,0.88)"/>
    <rect x="1400" y="366" width="280" height="160" rx="26" fill="rgba(255,255,255,0.88)"/>
    <text x="1118" y="408" font-size="15" font-weight="800" fill="#64748b" letter-spacing="2">DASHBOARDS</text>
    <text x="1118" y="463" font-size="42" font-weight="900" fill="#0f172a">5</text>
    <text x="1428" y="408" font-size="15" font-weight="800" fill="#64748b" letter-spacing="2">TEMPLATES</text>
    <text x="1428" y="463" font-size="42" font-weight="900" fill="#0f172a">8+</text>
  </g>

  <g filter="url(#shadow)">
    <rect x="60" y="710" width="1680" height="380" rx="30" fill="rgba(255,255,255,0.88)"/>
    <text x="100" y="765" font-size="26" font-weight="900" fill="#0f172a">Extraction footprint</text>
    <text x="100" y="800" font-size="18" fill="#64748b">Where the backup lives</text>
    ${folderBars}
  </g>

  <g filter="url(#shadow)">
    <rect x="60" y="1130" width="1680" height="560" rx="30" fill="rgba(255,255,255,0.88)"/>
    <text x="100" y="1185" font-size="26" font-weight="900" fill="#0f172a">First report pack</text>
    <text x="100" y="1220" font-size="18" fill="#64748b">The first dashboards we can ship</text>
    ${reportCards}
  </g>

  <g filter="url(#shadow)">
    <rect x="60" y="1760" width="1680" height="930" rx="30" fill="rgba(255,255,255,0.88)"/>
    <text x="100" y="1815" font-size="26" font-weight="900" fill="#0f172a">Source domains</text>
    <text x="100" y="1850" font-size="18" fill="#64748b">Coverage discovered in the backup</text>
    ${domainCards}
  </g>

  <text x="60" y="2720" font-size="18" fill="#64748b">Concrete next step: restore HFSQL into a server, land raw tables in PostgreSQL, then publish the marts above.</text>
</svg>`;

const png = await sharp(Buffer.from(svg)).png().toBuffer();
await writeFile(outPath, png);
console.log(outPath);
