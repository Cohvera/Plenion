import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { DocumentType } from "@prisma/client";

const uploadRoot = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");

export async function saveUploadedFile(file: File, folder: string) {
  const bytes = Buffer.from(await file.arrayBuffer());
  const safeName = file.name.replace(/[^a-z0-9._-]/gi, "_");
  const targetDir = path.join(uploadRoot, folder);
  await mkdir(targetDir, { recursive: true });
  const storagePath = path.join(targetDir, `${Date.now()}-${safeName}`);
  await writeFile(storagePath, bytes);

  return {
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    storagePath
  };
}

export function inferDocumentType(fileName: string): DocumentType {
  const lower = fileName.toLowerCase();
  if (lower.includes("plan")) {
    return DocumentType.PLAN;
  }
  if (lower.includes("spec") || lower.includes("bestek")) {
    return DocumentType.SPECIFICATION;
  }
  if (lower.includes("offerte") || lower.includes("quotation")) {
    return DocumentType.CUSTOMER_QUOTATION;
  }
  return DocumentType.OTHER;
}

export function isRealFile(value: FormDataEntryValue | null): value is File {
  return value instanceof File && value.size > 0;
}
