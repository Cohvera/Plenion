import { noStore } from "next/cache";

import { prisma } from "@/lib/prisma";

type PlenionSnapshotRecord = {
  id: string;
  sourceRoot: string;
  generatedAt: Date;
  invoiceXmlCount: number;
  workOrderXmlCount: number;
  supplierOrderXmlCount: number;
  notes: string | null;
};

export type PlenionInvoiceRow = {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string | null;
  note: string | null;
  supplierName: string | null;
  customerName: string | null;
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
  lineCount: number;
  sourceFileName: string;
};

export type PlenionWorkOrderRow = {
  id: string;
  bonNumber: string;
  customerCode: string | null;
  workDate: string;
  workTime: string | null;
  reference: string | null;
  workReady: boolean;
  firstArticleCode: string | null;
  quantity: number | null;
  resourceCode: string | null;
  startTime: string | null;
  endTime: string | null;
  durationHours: number | null;
  lineCount: number;
  gpsStartLat: number | null;
  gpsStopLat: number | null;
  sourceFileName: string;
};

export type PlenionSupplierOrderRow = {
  id: string;
  customerOrderId: string;
  customerOrderRef: string | null;
  orderDate: string;
  deliverTo: string | null;
  city: string | null;
  lineCount: number;
  supplierItemIds: string[];
  sourceFileName: string;
};

export type PlenionReportData = {
  generatedAt: string;
  sourceRoot: string;
  sources: {
    invoiceXmlCount: number;
    mobileOrderXmlCount: number;
    supplierOrderXmlCount: number;
  };
  invoices: {
    count: number;
    netTotal: number;
    vatTotal: number;
    grossTotal: number;
    averageNet: number;
    customerCount: number;
    months: Array<{ month: string; netTotal: number }>;
    topCustomers: Array<{ name: string; netTotal: number }>;
    topNotes: Array<{ note: string; count: number }>;
    recent: PlenionInvoiceRow[];
  };
  workOrders: {
    count: number;
    completedCount: number;
    lineCount: number;
    averageDurationHours: number;
    resourceUsage: Array<{ resourceCode: string; count: number }>;
    months: Array<{ month: string; count: number }>;
    recent: PlenionWorkOrderRow[];
  };
  supplierOrders: {
    count: number;
    lineCount: number;
    months: Array<{ month: string; count: number }>;
    recent: PlenionSupplierOrderRow[];
  };
};

export type PlenionInvoiceDetail = {
  snapshot: PlenionSnapshotRecord;
  invoice: PlenionInvoiceRow & { note: string | null; raw: unknown };
};

export type PlenionWorkOrderDetail = {
  snapshot: PlenionSnapshotRecord;
  workOrder: PlenionWorkOrderRow & { raw: unknown };
};

export type PlenionSupplierOrderDetail = {
  snapshot: PlenionSnapshotRecord;
  supplierOrder: PlenionSupplierOrderRow & { raw: unknown };
};

function toNumber(value: unknown) {
  if (value == null) return 0;
  return Number(value);
}

function monthKey(value: Date) {
  return value.toISOString().slice(0, 7);
}

function normalizeDate(value: Date | null | undefined) {
  if (!value) return null;
  return value.toISOString();
}

function mapInvoice(row: {
  id: string;
  invoiceNumber: string;
  issueDate: Date;
  dueDate: Date | null;
  note: string | null;
  supplierName: string | null;
  customerName: string | null;
  netAmount: unknown;
  vatAmount: unknown;
  grossAmount: unknown;
  lineCount: number;
  sourceFileName: string;
}) {
  return {
    id: row.id,
    invoiceNumber: row.invoiceNumber,
    issueDate: row.issueDate.toISOString(),
    dueDate: normalizeDate(row.dueDate),
    note: row.note,
    supplierName: row.supplierName,
    customerName: row.customerName,
    netAmount: toNumber(row.netAmount),
    vatAmount: toNumber(row.vatAmount),
    grossAmount: toNumber(row.grossAmount),
    lineCount: row.lineCount,
    sourceFileName: row.sourceFileName
  };
}

function mapWorkOrder(row: {
  id: string;
  bonNumber: string;
  customerCode: string | null;
  workDate: Date;
  workTime: string | null;
  reference: string | null;
  workReady: boolean;
  firstArticleCode: string | null;
  quantity: unknown;
  resourceCode: string | null;
  startTime: string | null;
  endTime: string | null;
  durationHours: unknown;
  lineCount: number;
  gpsStartLat: unknown;
  gpsStopLat: unknown;
  sourceFileName: string;
}) {
  return {
    id: row.id,
    bonNumber: row.bonNumber,
    customerCode: row.customerCode,
    workDate: row.workDate.toISOString(),
    workTime: row.workTime,
    reference: row.reference,
    workReady: row.workReady,
    firstArticleCode: row.firstArticleCode,
    quantity: row.quantity == null ? null : toNumber(row.quantity),
    resourceCode: row.resourceCode,
    startTime: row.startTime,
    endTime: row.endTime,
    durationHours: row.durationHours == null ? null : toNumber(row.durationHours),
    lineCount: row.lineCount,
    gpsStartLat: row.gpsStartLat == null ? null : toNumber(row.gpsStartLat),
    gpsStopLat: row.gpsStopLat == null ? null : toNumber(row.gpsStopLat),
    sourceFileName: row.sourceFileName
  };
}

