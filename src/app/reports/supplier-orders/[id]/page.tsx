import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Truck } from "lucide-react";

import { getPlenionSupplierOrderDetail } from "@/lib/plenion-reporting";

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

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">{label}</p>
      <p className="mt-2 text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

export default async function SupplierOrderDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getPlenionSupplierOrderDetail(id);

  if (!detail) {
    notFound();
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="field-label">Plenion supplier posting</p>
          <h2 className="text-2xl font-bold text-ink">Order {detail.supplierOrder.customerOrderId}</h2>
          <p className="mt-2 text-sm text-steel">{detail.supplierOrder.customerOrderRef ?? "No reference"}</p>
        </div>
        <Link href="/reports" className="button-secondary">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to reports
        </Link>
      </div>

      <section className="panel p-5">
        <div className="flex items-center gap-2 text-steel">
          <Truck className="h-5 w-5" aria-hidden="true" />
          <p className="field-label">Supplier-order summary</p>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoCard label="Order date" value={formatDate(detail.supplierOrder.orderDate)} />
          <InfoCard label="Deliver to" value={detail.supplierOrder.deliverTo ?? "Unknown"} />
          <InfoCard label="City" value={detail.supplierOrder.city ?? "Unknown"} />
          <InfoCard label="Line count" value={String(detail.supplierOrder.lineCount)} />
          <InfoCard label="Source file" value={detail.supplierOrder.sourceFileName} />
          <InfoCard label="Item IDs" value={String(detail.supplierOrder.supplierItemIds.length)} />
          <InfoCard label="Snapshot time" value={formatDate(detail.snapshot.generatedAt)} />
          <InfoCard label="Source root" value={detail.snapshot.sourceRoot} />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <div className="panel p-5">
          <h3 className="text-lg font-bold text-ink">Imported fields</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <InfoCard
              label="Supplier item IDs"
              value={detail.supplierOrder.supplierItemIds.length > 0 ? detail.supplierOrder.supplierItemIds.join(", ") : "None"}
            />
            <InfoCard label="Snapshot notes" value={detail.snapshot.notes ?? "No snapshot notes"} />
            <InfoCard
              label="Staging counts"
              value={`${detail.snapshot.invoiceXmlCount} invoices, ${detail.snapshot.workOrderXmlCount} work orders, ${detail.snapshot.supplierOrderXmlCount} supplier files`}
            />
            <InfoCard label="Ship-to snapshot" value={detail.supplierOrder.deliverTo ?? "Unknown"} />
          </div>
        </div>

        <div className="panel p-5">
          <h3 className="text-lg font-bold text-ink">Raw payload</h3>
          <p className="mt-1 text-sm text-steel">
            The full imported supplier-order record is stored alongside the normalized row.
          </p>
          <pre className="mt-4 overflow-x-auto rounded-xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">
            {JSON.stringify(detail.supplierOrder.raw, null, 2)}
          </pre>
        </div>
      </section>
    </div>
  );
}
