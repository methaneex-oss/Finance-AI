import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function getAuthenticatedContext() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("Authentication required");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, organizationId: true, role: true, active: true, branchId: true },
  });
  if (!user?.active) throw new Error("User account is inactive");

  return user;
}

export async function getAuthenticatedOrganizationId() {
  return (await getAuthenticatedContext()).organizationId;
}

export async function requireRole(allowed: string[]) {
  const context = await getAuthenticatedContext();
  if (!allowed.includes(context.role)) throw new Error("Insufficient permissions");
  return context;
}
