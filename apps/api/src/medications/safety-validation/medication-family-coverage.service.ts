import type { PrismaClient } from "@prisma/client";
import {
  EM_BATCH_MEDICATION_FAMILIES,
  MEDICATION_COVERAGE_DOMAIN_VALUES,
  MEDICATION_COVERAGE_DOMAIN_WEIGHTS,
  PHASE11_COVERAGE_CALCULATION_VERSION,
  allCriticalGatesPass,
  computeWeightedCoverageScore,
  evaluateCriticalCoverageGates,
  type MedicationCoverageDomain,
  type MedicationFamilyCoverageStatus,
} from "@medora/shared";

export type MedicationInventorySnapshot = {
  TotalMedicationConcepts: number;
  TotalMedicationProducts: number;
  TotalMedicationPackages: number;
  TotalCatalogMedications: number;
  ActiveCatalogMedications: number;
  CanonicalConceptsWithProducts: number;
  ConceptsWithoutProducts: number;
  ProductsWithoutCanonicalConcept: number;
  ProductsWithoutCatalogEntry: number;
  CatalogEntriesWithoutCanonicalProduct: number;
  Phase7PilotFamilies: number;
  Phase7ImportedFamilies: number;
  Phase7ApprovedFamilies: number;
  EmergencyMedicineMedicationFamilies: number;
  EmergencyMedicineMedicationFamilyNames: string[];
  TherapeuticClasses: number;
  TherapeuticClassMemberships: number;
  DuplicateTherapyGroups: number;
  AllergenMappings: number;
  ApprovedClinicalProfiles: number;
  ApprovedSafetyKnowledgeRecords: number;
  sampleSource: "database+governed-manifest";
};

function normalizeFamilyName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function familyKeyFromName(name: string): string {
  return `FAM_${normalizeFamilyName(name).replace(/[^a-z0-9]+/g, "_")}`.toUpperCase();
}

export async function collectMedicationInventory(
  prisma: PrismaClient
): Promise<MedicationInventorySnapshot> {
  const [
    TotalMedicationConcepts,
    TotalMedicationProducts,
    TotalMedicationPackages,
    TotalCatalogMedications,
    ActiveCatalogMedications,
    TherapeuticClasses,
    TherapeuticClassMemberships,
    DuplicateTherapyGroups,
    AllergenMappings,
    ApprovedClinicalProfiles,
    approvedInteractions,
    approvedCross,
    CanonicalConceptsWithProducts,
    ConceptsWithoutProducts,
    ProductsWithoutCatalogEntry,
    CatalogEntriesWithoutCanonicalProduct,
  ] = await Promise.all([
    prisma.medicationConcept.count(),
    prisma.medicationProduct.count(),
    prisma.medicationPackage.count(),
    prisma.catalogMedication.count(),
    prisma.catalogMedication.count({ where: { isActive: true } }),
    prisma.medicationTherapeuticClass.count(),
    prisma.medicationTherapeuticClassMembership.count(),
    prisma.medicationDuplicateTherapyGroup.count(),
    prisma.medicationAllergenMapping.count({ where: { status: "APPROVED" } }),
    prisma.medicationClinicalProfile.count({ where: { lifecycleStatus: "APPROVED" } }),
    prisma.medicationDrugInteraction.count({ where: { status: "APPROVED" } }),
    prisma.medicationAllergyCrossReactivityRule.count({ where: { status: "APPROVED" } }),
    prisma.medicationConcept.count({ where: { products: { some: {} } } }),
    prisma.medicationConcept.count({ where: { products: { none: {} } } }),
    prisma.medicationProduct.count({ where: { legacyCatalogMedicationId: null } }),
    (async () => {
      const linked = await prisma.medicationProduct.count({
        where: { legacyCatalogMedicationId: { not: null } },
      });
      const total = await prisma.catalogMedication.count();
      return Math.max(0, total - linked);
    })(),
  ]);

  // Products always require conceptId in schema; orphan count is structurally 0.
  const ProductsWithoutCanonicalConcept = 0;

  let Phase7PilotFamilies = 0;
  let Phase7ImportedFamilies = 0;
  let Phase7ApprovedFamilies = 0;
  try {
    Phase7PilotFamilies = await (prisma as any).medicationPilotManifestItem?.count?.() ?? 0;
  } catch {
    Phase7PilotFamilies = 0;
  }
  try {
    Phase7ImportedFamilies =
      (await (prisma as any).medicationBatchManifestItem?.count?.({
        where: { status: { in: ["IMPORTED", "APPROVED", "READY"] } },
      })) ?? 0;
  } catch {
    Phase7ImportedFamilies = 0;
  }
  try {
    Phase7ApprovedFamilies =
      (await (prisma as any).medicationBatchManifestItem?.count?.({
        where: { status: "APPROVED" },
      })) ?? 0;
  } catch {
    Phase7ApprovedFamilies = 0;
  }

  const emIncluded = EM_BATCH_MEDICATION_FAMILIES.filter((f) => !f.excluded);
  const EmergencyMedicineMedicationFamilyNames = emIncluded.map((f) => f.genericName);

  // Only report EM family as "present in inventory" when a matching concept exists.
  const concepts = await prisma.medicationConcept.findMany({
    select: { genericName: true },
  });
  const conceptNames = new Set(
    concepts.map((c) => normalizeFamilyName(c.genericName))
  );
  const presentEmNames = EmergencyMedicineMedicationFamilyNames.filter((n) =>
    conceptNames.has(normalizeFamilyName(n))
  );

  return {
    TotalMedicationConcepts,
    TotalMedicationProducts,
    TotalMedicationPackages,
    TotalCatalogMedications,
    ActiveCatalogMedications,
    CanonicalConceptsWithProducts,
    ConceptsWithoutProducts,
    ProductsWithoutCanonicalConcept,
    ProductsWithoutCatalogEntry,
    CatalogEntriesWithoutCanonicalProduct:
      typeof CatalogEntriesWithoutCanonicalProduct === "number"
        ? CatalogEntriesWithoutCanonicalProduct
        : 0,
    Phase7PilotFamilies,
    Phase7ImportedFamilies,
    Phase7ApprovedFamilies,
    EmergencyMedicineMedicationFamilies: presentEmNames.length,
    EmergencyMedicineMedicationFamilyNames: presentEmNames,
    TherapeuticClasses,
    TherapeuticClassMemberships,
    DuplicateTherapyGroups,
    AllergenMappings,
    ApprovedClinicalProfiles,
    ApprovedSafetyKnowledgeRecords:
      approvedInteractions + AllergenMappings + approvedCross,
    sampleSource: "database+governed-manifest",
  };
}

