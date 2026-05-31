import { noStore } from "next/cache";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

type CatalogSnapshotRecord = {
  id?: string;
  sourceRoot: string;
  generatedAt: Date;
  workbookCount: number;
  supplierCount: number;
  itemCount: number;
  notes: string | null;
};

export type PlenionSupplierCatalogRow = {
  id: string;
  supplierName: string;
  sourceFileName: string;
  sourceSheetName: string;
  sourceRow: number;
  itemCode: string;
  itemNameNl: string | null;
  itemNameFr: string | null;
  series: string | null;
  type: string | null;
  branch: string | null;
  listPrice: number;
  netPrice: number;
  discountRate: number | null;
  modelRange: string | null;
  currency: string;
  priceSource: string;
  raw?: unknown;
};

export type PlenionSupplierCatalogEvidenceRow = {
  id: string;
  supplierName: string;
  sourceFileName: string;
  sourceType: string;
  documentId: string | null;
  documentDate: string | null;
  documentReference: string | null;
  itemCode: string | null;
  itemName: string | null;
  quantity: number | null;
  unit: string | null;
  brutPrice: number | null;
  netPrice: number | null;
  vatRate: number | null;
  currency: string;
  priceSource: string;
  sourceParty: string | null;
  raw?: unknown;
};

export type PlenionSupplierCatalogItemDetail = {
  snapshot: CatalogSnapshotRecord;
  item: PlenionSupplierCatalogRow & { raw: unknown };
  relatedItems: PlenionSupplierCatalogRow[];
  relatedEvidence: PlenionSupplierCatalogEvidenceRow[];
};

export type PlenionSupplierCatalogData = {
  snapshot: CatalogSnapshotRecord;
  summary: {
    workbookCount: number;
    supplierCount: number;
    itemCount: number;
  };
  suppliers: Array<{
    supplierName: string;
    itemCount: number;
    minListPrice: number;
    maxListPrice: number;
    evidenceCount: number;
    pricedEvidenceCount: number;
    minEvidencePrice: number;
    maxEvidencePrice: number;
  }>;
  items: PlenionSupplierCatalogRow[];
  priceEvidence: PlenionSupplierCatalogEvidenceRow[];
  query: {
    q: string;
    supplier: string;
  };
};

type RawCatalog = {
  sourceRoot: string;
  generatedAt: string;
  workbookCount: number;
  supplierCount: number;
  itemCount: number;
  notes: string | null;
  workbooks: Array<{
    fileName: string;
    supplierName: string;
    sheetName: string;
    modifiedAt: string;
    rowCount: number;
  }>;
  suppliers: Array<{
    supplierName: string;
    itemCount: number;
    minListPrice: string | null;
    maxListPrice: string | null;
    evidenceCount: number;
    pricedEvidenceCount: number;
    minEvidencePrice: string | null;
    maxEvidencePrice: string | null;
  }>;
  items: Array<{
    supplierName: string;
    sourceFileName: string;
    sourceSheetName: string;
    sourceRow: number;
    itemCode: string;
    itemNameNl: string | null;
    itemNameFr: string | null;
    series: string | null;
    type: string | null;
    branch: string | null;
    listPrice: string | null;
    netPrice: string | null;
    discountRate: string | null;
    modelRange: string | null;
    currency: string;
    priceSource: string;
    raw?: unknown;
  }>;
  priceEvidence: Array<{
    supplierName: string;
    sourceFileName: string;
    sourceType: string;
    documentId: string | null;
    documentDate: string | null;
    documentReference: string | null;
    itemCode: string | null;
    itemName: string | null;
    quantity: string | null;
    unit: string | null;
    brutPrice: string | null;
    netPrice: string | null;
    vatRate: string | null;
    currency: string;
    priceSource: string;
    sourceParty: string | null;
    raw?: unknown;
  }>;
};

const DATA_PATH = join(process.cwd(), "src", "data", "plenion-supplier-catalog.json");

