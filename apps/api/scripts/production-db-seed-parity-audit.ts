/**
 * MEDUI.MEDICATION.PRODUCTION_DB_SEED_PARITY_AUDIT.1
 * Read-only production database parity audit vs enterprise medication manifests.
 *
 * Usage (production via Railway):
 *   railway run --service Postgres --environment production -- \
 *     pnpm --filter @medora/api run audit:production-db-seed-parity
 *
 * Writes exports/production-db-seed-parity-audit.json — does NOT modify production data.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  buildUnifiedOrderabilityMap,
  evaluateMedicationOrderScheduleCreateGate,
  buildEnterpriseMedicationSearchQueryExpansions,
  getActiveProviderOrderableCatalogCodes,
  prewarmProviderOrderableCatalogCodesRegistry,
  resolveMedicationBillingReadiness,
  shouldSuppressMedicationSearchCatalogCode,
  validateProviderOrderPlacementForCatalogCode,
  orderCreateDtoSchema,
  ENTERPRISE_WAVE1_FORMULARY_MANIFEST,
  ENTERPRISE_WAVE2_FORMULARY_MANIFEST,
  listActiveTranche1PilotCatalogCodes,
  listActiveTranche2ProviderOrderingCatalogCodes,
  listActiveCriticalCareProviderOrderingCatalogCodes,
  listActiveNeurologyProviderOrderingCatalogCodes,
  listActiveInfectiousDiseaseProviderOrderingCatalogCodes,
  listActiveCardiologyProviderOrderingCatalogCodes,
  listActiveIvFluidsProviderOrderingCatalogCodes,
  listActiveAnticoagulationProviderOrderingCatalogCodes,
  listActiveInsulinDiabetesProviderOrderingCatalogCodes,
  listActiveVaccineProviderOrderingCatalogCodes,
  listActiveObgynProviderOrderingCatalogCodes,
  listActivePsychiatryProviderOrderingCatalogCodes,
  listActiveGastroenterologyProviderOrderingCatalogCodes,
  listActivePediatricsProviderOrderingCatalogCodes,
  listActiveSurgeryPerioperativeProviderOrderingCatalogCodes,
  listActivePainManagementProviderOrderingCatalogCodes,
  listActiveControlledSubstanceProviderOrderingCatalogCodes,
  HAITI_MEDICATION_FORMULARY_CATALOG,
} from "@medora/shared";

const prisma = new PrismaClient();
const TICKET = "MEDUI.MEDICATION.PRODUCTION_DB_SEED_PARITY_AUDIT.1";

type RegistryClassification = "MATCH" | "MISSING_DB_ROW" | "DB_METADATA_MISMATCH" | "DUPLICATE_DB_ROW";
type BillingClassification = "READY" | "MISSING" | "PARTIAL" | "DUPLICATE";

function maskDatabaseUrl(url: string | undefined): string {
  if (!url?.trim()) return "unset";
  try {
    const parsed = new URL(url.replace(/^postgres(ql)?:\/\//, "http://"));
    return `${parsed.hostname}:${parsed.port || "5432"}/${parsed.pathname.replace(/^\//, "").split("?")[0]}`;
  } catch {
    return "configured";
  }
}

function norm(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function fieldsMatch(expected: string | null | undefined, actual: string | null | undefined): boolean {
  return norm(expected) === norm(actual);
}

function localMigrationNames(): string[] {
  const dir = join(__dirname, "../prisma/migrations");
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

const FORMULARY_DOMAINS: Array<{ domain: string; codes: () => string[] }> = [
  { domain: "Tranche 1", codes: () => listActiveTranche1PilotCatalogCodes() },
  { domain: "Tranche 2", codes: () => listActiveTranche2ProviderOrderingCatalogCodes() },
  { domain: "Critical Care", codes: () => listActiveCriticalCareProviderOrderingCatalogCodes() },
  { domain: "Neurology", codes: () => listActiveNeurologyProviderOrderingCatalogCodes() },
  { domain: "Infectious Disease", codes: () => listActiveInfectiousDiseaseProviderOrderingCatalogCodes() },
  { domain: "Cardiology", codes: () => listActiveCardiologyProviderOrderingCatalogCodes() },
  { domain: "IV Fluids", codes: () => listActiveIvFluidsProviderOrderingCatalogCodes() },
  { domain: "Anticoagulation", codes: () => listActiveAnticoagulationProviderOrderingCatalogCodes() },
  { domain: "Diabetes", codes: () => listActiveInsulinDiabetesProviderOrderingCatalogCodes() },
  { domain: "Vaccines", codes: () => listActiveVaccineProviderOrderingCatalogCodes() },
  { domain: "OBGYN", codes: () => listActiveObgynProviderOrderingCatalogCodes() },
  { domain: "Psychiatry", codes: () => listActivePsychiatryProviderOrderingCatalogCodes() },
  { domain: "Gastroenterology", codes: () => listActiveGastroenterologyProviderOrderingCatalogCodes() },
  { domain: "Pediatrics", codes: () => listActivePediatricsProviderOrderingCatalogCodes() },
  { domain: "Surgery", codes: () => listActiveSurgeryPerioperativeProviderOrderingCatalogCodes() },
  { domain: "Pain Management", codes: () => listActivePainManagementProviderOrderingCatalogCodes() },
  { domain: "Controlled Substances", codes: () => listActiveControlledSubstanceProviderOrderingCatalogCodes() },
];

const SEARCH_QUERIES = [
  "Morphine",
  "Hydromorphone",
  "Fentanyl",
  "Gabapentin",
  "Cyclobenzaprine",
  "Methocarbamol",
  "Tizanidine",
  "Lidocaine Patch",
  "Diclofenac Gel",
  "Norco",
  "Percocet",
  "Tylenol #3",
  "NS",
  "LR",
  "D5",
  "Pantoprazole",
  "Ceftriaxone",
  "Ondansetron",
  "Albuterol",
];

const RUNTIME_REPRESENTATIVE_CODES = [
  "MORPHINE_2_MG_ML_INJECTABLE_INTRAVEINEUSE",
  "HYDROMORPHONE_2_MG_ML_INJECTABLE_INTRAVEINEUSE",
  "FENTANYL_50_MCG_ML_INJECTABLE_INTRAVEINEUSE",
  "GABAPENTIN_300MG_ORAL",
  "SODIUM_CHLORIDE_0_9_1000_ML_PERFUSION_INTRAVEINEUSE",
  "PLASMALYTE_1000_ML_PERFUSION_INTRAVEINEUSE",
  "DEXTROSE_5_1000_ML_PERFUSION_INTRAVEINEUSE",
  "ONDANSETRON_4MG_ORAL",
  "ALBUTEROL_2_5MG_3ML_NEB",
];

const EXPECTED_INDEXES = [
  "CatalogMedication_isActive_idx",
  "CatalogMedication_searchText_trgm_idx",
  "CatalogMedication_name_trgm_idx",
  "CatalogMedication_genericName_trgm_idx",
  "CatalogMedication_displayNameEn_trgm_idx",
  "CatalogMedication_displayNameFr_trgm_idx",
  "MedicationAlias_alias_trgm_idx",
];

const SEED_PIPELINES: Array<{ seed: string; codes: string[]; alwaysOn: boolean }> = [
  {
    seed: "seed-haiti-medication-catalog (seed-catalogs.ts)",
    codes: HAITI_MEDICATION_FORMULARY_CATALOG.map((r) => r.code),
    alwaysOn: true,
  },
  {
    seed: "seed-enterprise-wave1-formulary (MEDORA_ENABLE_ENTERPRISE_WAVE1_FORMULARY=1)",
    codes: ENTERPRISE_WAVE1_FORMULARY_MANIFEST.map((r) => r.catalogCode),
    alwaysOn: false,
  },
  {
    seed: "seed-enterprise-wave2-formulary (MEDORA_ENABLE_ENTERPRISE_WAVE2_FORMULARY=1)",
    codes: ENTERPRISE_WAVE2_FORMULARY_MANIFEST.map((r) => r.catalogCode),
    alwaysOn: false,
  },
  {
    seed: "seed-enterprise-iv-fluids-catalog (seed-catalogs.ts)",
    codes: listActiveIvFluidsProviderOrderingCatalogCodes(),
    alwaysOn: true,
  },
  {
    seed: "seed-ed-critical-gap-remediation (seed-catalogs.ts)",
    codes: [],
    alwaysOn: true,
  },
  {
    seed: "seed-controlled-substance-governance (seed-catalogs.ts)",
    codes: listActiveControlledSubstanceProviderOrderingCatalogCodes(),
    alwaysOn: true,
  },
  {
    seed: "seed-billing-catalog + seed-medication-billing-mapping-remediation (seed-catalogs.ts)",
    codes: [...getActiveProviderOrderableCatalogCodes()],
    alwaysOn: true,
  },
];

function expandMedicationSearchQuery(rawQuery: string): string[] {
  const q = rawQuery.trim().toLowerCase().replace(/\s+/g, " ");
  if (!q) return [];
  const terms = new Set<string>([q]);
  const expansions = buildEnterpriseMedicationSearchQueryExpansions();
  const aliasHits = expansions[q];
  if (aliasHits) for (const alias of aliasHits) terms.add(alias.trim().toLowerCase());
  return [...terms];
}

async function catalogMedicationTextMatchOr(term: string) {
  const mode = "insensitive" as const;
  return {
    OR: [
      { code: { contains: term, mode } },
      { name: { contains: term, mode } },
      { genericName: { contains: term, mode } },
      { displayNameEn: { contains: term, mode } },
      { displayNameFr: { contains: term, mode } },
      { strength: { contains: term, mode } },
      { searchText: { contains: term, mode } },
      { dosageForm: { contains: term, mode } },
      { route: { contains: term, mode } },
    ],
  };
}

async function runSearch(query: string, activeCodes: Set<string>) {
  const q = query.trim().toLowerCase();
  const terms = expandMedicationSearchQuery(q);
  const orClauses = [];
  for (const term of terms) {
    orClauses.push(await catalogMedicationTextMatchOr(term));
  }

  const byCatalog = await prisma.catalogMedication.findMany({
    where: { isActive: true, OR: orClauses.flatMap((c) => c.OR!) },
    take: 50,
  });

  const aliasOr = terms.map((term) => ({ alias: { contains: term, mode: "insensitive" as const } }));
  const byAlias = await prisma.medicationAlias.findMany({
    where: { OR: aliasOr },
    select: { catalogMedicationId: true },
    distinct: ["catalogMedicationId"],
  });
  const aliasIds = byAlias.map((a) => a.catalogMedicationId);
  const byAliasCatalog =
    aliasIds.length > 0
      ? await prisma.catalogMedication.findMany({ where: { id: { in: aliasIds }, isActive: true } })
      : [];

  const merged = new Map<string, (typeof byCatalog)[0]>();
  for (const row of [...byCatalog, ...byAliasCatalog]) merged.set(row.id, row);

  const visible = [...merged.values()].filter(
    (row) => !shouldSuppressMedicationSearchCatalogCode(row.code, activeCodes)
  );

  return { query, terms, totalHits: merged.size, visibleHits: visible.length, codes: visible.map((r) => r.code) };
}

async function main() {
  prewarmProviderOrderableCatalogCodesRegistry();
  const activeCodes = [...getActiveProviderOrderableCatalogCodes()];
  const activeCodeSet = new Set(activeCodes);
  const orderabilityMap = buildUnifiedOrderabilityMap();

  const dbMeta = await prisma.$queryRaw<
    Array<{ db_name: string; schema_name: string }>
  >`SELECT current_database() AS db_name, current_schema() AS schema_name`;

  const migrationRows = await prisma.$queryRaw<
    Array<{ migration_name: string; finished_at: Date | null; rolled_back_at: Date | null; logs: string | null }>
  >`SELECT migration_name, finished_at, rolled_back_at, logs FROM "_prisma_migrations" ORDER BY migration_name`;

  const [
    catalogCount,
    aliasCount,
    billingCatalogCount,
    inventoryCount,
    allCatalogRows,
    duplicateCodes,
    duplicateAliases,
    duplicateDisplayEn,
    duplicateStrengths,
    legacyActiveRows,
    indexRows,
    billingCatalogMed,
    medicationBillingProfiles,
    inventoryByCatalog,
    productByLegacy,
  ] = await Promise.all([
    prisma.catalogMedication.count(),
    prisma.medicationAlias.count(),
    prisma.billingCatalog.count({ where: { triggerSource: "MEDICATION" } }),
    prisma.inventoryItem.count(),
    prisma.catalogMedication.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        genericName: true,
        displayNameEn: true,
        displayNameFr: true,
        strength: true,
        dosageForm: true,
        route: true,
        isActive: true,
        billingCodeDefault: true,
        ndc11: true,
      },
    }),
    prisma.$queryRaw<Array<{ code: string; cnt: number }>>`
      SELECT code, COUNT(*)::int AS cnt FROM "CatalogMedication" GROUP BY code HAVING COUNT(*) > 1`,
    prisma.$queryRaw<Array<{ alias: string; cnt: number }>>`
      SELECT alias, COUNT(*)::int AS cnt FROM "MedicationAlias" GROUP BY alias HAVING COUNT(*) > 1`,
    prisma.$queryRaw<Array<{ display_name: string; cnt: number }>>`
      SELECT COALESCE("displayNameEn", '') AS display_name, COUNT(*)::int AS cnt
      FROM "CatalogMedication" WHERE "isActive" = true AND COALESCE("displayNameEn", '') <> ''
      GROUP BY COALESCE("displayNameEn", '') HAVING COUNT(*) > 1 LIMIT 50`,
    prisma.$queryRaw<Array<{ strength: string; cnt: number }>>`
      SELECT COALESCE(strength, '') AS strength, COUNT(*)::int AS cnt
      FROM "CatalogMedication" WHERE "isActive" = true AND COALESCE(strength, '') <> ''
      GROUP BY COALESCE(strength, '') HAVING COUNT(*) > 1 LIMIT 50`,
    prisma.$queryRaw<Array<{ code: string }>>`
      SELECT code FROM "CatalogMedication"
      WHERE "isActive" = true AND code LIKE '%LEGACY%' LIMIT 20`,
    prisma.$queryRaw<Array<{ indexname: string; tablename: string }>>`
      SELECT indexname, tablename FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename IN ('CatalogMedication', 'MedicationAlias')
      ORDER BY indexname`,
    prisma.billingCatalog.findMany({
      where: { triggerSource: "MEDICATION" },
      select: { externalCode: true, code: true, system: true },
    }),
    prisma.$queryRaw<Array<{ catalog_code: string; profile_count: number }>>`
      SELECT cm.code AS catalog_code, COUNT(DISTINCT bp.id)::int AS profile_count
      FROM "CatalogMedication" cm
      JOIN "MedicationProduct" mp ON mp."legacyCatalogMedicationId" = cm.id
      JOIN "MedicationPackage" pkg ON pkg."productId" = mp.id
      JOIN "MedicationBillingProfile" bp ON bp."packageId" = pkg.id
      GROUP BY cm.code`,
    prisma.$queryRaw<Array<{ catalog_code: string; item_count: number }>>`
      SELECT cm.code AS catalog_code, COUNT(ii.id)::int AS item_count
      FROM "CatalogMedication" cm
      JOIN "InventoryItem" ii ON ii."catalogMedicationId" = cm.id
      GROUP BY cm.code`,
    prisma.$queryRaw<Array<{ catalog_code: string; product_count: number }>>`
      SELECT cm.code AS catalog_code, COUNT(mp.id)::int AS product_count
      FROM "CatalogMedication" cm
      JOIN "MedicationProduct" mp ON mp."legacyCatalogMedicationId" = cm.id
      GROUP BY cm.code`,
  ]);

  const catalogByCode = new Map<string, typeof allCatalogRows>();
  for (const row of allCatalogRows) {
    const list = catalogByCode.get(row.code) ?? [];
    list.push(row);
    catalogByCode.set(row.code, list);
  }

  const billingByExternal = new Map<string, typeof billingCatalogMed>();
  for (const row of billingCatalogMed) {
    const key = row.externalCode ?? "";
    const list = billingByExternal.get(key) ?? [];
    list.push(row);
    billingByExternal.set(key, list);
  }

  const profileCountByCode = new Map(medicationBillingProfiles.map((r) => [r.catalog_code, r.profile_count]));
  const inventoryCountByCode = new Map(inventoryByCatalog.map((r) => [r.catalog_code, r.item_count]));
  const productCountByCode = new Map(productByLegacy.map((r) => [r.catalog_code, r.product_count]));

  const localMigrations = localMigrationNames();
  const prodMigrationNames = migrationRows.map((r) => r.migration_name);
  const missingInProd = localMigrations.filter((m) => !prodMigrationNames.includes(m));
  const extraInProd = prodMigrationNames.filter((m) => !localMigrations.includes(m));
  const failedMigrations = migrationRows.filter(
    (r) => !r.finished_at && !r.rolled_back_at
  );
  const rolledBackHistorical = migrationRows.filter((r) => r.rolled_back_at && !r.finished_at);

  const connectionReport = {
    ticket: TICKET,
    databaseName: dbMeta[0]?.db_name ?? "unknown",
    schema: dbMeta[0]?.schema_name ?? "unknown",
    host: maskDatabaseUrl(process.env.DATABASE_PUBLIC_URL ?? process.env.DATABASE_URL),
    migrationCount: prodMigrationNames.length,
    latestMigration: prodMigrationNames[prodMigrationNames.length - 1] ?? null,
    catalogMedicationRowCount: catalogCount,
    medicationAliasRowCount: aliasCount,
    billingRowCount: billingCatalogCount,
    inventoryRowCount: inventoryCount,
    isProductionHost: !maskDatabaseUrl(process.env.DATABASE_PUBLIC_URL ?? process.env.DATABASE_URL).includes("localhost"),
  };

  const registryRows: Array<{
    catalogCode: string;
    classification: RegistryClassification;
    mismatches?: string[];
  }> = [];

  for (const code of activeCodes) {
    const dbRows = catalogByCode.get(code) ?? [];
    const expected = orderabilityMap.get(code);
    if (dbRows.length === 0) {
      registryRows.push({ catalogCode: code, classification: "MISSING_DB_ROW" });
      continue;
    }
    if (dbRows.length > 1) {
      registryRows.push({ catalogCode: code, classification: "DUPLICATE_DB_ROW" });
      continue;
    }
    const db = dbRows[0]!;
    const mismatches: string[] = [];
    if (!db.isActive) mismatches.push("isActive=false");
    if (expected) {
      if (!fieldsMatch(expected.genericName, db.genericName)) mismatches.push("genericName");
      if (!fieldsMatch(expected.displayNameEn, db.displayNameEn)) mismatches.push("displayNameEn");
      if (!fieldsMatch(expected.displayNameFr, db.displayNameFr ?? db.name)) mismatches.push("displayNameFr");
      if (!fieldsMatch(expected.strength, db.strength)) mismatches.push("strength");
      if (!fieldsMatch(expected.dosageForm, db.dosageForm)) mismatches.push("dosageForm");
      if (!fieldsMatch(expected.route, db.route)) mismatches.push("route");
    }
    registryRows.push({
      catalogCode: code,
      classification: mismatches.length ? "DB_METADATA_MISMATCH" : "MATCH",
      ...(mismatches.length ? { mismatches } : {}),
    });
  }

  const registryReport = {
    activeRegistryCount: activeCodes.length,
    match: registryRows.filter((r) => r.classification === "MATCH").length,
    missingDbRow: registryRows.filter((r) => r.classification === "MISSING_DB_ROW").length,
    dbMetadataMismatch: registryRows.filter((r) => r.classification === "DB_METADATA_MISMATCH").length,
    duplicateDbRow: registryRows.filter((r) => r.classification === "DUPLICATE_DB_ROW").length,
    missingCodes: registryRows.filter((r) => r.classification === "MISSING_DB_ROW").map((r) => r.catalogCode),
    mismatchSamples: registryRows.filter((r) => r.classification === "DB_METADATA_MISMATCH").slice(0, 25),
  };

  const formularyReport = {
    domains: FORMULARY_DOMAINS.map(({ domain, codes }) => {
      const manifestCodes = [...new Set(codes())];
      const missing = manifestCodes.filter((c) => !(catalogByCode.get(c)?.length));
      const duplicates = manifestCodes.filter((c) => (catalogByCode.get(c)?.length ?? 0) > 1);
      const dbPresent = manifestCodes.filter((c) => (catalogByCode.get(c)?.length ?? 0) === 1);
      return {
        domain,
        manifestCount: manifestCodes.length,
        dbCount: dbPresent.length,
        missingRows: missing,
        duplicateRows: duplicates,
      };
    }),
  };

  const billingRows: Array<{ catalogCode: string; classification: BillingClassification; detail?: string }> = [];
  for (const code of activeCodes) {
    const manifest = resolveMedicationBillingReadiness(code);
    const dbRow = catalogByCode.get(code)?.[0];
    const billingEntries = billingByExternal.get(code) ?? [];
    const profileCount = profileCountByCode.get(code) ?? 0;

    if (!manifest.billingReady && !manifest.ndcReady) {
      billingRows.push({ catalogCode: code, classification: "MISSING", detail: "no manifest billing spec" });
      continue;
    }

    const hasHcpcs = Boolean(
      manifest.hcpcs?.trim() &&
        (dbRow?.billingCodeDefault?.trim() === manifest.hcpcs?.trim() ||
          billingEntries.some((b) => b.code === manifest.hcpcs && b.system === "HCPCS"))
    );
    const hasNdc = Boolean(manifest.ndc11 && dbRow?.ndc11?.trim() === manifest.ndc11?.trim());
    const hasProfile = profileCount > 0;

    if (billingEntries.length > 1) {
      billingRows.push({ catalogCode: code, classification: "DUPLICATE" });
    } else if (hasHcpcs && (hasNdc || !manifest.ndcReady) && (hasProfile || billingEntries.length > 0)) {
      billingRows.push({ catalogCode: code, classification: "READY" });
    } else if (hasHcpcs || hasNdc || hasProfile || billingEntries.length > 0) {
      billingRows.push({ catalogCode: code, classification: "PARTIAL", detail: `hcpcs=${hasHcpcs} ndc=${hasNdc} profile=${hasProfile}` });
    } else {
      billingRows.push({ catalogCode: code, classification: "MISSING" });
    }
  }

  const billingReport = {
    activeMedicationCount: activeCodes.length,
    ready: billingRows.filter((r) => r.classification === "READY").length,
    partial: billingRows.filter((r) => r.classification === "PARTIAL").length,
    missing: billingRows.filter((r) => r.classification === "MISSING").length,
    duplicate: billingRows.filter((r) => r.classification === "DUPLICATE").length,
    partialSamples: billingRows.filter((r) => r.classification === "PARTIAL").slice(0, 25),
    missingSamples: billingRows.filter((r) => r.classification === "MISSING").slice(0, 25),
  };

  const inventoryRows = activeCodes.map((code) => {
    const dbRow = catalogByCode.get(code)?.[0];
    const invCount = inventoryCountByCode.get(code) ?? 0;
    const productCount = productCountByCode.get(code) ?? 0;
    return {
      catalogCode: code,
      catalogExists: Boolean(dbRow),
      inventoryItemCount: invCount,
      medicationProductCount: productCount,
      packageMapped: productCount > 0,
      ready: Boolean(dbRow && (invCount > 0 || productCount > 0)),
    };
  });

  const inventoryReport = {
    activeMedicationCount: activeCodes.length,
    withInventoryItems: inventoryRows.filter((r) => r.inventoryItemCount > 0).length,
    withMedicationProduct: inventoryRows.filter((r) => r.medicationProductCount > 0).length,
    withNeither: inventoryRows.filter((r) => !r.ready).length,
    missingSamples: inventoryRows.filter((r) => !r.ready).slice(0, 25).map((r) => r.catalogCode),
  };

  const searchResults = [];
  for (const query of SEARCH_QUERIES) {
    const result = await runSearch(query, activeCodeSet);
    const expected = [...orderabilityMap.values()].find((r) => {
      const blob = `${r.displayNameEn} ${r.genericName} ${r.catalogCode}`.toLowerCase();
      return blob.includes(query.toLowerCase()) || query.toLowerCase().includes(r.genericName.toLowerCase());
    });
    searchResults.push({
      query,
      appears: result.visibleHits > 0,
      visibleCodes: result.codes,
      duplicateSuppressed: result.totalHits > result.visibleHits,
      canonicalCode: expected?.catalogCode ?? null,
      canonicalInResults: expected ? result.codes.includes(expected.catalogCode) : null,
      aliasResolution: result.terms.length > 1,
    });
  }

  const searchReport = {
    queriesRun: SEARCH_QUERIES.length,
    appears: searchResults.filter((r) => r.appears).length,
    missing: searchResults.filter((r) => !r.appears).map((r) => r.query),
    results: searchResults,
  };

  const runtimeRows = [];
  for (const code of RUNTIME_REPRESENTATIVE_CODES) {
    const dbRow = catalogByCode.get(code)?.[0];
    const expected = orderabilityMap.get(code);
    const registryOk = validateProviderOrderPlacementForCatalogCode(code) === null;
    const marGate = evaluateMedicationOrderScheduleCreateGate({
      frequencyCode: "BID",
      featureFlags: { medicationDoseSchedulingEnabled: true },
      catalog: dbRow
        ? {
            code: dbRow.code,
            route: dbRow.route,
            administrationType: expected?.administrationType ?? null,
            dosageForm: dbRow.dosageForm,
            genericName: dbRow.genericName,
          }
        : null,
      orderRoute: expected?.route ?? dbRow?.route ?? "PO",
    });

    const orderDto = expected
      ? orderCreateDtoSchema.safeParse({
          type: "MEDICATION",
          catalogMedicationCode: code,
          medicationName: expected.displayNameEn,
          dose: "1",
          doseUnit: "mg",
          route: expected.route,
          frequency: "ONCE",
          priority: "ROUTINE",
        })
      : { success: false as const };

    runtimeRows.push({
      catalogCode: code,
      searchSupported: Boolean(dbRow?.isActive),
      selectionSupported: registryOk,
      orderCreateDtoValid: orderDto.success,
      orderPersistenceReady: Boolean(dbRow?.isActive && registryOk),
      marScheduleEligible: marGate.shouldCreate,
      marScheduleReason: marGate.reason ?? null,
      painReassessmentApplicable: code.includes("MORPHINE") || code.includes("HYDROMORPHONE") || code.includes("FENTANYL"),
      dbRowPresent: Boolean(dbRow),
      productChainPresent: (productCountByCode.get(code) ?? 0) > 0,
    });
  }

  const runtimeReport = {
    note: "Read-only validation; no patient orders persisted.",
    representativeCount: RUNTIME_REPRESENTATIVE_CODES.length,
    fullyReady: runtimeRows.filter(
      (r) => r.dbRowPresent && r.selectionSupported && r.orderCreateDtoValid && r.marScheduleEligible
    ).length,
    rows: runtimeRows,
  };

  const missingActiveCodes = registryRows.filter((r) => r.classification === "MISSING_DB_ROW").map((r) => r.catalogCode);
  const seedAttribution: Array<{ seed: string; alwaysOn: boolean; missingCodes: string[] }> = [];
  for (const pipeline of SEED_PIPELINES) {
    if (!pipeline.codes.length) continue;
    const missing = missingActiveCodes.filter((c) => pipeline.codes.includes(c));
    if (missing.length) seedAttribution.push({ seed: pipeline.seed, alwaysOn: pipeline.alwaysOn, missingCodes: missing });
  }

  const seedReport = {
    requiresSeed: missingActiveCodes.length > 0 || missingInProd.length > 0,
    missingActiveCatalogCodes: missingActiveCodes.length,
    seedAttribution,
    flagGatedSeedsPossiblyRequired: seedAttribution.filter((s) => !s.alwaysOn),
    alwaysOnSeedsWithGaps: seedAttribution.filter((s) => s.alwaysOn),
  };

  const migrationReport = {
    localMigrationCount: localMigrations.length,
    productionMigrationCount: prodMigrationNames.length,
    missingInProduction: missingInProd,
    extraInProduction: extraInProd,
    failedOrRolledBack: failedMigrations.map((r) => ({
      migration_name: r.migration_name,
      finished_at: r.finished_at,
      rolled_back_at: r.rolled_back_at,
    })),
    rolledBackHistoricalCount: rolledBackHistorical.length,
    latestLocal: localMigrations[localMigrations.length - 1] ?? null,
    latestProduction: prodMigrationNames[prodMigrationNames.length - 1] ?? null,
    inSync: missingInProd.length === 0 && failedMigrations.length === 0,
  };

  const duplicateReport = {
    duplicateCatalogCodes: duplicateCodes,
    duplicateAliases: duplicateAliases.slice(0, 25),
    duplicateDisplayNamesEn: duplicateDisplayEn,
    duplicateStrengths: duplicateStrengths.slice(0, 25),
    legacyActiveRows: legacyActiveRows.map((r) => r.code),
  };

  const presentIndexes = new Set(indexRows.map((r) => r.indexname));
  const performanceReport = {
    expectedIndexes: EXPECTED_INDEXES,
    present: EXPECTED_INDEXES.filter((i) => presentIndexes.has(i)),
    missing: EXPECTED_INDEXES.filter((i) => !presentIndexes.has(i)),
    allCatalogMedicationIndexes: indexRows.filter((r) => r.tablename === "CatalogMedication").map((r) => r.indexname),
    allMedicationAliasIndexes: indexRows.filter((r) => r.tablename === "MedicationAlias").map((r) => r.indexname),
  };

  type Priority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  const remediation: Array<{
    priority: Priority;
    issue: string;
    rootCause: string;
    file: string;
    migrationRequired: boolean;
    seedRequired: boolean;
    rebuildRequired: boolean;
    productionImpact: string;
  }> = [];

  if (!connectionReport.isProductionHost) {
    remediation.push({
      priority: "CRITICAL",
      issue: "Audit not connected to production Railway host",
      rootCause: "DATABASE_URL points to localhost",
      file: "apps/api/.env",
      migrationRequired: false,
      seedRequired: false,
      rebuildRequired: false,
      productionImpact: "Cannot certify production DB from local database",
    });
  }

  for (const code of registryReport.missingCodes.slice(0, 50)) {
    remediation.push({
      priority: "CRITICAL",
      issue: `Active registry code missing in production CatalogMedication: ${code}`,
      rootCause: "Enterprise seed not applied or catalog row never created",
      file: "apps/api/prisma/seed-catalogs.ts",
      migrationRequired: false,
      seedRequired: true,
      rebuildRequired: false,
      productionImpact: "Provider cannot order medication in production",
    });
  }

  for (const m of missingInProd) {
    remediation.push({
      priority: "CRITICAL",
      issue: `Production missing migration: ${m}`,
      rootCause: "prisma migrate deploy not run on production",
      file: `apps/api/prisma/migrations/${m}/migration.sql`,
      migrationRequired: true,
      seedRequired: false,
      rebuildRequired: false,
      productionImpact: "Schema drift may block seeds, search indexes, or order workflows",
    });
  }

  for (const idx of performanceReport.missing) {
    remediation.push({
      priority: "HIGH",
      issue: `Missing production index: ${idx}`,
      rootCause: "Migration 20260910140000_catalog_medication_search_indexes not applied",
      file: "apps/api/prisma/migrations/20260910140000_catalog_medication_search_indexes/migration.sql",
      migrationRequired: true,
      seedRequired: false,
      rebuildRequired: false,
      productionImpact: "Medication search latency and CPU load elevated",
    });
  }

  for (const row of registryReport.mismatchSamples) {
    remediation.push({
      priority: "MEDIUM",
      issue: `Metadata mismatch for ${row.catalogCode}: ${row.mismatches?.join(", ")}`,
      rootCause: "Catalog enrichment seed not re-run after manifest update",
      file: "apps/api/prisma/helpers/seed-enterprise-wave*-formulary.ts",
      migrationRequired: false,
      seedRequired: true,
      rebuildRequired: false,
      productionImpact: "Search labels or order display may differ from certified manifests",
    });
  }

  for (const q of searchReport.missing) {
    remediation.push({
      priority: "HIGH",
      issue: `Production search missing representative query: ${q}`,
      rootCause: "Missing catalog row, alias, or searchText backfill",
      file: "apps/api/prisma/helpers/seed-enterprise-medication-search-aliases.ts",
      migrationRequired: false,
      seedRequired: true,
      rebuildRequired: false,
      productionImpact: "Clinicians cannot find medication via common search terms",
    });
  }

  let finalDecision:
    | "PRODUCTION_DB_FULLY_CERTIFIED"
    | "PRODUCTION_DB_REQUIRES_SEED"
    | "PRODUCTION_DB_REQUIRES_MIGRATION"
    | "PRODUCTION_DB_OUT_OF_SYNC";

  if (!connectionReport.isProductionHost) {
    finalDecision = "PRODUCTION_DB_OUT_OF_SYNC";
  } else if (missingInProd.length > 0 || failedMigrations.length > 0) {
    finalDecision = "PRODUCTION_DB_REQUIRES_MIGRATION";
  } else if (registryReport.missingDbRow > 0 || seedReport.requiresSeed) {
    finalDecision = "PRODUCTION_DB_REQUIRES_SEED";
  } else if (
    registryReport.dbMetadataMismatch > 0 ||
    billingReport.missing > 0 ||
    searchReport.missing.length > 0 ||
    performanceReport.missing.length > 0
  ) {
    finalDecision = "PRODUCTION_DB_OUT_OF_SYNC";
  } else {
    finalDecision = "PRODUCTION_DB_FULLY_CERTIFIED";
  }

  const report = {
    ticket: TICKET,
    generatedAt: new Date().toISOString(),
    finalDecision,
    ProductionDatabaseConnectionReport: connectionReport,
    ProductionRegistryParityReport: registryReport,
    EnterpriseFormularyParityReport: formularyReport,
    ProductionBillingParityReport: billingReport,
    ProductionInventoryParityReport: inventoryReport,
    ProductionSearchParityReport: searchReport,
    ProductionRuntimeParityReport: runtimeReport,
    ProductionSeedParityReport: seedReport,
    ProductionMigrationParityReport: migrationReport,
    ProductionDuplicateParityReport: duplicateReport,
    ProductionPerformanceParityReport: performanceReport,
    ProductionParityRemediationPlan: {
      critical: remediation.filter((r) => r.priority === "CRITICAL"),
      high: remediation.filter((r) => r.priority === "HIGH"),
      medium: remediation.filter((r) => r.priority === "MEDIUM"),
      low: remediation.filter((r) => r.priority === "LOW"),
    },
    CompatibilityAudit: {
      readOnly: true,
      productionDataModified: false,
      manifestRegistryCompared: true,
      activeProviderOrderableCount: activeCodes.length,
    },
    ExactFilesChanged: [
      "apps/api/scripts/production-db-seed-parity-audit.ts",
      "apps/api/package.json",
      "exports/production-db-seed-parity-audit.json",
    ],
    RecommendedCommitMessage: "audit(meds): production database seed parity audit",
  };

  const repoRoot = join(__dirname, "../../..");
  const outDir = join(repoRoot, "exports");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "production-db-seed-parity-audit.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2));

  console.log(
    JSON.stringify(
      {
        finalDecision,
        exportPath: outPath,
        connection: connectionReport,
        registry: {
          match: registryReport.match,
          missing: registryReport.missingDbRow,
          mismatch: registryReport.dbMetadataMismatch,
        },
        migrations: { missingInProduction: missingInProd.length, inSync: migrationReport.inSync },
        searchMissing: searchReport.missing,
      },
      null,
      2
    )
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