function deriveCoverageStatus(input: {
  hasIdentity: boolean;
  clinicalCount: number;
  safetyCount: number;
  shadowEvaluable: boolean;
  blocked: boolean;
}): MedicationFamilyCoverageStatus {
  if (input.blocked) return "BLOCKED";
  if (!input.hasIdentity) return "NOT_STARTED";
  if (input.shadowEvaluable && input.clinicalCount > 0 && input.safetyCount > 0) {
    return "SHADOW_EVALUABLE";
  }
  if (input.safetyCount > 0 && input.clinicalCount === 0) return "PARTIAL_SAFETY_KNOWLEDGE";
  if (input.clinicalCount > 0) return "PARTIAL_CLINICAL_KNOWLEDGE";
  return "IDENTITY_ONLY";
}

function domainRow(
  domain: MedicationCoverageDomain,
  numerator: number,
  denominator: number
) {
  const den = Math.max(1, denominator);
  const num = Math.max(0, Math.min(numerator, den));
  const percentage = Number(((num / den) * 100).toFixed(4));
  const weight = MEDICATION_COVERAGE_DOMAIN_WEIGHTS[domain];
  return {
    domain,
    numerator: num,
    denominator: den,
    percentage,
    weight,
    weightedScore: Number(((percentage / 100) * weight).toFixed(4)),
    calculationVersion: PHASE11_COVERAGE_CALCULATION_VERSION,
  };
}

