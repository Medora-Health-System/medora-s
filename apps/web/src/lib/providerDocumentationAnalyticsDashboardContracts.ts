/**
 * MEDUI.ED.POSTCERT.5 — Dashboard contracts for complaint-intelligence analytics.
 * Contracts only. No UI implementation.
 */
import type {
  ProviderDocumentationAnalyticsCategory,
  ProviderDocumentationCertificationHealthMetrics,
  ProviderDocumentationChipUsageMetrics,
  ProviderDocumentationGovernanceHealthMetrics,
  ProviderDocumentationMdmUsageMetrics,
  ProviderDocumentationTemplateUsageMetrics,
} from "./providerDocumentationAnalyticsModel";

export type ProviderDocumentationAnalyticsDashboardMetricKey =
  | "certified_template_count"
  | "certified_family_count"
  | "track_c_pass_rate"
  | "human_doc_pass_rate"
  | "mdm1_pass_rate"
  | "governance_pass_rate"
  | "template_usage_count"
  | "template_completion_rate"
  | "template_abandonment_count"
  | "chip_adoption_rate"
  | "chip_insertion_count"
  | "mdm_section_completion_rate"
  | "ownerless_template_count"
  | "isolation_violation_count"
  | "drift_indicator_count";

export type ProviderDocumentationAnalyticsDashboardSectionId =
  | "executive_overview"
  | "template_adoption"
  | "family_adoption"
  | "chip_usage"
  | "mdm_completion"
  | "governance_health"
  | "certification_health";

export type ProviderDocumentationAnalyticsDashboardSection = {
  id: ProviderDocumentationAnalyticsDashboardSectionId;
  title: string;
  description: string;
  categories: ProviderDocumentationAnalyticsCategory[];
  metricKeys: ProviderDocumentationAnalyticsDashboardMetricKey[];
};

export const PROVIDER_DOCUMENTATION_ANALYTICS_DASHBOARD_SECTIONS: readonly ProviderDocumentationAnalyticsDashboardSection[] = [
  {
    id: "executive_overview",
    title: "Executive Overview",
    description: "Aggregate adoption and certification health across all complaint-intelligence families.",
    categories: ["template_usage", "certification_health", "governance_health"],
    metricKeys: [
      "certified_template_count",
      "certified_family_count",
      "track_c_pass_rate",
      "human_doc_pass_rate",
      "mdm1_pass_rate",
      "governance_pass_rate",
      "template_usage_count",
      "template_completion_rate",
      "drift_indicator_count",
    ],
  },
  {
    id: "template_adoption",
    title: "Template Adoption",
    description: "Per-template lifecycle metrics: opened, completed, abandoned, saved, exported.",
    categories: ["template_usage"],
    metricKeys: ["template_usage_count", "template_completion_rate", "template_abandonment_count"],
  },
  {
    id: "family_adoption",
    title: "Family Adoption",
    description: "Roll-up adoption by certified governance family and audit phase.",
    categories: ["template_usage"],
    metricKeys: ["template_usage_count", "template_completion_rate"],
  },
  {
    id: "chip_usage",
    title: "Chip Usage",
    description: "HPI, ROS, exam, and MDM chip display and insertion rates by template and family.",
    categories: ["chip_usage"],
    metricKeys: ["chip_adoption_rate", "chip_insertion_count"],
  },
  {
    id: "mdm_completion",
    title: "MDM Completion",
    description: "MDM.1 section presence and completion rates to detect documentation drift.",
    categories: ["mdm_usage"],
    metricKeys: ["mdm_section_completion_rate", "mdm1_pass_rate"],
  },
  {
    id: "governance_health",
    title: "Governance Health",
    description: "Enterprise Governance V2 drift indicators: ownership, isolation, registration gaps.",
    categories: ["governance_health"],
    metricKeys: ["ownerless_template_count", "isolation_violation_count", "governance_pass_rate"],
  },
  {
    id: "certification_health",
    title: "Certification Health",
    description: "Track C, Human Documentation, MDM.1, and governance certification pass rates.",
    categories: ["certification_health"],
    metricKeys: [
      "certified_template_count",
      "certified_family_count",
      "track_c_pass_rate",
      "human_doc_pass_rate",
      "mdm1_pass_rate",
      "governance_pass_rate",
      "drift_indicator_count",
    ],
  },
];

export type ProviderDocumentationAnalyticsDashboardSnapshot = {
  generatedAt: string;
  executiveOverview: {
    certifiedTemplateCount: number;
    certifiedFamilyCount: number;
    trackCPassRate: number;
    humanDocPassRate: number;
    mdm1PassRate: number;
    governancePassRate: number;
    driftIndicatorCount: number;
  };
  templateAdoption: ProviderDocumentationTemplateUsageMetrics[];
  familyAdoption: {
    familyId: string;
    auditPhase: string | null;
    templateCount: number;
    usageCount: number;
    completionRate: number;
  }[];
  chipUsage: ProviderDocumentationChipUsageMetrics[];
  mdmCompletion: ProviderDocumentationMdmUsageMetrics[];
  governanceHealth: ProviderDocumentationGovernanceHealthMetrics;
  certificationHealth: ProviderDocumentationCertificationHealthMetrics;
};

export function validateDashboardSections(): boolean {
  const requiredIds: ProviderDocumentationAnalyticsDashboardSectionId[] = [
    "executive_overview",
    "template_adoption",
    "family_adoption",
    "chip_usage",
    "mdm_completion",
    "governance_health",
    "certification_health",
  ];
  const presentIds = new Set(PROVIDER_DOCUMENTATION_ANALYTICS_DASHBOARD_SECTIONS.map((section) => section.id));
  return requiredIds.every((id) => presentIds.has(id));
}

export function dashboardSectionById(
  id: ProviderDocumentationAnalyticsDashboardSectionId
): ProviderDocumentationAnalyticsDashboardSection | undefined {
  return PROVIDER_DOCUMENTATION_ANALYTICS_DASHBOARD_SECTIONS.find((section) => section.id === id);
}
