"use server";

import { redirect } from "next/navigation";
import { DocumentType, SectionSource, SectionStatus, TaskStatus } from "@prisma/client";
import { ZodError } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { saveUploadedFile, inferDocumentType, isRealFile } from "@/lib/files";
import { formatRequestNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { quotationRequestSchema, type WizardTechniqueInput } from "@/lib/validation";

export type SubmitQuotationRequestState = {
  error: string | null;
};

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parseTechniques(raw: FormDataEntryValue | null): WizardTechniqueInput[] {
  if (typeof raw !== "string") {
    return [];
  }
  try {
    return JSON.parse(raw) as WizardTechniqueInput[];
  } catch {
    return [];
  }
}

function friendlyError(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Check the quotation request fields and try again.";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "The quotation request could not be submitted. Please try again.";
}

export async function submitQuotationRequestAction(
  _state: SubmitQuotationRequestState,
  formData: FormData
): Promise<SubmitQuotationRequestState> {
  let redirectPath: string | null = null;

  try {
    const user = await getCurrentUser();
    const techniques = parseTechniques(formData.get("techniques"));

    const parsed = quotationRequestSchema.parse({
      requesterCompanyId: text(formData, "requesterCompanyId"),
      projectName: text(formData, "projectName"),
      projectDescription: text(formData, "projectDescription"),
      requestedDueDate: text(formData, "requestedDueDate"),
      customer: {
        companyName: text(formData, "customer.companyName"),
        vatNumber: text(formData, "customer.vatNumber"),
        contactName: text(formData, "customer.contactName"),
        contactEmail: text(formData, "customer.contactEmail"),
        phone: text(formData, "customer.phone"),
        street: text(formData, "customer.street"),
        postalCode: text(formData, "customer.postalCode"),
        city: text(formData, "customer.city")
      },
      techniques
    });

    parsed.techniques.forEach((technique) => {
      if (
        technique.action === "external" &&
        !isRealFile(formData.get(`externalOffer.${technique.techniqueId}`))
      ) {
        throw new Error("Every external-offer technique needs an uploaded technical offer.");
      }
    });

    const requestCount = await prisma.quotationRequest.count();
    const requestNumber = formatRequestNumber(requestCount);
    const customer = await prisma.customer.create({
      data: parsed.customer
    });

    const request = await prisma.quotationRequest.create({
      data: {
        requestNumber,
        projectName: parsed.projectName,
        projectDescription: parsed.projectDescription,
        requestedDueDate: parsed.requestedDueDate ? new Date(parsed.requestedDueDate) : null,
        requesterCompanyId: parsed.requesterCompanyId,
        requesterId: user.id,
        customerId: customer.id
      }
    });

    const uploadedDocuments = formData.getAll("documents").filter(isRealFile);
    for (const file of uploadedDocuments) {
      const saved = await saveUploadedFile(file, request.id);
      await prisma.uploadedDocument.create({
        data: {
          ...saved,
          quotationRequestId: request.id,
          uploadedById: user.id,
          type: inferDocumentType(file.name)
        }
      });
    }

    for (const [index, selected] of parsed.techniques.entries()) {
      const technique = await prisma.technique.findUniqueOrThrow({
        where: { id: selected.techniqueId }
      });

      if (selected.action === "template") {
        const template =
          (await prisma.template.findFirst({
            where: {
              techniqueId: selected.techniqueId,
              companyId: parsed.requesterCompanyId,
              active: true
            },
            orderBy: { version: "desc" }
          })) ??
          (await prisma.template.findFirst({
            where: { techniqueId: selected.techniqueId, active: true },
            orderBy: { version: "desc" }
          }));

        await prisma.quotationSection.create({
          data: {
            quotationRequestId: request.id,
            techniqueId: selected.techniqueId,
            source: SectionSource.TEMPLATE,
            status: SectionStatus.GENERATED,
            title: `${technique.label} generated section`,
            content: template?.content ?? "No active template was found for this technique.",
            templateId: template?.id,
            sortOrder: index
          }
        });
      }

      if (selected.action === "assign") {
        await prisma.quotationSection.create({
          data: {
            quotationRequestId: request.id,
            techniqueId: selected.techniqueId,
            source: SectionSource.TASK,
            status: SectionStatus.WAITING_FOR_TASK,
            title: `${technique.label} technical offer`,
            content: selected.instructions || null,
            sortOrder: index
          }
        });

        await prisma.task.create({
          data: {
            quotationRequestId: request.id,
            techniqueId: selected.techniqueId,
            requesterId: user.id,
            requestedCompanyId: selected.requestedCompanyId || null,
            assigneeId: selected.assigneeId || null,
            status: TaskStatus.OPEN,
            title: `${requestNumber} - ${technique.label}`,
            instructions:
              selected.instructions ||
              "Prepare a technical quotation and upload the technical offer when ready.",
            dueDate: parsed.requestedDueDate ? new Date(parsed.requestedDueDate) : null
          }
        });
      }

      if (selected.action === "external") {
        const externalFile = formData.get(`externalOffer.${selected.techniqueId}`);
        if (!isRealFile(externalFile)) {
          throw new Error(`Upload an external technical offer for ${technique.label}.`);
        }
        const saved = await saveUploadedFile(externalFile, request.id);
        const document = await prisma.uploadedDocument.create({
          data: {
            ...saved,
            quotationRequestId: request.id,
            uploadedById: user.id,
            type: DocumentType.TECHNICAL_OFFER
          }
        });

        await prisma.quotationSection.create({
          data: {
            quotationRequestId: request.id,
            techniqueId: selected.techniqueId,
            source: SectionSource.EXTERNAL_UPLOAD,
            status: SectionStatus.UPLOADED,
            title: `${technique.label} external technical offer`,
            content: selected.instructions || null,
            externalDocumentId: document.id,
            sortOrder: index
          }
        });
      }
    }

    await prisma.finalQuotation.create({
      data: {
        quotationRequestId: request.id
      }
    });

    redirectPath = `/requests/${request.id}`;
  } catch (error) {
    return { error: friendlyError(error) };
  }

  if (redirectPath) {
    redirect(redirectPath);
  }

  return {
    error: "The quotation request was saved, but the app could not open the request detail page."
  };
}