export async function recalculateFamilyCoverage(
  prisma: PrismaClient,
  actorUserId: string
): Promise<{
  familiesProcessed: number;
  inventory: MedicationInventorySnapshot;
  calculationVersion: string;
}> {
  const inventory = await collectMedicationInventory(prisma);
  // Inventory all concepts (many Phase 7 rows are inactive but still implemented content).
  const concepts = await prisma.medicationConcept.findMany({
    select: {
      id: true,
      genericName: true,
      displayName: true,
      therapeuticClassId: true,
      isActive: true,
      _count: {
        select: {
          products: true,
          clinicalProfiles: true,
          allergenMappings: true,
          crossReactivityRules: true,
          subjectDrugInteractions: true,
          objectDrugInteractions: true,
          safetyClassMemberships: true,
        },
      },
    },
  });

  const productRows = await prisma.medicationProduct.findMany({
    select: {
      conceptId: true,
      isActive: true,
      legacyCatalogMedicationId: true,
      _count: { select: { packages: true } },
    },
  });
  const productsByConcept = new Map<
    string,
    { active: number; packages: number; catalog: number }
  >();
  for (const p of productRows) {
    const row = productsByConcept.get(p.conceptId) ?? {
      active: 0,
      packages: 0,
      catalog: 0,
    };
    if (p.isActive) row.active += 1;
    row.packages += p._count.packages;
    if (p.legacyCatalogMedicationId) row.catalog += 1;
    productsByConcept.set(p.conceptId, row);
  }

  const approvedProfiles = await prisma.medicationClinicalProfile.findMany({
    where: { lifecycleStatus: "APPROVED" },
    select: {
      conceptId: true,
      _count: {
        select: {
          renalAdjustments: true,
          hepaticAdjustments: true,
          administrationInstructions: true,
          monitoringRequirements: true,
          doseRecommendations: true,
          weightBasedDoses: true,
          infusionGuidance: true,
          contraindications: true,
          blackBoxWarnings: true,
          pregnancyInformation: true,
          lactationInformation: true,
          emergencyProfiles: true,
        },
      },
    },
  });
  const profileByConcept = new Map<string, (typeof approvedProfiles)[number]>();
  for (const row of approvedProfiles) {
    if (row.conceptId) profileByConcept.set(row.conceptId, row);
  }

  const dupMemberships = await prisma.medicationDuplicateTherapyMembership
    .findMany({ select: { medicationConceptId: true } })
    .catch(() => [] as Array<{ medicationConceptId: string | null }>);
  const dupByConcept = new Map<string, number>();
  for (const m of dupMemberships) {
    if (!m.medicationConceptId) continue;
    dupByConcept.set(
      m.medicationConceptId,
      (dupByConcept.get(m.medicationConceptId) ?? 0) + 1
    );
  }

  const emPriority = new Map(
    EM_BATCH_MEDICATION_FAMILIES.filter((f) => !f.excluded).map((f, idx) => [
      normalizeFamilyName(f.genericName),
      idx + 1,
    ])
  );

  type FamilyAgg = {
    key: string;
    normalized: string;
    displayName: string;
    conceptId: string;
    productCount: number;
    packageCount: number;
    catalogCount: number;
    classCount: number;
    profileCount: number;
    interactionCount: number;
    allergenCount: number;
    crossCount: number;
    dupCount: number;
    renal: boolean;
    hepatic: boolean;
    pregnancy: boolean;
    lactation: boolean;
    admin: boolean;
    monitoring: boolean;
    adultDosing: boolean;
    pedDosing: boolean;
    weightBased: boolean;
    infusion: boolean;
    contra: boolean;
    bbw: boolean;
    emCtx: boolean;
  };

  const byFamily = new Map<string, FamilyAgg>();
  for (const concept of concepts) {
    const key = familyKeyFromName(concept.genericName);
    const normalized = normalizeFamilyName(concept.genericName);
    const products = productsByConcept.get(concept.id) ?? {
      active: 0,
      packages: 0,
      catalog: 0,
    };
    // Prefer active product count; fall back to any products for inventory realism.
    const productCount =
      products.active > 0 ? products.active : concept._count.products;
    const profile = profileByConcept.get(concept.id);
    const profileCount = profile ? 1 : 0;
    const interactionCount =
      concept._count.subjectDrugInteractions +
      concept._count.objectDrugInteractions;
    const allergenCount = concept._count.allergenMappings;
    const crossCount = concept._count.crossReactivityRules;
    const classCount =
      (concept.therapeuticClassId ? 1 : 0) + concept._count.safetyClassMemberships;
    const dupCount = dupByConcept.get(concept.id) ?? 0;
    const existing = byFamily.get(key);
    if (!existing) {
      byFamily.set(key, {
        key,
        normalized,
        displayName: concept.displayName || concept.genericName,
        conceptId: concept.id,
        productCount,
        packageCount: products.packages,
        catalogCount: products.catalog,
        classCount,
        profileCount,
        interactionCount,
        allergenCount,
        crossCount,
        dupCount,
        renal: !!profile && profile._count.renalAdjustments > 0,
        hepatic: !!profile && profile._count.hepaticAdjustments > 0,
        pregnancy: !!profile && profile._count.pregnancyInformation > 0,
        lactation: !!profile && profile._count.lactationInformation > 0,
        admin: !!profile && profile._count.administrationInstructions > 0,
        monitoring: !!profile && profile._count.monitoringRequirements > 0,
        adultDosing: !!profile && profile._count.doseRecommendations > 0,
        pedDosing: false,
        weightBased: !!profile && profile._count.weightBasedDoses > 0,
        infusion: !!profile && profile._count.infusionGuidance > 0,
        contra: !!profile && profile._count.contraindications > 0,
        bbw: !!profile && profile._count.blackBoxWarnings > 0,
        emCtx: !!profile && profile._count.emergencyProfiles > 0,
      });
    } else {
      existing.productCount += productCount;
      existing.packageCount += products.packages;
      existing.catalogCount += products.catalog;
      existing.classCount += classCount;
      existing.profileCount += profileCount;
      existing.interactionCount += interactionCount;
      existing.allergenCount += allergenCount;
      existing.crossCount += crossCount;
      existing.dupCount += dupCount;
      if (concept.isActive) existing.conceptId = concept.id;
    }
  }

  const now = new Date();
  let familiesProcessed = 0;

  for (const family of byFamily.values()) {
    const safetyCount =
      family.interactionCount +
      family.allergenCount +
      family.crossCount +
      family.dupCount;
    const shadowEvaluable =
      family.productCount > 0 && (family.profileCount > 0 || safetyCount > 0);

    const gates = evaluateCriticalCoverageGates({
      hasCanonicalIdentity: true,
      hasActiveProducts: family.productCount > 0,
      hasTherapeuticClass: family.classCount > 0,
      hasApprovedClinicalProfile: family.profileCount > 0,
      hasApprovedSafetyKnowledge: safetyCount > 0,
      hasDuplicateTherapyMembership: family.dupCount > 0,
      hasAllergyMapping: family.allergenCount > 0,
      shadowEvaluationSuccessful: false,
      pharmacistValidationCompleted: false,
      hasCriticalKnowledgeConflict: false,
      hasUnresolvedIdentityBlocker: false,
    });

    const domainScores = [
      domainRow("IDENTITY", 1, 1),
      domainRow("PRODUCT", family.productCount > 0 ? 1 : 0, 1),
      domainRow("PACKAGE", family.packageCount > 0 ? 1 : 0, 1),
      domainRow("CATALOG", family.catalogCount > 0 ? 1 : 0, 1),
      domainRow("THERAPEUTIC_CLASS", family.classCount > 0 ? 1 : 0, 1),
      domainRow("CLINICAL_PROFILE", family.profileCount > 0 ? 1 : 0, 1),
      domainRow("ADULT_DOSING", family.adultDosing ? 1 : 0, 1),
      domainRow("PEDIATRIC_DOSING", family.pedDosing ? 1 : 0, 1),
      domainRow("WEIGHT_BASED_DOSING", family.weightBased ? 1 : 0, 1),
      domainRow("RENAL", family.renal ? 1 : 0, 1),
      domainRow("HEPATIC", family.hepatic ? 1 : 0, 1),
      domainRow("PREGNANCY", family.pregnancy ? 1 : 0, 1),
      domainRow("LACTATION", family.lactation ? 1 : 0, 1),
      domainRow("ADMINISTRATION", family.admin ? 1 : 0, 1),
      domainRow("INFUSION", family.infusion ? 1 : 0, 1),
      domainRow("MONITORING", family.monitoring ? 1 : 0, 1),
      domainRow("CONTRAINDICATION", family.contra ? 1 : 0, 1),
      domainRow("BLACK_BOX_WARNING", family.bbw ? 1 : 0, 1),
      domainRow("DRUG_INTERACTION", family.interactionCount > 0 ? 1 : 0, 1),
      domainRow("ALLERGY_MAPPING", family.allergenCount > 0 ? 1 : 0, 1),
      domainRow("CROSS_REACTIVITY", family.crossCount > 0 ? 1 : 0, 1),
      domainRow("DUPLICATE_THERAPY", family.dupCount > 0 ? 1 : 0, 1),
      domainRow("EMERGENCY_CONTEXT", family.emCtx ? 1 : 0, 1),
      domainRow("SHADOW_EVALUATION", shadowEvaluable ? 1 : 0, 1),
      domainRow("PHARMACIST_VALIDATION", 0, 1),
    ];

    for (const d of MEDICATION_COVERAGE_DOMAIN_VALUES) {
      if (!domainScores.find((x) => x.domain === d)) {
        domainScores.push(domainRow(d, 0, 1));
      }
    }

    const { weightedScore } = computeWeightedCoverageScore(
      domainScores.map((d) => ({ domain: d.domain, percentage: d.percentage }))
    );

    const coverageStatus = deriveCoverageStatus({
      hasIdentity: true,
      clinicalCount: family.profileCount,
      safetyCount,
      shadowEvaluable,
      blocked: false,
    });

    const profile = await prisma.medicationFamilyCoverageProfile.upsert({
      where: { medicationFamilyKey: family.key },
      create: {
        medicationFamilyKey: family.key,
        canonicalConceptId: family.conceptId,
        normalizedFamilyName: family.normalized,
        displayName: family.displayName,
        displayNameFr: family.displayName,
        emergencyMedicinePriority: emPriority.get(family.normalized) ?? 0,
        phase7ManifestItemId: emPriority.has(family.normalized)
          ? `EM_MANIFEST:${family.normalized}`
          : null,
        activeProductCount: family.productCount,
        activePackageCount: family.packageCount,
        catalogMedicationCount: family.catalogCount,
        therapeuticClassCount: family.classCount,
        approvedClinicalProfileCount: family.profileCount,
        approvedInteractionCount: family.interactionCount,
        approvedAllergenMappingCount: family.allergenCount,
        approvedCrossReactivityRuleCount: family.crossCount,
        duplicateTherapyMembershipCount: family.dupCount,
        renalKnowledgeAvailable: family.renal,
        hepaticKnowledgeAvailable: family.hepatic,
        pregnancyKnowledgeAvailable: family.pregnancy,
        lactationKnowledgeAvailable: family.lactation,
        administrationKnowledgeAvailable: family.admin,
        monitoringKnowledgeAvailable: family.monitoring,
        shadowEvaluable,
        coverageStatus,
        coverageScore: weightedScore,
        criticalGatesJson: gates,
        lastCalculatedAt: now,
      },
      update: {
        canonicalConceptId: family.conceptId,
        normalizedFamilyName: family.normalized,
        displayName: family.displayName,
        emergencyMedicinePriority: emPriority.get(family.normalized) ?? 0,
        activeProductCount: family.productCount,
        activePackageCount: family.packageCount,
        catalogMedicationCount: family.catalogCount,
        therapeuticClassCount: family.classCount,
        approvedClinicalProfileCount: family.profileCount,
        approvedInteractionCount: family.interactionCount,
        approvedAllergenMappingCount: family.allergenCount,
        approvedCrossReactivityRuleCount: family.crossCount,
        duplicateTherapyMembershipCount: family.dupCount,
        renalKnowledgeAvailable: family.renal,
        hepaticKnowledgeAvailable: family.hepatic,
        pregnancyKnowledgeAvailable: family.pregnancy,
        lactationKnowledgeAvailable: family.lactation,
        administrationKnowledgeAvailable: family.admin,
        monitoringKnowledgeAvailable: family.monitoring,
        shadowEvaluable,
        coverageStatus:
          coverageStatus === "VALIDATED" || coverageStatus === "ACTIVATION_CANDIDATE"
            ? "SHADOW_EVALUABLE"
            : coverageStatus,
        coverageScore: weightedScore,
        criticalGatesJson: gates,
        lastCalculatedAt: now,
      },
    });

    for (const score of domainScores) {
      await prisma.medicationCoverageScore.upsert({
        where: {
          familyCoverageProfileId_domain_calculationVersion: {
            familyCoverageProfileId: profile.id,
            domain: score.domain,
            calculationVersion: score.calculationVersion,
          },
        },
        create: {
          familyCoverageProfileId: profile.id,
          ...score,
          calculatedAt: now,
        },
        update: {
          numerator: score.numerator,
          denominator: score.denominator,
          percentage: score.percentage,
          weight: score.weight,
          weightedScore: score.weightedScore,
          calculatedAt: now,
        },
      });
    }

    familiesProcessed += 1;
  }

  await prisma.medicationSafetyValidationAuditEvent.create({
    data: {
      entityType: "MedicationFamilyCoverageProfile",
      entityId: "bulk",
      action: "COVERAGE_RECALCULATE",
      afterState: {
        familiesProcessed,
        calculationVersion: PHASE11_COVERAGE_CALCULATION_VERSION,
        inventory,
      },
      performedByUserId: actorUserId,
    },
  });

  return {
    familiesProcessed,
    inventory,
    calculationVersion: PHASE11_COVERAGE_CALCULATION_VERSION,
  };
}

