import { canManageTemplates, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function TemplatesAdminPage() {
  const user = await getCurrentUser();
  const templates = await prisma.template.findMany({
    orderBy: [{ title: "asc" }, { version: "desc" }],
    include: {
      company: true,
      technique: true
    }
  });

  const canEdit = canManageTemplates(user.role);

  return (
    <div className="grid gap-6">
      <div>
        <p className="field-label">Admin</p>
        <h2 className="text-2xl font-bold text-ink">Quotation templates</h2>
        <p className="mt-2 max-w-3xl text-sm text-steel">
          Placeholder admin area for company and technique specific section templates. Editing,
          approvals and version history can be added here later.
        </p>
      </div>

      {!canEdit ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          You can view templates, but your current demo role cannot edit them.
        </div>
      ) : null}

      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-steel">
              <tr>
                <th className="px-4 py-3">Template</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Technique</th>
                <th className="px-4 py-3">Version</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {templates.map((template) => (
                <tr key={template.id}>
                  <td className="px-4 py-3 font-semibold text-ink">{template.title}</td>
                  <td className="px-4 py-3 text-steel">{template.company?.name ?? "Global"}</td>
                  <td className="px-4 py-3 text-steel">{template.technique.label}</td>
                  <td className="px-4 py-3 text-steel">v{template.version}</td>
                  <td className="px-4 py-3 text-steel">{template.active ? "Active" : "Inactive"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
