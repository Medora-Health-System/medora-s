import type { PrismaClient } from "@prisma/client";
import {
  HAITI_M15R_CATALOG_DESCRIPTION_PREFIX,
  HAITI_M15R_CATALOG_SEARCH_REMEDIATED_MARKER,
  HAITI_M15R_LINK_UNLINKED_MARKER,
} from "../../src/medication-master/haiti-canonical-stabilization-remediation.constants";
import { loadHaitiCanonicalStabilizationRemediationSeedModules } from "./haiti-canonical-stabilization-remediation-seed-modules";

export class HaitiCanonicalStabilizationRemediationError extends Error {
  readonly details: ReadonlyArray<{ id: string; reason: string }>;

  constructor(message: string, details: ReadonlyArray<{ id: string; reason: string }>) {
    super(message);
    this.name = "HaitiCanonicalStabilizationRemediationError";
    this.details = details;
  }
}

export type AuditHaitiCanonicalStabilizationOptions = {
  /** Simulate post-remediation for M1.5H recheck scoring. */
  assumeRemediationApplied?: boolean;
};

export type AuditHaitiCanonicalStabilizationResult = {
  catalogActive: number;
  catalogTotal: number;
  productsWithLegacyLink: number;
  linkAudit: {
    correct: number;
    incorrect: number;
    missing: number;
    duplicate: number;
    quarantined: number;
    totalLinkedProducts: number;
  };
  manifestMissingLinks: number;
  activePollutionCatalogs: number;
  pollutionCatalogBreakdown: { acet19g: number; baseline19g: number };
  m15eMarkerCount: number;
  m15gPilotCount: number;
  m15eReadiness: Awaited<
    ReturnType<
      Awaited<ReturnType<typeof loadHaitiCanonicalStabilizationRemediationSeedModules>>["validateM15eBackfillReadiness"]
    >
  >;
  quarantineEnforcement: { pass: boolean };
  stabilizationScores: Awaited<
    ReturnType<
      Awaited<ReturnType<typeof loadHaitiCanonicalStabilizationRemediationSeedModules>>["computeStabilizationScores"]
    >
  >;
  searchValidation: Awaited<
    ReturnType<
      Awaited<ReturnType<typeof loadHaitiCanonicalStabilizationRemediationSeedModules>>["validateSearchScenarios"]
    >
  >;
  m15hRecheck: Awaited<
    ReturnType<
      Awaited<ReturnType<typeof loadHaitiCanonicalStabilizationRemediationSeedModules>>["evaluateM15hRecheckAfterRemediation"]
    >
  >;
  gates: {
    readyForM15eStaging: boolean;
    readyForM15gPilot: boolean;
    readyForM16a: boolean;
  };
};

export type RemediateHaitiCanonicalStabilizationOptions = {
  dryRun?: boolean;
};

export type RemediateHaitiCanonicalStabilizationResult = {
  dryRun: boolean;
  unlinkedInvalidProducts: number;
  deactivatedPollutionCatalogs: number;
  skippedAlreadyRemediated: number;
  failures: Array<{ id: string; reason: string }>;
  postAudit: AuditHaitiCanonicalStabilizationResult;
};

function appendDescriptionMarker(existing: string | null, marker: string): string {
  const base = (existing ?? "").trim();
  if (base.includes(marker)) return base;
  return base ? `${base}\n${marker}` : marker;
}

function appendGovernanceMarker(existing: string | null, marker: string): string {
  const base = (existing ?? "").trim();
  if (base.includes(marker)) return base;
  return base ? `${base}\n${marker}` : marker;
}

/**
 * M1.5R Part 1 — Root-cause / linkage inventory (read-only).
 */
