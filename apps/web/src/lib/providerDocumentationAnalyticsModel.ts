/**
 * MEDUI.ED.POSTCERT.5 — Enterprise complaint-intelligence analytics model.
 * Informational contracts and static catalog only. No runtime collection. No PHI.
 */
import type { ProviderDocumentationComplaintIntelligence } from "./providerDocumentationComplaintIntelligence";
import {
  ENTERPRISE_CERTIFIED_GOVERNANCE_FAMILIES,
  ENTERPRISE_GOVERNANCE_REGISTRY,
  registryEntryForTemplateId,
  type EnterpriseGovernanceFamilyId,
  type EnterpriseGovernanceRegistryEntry,
} from "./providerDocumentationEnterpriseGovernanceRegistry";
import {
  allCertifiedAuditTemplateIds,
  auditEnterpriseCertificationForTemplate,
  bundlePassesEnterpriseMdm1,
  bundlePassesEnterpriseTrackC,
  ENTERPRISE_MDM1_REQUIRED_SECTIONS,
  humanDocumentationAuditPhaseForTemplate,
  resolveEnterpriseGovernanceOwners,
  type EnterpriseGovernanceOwnerId,
} from "./providerDocumentationEnterpriseGovernanceV2";
import { HUMAN_DOCUMENTATION_AUDIT_FAMILIES } from "./providerDocumentationHumanDocumentationAudit";
import type { ProviderDocumentationTemplateId } from "./providerDocumentationModel";

/** Top-level telemetry categories for complaint-intelligence observability. */
export const PROVIDER_DOCUMENTATION_ANALYTICS_CATEGORIES = [
  "template_usage",
  "chip_usage",
  "mdm_usage",
  "governance_health",
  "certification_health",
] as const;

export type ProviderDocumentationAnalyticsCategory =
  (typeof PROVIDER_DOCUMENTATION_ANALYTICS_CATEGORIES)[number];

export const PROVIDER_DOCUMENTATION_TEMPLATE_LIFECYCLE_EVENTS = [
  "template_opened",
  "template_activated",
  "template_completed",
  "template_abandoned",
  "template_saved",
  "template_exported",
] as const;

export type ProviderDocumentationAnalyticsTemplateLifecycleEvent =
  (typeof PROVIDER_DOCUMENTATION_TEMPLATE_LIFECYCLE_EVENTS)[number];

export const PROVIDER_DOCUMENTATION_CHIP_CATEGORIES = [
  "hpi",
  "ros",
  "exam",
  "mdm",
] as const;

export type ProviderDocumentationAnalyticsChipCategory =
  (typeof PROVIDER_DOCUMENTATION_CHIP_CATEGORIES)[number];

export type ProviderDocumentationAnalyticsMdmSectionId =
  (typeof ENTERPRISE_MDM1_REQUIRED_SECTIONS)[number];

export type ProviderDocumentationTemplateUsageMetrics = {
  templateId: ProviderDocumentationTemplateId;
  familyId: EnterpriseGovernanceFamilyId | null;
  governanceOwnerId: EnterpriseGovernanceOwnerId | null;
  auditPhase: string | null;
  usageCount: number;
  completionCount: number;
  abandonmentCount: number;
  completionRate: number;
};

export type ProviderDocumentationChipUsageMetrics = {
  chipId: string;
  chipCategory: ProviderDocumentationAnalyticsChipCategory;
  templateId: ProviderDocumentationTemplateId;
  familyId: EnterpriseGovernanceFamilyId | null;
  displayedCount: number;
  insertedCount: number;
  removedCount: number;
  reinsertedCount: number;
  adoptionRate: number;
};

export type ProviderDocumentationMdmUsageMetrics = {
  sectionId: ProviderDocumentationAnalyticsMdmSectionId;
  templateId: ProviderDocumentationTemplateId;
  familyId: EnterpriseGovernanceFamilyId | null;
  governanceOwnerId: EnterpriseGovernanceOwnerId | null;
  presentCount: number;
  missingCount: number;
  completionRate: number;
};

export type ProviderDocumentationGovernanceHealthMetrics = {
  ownerlessTemplateCount: number;
  duplicateOwnerCount: number;
  missingHumanDocRegistrationCount: number;
  missingTrackCRegistrationCount: number;
  missingMdm1RegistrationCount: number;
  missingGovernanceModuleCount: number;
  isolationViolationCount: number;
};

export type ProviderDocumentationCertificationHealthMetrics = {
  certifiedTemplateCount: number;
  certifiedFamilyCount: number;
  trackCPassRate: number;
  humanDocPassRate: number;
  mdm1PassRate: number;
  governancePassRate: number;
  driftIndicators: ProviderDocumentationCertificationDriftIndicator[];
};

