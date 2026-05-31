import { UserRole } from "@prisma/client";

import { QuotationWizard } from "@/components/quotation-wizard";
import { prisma } from "@/lib/prisma";
import { submitQuotationRequestAction } from "./actions";

export default async function NewRequestPage() {
  const [companies, techniques, technicalUsers] = await Promise.all([
    prisma.company.findMany({ orderBy: { name: "asc" } }),
    prisma.technique.findMany({ orderBy: { label: "asc" } }),
    prisma.user.findMany({
      where: {
        role: {
          in: [UserRole.TECHNICAL_QUOTATION_MAKER, UserRole.ADMIN]
        }
      },
      orderBy: { name: "asc" }
    })
  ]);

  return (
    <div className="grid gap-6">
      <div>
        <p className="field-label">Wizard</p>
        <h2 className="text-2xl font-bold text-ink">Create quotation request</h2>
        <p className="mt-2 max-w-3xl text-sm text-steel">
          Build one internal request, generate available sections from templates and route the
          remaining techniques to technical quotation makers.
        </p>
      </div>
      <QuotationWizard
        companies={companies.map((company) => ({
          id: company.id,
          name: company.name,
          code: company.code,
          color: company.color
        }))}
        techniques={techniques.map((technique) => ({
          id: technique.id,
          code: technique.code,
          label: technique.label,
          description: technique.description,
          defaultOwnerCompanyId: technique.defaultOwnerCompanyId
        }))}
        technicalUsers={technicalUsers.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          companyId: user.companyId
        }))}
        action={submitQuotationRequestAction}
      />
    </div>
  );
}
