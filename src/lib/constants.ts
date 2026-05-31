import type { TaskStatus, TechniqueCode, UserRole } from "@prisma/client";

export const companyOrder = ["Q_HOME", "WARCO", "TOMME"] as const;

export const roleLabels: Record<UserRole, string> = {
  ADMIN: "Admin",
  REQUESTER: "Requester",
  TECHNICAL_QUOTATION_MAKER: "Technical quotation maker",
  REVIEWER: "Reviewer"
};

export const taskStatusLabels: Record<TaskStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  WAITING_FOR_INFO: "Waiting for info",
  UPLOADED: "Uploaded",
  REVIEWED: "Reviewed",
  APPROVED: "Approved",
  REJECTED: "Rejected"
};

export const taskStatusTone: Record<TaskStatus, "neutral" | "blue" | "amber" | "green" | "red"> = {
  OPEN: "neutral",
  IN_PROGRESS: "blue",
  WAITING_FOR_INFO: "amber",
  UPLOADED: "blue",
  REVIEWED: "green",
  APPROVED: "green",
  REJECTED: "red"
};

export const techniqueLabels: Record<TechniqueCode, string> = {
  ELECTRICITY: "Electricity",
  HVAC: "HVAC",
  SOLAR_PANELS: "Solar panels",
  BATTERY: "Battery",
  CHARGING_STATIONS: "Charging stations",
  DOMOTICS_LOXONE: "Domotics / Loxone",
  ENERGY_MANAGEMENT_Q_ENERGY_AI: "Energy management / Q-Energy AI",
  SANITARY: "Sanitary"
};

export const documentTypeLabels = {
  CUSTOMER_QUOTATION: "Customer quotation",
  TECHNICAL_OFFER: "Technical offer",
  PLAN: "Plan",
  SPECIFICATION: "Specification",
  OTHER: "Other"
} as const;