export type ProviderDocumentationCertificationDriftIndicator =
  | "new_uncertified_template"
  | "new_ownerless_template"
  | "new_unregistered_family"
  | "new_unisolated_family";

export type ProviderDocumentationAnalyticsTemplateCatalogEntry = {
  templateId: string;
  familyId: EnterpriseGovernanceFamilyId | null;
  governanceOwnerIds: EnterpriseGovernanceOwnerId[];
  auditPhase: string | null;
  isCertified: boolean;
  hpiChipCount: number;
  rosChipCount: number;
  examChipCount: number;
  mdmChipCount: number;
  totalChipCount: number;
};

export function classifyChipCategory(chipId: string): ProviderDocumentationAnalyticsChipCategory {
  if (chipId.includes(".hpi") || chipId.startsWith("providerDocumentationTemplateHpi") || chipId.startsWith("providerDocumentationTemplateLocation")) {
    return "hpi";
  }
  if (chipId.includes(".ros") || chipId.startsWith("providerDocumentationTemplateRos")) {
    return "ros";
  }
  if (chipId.includes(".exam") || chipId.startsWith("providerDocumentationTemplateExam")) {
    return "exam";
  }
  return "mdm";
}

export function extractChipIdsByCategory(
  bundle: ProviderDocumentationComplaintIntelligence
): Record<ProviderDocumentationAnalyticsChipCategory, string[]> {
  const mdmFields = [
    "mdmWorkingAssessment",
    "mdmDifferentialSynthesis",
    "mdmDataReviewed",
    "mdmRiskStratification",
    "mdmClinicalRationale",
    "clinicalImpression",
    "mdmPlanSummary",
  ] as const;

  return {
    hpi: [...(bundle.hpi ?? [])],
    ros: [
      ...(bundle.rosImportantPositives ?? []),
      ...(bundle.rosImportantNegatives ?? []),
      ...(bundle.rosRedFlags ?? []),
    ],
    exam: Object.values(bundle.physicalExam ?? {}).flat(),
    mdm: mdmFields.flatMap((field) => bundle[field] ?? []),
  };
}

export function countChipsByCategory(bundle: ProviderDocumentationComplaintIntelligence): {
  hpi: number;
  ros: number;
  exam: number;
  mdm: number;
  total: number;
} {
  const byCategory = extractChipIdsByCategory(bundle);
  const hpi = byCategory.hpi.length;
  const ros = byCategory.ros.length;
  const exam = byCategory.exam.length;
  const mdm = byCategory.mdm.length;
  return { hpi, ros, exam, mdm, total: hpi + ros + exam + mdm };
}

export function buildTemplateAnalyticsCatalogEntry(
  templateId: string,
  bundle: ProviderDocumentationComplaintIntelligence
): ProviderDocumentationAnalyticsTemplateCatalogEntry {
  const registryEntry = registryEntryForTemplateId(templateId);
  const owners = resolveEnterpriseGovernanceOwners(templateId as ProviderDocumentationTemplateId);
  const auditPhase = humanDocumentationAuditPhaseForTemplate(templateId);
  const chipCounts = countChipsByCategory(bundle);

  return {
    templateId,
    familyId: registryEntry?.familyId ?? null,
    governanceOwnerIds: owners,
    auditPhase,
    isCertified: auditPhase != null,
    hpiChipCount: chipCounts.hpi,
    rosChipCount: chipCounts.ros,
    examChipCount: chipCounts.exam,
    mdmChipCount: chipCounts.mdm,
    totalChipCount: chipCounts.total,
  };
}

export function buildCertifiedTemplateAnalyticsCatalog(): ProviderDocumentationAnalyticsTemplateCatalogEntry[] {
  return HUMAN_DOCUMENTATION_AUDIT_FAMILIES.flatMap((family) =>
    family.templates.map((template) =>
      buildTemplateAnalyticsCatalogEntry(template.templateId, template.bundle)
    )
  );
}

