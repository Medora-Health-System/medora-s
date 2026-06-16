/**
 * MEDUI.ED.POSTCERT.8 — Dashboard component contracts.
 * Contracts only. No UI styling. No runtime behavior.
 */
import type { ProviderDocumentationAnalyticsDashboardSectionId } from "./providerDocumentationAnalyticsDashboardContracts";
import type { ProviderDocumentationExecutiveOverviewDashboard } from "./providerDocumentationExecutiveOverviewDashboard";
import type { ProviderDocumentationTemplateAnalyticsDashboard } from "./providerDocumentationTemplateAnalyticsDashboard";
import type { ProviderDocumentationChipAnalyticsDashboard } from "./providerDocumentationChipAnalyticsDashboard";
import type { ProviderDocumentationMdmAnalyticsDashboard } from "./providerDocumentationMdmAnalyticsDashboard";
import type { ProviderDocumentationGovernanceAnalyticsDashboard } from "./providerDocumentationGovernanceAnalyticsDashboard";
import type { ProviderDocumentationCertificationDashboard } from "./providerDocumentationCertificationDashboard";

export type ProviderDocumentationDashboardCardStatus = "pass" | "warning" | "fail" | "neutral";

export type ProviderDocumentationDashboardMetricDisplay = {
  label: string;
  value: string | number;
  status?: ProviderDocumentationDashboardCardStatus;
  helperText?: string;
};

export type ExecutiveOverviewCard = {
  kind: "executive_overview";
  sectionId: "executive_overview";
  title: string;
  kpis: ProviderDocumentationDashboardMetricDisplay[];
  dashboardCompletionRate: number;
  model: ProviderDocumentationExecutiveOverviewDashboard;
};

export type MetricCard = {
  kind: "metric";
  metricKey: string;
  title: string;
  value: string | number;
  format: "count" | "rate" | "percent";
  status?: ProviderDocumentationDashboardCardStatus;
};

export type TrendCard = {
  kind: "trend";
  metricKey: string;
  title: string;
  currentValue: number;
  previousValue: number | null;
  direction: "up" | "down" | "flat";
};

export type FamilyUsageCard = {
  kind: "family_usage";
  sectionId: "family_adoption";
  familyId: string;
  displayName: string;
  auditPhase: string | null;
  templateCount: number;
  usageCount: number;
  completionRate: number;
  totalChipCount: number;
};

export type TemplateUsageCard = {
  kind: "template_usage";
  sectionId: "template_adoption";
  templateId: string;
  familyId: string | null;
  governanceOwnerId: string | null;
  usageCount: number;
  completionRate: number;
  abandonmentCount: number;
  catalogChipCount: number;
};

export type ChipUsageCard = {
  kind: "chip_usage";
  sectionId: "chip_usage";
  chipId: string;
  chipCategory: "hpi" | "ros" | "exam" | "mdm";
  templateId: string;
  familyId: string | null;
  insertedCount: number;
  adoptionRate: number;
  rank: number;
};

export type MdmCompletionCard = {
  kind: "mdm_completion";
  sectionId: "mdm_completion";
  sectionId_mdm: string;
  sectionLabel: string;
  completionRate: number;
  readinessScore: number;
  templateCount: number;
  presentCount: number;
};

export type GovernanceHealthCard = {
  kind: "governance_health";
  sectionId: "governance_health";
  indicatorKey: string;
  label: string;
  count: number;
  status: ProviderDocumentationDashboardCardStatus;
  governanceDriftScore: number;
};

export type CertificationHealthCard = {
  kind: "certification_health";
  sectionId: "certification_health";
  familyId: string;
  displayName: string;
  auditPhase: string | null;
  templateCount: number;
  trackCPassRate: number;
  humanDocPassRate: number;
  mdm1PassRate: number;
  governancePassRate: number;
  status: "certified" | "partial" | "uncertified";
};

export type ProviderDocumentationDashboardCard =
  | ExecutiveOverviewCard
  | MetricCard
  | TrendCard
  | FamilyUsageCard
  | TemplateUsageCard
  | ChipUsageCard
  | MdmCompletionCard
  | GovernanceHealthCard
  | CertificationHealthCard;

export type ProviderDocumentationDashboardLayout = {
  generatedAt: string;
  sections: ProviderDocumentationAnalyticsDashboardSectionId[];
  cards: ProviderDocumentationDashboardCard[];
};

export const PROVIDER_DOCUMENTATION_DASHBOARD_CARD_KINDS = [
  "executive_overview",
  "metric",
  "trend",
  "family_usage",
  "template_usage",
  "chip_usage",
  "mdm_completion",
  "governance_health",
  "certification_health",
] as const;

export type ProviderDocumentationDashboardCardKind =
  (typeof PROVIDER_DOCUMENTATION_DASHBOARD_CARD_KINDS)[number];

export function isProviderDocumentationDashboardCard(value: unknown): value is ProviderDocumentationDashboardCard {
  if (value == null || typeof value !== "object") return false;
  const kind = (value as { kind?: unknown }).kind;
  return typeof kind === "string" && PROVIDER_DOCUMENTATION_DASHBOARD_CARD_KINDS.includes(kind as ProviderDocumentationDashboardCardKind);
}

export function dashboardCardsBySection(
  layout: ProviderDocumentationDashboardLayout,
  sectionId: ProviderDocumentationAnalyticsDashboardSectionId
): ProviderDocumentationDashboardCard[] {
  return layout.cards.filter((card) => {
    if (card.kind === "executive_overview") return sectionId === "executive_overview";
    if (card.kind === "metric" || card.kind === "trend") return true;
    return "sectionId" in card && card.sectionId === sectionId;
  });
}