export async function auditHaitiCanonicalStabilization(
  prisma: PrismaClient,
  options: AuditHaitiCanonicalStabilizationOptions = {}
): Promise<AuditHaitiCanonicalStabilizationResult> {
  const modules = await loadHaitiCanonicalStabilizationRemediationSeedModules();
  const assume = options.assumeRemediationApplied === true;

  const [catalogActive, catalogTotal, m15eMarkerCount, m15gPilotCount, linkedProducts] =
    await Promise.all([
      prisma.catalogMedication.count({ where: { isActive: true } }),
      prisma.catalogMedication.count(),
      prisma.medicationProduct.count({
        where: { governanceNotes: { contains: "HAITI_M15E_CANONICAL_LINKAGE_ONLY" } },
      }),
      prisma.medicationProduct.count({
        where: { governanceNotes: { contains: "HAITI_M15G_PILOT_ACTIVATED" } },
      }),
      prisma.medicationProduct.findMany({
        where: { legacyCatalogMedicationId: { not: null } },
        select: {
          id: true,
          code: true,
          baselineAvailable: true,
          legacyCatalogMedicationId: true,
          concept: { select: { genericName: true } },
        },
      }),
    ]);

  const catalogById = new Map(
    (
      await prisma.catalogMedication.findMany({
        where: {
          id: {
            in: linkedProducts
              .map((p) => p.legacyCatalogMedicationId)
              .filter((id): id is string => id != null),
          },
        },
        select: { id: true, code: true, genericName: true, isActive: true },
      })
    ).map((c) => [c.id, c])
  );

  const auditRows = linkedProducts.map((p) =>
    modules.classifyLegacyLinkRow({
      productId: p.id,
      productCode: p.code,
      conceptGenericName: p.concept.genericName,
      baselineAvailable: p.baselineAvailable,
      legacyCatalogMedicationId: p.legacyCatalogMedicationId,
      catalogCode: p.legacyCatalogMedicationId
        ? (catalogById.get(p.legacyCatalogMedicationId)?.code ?? null)
        : null,
      catalogExists: p.legacyCatalogMedicationId
        ? catalogById.has(p.legacyCatalogMedicationId)
        : false,
    })
  );

  const duplicateCatalogIds = modules.detectDuplicateLegacyLinks(
    linkedProducts.map((p) => ({
      productId: p.id,
      legacyCatalogMedicationId: p.legacyCatalogMedicationId,
    }))
  );
  for (const catalogId of duplicateCatalogIds) {
    for (const row of auditRows.filter((r) => r.catalogId === catalogId)) {
      row.classification = "DUPLICATE";
      row.reason = "multiple products share legacyCatalogMedicationId";
    }
  }

  const linkAudit = modules.summarizeLegacyLinkAudit(auditRows);

  const linkedCatalogCodes = new Set(
    linkedProducts
      .map((p) => p.legacyCatalogMedicationId && catalogById.get(p.legacyCatalogMedicationId)?.code)
      .filter((c): c is string => Boolean(c))
  );

  let manifestMissingLinks = 0;
  for (const entry of modules.HAITI_CANONICAL_LINKAGE_MANIFEST) {
    if (entry.linkageStatus !== "MISSING_CANONICAL_TARGET") continue;
    if (!linkedCatalogCodes.has(entry.catalogMedicationCode)) manifestMissingLinks += 1;
  }

  const activeCatalogs = await prisma.catalogMedication.findMany({
    where: { isActive: true },
    select: { id: true, code: true, genericName: true, isActive: true, description: true },
  });

  let activePollutionCatalogs = 0;
  let acet19g = 0;
  let baseline19g = 0;
  for (const row of activeCatalogs) {
    if (!modules.isProviderSearchPollutionCatalogCode(row.code)) continue;
    if (assume && row.description?.includes(HAITI_M15R_CATALOG_SEARCH_REMEDIATED_MARKER)) {
      continue;
    }
    activePollutionCatalogs += 1;
    if (row.code.toUpperCase().startsWith("19G1-ACET")) acet19g += 1;
    else baseline19g += 1;
  }

  const incorrectLinks = assume ? 0 : linkAudit.incorrect + linkAudit.quarantined;

  const existingCodes = await prisma.medicationProduct.findMany({ select: { code: true } });
  const m15eReadiness = modules.validateM15eBackfillReadiness(
    existingCodes.map((r) => r.code)
  );
  const quarantineEnforcement = modules.validateQuarantineRemediationEnforcement();

  const searchHits = activeCatalogs
    .filter((c) => !modules.isProviderSearchPollutionCatalogCode(c.code) || assume)
    .map((c) => ({ code: c.code, genericName: c.genericName }));

  const searchValidation = modules.validateSearchScenarios(
    assume
      ? searchHits
      : activeCatalogs.map((c) => ({ code: c.code, genericName: c.genericName }))
  );

  const acetScenario = searchValidation.find((s) => s.query === "acetaminophen");

  const m15hRecheck = modules.evaluateM15hRecheckAfterRemediation({
    incorrectLinks,
    quarantinedLinks: assume ? 0 : linkAudit.quarantined,
    activePollutionCatalogs,
    m15eMarkers: m15eMarkerCount,
    acetSearchCloneHits: acetScenario?.cloneHits ?? 0,
  });

  const stabilizationScores = modules.computeStabilizationScores({
    linkAudit: assume
      ? { ...linkAudit, incorrect: 0, quarantined: 0, totalLinkedProducts: linkAudit.totalLinkedProducts }
      : linkAudit,
    activePollutionCatalogs,
    m15eReadinessScore: m15eReadiness.score,
    searchScenariosPass: searchValidation.every((s) => s.pass),
  });

  const gates = modules.remediationGateDecisions({
    incorrectLinks,
    activePollutionCatalogs,
    m15eReadinessScore: m15eReadiness.score,
    m15hRecheck,
  });

  return {
    catalogActive,
    catalogTotal,
    productsWithLegacyLink: linkedProducts.length,
    linkAudit: {
      correct: linkAudit.correct,
      incorrect: assume ? 0 : linkAudit.incorrect,
      missing: linkAudit.missing,
      duplicate: linkAudit.duplicate,
      quarantined: assume ? 0 : linkAudit.quarantined,
      totalLinkedProducts: linkAudit.totalLinkedProducts,
    },
    manifestMissingLinks,
    activePollutionCatalogs,
    pollutionCatalogBreakdown: { acet19g, baseline19g },
    m15eMarkerCount,
    m15gPilotCount,
    m15eReadiness,
    quarantineEnforcement,
    stabilizationScores,
    searchValidation,
    m15hRecheck,
    gates,
  };
}

