import { notFound } from "next/navigation";
import { TaskStatus } from "@prisma/client";

import { CompanyBadge } from "@/components/company-badge";
import { StatusBadge } from "@/components/status-badge";
import { documentTypeLabels, taskStatusLabels, taskStatusTone } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { updateTaskStatusAction, uploadTaskOfferAction } from "./actions";

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      technique: true,
      requester: true,
      assignee: true,
      requestedCompany: true,
      uploads: { orderBy: { createdAt: "desc" } },
      quotationRequest: {
        include: {
          customer: true,
          requesterCompany: true,
          uploadedDocuments: true
        }
      }
    }
  });

  if (!task) {
    notFound();
  }

  const uploadAction = uploadTaskOfferAction.bind(null, task.id);
  const statusAction = updateTaskStatusAction.bind(null, task.id);
  const referenceDocuments = task.quotationRequest.uploadedDocuments.filter(
    (document) => document.taskId === null
  );

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="field-label">{task.quotationRequest.requestNumber}</p>
          <h2 className="text-2xl font-bold text-ink">{task.title}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <CompanyBadge
              name={task.quotationRequest.requesterCompany.name}
              color={task.quotationRequest.requesterCompany.color}
            />
            <StatusBadge label={taskStatusLabels[task.status]} tone={taskStatusTone[task.status]} />
          </div>
        </div>
      </div>

      <section className="panel p-5">
        <div className="grid gap-5 md:grid-cols-3">
          <div>
            <p className="field-label">Technique</p>
            <h3 className="mt-1 font-semibold text-ink">{task.technique.label}</h3>
            <p className="mt-1 text-sm text-steel">{task.technique.description}</p>
          </div>
          <div>
            <p className="field-label">Customer</p>
            <h3 className="mt-1 font-semibold text-ink">{task.quotationRequest.customer.companyName}</h3>
            <p className="mt-1 text-sm text-steel">{task.quotationRequest.projectName}</p>
          </div>
          <div>
            <p className="field-label">Ownership</p>
            <h3 className="mt-1 font-semibold text-ink">
              {task.requestedCompany?.name ?? "No requested company"}
            </h3>
            <p className="mt-1 text-sm text-steel">
              {task.assignee?.name ?? "Unassigned"} - due {formatDate(task.dueDate)}
            </p>
          </div>
        </div>
        <div className="mt-5 border-t border-slate-200 pt-5">
          <p className="field-label">Instructions</p>
          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">{task.instructions}</p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <form action={uploadAction} className="panel p-5">
          <h3 className="text-lg font-bold text-ink">Upload technical offer</h3>
          <p className="mt-2 text-sm text-steel">
            Upload the technical offer produced by the quotation maker. The task moves to uploaded
            automatically.
          </p>
          <label className="mt-5 grid gap-1">
            <span className="field-label">Technical offer</span>
            <input name="technicalOffer" type="file" required className="field-control py-2" />
          </label>
          <button type="submit" className="button-primary mt-4">
            Upload offer
          </button>
        </form>

        <form action={statusAction} className="panel p-5">
          <h3 className="text-lg font-bold text-ink">Update status</h3>
          <label className="mt-5 grid gap-1">
            <span className="field-label">Task status</span>
            <select name="status" defaultValue={task.status} className="field-control">
              {Object.values(TaskStatus).map((status) => (
                <option key={status} value={status}>
                  {taskStatusLabels[status]}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="button-secondary mt-4">
            Save status
          </button>
        </form>
      </section>

      <section className="panel p-5">
        <h3 className="text-lg font-bold text-ink">Reference documents</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {[...referenceDocuments, ...task.uploads].map((document) => (
            <div key={document.id} className="rounded-md border border-slate-200 p-4">
              <p className="font-semibold text-ink">{document.fileName}</p>
              <p className="mt-1 text-sm text-steel">
                {documentTypeLabels[document.type]} - {Math.ceil(document.size / 1024)} KB
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
