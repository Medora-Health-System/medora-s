/**
 * MEDUI.ED.POSTCERT.8 — Analytics aggregation layer.
 * Consumes providerDocumentationAnalyticsModel only. No duplicated metric definitions.
 * Read-only. No runtime telemetry collection.
 */
import {
  buildCertifiedTemplateAnalyticsCatalog,
  certifiedRegistryEntriesForAnalytics,
  classifyChipCategory,
  computeStaticCertificationHealthMetrics,
  computeStaticGovernanceHealthMetrics,
  emptyTemplateUsageMetrics,
  extractChipIdsByCategory,
  type ProviderDocumentationAnalyticsChipCategory,
  type ProviderDocumentationAnalyticsMdmSectionId,
  type ProviderDocumentationAnalyticsTemplateCatalogEntry,
  type ProviderDocumentationCertificationHealthMetrics,
  type ProviderDocumentationChipUsageMetrics,
  type ProviderDocumentationGovernanceHealthMetrics,
  type ProviderDocumentationMdmUsageMetrics,
  type ProviderDocumentationTemplateUsageMetrics,
} from "./providerDocumentationAnalyticsModel";
import { HUMAN_DOCUMENTATION_AUDIT_FAMILIES } from "./providerDocumentationHumanDocumentationAudit";
import {
  ENTERPRISE_MDM1_REQUIRED_SECTIONS,
  resolveEnterpriseGovernanceOwners,
  type EnterpriseGovernanceOwnerId,
} from "./providerDocumentationEnterpriseGovernanceV2";
import type { EnterpriseGovernanceFamilyId } from "./providerDocumentationEnterpriseGovernanceRegistry";
import type { ProviderDocumentationTemplateId } from "./providerDocumentationModel";

export type ProviderDocumentationFamilyUsageAggregate = {
  familyId: EnterpriseGovernanceFamilyId;
  displayName: string;
  auditPhase: string | null;
  templateCount: number;
  usageCount: number;
  completionCount: number;
  abandonmentCount: number;
  completionRate: number;
  totalChipCount: number;
};

export type ProviderDocumentationChipUsageAggregate = {
  chipId: string;
  chipCategory: ProviderDocumentationAnalyticsChipCategory;
  templateId: ProviderDocumentationTemplateId;
  familyId: EnterpriseGovernanceFamilyId | null;
  governanceOwnerId: EnterpriseGovernanceOwnerId | null;
  displayedCount: number;
  insertedCount: number;
  removedCount: number;
  reinsertedCount: number;
  adoptionRate: number;
};

export type ProviderDocumentationMdmCompletionAggregate = {
  sectionId: ProviderDocumentationAnalyticsMdmSectionId;
  templateId: ProviderDocumentationTemplateId;
  familyId: EnterpriseGovernanceFamilyId | null;
  governanceOwnerId: EnterpriseGovernanceOwnerId | null;
  presentCount: number;
  missingCount: number;
  completionRate: number;
  readinessScore: number;
};

export type ProviderDocumentationAnalyticsAggregates = {
  generatedAt: string;
  templateUsage: ProviderDocumentationTemplateUsageMetrics[];
  familyUsage: ProviderDocumentationFamilyUsageAggregate[];
  chipUsage: ProviderDocumentationChipUsageAggregate[];
  mdmCompletion: ProviderDocumentationMdmCompletionAggregate[];
  governanceHealth: ProviderDocumentationGovernanceHealthMetrics;
  certificationHealth: ProviderDocumentationCertificationHealthMetrics;
  catalog: ProviderDocumentationAnalyticsTemplateCatalogEntry[];
};

function completionRate(completionCount: number, usageCount: number): number {
  if (usageCount === 0) return 0;
  return completionCount / usageCount;
}

export function aggregateTemplateUsage(): ProviderDocumentationTemplateUsageMetrics[] {
  return HUMAN_DOCUMENTATION_AUDIT_FAMILIES.flatMap((family) =>
    family.templates.map((template) => emptyTemplateUsageMetrics(template.templateId as ProviderDocumentationTemplateId))
  );
}

export function aggregateFamilyUsage(
  catalog: ProviderDocumentationAnalyticsTemplateCatalogEntry[] = buildCertifiedTemplateAnalyticsCatalog(),
  templateUsage: ProviderDocumentationTemplateUsageMetrics[] = aggregateTemplateUsage()
): ProviderDocumentationFamilyUsageAggregate[] {
  const registry = certifiedRegistryEntriesForAnalytics();

  return registry.map((entry) => {
    const familyTemplates = catalog.filter((item) => item.familyId === entry.familyId);
    const familyUsage = templateUsage.filter((item) => item.familyId === entry.familyId);
    const usageCount = familyUsage.reduce((sum, item) => sum + item.usageCount, 0);
    const completionCount = familyUsage.reduce((sum, item) => sum + item.completionCount, 0);
    const abandonmentCount = familyUsage.reduce((sum, item) => sum + item.abandonmentCount, 0);

    return {
      familyId: entry.familyId,
      displayName: entry.displayName,
      auditPhase: entry.auditPhase,
      templateCount: familyTemplates.length,
      usageCount,
      completionCount,
      abandonmentCount,
      completionRate: completionRate(completionCount, usageCount),
      totalChipCount: familyTemplates.reduce((sum, item) => sum + item.totalChipCount, 0),
    };
  });
}

