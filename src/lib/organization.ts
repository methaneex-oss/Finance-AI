export function getOrganizationId(): string {
  const organizationId = process.env.FINANCE_AI_ORGANIZATION_ID?.trim();

  if (!organizationId) {
    throw new Error("FINANCE_AI_ORGANIZATION_ID is not configured");
  }

  return organizationId;
}
