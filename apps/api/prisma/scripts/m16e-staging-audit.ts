/**
 * M1.6E — Read-only Railway staging enterprise formulary audit.
 * Run: DATABASE_URL=... npx ts-node --transpile-only prisma/scripts/m16e-staging-audit.ts
 */
import { PrismaClient } from "@prisma/client";

const W1 = "ENTERPRISE_M16B_WAVE1_FORMULARY";
const W2 = "ENTERPRISE_M16D_WAVE2_FORMULARY";
const M15E = "HAITI_M15E_LINKAGE_ONLY";

const prisma = new PrismaClient();

async function main() {
  const [
    wave1Markers,
    wave2Markers,
    bothMarkers,
    wave1Active,
    wave2Active,
    wave1Review,
    wave2Review,
    wave1Billing,
    wave2Billing,
    wave1LegacyNull,
    wave2LegacyNull,
    wave1NoPackage,
    wave2NoPackage,
    wave1NoSafety,
    wave2NoSafety,
    duplicateLegacy,
    orphanProducts,
    orphanPackages,
    wave1OrderSearch,
    wave2OrderSearch,
    wave1Baseline,
    wave2Baseline,
    aliasWave1,
    aliasWave2,
    aliasEnterprise,
    productsTotal,
    catalogWithAlias,
  ] = await Promise.all([
    prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM "MedicationProduct"
      WHERE "governanceNotes" LIKE ${"%" + W1 + "%"}`,
    prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM "MedicationProduct"
      WHERE "governanceNotes" LIKE ${"%" + W2 + "%"}`,
    prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM "MedicationProduct"
      WHERE "governanceNotes" LIKE ${"%" + W1 + "%"}
        AND "governanceNotes" LIKE ${"%" + W2 + "%"}`,
    prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM "MedicationProduct"
      WHERE "governanceNotes" LIKE ${"%" + W1 + "%"} AND "isActive" = true`,
    prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM "MedicationProduct"
      WHERE "governanceNotes" LIKE ${"%" + W2 + "%"} AND "isActive" = true`,
    prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM "MedicationProduct"
      WHERE "governanceNotes" LIKE ${"%" + W1 + "%"} AND "governanceStatus" = 'REVIEW_REQUIRED'`,
    prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM "MedicationProduct"
      WHERE "governanceNotes" LIKE ${"%" + W2 + "%"} AND "governanceStatus" = 'REVIEW_REQUIRED'`,
    prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(DISTINCT p.id)::int AS count
      FROM "MedicationProduct" p
      JOIN "MedicationPackage" pkg ON pkg."productId" = p.id
      JOIN "MedicationBillingProfile" bp ON bp."packageId" = pkg.id
      WHERE p."governanceNotes" LIKE ${"%" + W1 + "%"}
        AND bp."hcpcsCodeSuggested" IS NOT NULL AND TRIM(bp."hcpcsCodeSuggested") <> ''
        AND pkg."ndc11" IS NOT NULL AND TRIM(pkg."ndc11") <> ''`,
    prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(DISTINCT p.id)::int AS count
      FROM "MedicationProduct" p
      JOIN "MedicationPackage" pkg ON pkg."productId" = p.id
      JOIN "MedicationBillingProfile" bp ON bp."packageId" = pkg.id
      WHERE p."governanceNotes" LIKE ${"%" + W2 + "%"}
        AND bp."hcpcsCodeSuggested" IS NOT NULL AND TRIM(bp."hcpcsCodeSuggested") <> ''
        AND pkg."ndc11" IS NOT NULL AND TRIM(pkg."ndc11") <> ''`,
    prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM "MedicationProduct"
      WHERE "governanceNotes" LIKE ${"%" + W1 + "%"} AND "legacyCatalogMedicationId" IS NULL`,
    prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM "MedicationProduct"
      WHERE "governanceNotes" LIKE ${"%" + W2 + "%"} AND "legacyCatalogMedicationId" IS NULL`,
    prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM "MedicationProduct" p
      WHERE p."governanceNotes" LIKE ${"%" + W1 + "%"}
        AND NOT EXISTS (SELECT 1 FROM "MedicationPackage" pkg WHERE pkg."productId" = p.id)`,
    prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM "MedicationProduct" p
      WHERE p."governanceNotes" LIKE ${"%" + W2 + "%"}
        AND NOT EXISTS (SELECT 1 FROM "MedicationPackage" pkg WHERE pkg."productId" = p.id)`,
    prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM "MedicationProduct" p
      JOIN "MedicationConcept" c ON c.id = p."conceptId"
      WHERE p."governanceNotes" LIKE ${"%" + W1 + "%"}
        AND NOT EXISTS (SELECT 1 FROM "MedicationSafetyProfile" sp WHERE sp."conceptId" = c.id)`,
    prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM "MedicationProduct" p
      JOIN "MedicationConcept" c ON c.id = p."conceptId"
      WHERE p."governanceNotes" LIKE ${"%" + W2 + "%"}
        AND NOT EXISTS (SELECT 1 FROM "MedicationSafetyProfile" sp WHERE sp."conceptId" = c.id)`,
    prisma.$queryRaw<{ legacy_id: string; cnt: number }[]>`
      SELECT "legacyCatalogMedicationId" AS legacy_id, COUNT(*)::int AS cnt
      FROM "MedicationProduct"
      WHERE "legacyCatalogMedicationId" IS NOT NULL
        AND ("governanceNotes" LIKE ${"%" + W1 + "%"} OR "governanceNotes" LIKE ${"%" + W2 + "%"})
      GROUP BY "legacyCatalogMedicationId"
      HAVING COUNT(*) > 1`,
    prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM "MedicationProduct" p
      WHERE (p."governanceNotes" LIKE ${"%" + W1 + "%"} OR p."governanceNotes" LIKE ${"%" + W2 + "%"})
        AND p."legacyCatalogMedicationId" IS NULL`,
    prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM "MedicationPackage" pkg
      WHERE NOT EXISTS (SELECT 1 FROM "MedicationProduct" p WHERE p.id = pkg."productId")`,
    prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM "MedicationProduct"
      WHERE "governanceNotes" LIKE ${"%" + W1 + "%"}
        AND "governanceNotes" LIKE '%orderSearchEnabled":true%'`,
    prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM "MedicationProduct"
      WHERE "governanceNotes" LIKE ${"%" + W2 + "%"}
        AND "governanceNotes" LIKE '%orderSearchEnabled":true%'`,
    prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM "MedicationProduct"
      WHERE "governanceNotes" LIKE ${"%" + W1 + "%"} AND "baselineAvailable" = true`,
    prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM "MedicationProduct"
      WHERE "governanceNotes" LIKE ${"%" + W2 + "%"} AND "baselineAvailable" = true`,
    prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(DISTINCT cm.id)::int AS count
      FROM "CatalogMedication" cm
      JOIN "MedicationProduct" p ON p."legacyCatalogMedicationId" = cm.id
      JOIN "MedicationAlias" ma ON ma."catalogMedicationId" = cm.id
      WHERE p."governanceNotes" LIKE ${"%" + W1 + "%"}`,
    prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(DISTINCT cm.id)::int AS count
      FROM "CatalogMedication" cm
      JOIN "MedicationProduct" p ON p."legacyCatalogMedicationId" = cm.id
      JOIN "MedicationAlias" ma ON ma."catalogMedicationId" = cm.id
      WHERE p."governanceNotes" LIKE ${"%" + W2 + "%"}`,
    prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM "MedicationAlias"`,
    prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM "MedicationProduct"
      WHERE "governanceNotes" LIKE ${"%" + W1 + "%"} OR "governanceNotes" LIKE ${"%" + W2 + "%"}`,
    prisma.$queryRaw<{ count: number }[]>`
      SELECT COUNT(DISTINCT cm.id)::int AS count
      FROM "CatalogMedication" cm
      WHERE EXISTS (SELECT 1 FROM "MedicationAlias" ma WHERE ma."catalogMedicationId" = cm.id)`,
  ]);

  const wave1MissingBilling = wave1Markers[0]!.count - wave1Billing[0]!.count;
  const wave2MissingBilling = wave2Markers[0]!.count - wave2Billing[0]!.count;

  const wave1NoAlias = wave1Markers[0]!.count - aliasWave1[0]!.count;
  const wave2NoAlias = wave2Markers[0]!.count - aliasWave2[0]!.count;

  const highAlertW1 = await prisma.$queryRaw<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM "MedicationProduct" p
    JOIN "MedicationSafetyProfile" sp ON sp."conceptId" = p."conceptId"
    WHERE p."governanceNotes" LIKE ${"%" + W1 + "%"} AND sp."isHighAlert" = true`;
  const highAlertW2 = await prisma.$queryRaw<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM "MedicationProduct" p
    JOIN "MedicationSafetyProfile" sp ON sp."conceptId" = p."conceptId"
    WHERE p."governanceNotes" LIKE ${"%" + W2 + "%"} AND sp."isHighAlert" = true`;
  const controlledW1 = await prisma.$queryRaw<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM "MedicationProduct" p
    JOIN "MedicationSafetyProfile" sp ON sp."conceptId" = p."conceptId"
    WHERE p."governanceNotes" LIKE ${"%" + W1 + "%"} AND sp."isControlled" = true`;
  const controlledW2 = await prisma.$queryRaw<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM "MedicationProduct" p
    JOIN "MedicationSafetyProfile" sp ON sp."conceptId" = p."conceptId"
    WHERE p."governanceNotes" LIKE ${"%" + W2 + "%"} AND sp."isControlled" = true`;
  const lasaW1 = await prisma.$queryRaw<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM "MedicationProduct" p
    JOIN "MedicationSafetyProfile" sp ON sp."conceptId" = p."conceptId"
    WHERE p."governanceNotes" LIKE ${"%" + W1 + "%"} AND sp."lasaGroupId" IS NOT NULL`;
  const lasaW2 = await prisma.$queryRaw<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM "MedicationProduct" p
    JOIN "MedicationSafetyProfile" sp ON sp."conceptId" = p."conceptId"
    WHERE p."governanceNotes" LIKE ${"%" + W2 + "%"} AND sp."lasaGroupId" IS NOT NULL`;

  const manualReviewBilling = await prisma.$queryRaw<{ count: number }[]>`
    SELECT COUNT(DISTINCT p.id)::int AS count
    FROM "MedicationProduct" p
    JOIN "MedicationPackage" pkg ON pkg."productId" = p.id
    JOIN "MedicationBillingProfile" bp ON bp."packageId" = pkg.id
    WHERE (p."governanceNotes" LIKE ${"%" + W1 + "%"} OR p."governanceNotes" LIKE ${"%" + W2 + "%"})
      AND bp."requiresManualReview" = true`;

  const wave1CodesMissingMarker = await prisma.$queryRaw<{ code: string }[]>`
    SELECT p.code FROM "MedicationProduct" p
    WHERE p."governanceNotes" LIKE ${"%" + W1 + "%"}
      AND p."legacyCatalogMedicationId" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM "MedicationPackage" pkg
        JOIN "MedicationBillingProfile" bp ON bp."packageId" = pkg.id
        WHERE pkg."productId" = p.id
      )
    LIMIT 10`;

  const report = {
    inventory: {
      wave1Markers: wave1Markers[0]!.count,
      wave2Markers: wave2Markers[0]!.count,
      totalEnterprise: wave1Markers[0]!.count + wave2Markers[0]!.count - bothMarkers[0]!.count,
      bothWaveMarkers: bothMarkers[0]!.count,
      expectedWave1: 45,
      expectedWave2: 89,
      expectedTotal: 134,
    },
    activationState: {
      wave1Active: wave1Active[0]!.count,
      wave2Active: wave2Active[0]!.count,
      wave1ReviewRequired: wave1Review[0]!.count,
      wave2ReviewRequired: wave2Review[0]!.count,
      wave1OrderSearchEnabled: wave1OrderSearch[0]!.count,
      wave2OrderSearchEnabled: wave2OrderSearch[0]!.count,
      wave1BaselineAvailable: wave1Baseline[0]!.count,
      wave2BaselineAvailable: wave2Baseline[0]!.count,
    },
    canonical: {
      wave1LegacyNull: wave1LegacyNull[0]!.count,
      wave2LegacyNull: wave2LegacyNull[0]!.count,
      wave1NoPackage: wave1NoPackage[0]!.count,
      wave2NoPackage: wave2NoPackage[0]!.count,
      duplicateLegacyLinkages: duplicateLegacy.length,
      duplicateLegacySamples: duplicateLegacy.slice(0, 5),
      orphanProductsNoLegacy: orphanProducts[0]!.count,
      orphanPackages: orphanPackages[0]!.count,
      productsMissingBillingChain: wave1CodesMissingMarker.map((r) => r.code),
    },
    billing: {
      wave1BillingComplete: wave1Billing[0]!.count,
      wave2BillingComplete: wave2Billing[0]!.count,
      wave1MissingBilling,
      wave2MissingBilling,
      manualReviewBillingProfiles: manualReviewBilling[0]!.count,
    },
    governance: {
      wave1NoSafetyProfile: wave1NoSafety[0]!.count,
      wave2NoSafetyProfile: wave2NoSafety[0]!.count,
      wave1HighAlert: highAlertW1[0]!.count,
      wave2HighAlert: highAlertW2[0]!.count,
      wave1Controlled: controlledW1[0]!.count,
      wave2Controlled: controlledW2[0]!.count,
      wave1Lasa: lasaW1[0]!.count,
      wave2Lasa: lasaW2[0]!.count,
    },
    search: {
      totalMedicationAliases: aliasEnterprise[0]!.count,
      catalogsWithAnyAlias: catalogWithAlias[0]!.count,
      wave1WithAlias: aliasWave1[0]!.count,
      wave2WithAlias: aliasWave2[0]!.count,
      wave1MissingAlias: wave1NoAlias,
      wave2MissingAlias: wave2NoAlias,
    },
    productsTotalEnterprise: productsTotal[0]!.count,
  };

  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
