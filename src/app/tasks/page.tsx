import Link from "next/link";

import { CompanyBadge } from "@/components/company-badge";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { taskStatusLabels, taskStatusTone } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function TasksPage() {
  const tasks = await prisma.task.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      technique: true,
      quotationRequest: {
        include: {
          customer: true,
          requesterCompany: true
        }
      },
      assignee: true,
      requestedCompany: true,
      uploads: true
    }
  });

  return (
    <div className="grid gap-6">
      <div>
        <p className="field-label">Work queue</p>
        <h2 className="text-2xl font-bold text-ink">Technical quotation tasks</h2>
        <p className="mt-2 max-w-3xl text-sm text-steel">
          Tasks are created automatically when a selected technique needs a technical quotation
          maker instead of a generated template section.
        </p>
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          title="No technical tasks yet"
          description="Use the request wizard and assign at least one technique to a quotation maker."
        />
      ) : (
        <div className="grid gap-3">
          {tasks.map((task) => (
            <Link key={task.id} href={`/tasks/${task.id}`} className="panel block p-5 hover:bg-slate-50">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <CompanyBadge
                      name={task.quotationRequest.requesterCompany.name}
                      color={task.quotationRequest.requesterCompany.color}
                    />
                    <StatusBadge label={taskStatusLabels[task.status]} tone={taskStatusTone[task.status]} />
                  </div>
                  <h3 className="mt-3 text-lg font-bold text-ink">{task.title}</h3>
                  <p className="mt-1 text-sm text-steel">
                    {task.quotationRequest.customer.companyName} - {task.technique.label}
                  </p>
                </div>
                <div className="text-sm text-steel">
                  <p>
                    <span className="font-semibold text-ink">Assignee:</span>{" "}
                    {task.assignee?.name ?? "Unassigned"}
                  </p>
                  <p>
                    <span className="font-semibold text-ink">Due:</span> {formatDate(task.dueDate)}
                  </p>
                  <p>
                    <span className="font-semibold text-ink">Uploads:</span> {task.uploads.length}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