/**
 * M1.5R Parts 2–4 — Remediate invalid legacy links + deactivate search-pollution catalog rows.
 * No deletes. Orders/MAR/billing historical FKs preserved on catalog rows.
 */
export async function remediateHaitiCanonicalStabilization(
  prisma: PrismaClient,
  options: RemediateHaitiCanonicalStabilizationOptions = {}
): Promise<RemediateHaitiCanonicalStabilizationResult> {
  const dryRun = options.dryRun !== false;
  const modules = await loadHaitiCanonicalStabilizationRemediationSeedModules();
  const pre = await auditHaitiCanonicalStabilization(prisma);

  const failures: Array<{ id: string; reason: string }> = [];
  let unlinkedInvalidProducts = 0;
  let deactivatedPollutionCatalogs = 0;
  let skippedAlreadyRemediated = 0;

  const linkedProducts = await prisma.medicationProduct.findMany({
    where: { legacyCatalogMedicationId: { not: null } },
    include: { concept: { select: { genericName: true } } },
  });

  const catalogById = new Map(
    (
      await prisma.catalogMedication.findMany({
        where: {
          id: {
            in: linkedProducts
              .map((p) => p.legacyCatalogMedicationId)
              .filter((id): id is string => id != null),
          },
        },
        select: { id: true, code: true },
      })
    ).map((c) => [c.id, c])
  );

  for (const product of linkedProducts) {
    const catalogCode = product.legacyCatalogMedicationId
      ? (catalogById.get(product.legacyCatalogMedicationId)?.code ?? null)
      : null;

    const invalid = modules.isInvalidLegacyLinkage({
      productId: product.id,
      productCode: product.code,
      conceptGenericName: product.concept.genericName,
      baselineAvailable: product.baselineAvailable,
      legacyCatalogMedicationId: product.legacyCatalogMedicationId,
      catalogCode,
      catalogExists: product.legacyCatalogMedicationId
        ? catalogById.has(product.legacyCatalogMedicationId)
        : false,
    });

    if (!invalid) continue;

    if (dryRun) {
      unlinkedInvalidProducts += 1;
      continue;
    }

    await prisma.medicationProduct.update({
      where: { id: product.id },
      data: {
        legacyCatalogMedicationId: null,
        governanceNotes: appendGovernanceMarker(
          product.governanceNotes,
          `${HAITI_M15R_LINK_UNLINKED_MARKER} catalog=${catalogCode ?? "unknown"}`
        ),
      },
    });
    unlinkedInvalidProducts += 1;
  }

  const pollutionCatalogs = await prisma.catalogMedication.findMany({
    where: { isActive: true },
    select: { id: true, code: true, description: true },
  });

  for (const catalog of pollutionCatalogs) {
    if (!modules.isProviderSearchPollutionCatalogCode(catalog.code)) continue;
    if (catalog.description?.includes(HAITI_M15R_CATALOG_SEARCH_REMEDIATED_MARKER)) {
      skippedAlreadyRemediated += 1;
      continue;
    }

    if (dryRun) {
      deactivatedPollutionCatalogs += 1;
      continue;
    }

    await prisma.catalogMedication.update({
      where: { id: catalog.id },
      data: {
        isActive: false,
        description: appendDescriptionMarker(
          catalog.description,
          `${HAITI_M15R_CATALOG_DESCRIPTION_PREFIX}\n${HAITI_M15R_CATALOG_SEARCH_REMEDIATED_MARKER}`
        ),
      },
    });
    deactivatedPollutionCatalogs += 1;
  }

  if (
    !dryRun &&
    failures.some((f) => f.reason.toLowerCase().includes("quarantine"))
  ) {
    throw new HaitiCanonicalStabilizationRemediationError(
      "[m15r] remediation blocked by quarantine violation",
      failures
    );
  }

  const postAudit = await auditHaitiCanonicalStabilization(prisma, {
    assumeRemediationApplied: dryRun,
  });

  return {
    dryRun,
    unlinkedInvalidProducts,
    deactivatedPollutionCatalogs,
    skippedAlreadyRemediated,
    failures,
    postAudit,
  };
}

/** Rollback M1.5R catalog deactivations (does not restore invalid product links). */
export async function rollbackHaitiCanonicalStabilizationCatalogRemediation(
  prisma: PrismaClient,
  options: { dryRun?: boolean } = {}
): Promise<{ dryRun: boolean; reactivatedCatalogs: number }> {
  const dryRun = options.dryRun !== false;
  const rows = await prisma.catalogMedication.findMany({
    where: { description: { contains: HAITI_M15R_CATALOG_SEARCH_REMEDIATED_MARKER } },
    select: { id: true, description: true },
  });

  let reactivatedCatalogs = 0;
  for (const row of rows) {
    if (dryRun) {
      reactivatedCatalogs += 1;
      continue;
    }
    const description = (row.description ?? "")
      .split("\n")
      .filter(
        (line) =>
          !line.includes(HAITI_M15R_CATALOG_SEARCH_REMEDIATED_MARKER) &&
          !line.includes(HAITI_M15R_CATALOG_DESCRIPTION_PREFIX)
      )
      .join("\n")
      .trim();

    await prisma.catalogMedication.update({
      where: { id: row.id },
      data: { isActive: true, description: description || null },
    });
    reactivatedCatalogs += 1;
  }

  return { dryRun, reactivatedCatalogs };
}
