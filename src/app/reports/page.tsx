import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Database,
  FileSpreadsheet,
  Layers3,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Truck,
  Wrench
} from "lucide-react";
import type { ReactNode } from "react";

import { getLatestPlenionReportData } from "@/lib/plenion-reporting";

const euro = new Intl.NumberFormat("nl-BE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

function formatIsoDate(date: string | Date | undefined | null) {
  if (!date) return "No date";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return String(date);
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(parsed);
}

function formatCompactDate(value: string | Date | undefined | null) {
  if (!value) return "No date";
  if (typeof value === "string" && /^\d{8}$/.test(value)) {
    const parsed = new Date(
      Number(value.slice(0, 4)),
      Number(value.slice(4, 6)) - 1,
      Number(value.slice(6, 8))
    );
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }).format(parsed);
  }

  return formatIsoDate(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-GB").format(value);
}

function maxValue(values: number[]) {
  return Math.max(1, ...values);
}

export default async function ReportsPage() {
  const data = await getLatestPlenionReportData();

  if (!data) {
    return (
      <div className="panel p-6">
        <p className="field-label">Plenion reporting cockpit</p>
        <h2 className="mt-2 text-2xl font-bold text-ink">No staging snapshot found</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-steel">
          The PostgreSQL staging schema is ready, but no Plenion snapshot has
          been loaded yet. Run the staging import after setting
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">DATABASE_URL</code>
          to populate the report tables.
        </p>
      </div>
    );
  }

  const invoiceTrend = data.invoices.months.slice(-6);
  const maxInvoiceTrend = maxValue(invoiceTrend.map((item) => item.netTotal));
  const topCustomers = data.invoices.topCustomers;
  const topNotes = data.invoices.topNotes;
  const recentInvoices = data.invoices.recent;
  const recentWorkOrders = data.workOrders.recent;
  const recentSupplierOrders = data.supplierOrders.recent;
  const reportCards = [
    {
      name: "Finance dashboard",
      status: "Live from UBL invoices",
      output: `${formatNumber(data.invoices.count)} invoices, ${euro.format(data.invoices.netTotal)} net`,
      tables: `${data.sources.invoiceXmlCount} invoice XML files`
    },
    {
      name: "Operations dashboard",
      status: "Live from tablet orders",
      output: `${formatNumber(data.workOrders.count)} work orders, ${formatNumber(data.workOrders.completedCount)} marked complete`,
      tables: `${data.sources.mobileOrderXmlCount} PlenionMobile XML files`
    },
    {
      name: "Procurement dashboard",
      status: "Live from supplier order XML",
      output: `${formatNumber(data.supplierOrders.count)} supplier postings, ${formatNumber(data.supplierOrders.lineCount)} order lines`,
      tables: `${data.sources.supplierOrderXmlCount} BUOrderposting XML files`
    }
  ];
  const sourceChecks = [
    { label: "Invoice XML", value: data.sources.invoiceXmlCount, note: "Parsed from Dummieboekhouding" },
    { label: "Work order XML", value: data.sources.mobileOrderXmlCount, note: "Parsed from PlenionMobile/Temp/OK" },
    { label: "Supplier order XML", value: data.sources.supplierOrderXmlCount, note: "Parsed from BUOrderposting" }
  ];
  const maxSourceCount = maxValue(sourceChecks.map((source) => source.value));

  return (
    <div className="space-y-6">
      <section className="panel relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(60,179,113,0.35),_transparent_30%),radial-gradient(circle_at_20%_20%,_rgba(59,130,246,0.24),_transparent_28%),linear-gradient(135deg,_rgba(15,23,42,0.96),_rgba(15,23,42,0.84))]" />
        <div className="relative grid gap-6 p-6 lg:grid-cols-[1.25fr_0.75fr] lg:p-8">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Plenion reporting cockpit
            </div>
            <div className="space-y-3">
              <h2 className="max-w-3xl text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                Real dashboard data loaded from PostgreSQL staging tables.
              </h2>
              <p className="max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
                The preview is now backed by a PostgreSQL staging snapshot that
                was populated from the Plenion XML exports: UBL invoices,
                tablet work orders, and supplier order postings. This is the
                concrete first slice of the reporting layer we can grow into
                curated marts later.
              </p>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                Snapshot {new Intl.DateTimeFormat("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric"
                }).format(new Date(data.generatedAt))} from {data.sourceRoot}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href="#report-pack"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-emerald-400 px-4 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
              >
                View extracted reports
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
              <a
                href="#recent-data"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-white/15 bg-white/5 px-4 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Inspect source records
              </a>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <MetricCard label="Invoice net revenue" value={euro.format(data.invoices.netTotal)} detail={`${formatNumber(data.invoices.count)} invoices extracted`} />
            <MetricCard label="Work orders" value={formatNumber(data.workOrders.count)} detail={`${formatNumber(data.workOrders.completedCount)} marked complete`} />
            <MetricCard label="Supplier postings" value={formatNumber(data.supplierOrders.count)} detail={`${formatNumber(data.supplierOrders.lineCount)} order lines`} />
            <MetricCard label="Customer count" value={formatNumber(data.invoices.customerCount)} detail={`From ${data.sources.invoiceXmlCount} invoice XMLs`} />
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="panel overflow-hidden" id="warehouse">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <p className="field-label">Source footprint</p>
              <h3 className="text-xl font-bold text-ink">What we parsed from the backup</h3>
            </div>
            <Database className="h-5 w-5 text-steel" aria-hidden="true" />
          </div>
          <div className="space-y-4 p-5">
            {sourceChecks.map((source) => {
              const width = (source.value / maxSourceCount) * 100;
              return (
                <div key={source.label} className="space-y-2">
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <div>
                      <p className="font-semibold text-ink">{source.label}</p>
                      <p className="text-xs text-steel">{source.note}</p>
                    </div>
                    <p className="font-semibold text-ink">{formatNumber(source.value)} files</p>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-sky-500"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="panel overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <p className="field-label">Pipeline</p>
              <h3 className="text-xl font-bold text-ink">From XML snapshot to report layer</h3>
            </div>
            <Layers3 className="h-5 w-5 text-steel" aria-hidden="true" />
          </div>
          <div className="space-y-3 p-5">
            {[
              "Extract invoice, order and work-order XML from the backup tree",
              "Load the extracted rows into PostgreSQL staging tables",
              "Render KPIs, trends and recent records directly from that snapshot",
              "Replace staging with curated marts when the HFSQL tables are available",
              "Keep the same page structure so the dashboard can upgrade in place"
            ].map((step, index) => (
              <div key={step} className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-sm font-bold text-white">
                  {index + 1}
                </div>
                <p className="text-sm leading-6 text-slate-700">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="panel overflow-hidden" id="report-pack">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <p className="field-label">Live report pack</p>
              <h3 className="text-xl font-bold text-ink">Reports powered by extracted XML data</h3>
            </div>
            <FileSpreadsheet className="h-5 w-5 text-steel" aria-hidden="true" />
          </div>
          <div className="divide-y divide-slate-200">
            {reportCards.map((report) => (
              <div key={report.name} className="grid gap-2 px-5 py-4 sm:grid-cols-[1.1fr_0.9fr]">
                <div>
                  <p className="text-base font-semibold text-ink">{report.name}</p>
                  <p className="mt-1 text-sm text-steel">{report.output}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">
                    {report.status}
                  </p>
                  <p className="mt-1 text-sm font-medium text-ink">{report.tables}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <p className="field-label">Trend</p>
              <h3 className="text-xl font-bold text-ink">Invoice revenue by month</h3>
            </div>
            <BarChart3 className="h-5 w-5 text-steel" aria-hidden="true" />
          </div>
          <div className="space-y-4 p-5">
            {invoiceTrend.map((item) => (
              <div key={item.month} className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-ink">{item.month}</span>
                  <span className="text-steel">{euro.format(item.netTotal)}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-slate-900 to-emerald-500"
                    style={{ width: `${(item.netTotal / maxInvoiceTrend) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            <div className="grid gap-3 pt-2 sm:grid-cols-2">
              <StatBox label="VAT total" value={euro.format(data.invoices.vatTotal)} />
              <StatBox label="Average invoice" value={euro.format(data.invoices.averageNet)} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3" id="recent-data">
        <DataTable
          icon={<ReceiptText className="h-5 w-5 text-steel" aria-hidden="true" />}
          title="Recent invoices"
          subtitle="Latest UBL invoice exports"
          headers={["Invoice", "Date", "Customer", "Net", "Gross"]}
          rows={recentInvoices.map((invoice) => ({
            href: `/reports/invoices/${invoice.id}`,
            cells: [
              `#${invoice.invoiceNumber}`,
              formatCompactDate(invoice.issueDate),
              invoice.customerName || "Unknown",
              euro.format(invoice.netAmount),
              euro.format(invoice.grossAmount)
            ]
          }))}
        />
        <DataTable
          icon={<Wrench className="h-5 w-5 text-steel" aria-hidden="true" />}
          title="Recent work orders"
          subtitle="Tablet orders from PlenionMobile"
          headers={["Bon", "Date", "Customer", "Duration", "Done"]}
          rows={recentWorkOrders.map((order) => ({
            href: `/reports/work-orders/${order.id}`,
            cells: [
              order.bonNumber || "N/A",
              formatCompactDate(order.workDate),
              order.customerCode || "Unknown",
              order.durationHours == null ? "N/A" : `${order.durationHours.toFixed(2)} h`,
              order.workReady ? "Yes" : "No"
            ]
          }))}
        />
        <DataTable
          icon={<Truck className="h-5 w-5 text-steel" aria-hidden="true" />}
          title="Recent supplier postings"
          subtitle="BUOrderposting supplier XML"
          headers={["Order", "Date", "Ship to", "Lines", "Ref"]}
          rows={recentSupplierOrders.map((order) => ({
            href: `/reports/supplier-orders/${order.id}`,
            cells: [
              order.customerOrderId || "N/A",
              formatCompactDate(order.orderDate),
              order.deliverTo || "Unknown",
              String(order.lineCount),
              order.customerOrderRef || "No ref"
            ]
          }))}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
        <div className="panel overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <p className="field-label">Customers</p>
              <h3 className="text-xl font-bold text-ink">Top customers by net revenue</h3>
            </div>
            <ShieldCheck className="h-5 w-5 text-steel" aria-hidden="true" />
          </div>
          <div className="space-y-3 p-5">
            {topCustomers.map((customer) => (
              <div key={customer.name} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-ink">{customer.name}</p>
                  <p className="font-bold text-ink">{euro.format(customer.netTotal)}</p>
                </div>
                <div className="mt-3 h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-sky-500"
                    style={{ width: `${(customer.netTotal / maxValue(topCustomers.map((item) => item.netTotal))) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <p className="field-label">Notes</p>
              <h3 className="text-xl font-bold text-ink">Most common invoice notes</h3>
            </div>
            <Sparkles className="h-5 w-5 text-steel" aria-hidden="true" />
          </div>
          <div className="space-y-3 p-5">
            {topNotes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-steel">
                No invoice notes were present in the extracted sample.
              </div>
            ) : (
              topNotes.map((note) => (
                <div key={note.note} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-ink">{note.note}</p>
                    <p className="text-sm font-bold text-ink">{note.count}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
      <p className="mt-2 text-sm leading-5 text-slate-300">{detail}</p>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-steel">{label}</p>
      <p className="mt-2 text-xl font-bold text-ink">{value}</p>
    </div>
  );
}

function DataTable({
  icon,
  title,
  subtitle,
  headers,
  rows
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  headers: string[];
  rows: Array<{ href: string; cells: ReactNode[] }>;
}) {
  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div>
          <p className="field-label">{title}</p>
          <h3 className="text-xl font-bold text-ink">{subtitle}</h3>
        </div>
        {icon}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-steel">
            <tr>
              {headers.map((header) => (
                <th key={header} className="px-4 py-3">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {rows.map((row, rowIndex) => (
              <tr key={`${title}-${rowIndex}`} className="hover:bg-slate-50">
                {row.cells.map((cell, cellIndex) => (
                  <td key={`${title}-${rowIndex}-${cellIndex}`} className="px-4 py-3 text-slate-700">
                    {cellIndex === 0 ? (
                      <Link href={row.href} className="font-semibold text-ink hover:underline">
                        {cell}
                      </Link>
                    ) : (
                      cell
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
