import { prisma } from "@/lib/prisma";
import { FinancialNotFoundError, FinancialValidationError } from "@/lib/financial-errors";

export const ROLE_PERMISSIONS = {
  OWNER: ["organization:manage", "users:manage", "finance:write", "finance:read", "audit:read", "metrics:manage"],
  ADMIN: ["organization:manage", "users:manage", "finance:write", "finance:read", "audit:read", "metrics:manage"],
  FINANCE_OFFICER: ["finance:write", "finance:read", "audit:read", "metrics:manage"],
  AUDITOR: ["finance:read", "audit:read", "metrics:read"],
  VIEWER: ["finance:read", "metrics:read"],
} as const;

export type Role = keyof typeof ROLE_PERMISSIONS;
export type Permission = (typeof ROLE_PERMISSIONS)[Role][number];

export function hasPermission(role: Role, permission: Permission): boolean {
  return (ROLE_PERMISSIONS[role] as readonly string[]).includes(permission);
}

export async function authorizeOrganizationUser(organizationId: string, userId: string, permission: Permission) {
  if (!organizationId.trim() || !userId.trim()) throw new FinancialValidationError("Organization and user identity are required");
  const user = await prisma.user.findFirst({ where: { id: userId, organizationId, active: true }, select: { id: true, role: true } });
  if (!user) throw new FinancialNotFoundError("Active organization user not found");
  if (!hasPermission(user.role, permission)) throw new FinancialValidationError("User is not authorized for this operation");
  return user;
}
