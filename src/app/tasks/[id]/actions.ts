"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DocumentType, SectionStatus, TaskStatus } from "@prisma/client";

import { getCurrentUser } from "@/lib/auth";
import { isRealFile, saveUploadedFile } from "@/lib/files";
import { prisma } from "@/lib/prisma";

export async function uploadTaskOfferAction(taskId: string, formData: FormData) {
  const user = await getCurrentUser();
  const file = formData.get("technicalOffer");
  if (!isRealFile(file)) {
    throw new Error("Upload a technical offer before submitting.");
  }

  const task = await prisma.task.findUniqueOrThrow({
    where: { id: taskId },
    include: { quotationRequest: true }
  });

  const saved = await saveUploadedFile(file, `${task.quotationRequestId}/tasks/${task.id}`);

  await prisma.uploadedDocument.create({
    data: {
      ...saved,
      quotationRequestId: task.quotationRequestId,
      taskId: task.id,
      uploadedById: user.id,
      type: DocumentType.TECHNICAL_OFFER
    }
  });

  await prisma.task.update({
    where: { id: task.id },
    data: { status: TaskStatus.UPLOADED }
  });

  await prisma.quotationSection.updateMany({
    where: {
      quotationRequestId: task.quotationRequestId,
      techniqueId: task.techniqueId,
      status: SectionStatus.WAITING_FOR_TASK
    },
    data: { status: SectionStatus.UPLOADED }
  });

  revalidatePath("/tasks");
  revalidatePath(`/tasks/${task.id}`);
  revalidatePath(`/requests/${task.quotationRequestId}`);
  redirect(`/tasks/${task.id}`);
}

export async function updateTaskStatusAction(taskId: string, formData: FormData) {
  const status = formData.get("status");
  if (typeof status !== "string" || !(status in TaskStatus)) {
    throw new Error("Invalid task status.");
  }

  const task = await prisma.task.update({
    where: { id: taskId },
    data: { status: status as TaskStatus }
  });

  revalidatePath("/tasks");
  revalidatePath(`/tasks/${task.id}`);
  revalidatePath(`/requests/${task.quotationRequestId}`);
}