function mapSupplierOrder(row: {
  id: string;
  customerOrderId: string;
  customerOrderRef: string | null;
  orderDate: Date;
  deliverTo: string | null;
  city: string | null;
  lineCount: number;
  supplierItemIds: string[];
  sourceFileName: string;
}) {
  return {
    id: row.id,
    customerOrderId: row.customerOrderId,
    customerOrderRef: row.customerOrderRef,
    orderDate: row.orderDate.toISOString(),
    deliverTo: row.deliverTo,
    city: row.city,
    lineCount: row.lineCount,
    supplierItemIds: row.supplierItemIds,
    sourceFileName: row.sourceFileName
  };
}

function computeTopEntries<T extends { [key: string]: unknown }>(
  rows: T[],
  selector: (row: T) => string | null | undefined,
  numericSelector: (row: T) => number
) {
  const map = new Map<string, number>();
  for (const row of rows) {
    const key = selector(row);
    if (!key) continue;
    map.set(key, (map.get(key) ?? 0) + numericSelector(row));
  }

  return [...map.entries()]
    .map(([name, value]) => ({ name, netTotal: value }))
    .sort((a, b) => b.netTotal - a.netTotal);
}

export async function getLatestPlenionReportData(): Promise<PlenionReportData | null> {
  noStore();

  const snapshot = await prisma.plenionSnapshot.findFirst({
    orderBy: { generatedAt: "desc" }
  });

  if (!snapshot) {
    return null;
  }

  const [invoices, workOrders, supplierOrders] = await Promise.all([
    prisma.plenionInvoice.findMany({
      where: { snapshotId: snapshot.id },
      orderBy: { issueDate: "desc" }
    }),
    prisma.plenionWorkOrder.findMany({
      where: { snapshotId: snapshot.id },
      orderBy: { workDate: "desc" }
    }),
    prisma.plenionSupplierOrder.findMany({
      where: { snapshotId: snapshot.id },
      orderBy: { orderDate: "desc" }
    })
  ]);

  const invoiceRows = invoices.map(mapInvoice);
  const workOrderRows = workOrders.map(mapWorkOrder);
  const supplierOrderRows = supplierOrders.map(mapSupplierOrder);

  const invoiceNetTotal = invoiceRows.reduce((total, row) => total + row.netAmount, 0);
  const invoiceVatTotal = invoiceRows.reduce((total, row) => total + row.vatAmount, 0);
  const invoiceGrossTotal = invoiceRows.reduce((total, row) => total + row.grossAmount, 0);
  const averageNet = invoiceRows.length ? invoiceNetTotal / invoiceRows.length : 0;

  const invoiceMonths = new Map<string, number>();
  for (const invoice of invoiceRows) {
    const month = monthKey(new Date(invoice.issueDate));
    invoiceMonths.set(month, (invoiceMonths.get(month) ?? 0) + invoice.netAmount);
  }

  const workOrderMonths = new Map<string, number>();
  for (const workOrder of workOrderRows) {
    const month = monthKey(new Date(workOrder.workDate));
    workOrderMonths.set(month, (workOrderMonths.get(month) ?? 0) + 1);
  }

  const supplierOrderMonths = new Map<string, number>();
  for (const supplierOrder of supplierOrderRows) {
    const month = monthKey(new Date(supplierOrder.orderDate));
    supplierOrderMonths.set(month, (supplierOrderMonths.get(month) ?? 0) + 1);
  }

  const topCustomers = computeTopEntries(
    invoiceRows,
    (row) => row.customerName,
    (row) => row.netAmount
  ).slice(0, 5);

  const noteCounts = new Map<string, number>();
  for (const invoice of invoiceRows) {
    if (!invoice.note) continue;
    noteCounts.set(invoice.note, (noteCounts.get(invoice.note) ?? 0) + 1);
  }

  const resourceCounts = new Map<string, number>();
  for (const workOrder of workOrderRows) {
    if (!workOrder.resourceCode) continue;
    resourceCounts.set(workOrder.resourceCode, (resourceCounts.get(workOrder.resourceCode) ?? 0) + 1);
  }

  const customerNames = invoiceRows
    .map((row) => row.customerName)
    .filter((name): name is string => Boolean(name));

  return {
    generatedAt: snapshot.generatedAt.toISOString(),
    sourceRoot: snapshot.sourceRoot,
    sources: {
      invoiceXmlCount: snapshot.invoiceXmlCount,
      mobileOrderXmlCount: snapshot.workOrderXmlCount,
      supplierOrderXmlCount: snapshot.supplierOrderXmlCount
    },
    invoices: {
      count: invoiceRows.length,
      netTotal: invoiceNetTotal,
      vatTotal: invoiceVatTotal,
      grossTotal: invoiceGrossTotal,
      averageNet,
      customerCount: new Set(customerNames).size,
      months: [...invoiceMonths.entries()]
        .map(([month, netTotal]) => ({ month, netTotal }))
        .sort((a, b) => a.month.localeCompare(b.month)),
      topCustomers,
      topNotes: [...noteCounts.entries()]
        .map(([note, count]) => ({ note, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8),
      recent: invoiceRows.slice(0, 5)
    },
    workOrders: {
      count: workOrderRows.length,
      completedCount: workOrderRows.filter((row) => row.workReady).length,
      lineCount: workOrderRows.reduce((total, row) => total + row.lineCount, 0),
      averageDurationHours: workOrderRows.length
        ? workOrderRows.reduce((total, row) => total + (row.durationHours ?? 0), 0) / workOrderRows.length
        : 0,
      resourceUsage: [...resourceCounts.entries()]
        .map(([resourceCode, count]) => ({ resourceCode, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      months: [...workOrderMonths.entries()]
        .map(([month, count]) => ({ month, count }))
        .sort((a, b) => a.month.localeCompare(b.month)),
      recent: workOrderRows.slice(0, 5)
    },
    supplierOrders: {
      count: supplierOrderRows.length,
      lineCount: supplierOrderRows.reduce((total, row) => total + row.lineCount, 0),
      months: [...supplierOrderMonths.entries()]
        .map(([month, count]) => ({ month, count }))
        .sort((a, b) => a.month.localeCompare(b.month)),
      recent: supplierOrderRows.slice(0, 5)
    }
  };
}

export async function getPlenionInvoiceDetail(id: string): Promise<PlenionInvoiceDetail | null> {
  noStore();

  const invoice = await prisma.plenionInvoice.findUnique({
    where: { id },
    include: {
      snapshot: true
    }
  });

  if (!invoice) return null;

  return {
    snapshot: {
      id: invoice.snapshot.id,
      sourceRoot: invoice.snapshot.sourceRoot,
      generatedAt: invoice.snapshot.generatedAt,
      invoiceXmlCount: invoice.snapshot.invoiceXmlCount,
      workOrderXmlCount: invoice.snapshot.workOrderXmlCount,
      supplierOrderXmlCount: invoice.snapshot.supplierOrderXmlCount,
      notes: invoice.snapshot.notes
    },
    invoice: {
      ...mapInvoice(invoice),
      note: invoice.note,
      raw: invoice.raw
    }
  };
}

export async function getPlenionWorkOrderDetail(id: string): Promise<PlenionWorkOrderDetail | null> {
  noStore();

  const workOrder = await prisma.plenionWorkOrder.findUnique({
    where: { id },
    include: {
      snapshot: true
    }
  });

  if (!workOrder) return null;

  return {
    snapshot: {
      id: workOrder.snapshot.id,
      sourceRoot: workOrder.snapshot.sourceRoot,
      generatedAt: workOrder.snapshot.generatedAt,
      invoiceXmlCount: workOrder.snapshot.invoiceXmlCount,
      workOrderXmlCount: workOrder.snapshot.workOrderXmlCount,
      supplierOrderXmlCount: workOrder.snapshot.supplierOrderXmlCount,
      notes: workOrder.snapshot.notes
    },
    workOrder: {
      ...mapWorkOrder(workOrder),
      raw: workOrder.raw
    }
  };
}

export async function getPlenionSupplierOrderDetail(id: string): Promise<PlenionSupplierOrderDetail | null> {
  noStore();

  const supplierOrder = await prisma.plenionSupplierOrder.findUnique({
    where: { id },
    include: {
      snapshot: true
    }
  });

  if (!supplierOrder) return null;

  return {
    snapshot: {
      id: supplierOrder.snapshot.id,
      sourceRoot: supplierOrder.snapshot.sourceRoot,
      generatedAt: supplierOrder.snapshot.generatedAt,
      invoiceXmlCount: supplierOrder.snapshot.invoiceXmlCount,
      workOrderXmlCount: supplierOrder.snapshot.workOrderXmlCount,
      supplierOrderXmlCount: supplierOrder.snapshot.supplierOrderXmlCount,
      notes: supplierOrder.snapshot.notes
    },
    supplierOrder: {
      ...mapSupplierOrder(supplierOrder),
      raw: supplierOrder.raw
    }
  };
}
