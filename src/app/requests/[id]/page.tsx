import Link from "next/link";
import { notFound } from "next/navigation";

import { CompanyBadge } from "@/components/company-badge";
import { StatusBadge } from "@/components/status-badge";
import { documentTypeLabels, taskStatusLabels, taskStatusTone } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const request = await prisma.quotationRequest.findUnique({
    where: { id },
    include: {
      customer: true,
      requester: true,
      requesterCompany: true,
      uploadedDocuments: true,
      sections: {
        orderBy: { sortOrder: "asc" },
        include: { technique: true, template: true }
      },
      tasks: {
        include: { technique: true, assignee: true, requestedCompany: true }
      },
      finalQuotation: true
    }
  });

  if (!request) {
    notFound();
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="field-label">{request.requestNumber}</p>
          <h2 className="text-2xl font-bold text-ink">{request.projectName}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <CompanyBadge name={request.requesterCompany.name} color={request.requesterCompany.color} />
            <StatusBadge label={request.status.replaceAll("_", " ").toLowerCase()} />
          </div>
        </div>
        <Link href="/requests" className="button-secondary">
          Back to overview
        </Link>
      </div>

      <section className="panel p-5">
        <div className="grid gap-5 md:grid-cols-3">
          <div>
            <p className="field-label">Customer</p>
            <h3 className="mt-1 font-semibold text-ink">{request.customer.companyName}</h3>
            <p className="mt-1 text-sm text-steel">
              {request.customer.contactName}
              <br />
              {request.customer.street}, {request.customer.postalCode} {request.customer.city}
            </p>
          </div>
          <div>
            <p className="field-label">Requester</p>
            <h3 className="mt-1 font-semibold text-ink">{request.requester.name}</h3>
            <p className="mt-1 text-sm text-steel">{request.requester.email}</p>
          </div>
          <div>
            <p className="field-label">Timing</p>
            <h3 className="mt-1 font-semibold text-ink">Due {formatDate(request.requestedDueDate)}</h3>
            <p className="mt-1 text-sm text-steel">Submitted {formatDate(request.submittedAt)}</p>
          </div>
        </div>
        <div className="mt-5 border-t border-slate-200 pt-5">
          <p className="field-label">Project description</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">{request.projectDescription}</p>
        </div>
      </section>

      <section className="panel p-5">
        <h3 className="text-lg font-bold text-ink">Quotation sections</h3>
        <div className="mt-4 grid gap-3">
          {request.sections.map((section) => (
            <div key={section.id} className="rounded-lg border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="field-label">{section.source.replaceAll("_", " ").toLowerCase()}</p>
                  <h4 className="font-semibold text-ink">{section.title}</h4>
                  <p className="mt-1 text-sm text-steel">{section.technique.label}</p>
                </div>
                <StatusBadge label={section.status.replaceAll("_", " ").toLowerCase()} />
              </div>
              {section.content ? (
                <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">{section.content}</p>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="panel p-5">
          <h3 className="text-lg font-bold text-ink">Technical tasks</h3>
          <div className="mt-4 grid gap-3">
            {request.tasks.length === 0 ? (
              <p className="text-sm text-steel">No manual technical tasks were created.</p>
            ) : (
              request.tasks.map((task) => (
                <Link
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  className="rounded-md border border-slate-200 p-4 hover:bg-slate-50"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h4 className="font-semibold text-ink">{task.technique.label}</h4>
                      <p className="mt-1 text-sm text-steel">
                        {task.requestedCompany?.name ?? "No company"} - {task.assignee?.name ?? "Unassigned"}
                      </p>
                    </div>
                    <StatusBadge label={taskStatusLabels[task.status]} tone={taskStatusTone[task.status]} />
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="panel p-5">
          <h3 className="text-lg font-bold text-ink">Uploaded documents</h3>
          <div className="mt-4 grid gap-3">
            {request.uploadedDocuments.length === 0 ? (
              <p className="text-sm text-steel">No documents uploaded.</p>
            ) : (
              request.uploadedDocuments.map((document) => (
                <div key={document.id} className="rounded-md border border-slate-200 p-4">
                  <p className="font-semibold text-ink">{document.fileName}</p>
                  <p className="mt-1 text-sm text-steel">
                    {documentTypeLabels[document.type]} - {Math.ceil(document.size / 1024)} KB
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
