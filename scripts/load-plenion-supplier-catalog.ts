import { readFile } from "node:fs/promises";

import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const dataPath =
  "C:/Users/RemkoVanderVeken/OneDrive - Q-home/Documents/New project/src/data/plenion-supplier-catalog.json";

function toDecimal(value: string | number | null | undefined) {
  if (value == null || value === "") return null;
  return new Prisma.Decimal(value);
}

async function main() {
  const raw = JSON.parse(await readFile(dataPath, "utf8"));

  await prisma.$transaction(async (tx) => {
    await tx.plenionSupplierCatalogItem.deleteMany();
    await tx.plenionSupplierCatalogSnapshot.deleteMany();

    const snapshot = await tx.plenionSupplierCatalogSnapshot.create({
      data: {
        sourceRoot: raw.sourceRoot,
        generatedAt: new Date(raw.generatedAt),
        workbookCount: raw.workbookCount ?? 0,
        supplierCount: raw.supplierCount ?? 0,
        itemCount: raw.itemCount ?? 0,
        notes: raw.notes ?? null
      }
    });

    if (Array.isArray(raw.items) && raw.items.length > 0) {
      const batchSize = 500;
      for (let index = 0; index < raw.items.length; index += batchSize) {
        const batch = raw.items.slice(index, index + batchSize);
        await tx.plenionSupplierCatalogItem.createMany({
          data: batch.map((item: any) => ({
            snapshotId: snapshot.id,
            supplierName: item.supplierName,
            sourceFileName: item.sourceFileName,
            sourceSheetName: item.sourceSheetName,
            sourceRow: item.sourceRow,
            itemCode: item.itemCode,
            itemNameNl: item.itemNameNl ?? null,
            itemNameFr: item.itemNameFr ?? null,
            series: item.series ?? null,
            type: item.type ?? null,
            branch: item.branch ?? null,
            listPrice: toDecimal(item.listPrice) ?? new Prisma.Decimal(0),
            netPrice: toDecimal(item.netPrice) ?? new Prisma.Decimal(0),
            discountRate: toDecimal(item.discountRate),
            modelRange: item.modelRange ?? null,
            currency: item.currency ?? "EUR",
            priceSource: item.priceSource,
            raw: item.raw ?? null
          }))
        });
      }
    }
  });

  console.log("Plenion supplier catalog imported");
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
