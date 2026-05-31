import Link from "next/link";
import { Plus } from "lucide-react";

import { CompanyBadge } from "@/components/company-badge";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function RequestsPage() {
  const requests = await prisma.quotationRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      customer: true,
      requesterCompany: true,
      tasks: true,
      sections: { include: { technique: true } }
    }
  });

  const openTasks = requests.reduce(
    (total, request) => total + request.tasks.filter((task) => task.status !== "APPROVED").length,
    0
  );

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="field-label">Workflow</p>
          <h2 className="text-2xl font-bold text-ink">Quotation requests</h2>
        </div>
        <Link href="/requests/new" className="button-primary">
          <Plus className="h-4 w-4" aria-hidden="true" />
          New request
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Requests" value={requests.length} />
        <Metric label="Open technical tasks" value={openTasks} />
        <Metric
          label="Generated sections"
          value={requests.reduce((total, request) => total + request.sections.length, 0)}
        />
      </div>

      {requests.length === 0 ? (
        <EmptyState
          title="No quotation requests yet"
          description="Create the first request through the wizard and the technical tasks will appear automatically."
        />
      ) : (
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-steel">
                <tr>
                  <th className="px-4 py-3">Request</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Techniques</th>
                  <th className="px-4 py-3">Tasks</th>
                  <th className="px-4 py-3">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {requests.map((request) => (
                  <tr key={request.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link href={`/requests/${request.id}`} className="font-semibold text-ink hover:underline">
                        {request.requestNumber}
                      </Link>
                      <div className="mt-1">
                        <StatusBadge label={request.status.replaceAll("_", " ").toLowerCase()} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-ink">{request.customer.companyName}</div>
                      <div className="text-xs text-steel">{request.projectName}</div>
                    </td>
                    <td className="px-4 py-3">
                      <CompanyBadge
                        name={request.requesterCompany.name}
                        color={request.requesterCompany.color}
                      />
                    </td>
                    <td className="px-4 py-3 text-steel">
                      {request.sections.map((section) => section.technique.label).join(", ")}
                    </td>
                    <td className="px-4 py-3 font-semibold text-ink">{request.tasks.length}</td>
                    <td className="px-4 py-3 text-steel">{formatDate(request.submittedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="panel p-5">
      <p className="field-label">{label}</p>
      <p className="mt-2 text-3xl font-bold text-ink">{value}</p>
    </div>
  );
}
