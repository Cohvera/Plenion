import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeDollarSign } from "lucide-react";

import { getLatestPlenionSupplierCatalogData } from "@/lib/plenion-supplier-catalog";

const euro = new Intl.NumberFormat("nl-BE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

function formatPrice(value: number) {
  if (value <= 0) return "n/a";
  return euro.format(value);
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">{label}</p>
      <p className="mt-2 text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

export default async function SupplierCatalogPage({
  params
}: {
  params: Promise<{ supplier: string }>;
}) {
  const { supplier } = await params;
  const decodedSupplier = decodeURIComponent(supplier);
  const data = await getLatestPlenionSupplierCatalogData({ supplier: decodedSupplier });

  if (!data) {
    notFound();
  }

  const supplierRow = data.suppliers.find((entry) => entry.supplierName === decodedSupplier);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="field-label">Supplier detail</p>
          <h2 className="text-2xl font-bold text-ink">{decodedSupplier}</h2>
          <p className="mt-2 text-sm text-steel">
            Local backup view for supplier items and price evidence only.
          </p>
        </div>
        <Link href="/catalog" className="button-secondary">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to catalog
        </Link>
      </div>

      <section className="panel p-5">
        <div className="flex items-center gap-2 text-steel">
          <BadgeDollarSign className="h-5 w-5" aria-hidden="true" />
          <p className="field-label">Supplier summary</p>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoCard label="Catalog items" value={String(supplierRow?.itemCount ?? data.items.length)} />
          <InfoCard label="Price evidence" value={String(supplierRow?.evidenceCount ?? data.priceEvidence.length)} />
          <InfoCard
            label="Evidence prices"
            value={`${formatPrice(supplierRow?.minEvidencePrice ?? 0)} - ${formatPrice(supplierRow?.maxEvidencePrice ?? 0)}`}
          />
          <InfoCard label="Invoice / order lines" value={`${data.priceEvidence.length} rows`} />
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4">
          <p className="field-label">Items</p>
          <h3 className="text-lg font-bold text-ink">{data.items.length} matching catalog items</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <Th>Model</Th>
                <Th>Description</Th>
                <Th>Brut</Th>
                <Th>Net</Th>
                <Th>Source</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {data.items.map((item) => (
                <tr key={item.id} className="align-top hover:bg-slate-50">
                  <Td>
                    <Link href={`/catalog/items/${item.id}`} className="font-semibold text-ink hover:underline">
                      {item.itemCode}
                    </Link>
                  </Td>
                  <Td>
                    <p className="text-sm text-ink">{item.itemNameNl ?? item.itemNameFr ?? "No description"}</p>
                    <p className="mt-1 text-xs text-steel">
                      {item.series ?? "No series"} / {item.type ?? "No type"}
                    </p>
                  </Td>
                  <Td className="font-semibold text-ink">{formatPrice(item.listPrice)}</Td>
                  <Td className="font-semibold text-ink">{formatPrice(item.netPrice)}</Td>
                  <Td>
                    <p className="text-sm text-ink">{item.sourceFileName}</p>
                    <p className="mt-1 text-xs text-steel">{item.priceSource}</p>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4">
          <p className="field-label">Price evidence</p>
          <h3 className="text-lg font-bold text-ink">{data.priceEvidence.length} source rows</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <Th>Item</Th>
                <Th>Brut</Th>
                <Th>Net</Th>
                <Th>Reference</Th>
                <Th>Source</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {data.priceEvidence.map((entry) => (
                <tr key={entry.id} className="align-top hover:bg-slate-50">
                  <Td>
                    <p className="text-sm font-semibold text-ink">{entry.itemName ?? entry.itemCode ?? "No item name"}</p>
                    <p className="mt-1 text-xs text-steel">{entry.itemCode ?? "No code"}</p>
                  </Td>
                  <Td className="font-semibold text-ink">{formatPrice(entry.brutPrice ?? 0)}</Td>
                  <Td className="font-semibold text-ink">{formatPrice(entry.netPrice ?? 0)}</Td>
                  <Td>
                    <p className="text-sm text-ink">{entry.documentReference ?? entry.documentId ?? "No reference"}</p>
                    <p className="mt-1 text-xs text-steel">{entry.documentDate ?? "No date"}</p>
                  </Td>
                  <Td>
                    <p className="text-sm text-ink">{entry.sourceFileName}</p>
                    <p className="mt-1 text-xs text-steel">{entry.priceSource}</p>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Th({ children }: { children: ReactNode }) {
  return <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-steel">{children}</th>;
}

function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={`px-4 py-4 text-sm ${className ?? "text-steel"}`}>{children}</td>;
}
