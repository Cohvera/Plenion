import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeDollarSign } from "lucide-react";

import { getPlenionSupplierCatalogItemDetail } from "@/lib/plenion-supplier-catalog";

const euro = new Intl.NumberFormat("nl-BE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

function formatDate(value: string | Date | null | undefined) {
  if (!value) return "No date";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(parsed);
}

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

export default async function CatalogItemPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getPlenionSupplierCatalogItemDetail(id);

  if (!detail) {
    notFound();
  }

  const discountText = detail.item.discountRate == null ? "n/a" : `${(detail.item.discountRate * 100).toFixed(1)}%`;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="field-label">Supplier catalog item</p>
          <h2 className="text-2xl font-bold text-ink">{detail.item.itemCode}</h2>
          <p className="mt-2 text-sm text-steel">{detail.item.supplierName}</p>
        </div>
        <Link href="/catalog" className="button-secondary">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to catalog
        </Link>
      </div>

      <section className="panel p-5">
        <div className="flex items-center gap-2 text-steel">
          <BadgeDollarSign className="h-5 w-5" aria-hidden="true" />
          <p className="field-label">Price summary</p>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoCard label="Brut/list price" value={formatPrice(detail.item.listPrice)} />
          <InfoCard label="Net price" value={formatPrice(detail.item.netPrice)} />
          <InfoCard label="Discount" value={discountText} />
          <InfoCard label="Currency" value={detail.item.currency} />
          <InfoCard label="Series" value={detail.item.series ?? "No series"} />
          <InfoCard label="Type" value={detail.item.type ?? "No type"} />
          <InfoCard label="Model range" value={detail.item.modelRange ?? "No model range"} />
          <InfoCard label="Source row" value={`${detail.item.sourceFileName} / row ${detail.item.sourceRow}`} />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <div className="panel p-5">
          <h3 className="text-lg font-bold text-ink">Descriptions</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <InfoCard label="Dutch" value={detail.item.itemNameNl ?? "No Dutch description"} />
            <InfoCard label="French" value={detail.item.itemNameFr ?? "No French description"} />
            <InfoCard label="Branch" value={detail.item.branch ?? "No branch"} />
            <InfoCard label="Price source" value={detail.item.priceSource} />
            <InfoCard label="Snapshot date" value={formatDate(detail.snapshot.generatedAt)} />
            <InfoCard label="Snapshot notes" value={detail.snapshot.notes ?? "No snapshot notes"} />
          </div>
        </div>

        <div className="panel p-5">
          <h3 className="text-lg font-bold text-ink">Raw payload</h3>
          <p className="mt-1 text-sm text-steel">
            This is the original local backup row, kept alongside the normalized catalog item.
          </p>
          <pre className="mt-4 overflow-x-auto rounded-xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">
            {JSON.stringify(detail.item.raw, null, 2)}
          </pre>
        </div>
      </section>

      <section className="panel p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="field-label">Related items</p>
            <h3 className="text-lg font-bold text-ink">More items from {detail.item.supplierName}</h3>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {detail.relatedItems.length === 0 ? (
            <p className="text-sm text-steel">No related items found in the current snapshot.</p>
          ) : (
            detail.relatedItems.map((item) => (
              <Link
                key={item.id}
                href={`/catalog/items/${item.id}`}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4 hover:bg-slate-100"
              >
                <p className="text-sm font-semibold text-ink">{item.itemCode}</p>
                <p className="mt-1 text-xs text-steel">{item.itemNameNl ?? item.itemNameFr ?? "No description"}</p>
                <p className="mt-2 text-sm font-semibold text-ink">{formatPrice(item.listPrice)}</p>
              </Link>
            ))
          )}
        </div>
      </section>

      <section className="panel p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="field-label">Price evidence</p>
            <h3 className="text-lg font-bold text-ink">Local source rows for this supplier or item</h3>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {detail.relatedEvidence.length === 0 ? (
            <p className="text-sm text-steel">No evidence rows found for this item yet.</p>
          ) : (
            detail.relatedEvidence.map((entry) => (
              <div key={entry.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-ink">{entry.itemName ?? entry.itemCode ?? "No item name"}</p>
                <p className="mt-1 text-xs text-steel">{entry.sourceFileName}</p>
                <p className="mt-2 text-sm font-semibold text-ink">
                  Brut {formatPrice(entry.brutPrice ?? 0)} / Net {formatPrice(entry.netPrice ?? 0)}
                </p>
                <p className="mt-1 text-xs text-steel">
                  {entry.documentReference ?? entry.documentId ?? "No reference"}
                  {entry.documentDate ? ` - ${entry.documentDate}` : ""}
                </p>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
