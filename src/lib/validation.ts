import { z } from "zod";

export const techniqueActionSchema = z.enum(["template", "assign", "external"]);

export const wizardTechniqueSchema = z.object({
  techniqueId: z.string().min(1),
  techniqueCode: z.string().min(1),
  action: techniqueActionSchema,
  requestedCompanyId: z.string().optional(),
  assigneeId: z.string().optional(),
  instructions: z.string().max(1200).optional()
});

export const quotationRequestSchema = z.object({
  requesterCompanyId: z.string().min(1, "Select a requesting company."),
  projectName: z.string().min(3, "Enter a project name."),
  projectDescription: z.string().min(10, "Add a short project description."),
  requestedDueDate: z.string().optional(),
  customer: z.object({
    companyName: z.string().min(2, "Enter the customer name."),
    vatNumber: z.string().optional(),
    contactName: z.string().min(2, "Enter a contact person."),
    contactEmail: z.string().email("Enter a valid email.").optional().or(z.literal("")),
    phone: z.string().optional(),
    street: z.string().min(3, "Enter a street and number."),
    postalCode: z.string().min(4, "Enter a postal code."),
    city: z.string().min(2, "Enter a city.")
  }),
  techniques: z
    .array(wizardTechniqueSchema)
    .min(1, "Select at least one technique.")
    .superRefine((techniques, ctx) => {
      techniques.forEach((technique, index) => {
        if (technique.action === "assign" && !technique.requestedCompanyId) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Choose a company for assigned technical work.",
            path: [index, "requestedCompanyId"]
          });
        }
      });
    })
});

export type TechniqueAction = z.infer<typeof techniqueActionSchema>;
export type WizardTechniqueInput = z.infer<typeof wizardTechniqueSchema>;
export type QuotationRequestInput = z.infer<typeof quotationRequestSchema>;