export async function getCoverageDashboard(prisma: PrismaClient) {
  const inventory = await collectMedicationInventory(prisma);
  const [
    MedicationFamiliesPresent,
    MedicationFamiliesShadowEvaluable,
    MedicationFamiliesValidated,
    MedicationFamiliesBlocked,
    ReviewedFindings,
    AdjudicatedFindings,
    KnowledgeGapCount,
    IdentityGapCount,
    ContextGapCount,
    ReadinessCandidates,
    ReadyForGovernanceReview,
    ClinicalActivations,
  ] = await Promise.all([
    prisma.medicationFamilyCoverageProfile.count(),
    prisma.medicationFamilyCoverageProfile.count({ where: { shadowEvaluable: true } }),
    prisma.medicationFamilyCoverageProfile.count({
      where: { coverageStatus: "VALIDATED" },
    }),
    prisma.medicationFamilyCoverageProfile.count({
      where: { coverageStatus: "BLOCKED" },
    }),
    prisma.medicationSafetyValidationReview.count(),
    prisma.medicationSafetyValidationAdjudication.count({
      where: { status: "RESOLVED" },
    }),
    prisma.medicationKnowledgeGap.count({ where: { status: { not: "RESOLVED" } } }),
    prisma.medicationIdentityGap.count({ where: { status: "OPEN" } }),
    prisma.medicationPatientContextGap.count({ where: { status: "OPEN" } }),
    prisma.medicationSafetyActivationCandidate.count(),
    prisma.medicationSafetyActivationReadinessAssessment.count({
      where: { readinessResult: "READY_FOR_GOVERNANCE_REVIEW" },
    }),
    prisma.medicationSafetyActivationReadinessAttestation.count({
      where: { clinicalActivationPerformed: true },
    }),
  ]);

  const clinicalKnowledgeCoverage =
    inventory.TotalMedicationConcepts === 0
      ? 0
      : Number(
          (
            inventory.ApprovedClinicalProfiles / inventory.TotalMedicationConcepts
          ).toFixed(4)
        );
  const safetyKnowledgeCoverage =
    inventory.TotalMedicationConcepts === 0
      ? 0
      : Number(
          (
            inventory.ApprovedSafetyKnowledgeRecords /
            Math.max(1, inventory.TotalMedicationConcepts)
          ).toFixed(4)
        );
  const identityCoverage =
    inventory.TotalMedicationConcepts === 0
      ? 0
      : Number(
          (
            inventory.CanonicalConceptsWithProducts /
            inventory.TotalMedicationConcepts
          ).toFixed(4)
        );

  return {
    ...inventory,
    MedicationFamiliesPresent,
    MedicationFamiliesShadowEvaluable,
    MedicationFamiliesValidated,
    MedicationFamiliesBlocked,
    ClinicalKnowledgeCoverage: clinicalKnowledgeCoverage,
    SafetyKnowledgeCoverage: safetyKnowledgeCoverage,
    IdentityCoverage: identityCoverage,
    ReviewedFindings,
    AdjudicatedFindings,
    TruePositiveRate: null,
    FalsePositiveRate: null,
    EstimatedRecall: null,
    CriticalMisses: 0,
    SeverityAgreement: null,
    IdentityGapRate: null,
    ContextGapRate: null,
    KnowledgeGapCount,
    IdentityGapCount,
    ContextGapCount,
    SuppressionPrecision: null,
    EvaluationSuccessRate: null,
    P95Latency: null,
    ReadinessCandidates,
    ReadyForGovernanceReview,
    ClinicalActivations: ClinicalActivations === 0 ? 0 : ClinicalActivations,
    ProviderFacingAlerts: 0,
    OrderBlocks: 0,
    ClinicalActivationEnabled: false,
    ProviderFacingAlertsEnabled: false,
    OrderBlockingEnabled: false,
    banner: {
      shadowValidationOnly: true,
      noProviderAlerts: true,
      noOrderBlocking: true,
      noClinicalActivation: true,
    },
    allCriticalGatesWouldPassForActivation: false,
  };
}

export function assertCriticalGatesBlockActivation(
  gates: Record<string, boolean>
): void {
  if (!allCriticalGatesPass(gates as any)) {
    // intentional — activation must remain blocked
    return;
  }
  // Even if all gates pass, Phase 11 still forbids activation.
  throw new Error(
    "Phase 11 never activates CDS even when critical coverage gates pass."
  );
}
