import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Search, ShoppingCart, Sparkles } from "lucide-react";

import { getLatestPlenionSupplierCatalogData } from "@/lib/plenion-supplier-catalog";

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

function formatPercent(value: number | null) {
  if (value == null) return "n/a";
  return `${new Intl.NumberFormat("nl-BE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value * 100)}%`;
}

export default async function CatalogPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; supplier?: string }>;
}) {
  const resolved = await searchParams;
  const data = await getLatestPlenionSupplierCatalogData({
    q: resolved.q,
    supplier: resolved.supplier
  });

  if (!data) {
    return (
      <div className="panel p-6">
        <p className="field-label">Plenion supplier catalog</p>
        <h2 className="mt-2 text-2xl font-bold text-ink">No supplier catalog snapshot found</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-steel">
          Run the supplier catalog extraction and staging import first so we can search the price lists.
        </p>
      </div>
    );
  }

  const supplierNames = data.suppliers.map((supplier) => supplier.supplierName);
  const totalFiltered = data.priceCatalog.length;
  const pricedCatalog = data.priceCatalog.filter((item) => (item.netPrice ?? 0) > 0);
  const minCatalogPrice =
    pricedCatalog.length > 0 ? Math.min(...pricedCatalog.map((item) => item.netPrice ?? 0)) : 0;
  const maxCatalogPrice =
    pricedCatalog.length > 0 ? Math.max(...pricedCatalog.map((item) => item.netPrice ?? 0)) : 0;

  return (
    <div className="space-y-6">
      <section className="panel relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(60,179,113,0.3),_transparent_30%),radial-gradient(circle_at_20%_20%,_rgba(59,130,246,0.22),_transparent_28%),linear-gradient(135deg,_rgba(15,23,42,0.96),_rgba(15,23,42,0.86))]" />
        <div className="relative grid gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr] lg:p-8">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Supplier catalog
            </div>
            <div className="space-y-3">
              <h2 className="max-w-3xl text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                Search supplier prices, brut prices, and net prices from the Plenion backup.
              </h2>
              <p className="max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
                This view is grounded in the local HFSQL backup only. It combines supplier master data,
                article records, and local price evidence so you can search models, supplier item codes,
                and prices directly from one place, without calling any external services.
              </p>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                Snapshot {formatDate(data.snapshot.generatedAt)} from {data.snapshot.sourceRoot}
              </p>
            </div>
            <form className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 sm:grid-cols-[1fr_220px_auto]">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                  Search
                </span>
                <input
                  name="q"
                  defaultValue={data.query.q}
                  placeholder="Model, description, supplier item code..."
                  className="h-11 w-full rounded-md border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none ring-0 placeholder:text-slate-500 focus:border-emerald-400"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                  Supplier
                </span>
                <select
                  name="supplier"
                  defaultValue={data.query.supplier || ""}
                  className="h-11 w-full rounded-md border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none focus:border-emerald-400"
                >
                  <option value="">All suppliers</option>
                  {supplierNames.map((supplierName) => (
                    <option key={supplierName} value={supplierName}>
                      {supplierName}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-emerald-400 px-4 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
                >
                  <Search className="h-4 w-4" aria-hidden="true" />
                  Search
                </button>
              </div>
            </form>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <MetricCard label="Suppliers" value={String(data.summary.supplierCount)} detail="Distinct supplier names found" />
            <MetricCard label="Item hints" value={String(data.summary.itemCount)} detail={`${data.items.length} raw rows visible in current filter`} />
            <MetricCard label="Price rows" value={String(data.priceCatalog.length)} detail="Grouped local price evidence" />
            <MetricCard label="Price range" value={`${formatPrice(minCatalogPrice)} - ${formatPrice(maxCatalogPrice)}`} detail="Net unit prices in the visible set" />
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="panel overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4">
            <p className="field-label">Suppliers</p>
            <h3 className="text-xl font-bold text-ink">Current backup coverage</h3>
          </div>
          <div className="space-y-3 p-5">
            {data.suppliers.map((supplier) => (
              <Link
                key={supplier.supplierName}
                href={`/catalog/suppliers/${encodeURIComponent(supplier.supplierName)}`}
                className="block rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-sky-300 hover:bg-sky-50"
              >
                <p className="font-semibold text-ink">{supplier.supplierName}</p>
                <p className="mt-1 text-sm text-steel">{supplier.itemCount} catalog items</p>
                <p className="mt-1 text-sm text-steel">{supplier.priceCatalogCount} priced rows</p>
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-steel">
                  Price {formatPrice(supplier.minCatalogPrice)} - {formatPrice(supplier.maxCatalogPrice)}
                </p>
              </Link>
            ))}
          </div>
        </div>

        <div className="panel overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <p className="field-label">Price catalog</p>
              <h3 className="text-xl font-bold text-ink">
                {totalFiltered} item{totalFiltered === 1 ? "" : "s"} match your search
              </h3>
            </div>
            <ShoppingCart className="h-5 w-5 text-steel" aria-hidden="true" />
          </div>

          {data.priceCatalog.length === 0 ? (
            <div className="p-5 text-sm text-steel">No grouped price rows matched the current search.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <Th>Supplier</Th>
                    <Th>Item / reference</Th>
                    <Th>Brut</Th>
                    <Th>Net</Th>
                    <Th>Evidence</Th>
                    <Th>Source</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {data.priceCatalog.map((item) => (
                    <tr key={item.id} className="align-top hover:bg-slate-50">
                      <Td>
                        <Link
                          href={`/catalog/suppliers/${encodeURIComponent(item.supplierName)}`}
                          className="font-semibold text-sky-800 hover:underline"
                        >
                          {item.supplierName}
                        </Link>
                      </Td>
                      <Td>
                        <p className="text-sm font-semibold text-ink">{item.itemName ?? item.itemCode ?? "No item"}</p>
                        <p className="mt-1 text-xs text-steel">{item.itemCode ?? "No code"}</p>
                        <p className="mt-1 text-xs text-steel">
                          {item.documentReference ?? "No reference"}
                          {item.documentDate ? ` - ${item.documentDate}` : ""}
                        </p>
                      </Td>
                      <Td className="font-semibold text-ink">{formatPrice(item.brutPrice ?? 0)}</Td>
                      <Td className="font-semibold text-ink">{formatPrice(item.netPrice ?? 0)}</Td>
                      <Td>{item.evidenceCount} rows</Td>
                      <Td>
                        <p className="text-sm text-ink">{item.sourceFileName}</p>
                        <p className="mt-1 text-xs text-steel">{item.priceSource}</p>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <p className="field-label">Raw item hints</p>
            <h3 className="text-xl font-bold text-ink">{data.items.length} backup rows</h3>
          </div>
          <Sparkles className="h-5 w-5 text-steel" aria-hidden="true" />
        </div>
        {data.items.length === 0 ? (
          <div className="p-5 text-sm text-steel">No raw item hints matched the current search.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <Th>Supplier</Th>
                  <Th>Model</Th>
                  <Th>Description</Th>
                  <Th>Brut</Th>
                  <Th>Net</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {data.items.slice(0, 20).map((item) => (
                  <tr key={item.id} className="align-top hover:bg-slate-50">
                    <Td>
                      <Link href={`/catalog/items/${item.id}`} className="font-semibold text-sky-800 hover:underline">
                        {item.supplierName}
                      </Link>
                    </Td>
                    <Td>
                      <p className="font-semibold text-ink">{item.itemCode}</p>
                      <p className="mt-1 text-xs text-steel">
                        {item.series ?? "No series"} / {item.type ?? "No type"}
                      </p>
                    </Td>
                    <Td>
                      <p className="text-sm text-ink">{item.itemNameNl ?? item.itemNameFr ?? "No description"}</p>
                    </Td>
                    <Td className="font-semibold text-ink">{formatPrice(item.listPrice)}</Td>
                      <Td className="font-semibold text-ink">{formatPrice(item.netPrice ?? 0)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <p className="field-label">Price evidence</p>
            <h3 className="text-xl font-bold text-ink">{data.priceEvidence.length} local price lines</h3>
          </div>
          <Sparkles className="h-5 w-5 text-steel" aria-hidden="true" />
        </div>
        {data.priceEvidence.length === 0 ? (
          <div className="p-5 text-sm text-steel">No price evidence matched the current search.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <Th>Supplier</Th>
                  <Th>Item / reference</Th>
                  <Th>Brut</Th>
                  <Th>Net</Th>
                  <Th>Qty</Th>
                  <Th>Source</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {data.priceEvidence.map((entry) => (
                  <tr key={entry.id} className="align-top hover:bg-slate-50">
                    <Td>
                      <Link
                        href={`/catalog/suppliers/${encodeURIComponent(entry.supplierName)}`}
                        className="font-semibold text-sky-800 hover:underline"
                      >
                        {entry.supplierName}
                      </Link>
                    </Td>
                    <Td>
                      <p className="text-sm font-semibold text-ink">
                        {entry.itemName ?? entry.itemCode ?? "No item name"}
                      </p>
                      <p className="mt-1 text-xs text-steel">
                        {entry.itemCode ?? "No code"}
                        {entry.documentReference ? ` - ${entry.documentReference}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-steel">
                        {entry.documentId ?? "No document"}
                        {entry.documentDate ? ` - ${entry.documentDate}` : ""}
                      </p>
                    </Td>
                    <Td className="font-semibold text-ink">{formatPrice(entry.brutPrice ?? 0)}</Td>
                    <Td className="font-semibold text-ink">{formatPrice(entry.netPrice ?? 0)}</Td>
                    <Td>
                      {entry.quantity == null
                        ? "n/a"
                        : new Intl.NumberFormat("nl-BE", { maximumFractionDigits: 3 }).format(entry.quantity)}
                    </Td>
                    <Td>
                      <p className="text-sm text-ink">{entry.sourceFileName}</p>
                      <p className="mt-1 text-xs text-steel">{entry.priceSource}</p>
                      <p className="mt-1 text-xs text-steel">{entry.sourceType}</p>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel p-5">
        <div className="flex items-center gap-2">
          <ArrowRight className="h-4 w-4 text-steel" aria-hidden="true" />
          <p className="field-label">How to use it</p>
        </div>
        <p className="mt-2 text-sm leading-6 text-steel">
          Search a model code or description, then open any row for a full item view with the raw local
          source record. That gives us a base for answering questions from the backup data only or for
          adding a proper local price import later.
        </p>
      </section>
    </div>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-sm text-slate-300">{detail}</p>
    </div>
  );
}

function Th({ children }: { children: ReactNode }) {
  return <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-steel">{children}</th>;
}

function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={`px-4 py-4 text-sm ${className ?? "text-steel"}`}>{children}</td>;
}