function toNumber(value: unknown) {
  if (value == null || value === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeText(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function mapRow(row: {
  id: string;
  supplierName: string;
  sourceFileName: string;
  sourceSheetName: string;
  sourceRow: number;
  itemCode: string;
  itemNameNl: string | null;
  itemNameFr: string | null;
  series: string | null;
  type: string | null;
  branch: string | null;
  listPrice: unknown;
  netPrice: unknown;
  discountRate: unknown;
  modelRange: string | null;
  currency: string;
  priceSource: string;
  raw?: unknown;
}) {
  return {
    id: row.id,
    supplierName: row.supplierName,
    sourceFileName: row.sourceFileName,
    sourceSheetName: row.sourceSheetName,
    sourceRow: row.sourceRow,
    itemCode: row.itemCode,
    itemNameNl: row.itemNameNl,
    itemNameFr: row.itemNameFr,
    series: row.series,
    type: row.type,
    branch: row.branch,
    listPrice: toNumber(row.listPrice),
    netPrice: toNumber(row.netPrice),
    discountRate: row.discountRate == null ? null : toNumber(row.discountRate),
    modelRange: row.modelRange,
    currency: row.currency,
    priceSource: row.priceSource,
    raw: row.raw
  };
}

function mapEvidence(row: {
  id: string;
  supplierName: string;
  sourceFileName: string;
  sourceType: string;
  documentId: string | null;
  documentDate: string | null;
  documentReference: string | null;
  itemCode: string | null;
  itemName: string | null;
  quantity: unknown;
  unit: string | null;
  brutPrice: unknown;
  netPrice: unknown;
  vatRate: unknown;
  currency: string;
  priceSource: string;
  sourceParty: string | null;
  raw?: unknown;
}) {
  return {
    id: row.id,
    supplierName: row.supplierName,
    sourceFileName: row.sourceFileName,
    sourceType: row.sourceType,
    documentId: row.documentId,
    documentDate: row.documentDate,
    documentReference: row.documentReference,
    itemCode: row.itemCode,
    itemName: row.itemName,
    quantity: row.quantity == null ? null : toNumber(row.quantity),
    unit: row.unit,
    brutPrice: row.brutPrice == null ? null : toNumber(row.brutPrice),
    netPrice: row.netPrice == null ? null : toNumber(row.netPrice),
    vatRate: row.vatRate == null ? null : toNumber(row.vatRate),
    currency: row.currency,
    priceSource: row.priceSource,
    sourceParty: row.sourceParty,
    raw: row.raw
  };
}

function buildSearchWhere(q: string, supplier: string, items: PlenionSupplierCatalogRow[]) {
  const normalizedQ = q.toLowerCase();
  const normalizedSupplier = supplier.toLowerCase();

  return items.filter((item) => {
    if (normalizedSupplier && item.supplierName.toLowerCase() !== normalizedSupplier) {
      return false;
    }
    if (!normalizedQ) return true;
    const haystack = [
      item.itemCode,
      item.itemNameNl,
      item.itemNameFr,
      item.series,
      item.type,
      item.branch,
      item.modelRange,
      item.sourceFileName,
      item.supplierName
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalizedQ);
  });
}

function buildEvidenceSearchWhere(
  q: string,
  supplier: string,
  evidence: PlenionSupplierCatalogEvidenceRow[]
) {
  const normalizedQ = q.toLowerCase();
  const normalizedSupplier = supplier.toLowerCase();

  return evidence.filter((entry) => {
    if (normalizedSupplier && entry.supplierName.toLowerCase() !== normalizedSupplier) {
      return false;
    }
    if (!normalizedQ) return true;
    const haystack = [
      entry.itemCode,
      entry.itemName,
      entry.documentId,
      entry.documentReference,
      entry.sourceFileName,
      entry.sourceParty,
      entry.priceSource,
      entry.supplierName
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalizedQ);
  });
}

async function loadCatalog(): Promise<RawCatalog | null> {
  try {
    const text = await readFile(DATA_PATH, "utf-8");
    return JSON.parse(text) as RawCatalog;
  } catch {
    return null;
  }
}

export async function getLatestPlenionSupplierCatalogData(options?: {
  q?: string;
  supplier?: string;
}): Promise<PlenionSupplierCatalogData | null> {
  noStore();

  const raw = await loadCatalog();
  if (!raw) return null;

  const q = normalizeText(options?.q).slice(0, 100);
  const supplier = normalizeText(options?.supplier).slice(0, 100);

  const allItems = raw.items.map((item, index) => ({
    id: `${item.supplierName}:${item.itemCode}:${index}`,
    ...mapRow({
      id: `${item.supplierName}:${item.itemCode}:${index}`,
      ...item
    })
  }));
  const allEvidence = raw.priceEvidence.map((entry, index) => ({
    id: `${entry.supplierName}:${entry.sourceFileName}:${entry.documentId ?? "doc"}:${index}`,
    ...mapEvidence({
      id: `${entry.supplierName}:${entry.sourceFileName}:${entry.documentId ?? "doc"}:${index}`,
      ...entry
    })
  }));

  const items = buildSearchWhere(q, supplier, allItems);
  const priceEvidence = buildEvidenceSearchWhere(q, supplier, allEvidence);

  const suppliers = raw.suppliers.map((supplierEntry) => ({
    supplierName: supplierEntry.supplierName,
    itemCount: supplierEntry.itemCount,
    minListPrice: supplierEntry.minListPrice == null ? 0 : toNumber(supplierEntry.minListPrice),
    maxListPrice: supplierEntry.maxListPrice == null ? 0 : toNumber(supplierEntry.maxListPrice),
    evidenceCount: supplierEntry.evidenceCount,
    pricedEvidenceCount: supplierEntry.pricedEvidenceCount,
    minEvidencePrice: supplierEntry.minEvidencePrice == null ? 0 : toNumber(supplierEntry.minEvidencePrice),
    maxEvidencePrice: supplierEntry.maxEvidencePrice == null ? 0 : toNumber(supplierEntry.maxEvidencePrice)
  }));

  return {
    snapshot: {
      sourceRoot: raw.sourceRoot,
      generatedAt: new Date(raw.generatedAt),
      workbookCount: raw.workbookCount,
      supplierCount: raw.supplierCount,
      itemCount: raw.itemCount,
      notes: raw.notes
    },
    summary: {
      workbookCount: raw.workbookCount,
      supplierCount: raw.supplierCount,
      itemCount: raw.itemCount
    },
    suppliers,
    items,
    priceEvidence,
    query: {
      q,
      supplier
    }
  };
}

export async function getPlenionSupplierCatalogItemDetail(
  id: string
): Promise<PlenionSupplierCatalogItemDetail | null> {
  noStore();

  const raw = await loadCatalog();
  if (!raw) return null;

  const allItems = raw.items.map((item, index) => ({
    id: `${item.supplierName}:${item.itemCode}:${index}`,
    ...mapRow({
      id: `${item.supplierName}:${item.itemCode}:${index}`,
      ...item
    })
  }));
  const allEvidence = raw.priceEvidence.map((entry, index) => ({
    id: `${entry.supplierName}:${entry.sourceFileName}:${entry.documentId ?? "doc"}:${index}`,
    ...mapEvidence({
      id: `${entry.supplierName}:${entry.sourceFileName}:${entry.documentId ?? "doc"}:${index}`,
      ...entry
    })
  }));

  const item = allItems.find((entry) => entry.id === id);
  if (!item) return null;

  const relatedItems = allItems
    .filter((entry) => entry.supplierName === item.supplierName && entry.id !== item.id)
    .slice(0, 8);
  const relatedEvidence = allEvidence
    .filter((entry) => entry.supplierName === item.supplierName || entry.itemCode === item.itemCode)
    .slice(0, 8);

  return {
    snapshot: {
      sourceRoot: raw.sourceRoot,
      generatedAt: new Date(raw.generatedAt),
      workbookCount: raw.workbookCount,
      supplierCount: raw.supplierCount,
      itemCount: raw.itemCount,
      notes: raw.notes
    },
    item: {
      ...item,
      raw: raw.items.find((candidate, index) => `${candidate.supplierName}:${candidate.itemCode}:${index}` === id)?.raw
    },
    relatedItems,
    relatedEvidence
  };
}
