import { PrismaClient, CategoryClassification } from "@prisma/client";

const prisma = new PrismaClient();

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required to run the seed`);
  return value;
}

function readCategories() {
  const raw = requiredEnv("FINANCE_AI_SEED_CATEGORIES_JSON");
  const parsed: unknown = JSON.parse(raw);

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("FINANCE_AI_SEED_CATEGORIES_JSON must be a non-empty JSON array");
  }

  return parsed.map((item, index) => {
    if (!item || typeof item !== "object") throw new Error(`Category ${index + 1} is invalid`);
    const value = item as Record<string, unknown>;
    const name = typeof value.name === "string" ? value.name.trim() : "";
    const classification = value.classification;

    if (!name || !Object.values(CategoryClassification).includes(classification as CategoryClassification)) {
      throw new Error(`Category ${index + 1} must have a name and valid classification`);
    }

    return {
      name,
      classification: classification as CategoryClassification,
      description: typeof value.description === "string" ? value.description.trim() || null : null,
      isTemporary: value.isTemporary === true,
    };
  });
}

async function main() {
  const organizationId = requiredEnv("FINANCE_AI_SEED_ORGANIZATION_ID");
  const organizationName = requiredEnv("FINANCE_AI_SEED_ORGANIZATION_NAME");
  const baseCurrency = process.env.FINANCE_AI_SEED_BASE_CURRENCY?.trim() || "NGN";
  const branchName = process.env.FINANCE_AI_SEED_BRANCH_NAME?.trim();
  const branchCode = process.env.FINANCE_AI_SEED_BRANCH_CODE?.trim() || null;
  const categories = readCategories();

  const organization = await prisma.organization.upsert({
    where: { id: organizationId },
    update: { name: organizationName, baseCurrency },
    create: { id: organizationId, name: organizationName, baseCurrency },
  });

  if (branchName) {
    await prisma.branch.upsert({
      where: { organizationId_name: { organizationId, name: branchName } },
      update: { code: branchCode, active: true },
      create: { organizationId, name: branchName, code: branchCode },
    });
  }

  for (const category of categories) {
    await prisma.financialCategory.upsert({
      where: { organizationId_name: { organizationId, name: category.name } },
      update: category,
      create: { organizationId, ...category },
    });
  }

  console.log(`Seeded organization ${organization.id} with ${categories.length} configured categories.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