export function computeStaticGovernanceHealthMetrics(): ProviderDocumentationGovernanceHealthMetrics {
  const certifiedIds = allCertifiedAuditTemplateIds();
  let ownerlessTemplateCount = 0;
  let duplicateOwnerCount = 0;
  let missingHumanDocRegistrationCount = 0;
  let missingTrackCRegistrationCount = 0;
  let missingMdm1RegistrationCount = 0;
  let missingGovernanceModuleCount = 0;
  let isolationViolationCount = 0;

  for (const templateId of certifiedIds) {
    const owners = resolveEnterpriseGovernanceOwners(templateId as ProviderDocumentationTemplateId);
    if (owners.length === 0) ownerlessTemplateCount += 1;
    if (owners.length > 1) duplicateOwnerCount += 1;

    const auditPhase = humanDocumentationAuditPhaseForTemplate(templateId);
    if (!auditPhase) missingHumanDocRegistrationCount += 1;

    const family = HUMAN_DOCUMENTATION_AUDIT_FAMILIES.find((item) => item.phase === auditPhase);
    const template = family?.templates.find((item) => item.templateId === templateId);
    if (template) {
      if (!bundlePassesEnterpriseTrackC(template.bundle)) missingTrackCRegistrationCount += 1;
      if (!bundlePassesEnterpriseMdm1(template.bundle)) missingMdm1RegistrationCount += 1;
    }

    const registryEntry = registryEntryForTemplateId(templateId);
    if (!registryEntry) missingGovernanceModuleCount += 1;
    else if (registryEntry.deniedNamespacePrefixes.length === 0) {
      const ownerHasIsolation = owners.some((ownerId) => {
        const ownerEntry = ENTERPRISE_GOVERNANCE_REGISTRY.find((item) => item.governanceOwnerId === ownerId);
        return (ownerEntry?.deniedNamespacePrefixes.length ?? 0) > 0;
      });
      if (!ownerHasIsolation) isolationViolationCount += 1;
    }
  }

  return {
    ownerlessTemplateCount,
    duplicateOwnerCount,
    missingHumanDocRegistrationCount,
    missingTrackCRegistrationCount,
    missingMdm1RegistrationCount,
    missingGovernanceModuleCount,
    isolationViolationCount,
  };
}

export function computeStaticCertificationHealthMetrics(): ProviderDocumentationCertificationHealthMetrics {
  const certifiedIds = allCertifiedAuditTemplateIds();
  const total = certifiedIds.length;
  let trackCPass = 0;
  let humanDocPass = 0;
  let mdm1Pass = 0;
  let governancePass = 0;
  const driftIndicators: ProviderDocumentationCertificationDriftIndicator[] = [];

  for (const family of HUMAN_DOCUMENTATION_AUDIT_FAMILIES) {
    for (const template of family.templates) {
      const violations = auditEnterpriseCertificationForTemplate(template.templateId, template.bundle);
      const trackCOk = bundlePassesEnterpriseTrackC(template.bundle);
      const mdm1Ok = bundlePassesEnterpriseMdm1(template.bundle);
      const humanDocOk = !violations.some((v) => v.requirement === "human_documentation_pass");
      const governanceOk = violations.length === 0;

      if (trackCOk) trackCPass += 1;
      if (mdm1Ok) mdm1Pass += 1;
      if (humanDocOk) humanDocPass += 1;
      if (governanceOk) governancePass += 1;

      if (resolveEnterpriseGovernanceOwners(template.templateId as ProviderDocumentationTemplateId).length === 0) {
        driftIndicators.push("new_ownerless_template");
      }
    }
  }

  for (const family of HUMAN_DOCUMENTATION_AUDIT_FAMILIES) {
    const entry = ENTERPRISE_CERTIFIED_GOVERNANCE_FAMILIES.find((item) => item.auditPhase === family.phase);
    if (!entry) driftIndicators.push("new_unregistered_family");
    else if (entry.deniedNamespacePrefixes.length === 0) driftIndicators.push("new_unisolated_family");
  }

  return {
    certifiedTemplateCount: total,
    certifiedFamilyCount: ENTERPRISE_CERTIFIED_GOVERNANCE_FAMILIES.length,
    trackCPassRate: total === 0 ? 1 : trackCPass / total,
    humanDocPassRate: total === 0 ? 1 : humanDocPass / total,
    mdm1PassRate: total === 0 ? 1 : mdm1Pass / total,
    governancePassRate: total === 0 ? 1 : governancePass / total,
    driftIndicators: [...new Set(driftIndicators)],
  };
}

export function emptyTemplateUsageMetrics(
  templateId: ProviderDocumentationTemplateId
): ProviderDocumentationTemplateUsageMetrics {
  const registryEntry = registryEntryForTemplateId(templateId);
  const owners = resolveEnterpriseGovernanceOwners(templateId);
  return {
    templateId,
    familyId: registryEntry?.familyId ?? null,
    governanceOwnerId: owners[0] ?? null,
    auditPhase: humanDocumentationAuditPhaseForTemplate(templateId),
    usageCount: 0,
    completionCount: 0,
    abandonmentCount: 0,
    completionRate: 0,
  };
}

export function certifiedFamilyIdsForAnalytics(): EnterpriseGovernanceFamilyId[] {
  return ENTERPRISE_CERTIFIED_GOVERNANCE_FAMILIES.map((entry) => entry.familyId);
}

export function certifiedRegistryEntriesForAnalytics(): readonly EnterpriseGovernanceRegistryEntry[] {
  return ENTERPRISE_CERTIFIED_GOVERNANCE_FAMILIES;
}
