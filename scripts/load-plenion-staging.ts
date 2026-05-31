import { readFile } from "node:fs/promises";

import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const dataPath =
  "C:/Users/RemkoVanderVeken/OneDrive - Q-home/Documents/New project/src/data/plenion-report-data.json";

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseCompactDate(value: string | null | undefined) {
  if (!value || !/^\d{8}$/.test(value)) return parseDate(value);
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6)) - 1;
  const day = Number(value.slice(6, 8));
  return new Date(year, month, day);
}

function toDecimal(value: number | string | null | undefined) {
  if (value == null) return null;
  return new Prisma.Decimal(value);
}

async function main() {
  const raw = JSON.parse(await readFile(dataPath, "utf8"));

  await prisma.$transaction(async (tx) => {
    await tx.plenionSupplierOrder.deleteMany();
    await tx.plenionWorkOrder.deleteMany();
    await tx.plenionInvoice.deleteMany();
    await tx.plenionSnapshot.deleteMany();

    const snapshot = await tx.plenionSnapshot.create({
      data: {
        sourceRoot: raw.sourceRoot,
        generatedAt: parseDate(raw.generatedAt) ?? new Date(),
        invoiceXmlCount: raw.sources.invoiceXmlCount,
        workOrderXmlCount: raw.sources.mobileOrderXmlCount,
        supplierOrderXmlCount: raw.sources.supplierOrderXmlCount,
        notes: "Imported from extracted Plenion XML snapshot"
      }
    });

    const completeInvoices = raw.invoices.all ?? raw.invoices.recent ?? [];
    if (completeInvoices.length > 0) {
      const completeInvoiceRows = completeInvoices.map((invoice: any) => ({
        snapshotId: snapshot.id,
        sourceFileName: invoice.fileName,
        invoiceNumber: invoice.id,
        issueDate: parseDate(invoice.issueDate) ?? new Date(),
        dueDate: parseDate(invoice.dueDate),
        note: invoice.note ?? null,
        supplierName: invoice.supplierName ?? null,
        customerName: invoice.customerName ?? null,
        netAmount: toDecimal(invoice.netAmount) ?? new Prisma.Decimal(0),
        vatAmount: toDecimal(invoice.vatAmount) ?? new Prisma.Decimal(0),
        grossAmount: toDecimal(invoice.grossAmount) ?? new Prisma.Decimal(0),
        lineCount: invoice.lineCount ?? 0,
        raw: invoice
      }));

      if (completeInvoiceRows.length > 0) {
        await tx.plenionInvoice.createMany({ data: completeInvoiceRows });
      }
    }

    const workOrdersSource = raw.workOrders.all ?? raw.workOrders.recent ?? [];
    if (workOrdersSource.length > 0) {
      await tx.plenionWorkOrder.createMany({
        data: workOrdersSource.map((order: any) => ({
          snapshotId: snapshot.id,
          sourceFileName: order.fileName,
          bonNumber: String(order.bonNumber ?? ""),
          customerCode: order.customerCode ?? null,
          workDate: parseCompactDate(order.date) ?? new Date(),
          workTime: order.time ?? null,
          reference: order.reference ?? null,
          workReady: Boolean(order.workReady),
          firstArticleCode: order.firstArticleCode ?? null,
          quantity: toDecimal(order.quantity),
          resourceCode: order.resourceCode ?? null,
          startTime: order.startTime ?? null,
          endTime: order.endTime ?? null,
          durationHours: toDecimal(order.durationHours),
          lineCount: order.lineCount ?? 0,
          gpsStartLat: toDecimal(order.gpsStartLat),
          gpsStopLat: toDecimal(order.gpsStopLat),
          raw: order
        }))
      });
    }

    const supplierOrdersSource = raw.supplierOrders.all ?? raw.supplierOrders.recent ?? [];
    if (supplierOrdersSource.length > 0) {
      await tx.plenionSupplierOrder.createMany({
        data: supplierOrdersSource.map((order: any) => ({
          snapshotId: snapshot.id,
          sourceFileName: order.fileName,
          customerOrderId: String(order.customerOrderId ?? ""),
          customerOrderRef: order.customerOrderRef ?? null,
          orderDate: parseDate(order.orderDate) ?? new Date(),
          deliverTo: order.deliverTo ?? null,
          city: order.city ?? null,
          lineCount: order.lineCount ?? 0,
          supplierItemIds: order.supplierItemIds ?? [],
          raw: order
        }))
      });
    }
  });

  console.log("Plenion staging data imported");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
