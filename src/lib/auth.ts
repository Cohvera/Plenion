import { UserRole } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function getCurrentUser() {
  const email = process.env.DEMO_USER_EMAIL || "lotte@warco.be";
  const user = await prisma.user.findUnique({
    where: { email },
    include: { company: true }
  });

  if (!user) {
    throw new Error(`Demo user ${email} was not found. Run prisma seed first.`);
  }

  return user;
}

export async function requireRole(roles: UserRole[]) {
  const user = await getCurrentUser();
  if (!roles.includes(user.role)) {
    throw new Error("You do not have access to this page.");
  }
  return user;
}

export function canManageTemplates(role: UserRole) {
  return role === UserRole.ADMIN || role === UserRole.REVIEWER;
}

export function canWorkOnTechnicalTask(role: UserRole) {
  return role === UserRole.ADMIN || role === UserRole.TECHNICAL_QUOTATION_MAKER;
}