export function aggregateChipUsage(): ProviderDocumentationChipUsageAggregate[] {
  const chips: ProviderDocumentationChipUsageAggregate[] = [];

  for (const family of HUMAN_DOCUMENTATION_AUDIT_FAMILIES) {
    for (const template of family.templates) {
      const byCategory = extractChipIdsByCategory(template.bundle);
      const owners = resolveEnterpriseGovernanceOwners(template.templateId as ProviderDocumentationTemplateId);
      const governanceOwnerId = owners[0] ?? null;
      const catalogEntry = buildCertifiedTemplateAnalyticsCatalog().find(
        (item) => item.templateId === template.templateId
      );

      for (const category of ["hpi", "ros", "exam", "mdm"] as const) {
        for (const chipId of byCategory[category]) {
          chips.push({
            chipId,
            chipCategory: classifyChipCategory(chipId),
            templateId: template.templateId as ProviderDocumentationTemplateId,
            familyId: catalogEntry?.familyId ?? null,
            governanceOwnerId,
            displayedCount: 0,
            insertedCount: 0,
            removedCount: 0,
            reinsertedCount: 0,
            adoptionRate: 0,
          });
        }
      }
    }
  }

  return chips;
}

export function aggregateMdmCompletion(): ProviderDocumentationMdmCompletionAggregate[] {
  const rows: ProviderDocumentationMdmCompletionAggregate[] = [];

  for (const family of HUMAN_DOCUMENTATION_AUDIT_FAMILIES) {
    for (const template of family.templates) {
      const owners = resolveEnterpriseGovernanceOwners(template.templateId as ProviderDocumentationTemplateId);
      const catalogEntry = buildCertifiedTemplateAnalyticsCatalog().find(
        (item) => item.templateId === template.templateId
      );

      for (const sectionId of ENTERPRISE_MDM1_REQUIRED_SECTIONS) {
        const bundleSection = template.bundle[sectionId];
        const sectionPresent = (bundleSection?.length ?? 0) > 0;
        rows.push({
          sectionId,
          templateId: template.templateId as ProviderDocumentationTemplateId,
          familyId: catalogEntry?.familyId ?? null,
          governanceOwnerId: owners[0] ?? null,
          presentCount: sectionPresent ? 1 : 0,
          missingCount: sectionPresent ? 0 : 1,
          completionRate: sectionPresent ? 1 : 0,
          readinessScore: sectionPresent ? 100 : 0,
        });
      }
    }
  }

  return rows;
}

export function aggregateGovernanceHealth(): ProviderDocumentationGovernanceHealthMetrics {
  return computeStaticGovernanceHealthMetrics();
}

export function aggregateCertificationHealth(): ProviderDocumentationCertificationHealthMetrics {
  return computeStaticCertificationHealthMetrics();
}

export function buildProviderDocumentationAnalyticsAggregates(): ProviderDocumentationAnalyticsAggregates {
  const catalog = buildCertifiedTemplateAnalyticsCatalog();
  const templateUsage = aggregateTemplateUsage();

  return {
    generatedAt: new Date(0).toISOString(),
    templateUsage,
    familyUsage: aggregateFamilyUsage(catalog, templateUsage),
    chipUsage: aggregateChipUsage(),
    mdmCompletion: aggregateMdmCompletion(),
    governanceHealth: aggregateGovernanceHealth(),
    certificationHealth: aggregateCertificationHealth(),
    catalog,
  };
}

export function rankByNumericField<T extends Record<string, unknown>>(
  items: T[],
  field: keyof T,
  direction: "asc" | "desc" = "desc"
): T[] {
  return [...items].sort((a, b) => {
    const av = Number(a[field] ?? 0);
    const bv = Number(b[field] ?? 0);
    return direction === "desc" ? bv - av : av - bv;
  });
}

export function toChipUsageMetrics(
  aggregate: ProviderDocumentationChipUsageAggregate
): ProviderDocumentationChipUsageMetrics {
  return { ...aggregate };
}

export function toMdmUsageMetrics(
  aggregate: ProviderDocumentationMdmCompletionAggregate
): ProviderDocumentationMdmUsageMetrics {
  return {
    sectionId: aggregate.sectionId,
    templateId: aggregate.templateId,
    familyId: aggregate.familyId,
    governanceOwnerId: aggregate.governanceOwnerId,
    presentCount: aggregate.presentCount,
    missingCount: aggregate.missingCount,
    completionRate: aggregate.completionRate,
  };
}
