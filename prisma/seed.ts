import { PrismaClient, CategoryClassification } from "@prisma/client";

const prisma = new PrismaClient();
const organizationId = "demo-org";

async function main() {
  const organization = await prisma.organization.upsert({
    where: { id: organizationId },
    update: {},
    create: { id: organizationId, name: "Harvest Organization", baseCurrency: "NGN" },
  });

  await prisma.branch.upsert({
    where: { organizationId_name: { organizationId, name: "Main" } },
    update: {},
    create: { organizationId, name: "Main", code: "MAIN" },
  });

  const categories = [
    ["Tithe", CategoryClassification.INCOME],
    ["Offering", CategoryClassification.INCOME],
    ["Building Project", CategoryClassification.FUND],
    ["Welfare", CategoryClassification.FUND],
  ] as const;

  for (const [name, classification] of categories) {
    await prisma.financialCategory.upsert({
      where: { organizationId_name: { organizationId, name } },
      update: { classification, active: true },
      create: { organizationId, name, classification },
    });
  }

  console.log(`Seeded ${organization.name}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
}).finally(() => prisma.$disconnect());
