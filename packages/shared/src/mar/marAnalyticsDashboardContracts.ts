/** MEDUI.ED.MAR.H8 — MAR compliance & analytics dashboard contracts (no UI). */

export const MAR_ANALYTICS_DASHBOARD_SECTION_IDS = [
  "executive_overview",
  "compliance",
  "corrections",
  "missed_doses",
  "infusions",
  "nursing_performance",
] as const;

export type MarAnalyticsDashboardSectionId = (typeof MAR_ANALYTICS_DASHBOARD_SECTION_IDS)[number];

export const MAR_ANALYTICS_KPI_KEYS = [
  "medication_administrations",
  "scheduled_administrations",
  "prn_administrations",
  "infusion_starts",
  "infusion_stops",
  "corrections",
  "missed_doses",
  "refused_doses",
  "held_doses",
  "not_available_doses",
  "canceled_orders",
  "duplicate_documentation_corrections",
  "charted_not_given_corrections",
  "late_documentation_corrections",
  "correction_rate",
  "missed_dose_rate",
  "refusal_rate",
  "held_dose_rate",
  "compliance_health_score",
  "audit_reconstruction_availability",
  "rescheduled_doses",
  "early_reschedules",
  "late_reschedules",
  "high_risk_reschedules",
  "reschedule_rate",
  "on_time_administrations",
  "early_administrations",
  "late_administrations",
  "high_variance_administrations",
  "on_time_administration_rate",
  "early_administration_rate",
  "late_administration_rate",
] as const;

export type MarAnalyticsKpiKey = (typeof MAR_ANALYTICS_KPI_KEYS)[number];

export type MarAnalyticsDashboardSection = {
  id: MarAnalyticsDashboardSectionId;
  titleKey: string;
  descriptionKey: string;
  kpiKeys: MarAnalyticsKpiKey[];
};

export const MAR_ANALYTICS_DASHBOARD_SECTIONS: readonly MarAnalyticsDashboardSection[] = [
  {
    id: "executive_overview",
    titleKey: "marAnalytics.section.executiveOverview",
    descriptionKey: "marAnalytics.section.executiveOverviewDesc",
    kpiKeys: [
      "medication_administrations",
      "corrections",
      "missed_doses",
      "compliance_health_score",
      "audit_reconstruction_availability",
    ],
  },
  {
    id: "compliance",
    titleKey: "marAnalytics.section.compliance",
    descriptionKey: "marAnalytics.section.complianceDesc",
    kpiKeys: [
      "scheduled_administrations",
      "medication_administrations",
      "missed_dose_rate",
      "correction_rate",
      "compliance_health_score",
    ],
  },
  {
    id: "corrections",
    titleKey: "marAnalytics.section.corrections",
    descriptionKey: "marAnalytics.section.correctionsDesc",
    kpiKeys: [
      "corrections",
      "correction_rate",
      "duplicate_documentation_corrections",
      "charted_not_given_corrections",
      "late_documentation_corrections",
    ],
  },
  {
    id: "missed_doses",
    titleKey: "marAnalytics.section.missedDoses",
    descriptionKey: "marAnalytics.section.missedDosesDesc",
    kpiKeys: ["missed_doses", "refused_doses", "held_doses", "not_available_doses", "missed_dose_rate", "refusal_rate", "held_dose_rate"],
  },
  {
    id: "infusions",
    titleKey: "marAnalytics.section.infusions",
    descriptionKey: "marAnalytics.section.infusionsDesc",
    kpiKeys: ["infusion_starts", "infusion_stops"],
  },
  {
    id: "nursing_performance",
    titleKey: "marAnalytics.section.nursingPerformance",
    descriptionKey: "marAnalytics.section.nursingPerformanceDesc",
    kpiKeys: ["medication_administrations", "prn_administrations", "corrections"],
  },
];

export type MarAnalyticsCountBucket = { key: string; count: number };

export type MarAnalyticsRateMetric = {
  numerator: number;
  denominator: number;
  rate: number;
};

export type MarAnalyticsKpiValue = {
  key: MarAnalyticsKpiKey;
  count?: number;
  rate?: MarAnalyticsRateMetric;
  score?: number;
};
