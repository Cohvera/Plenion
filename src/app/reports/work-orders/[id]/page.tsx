import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Wrench } from "lucide-react";

import { getPlenionWorkOrderDetail } from "@/lib/plenion-reporting";

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

export default async function WorkOrderDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getPlenionWorkOrderDetail(id);

  if (!detail) {
    notFound();
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="field-label">Plenion work order</p>
          <h2 className="text-2xl font-bold text-ink">Bon {detail.workOrder.bonNumber}</h2>
          <p className="mt-2 text-sm text-steel">
            {detail.workOrder.customerCode ?? "Unknown customer"} - {detail.workOrder.resourceCode ?? "Unknown resource"}
          </p>
        </div>
        <Link href="/reports" className="button-secondary">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to reports
        </Link>
      </div>

      <section className="panel p-5">
        <div className="flex items-center gap-2 text-steel">
          <Wrench className="h-5 w-5" aria-hidden="true" />
          <p className="field-label">Work-order summary</p>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoCard label="Work date" value={formatDate(detail.workOrder.workDate)} />
          <InfoCard label="Work time" value={detail.workOrder.workTime ?? "No time"} />
          <InfoCard label="Duration" value={detail.workOrder.durationHours == null ? "N/A" : `${detail.workOrder.durationHours.toFixed(2)} h`} />
          <InfoCard label="Lines" value={String(detail.workOrder.lineCount)} />
          <InfoCard label="First article" value={detail.workOrder.firstArticleCode ?? "N/A"} />
          <InfoCard label="Quantity" value={detail.workOrder.quantity == null ? "N/A" : String(detail.workOrder.quantity)} />
          <InfoCard label="Start / end" value={`${detail.workOrder.startTime ?? "?"} - ${detail.workOrder.endTime ?? "?"}`} />
          <InfoCard label="Work ready" value={detail.workOrder.workReady ? "Yes" : "No"} />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <div className="panel p-5">
          <h3 className="text-lg font-bold text-ink">Imported fields</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <InfoCard label="Reference" value={detail.workOrder.reference ?? "No reference"} />
            <InfoCard label="Source file" value={detail.workOrder.sourceFileName} />
            <InfoCard label="GPS start lat" value={detail.workOrder.gpsStartLat == null ? "N/A" : String(detail.workOrder.gpsStartLat)} />
            <InfoCard label="GPS stop lat" value={detail.workOrder.gpsStopLat == null ? "N/A" : String(detail.workOrder.gpsStopLat)} />
            <InfoCard label="Snapshot time" value={formatDate(detail.snapshot.generatedAt)} />
            <InfoCard label="Source root" value={detail.snapshot.sourceRoot} />
            <InfoCard
              label="Staging counts"
              value={`${detail.snapshot.invoiceXmlCount} invoices, ${detail.snapshot.workOrderXmlCount} work orders, ${detail.snapshot.supplierOrderXmlCount} supplier files`}
            />
            <InfoCard label="Resource" value={detail.workOrder.resourceCode ?? "Unknown"} />
          </div>
        </div>

        <div className="panel p-5">
          <h3 className="text-lg font-bold text-ink">Raw payload</h3>
          <p className="mt-1 text-sm text-steel">
            The full imported work-order record is stored alongside the normalized row.
          </p>
          <pre className="mt-4 overflow-x-auto rounded-xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">
            {JSON.stringify(detail.workOrder.raw, null, 2)}
          </pre>
        </div>
      </section>
    </div>
  );
}
