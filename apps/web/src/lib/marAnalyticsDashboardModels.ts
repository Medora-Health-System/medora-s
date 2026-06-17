/**
 * MEDUI.ED.MAR.H8 — MAR analytics dashboard view models (contracts only, no UI).
 * Read-only. Consumes shared aggregate builders.
 */
import {
  MAR_ANALYTICS_DASHBOARD_SECTIONS,
  type MarAnalyticsDashboardSection,
  type MarAnalyticsDashboardSectionId,
  type MarAnalyticsKpiKey,
} from "@medora/shared";
import {
  buildMarAnalyticsAggregates,
  buildMarAdministrationMetrics,
  buildMarComplianceHealth,
  buildMarCorrectionMetrics,
  buildMarExecutiveOverview,
  buildMarInfusionMetrics,
  buildMarMissedDoseMetrics,
  type MarAnalyticsAggregates,
} from "@medora/shared";
import type { MarAnalyticsInput } from "@medora/shared";

export type MarDashboardKpiCard = {
  metricKey: MarAnalyticsKpiKey;
  labelKey: string;
  value: number;
  format: "count" | "rate" | "percent" | "score";
};

export type MarExecutiveOverviewDashboard = {
  sectionId: "executive_overview";
  generatedAt: string;
  cards: MarDashboardKpiCard[];
  summary: MarAnalyticsAggregates["executiveOverview"];
  complianceHealthScore: number;
};

export type MarComplianceDashboard = {
  sectionId: "compliance";
  generatedAt: string;
  cards: MarDashboardKpiCard[];
  complianceHealth: MarAnalyticsAggregates["complianceHealth"];
};

export type MarCorrectionDashboard = {
  sectionId: "corrections";
  generatedAt: string;
  cards: MarDashboardKpiCard[];
  metrics: MarAnalyticsAggregates["corrections"];
  highFrequencyAlerts: MarAnalyticsAggregates["corrections"]["highFrequencyAlerts"];
};

export type MarMissedDoseDashboard = {
  sectionId: "missed_doses";
  generatedAt: string;
  cards: MarDashboardKpiCard[];
  metrics: MarAnalyticsAggregates["missedDoses"];
};

export type MarInfusionDashboard = {
  sectionId: "infusions";
  generatedAt: string;
  cards: MarDashboardKpiCard[];
  metrics: MarAnalyticsAggregates["infusions"];
};

export type MarNursingPerformanceDashboard = {
  sectionId: "nursing_performance";
  generatedAt: string;
  cards: MarDashboardKpiCard[];
  byNurse: MarAnalyticsAggregates["administrations"]["byNurse"];
  byShift: MarAnalyticsAggregates["administrations"]["byShift"];
  correctionsByUser: MarAnalyticsAggregates["corrections"]["byUser"];
};

export type MarAnalyticsDashboardBundle = {
  readOnly: true;
  generatedAt: string;
  aggregates: MarAnalyticsAggregates;
  executive: MarExecutiveOverviewDashboard;
  compliance: MarComplianceDashboard;
  corrections: MarCorrectionDashboard;
  missedDoses: MarMissedDoseDashboard;
  infusions: MarInfusionDashboard;
  nursingPerformance: MarNursingPerformanceDashboard;
  sections: readonly MarAnalyticsDashboardSection[];
};

const KPI_LABEL_KEYS: Record<MarAnalyticsKpiKey, string> = {
  medication_administrations: "marAnalytics.kpi.medicationAdministrations",
  scheduled_administrations: "marAnalytics.kpi.scheduledAdministrations",
  prn_administrations: "marAnalytics.kpi.prnAdministrations",
  infusion_starts: "marAnalytics.kpi.infusionStarts",
  infusion_stops: "marAnalytics.kpi.infusionStops",
  corrections: "marAnalytics.kpi.corrections",
  missed_doses: "marAnalytics.kpi.missedDoses",
  refused_doses: "marAnalytics.kpi.refusedDoses",
  held_doses: "marAnalytics.kpi.heldDoses",
  not_available_doses: "marAnalytics.kpi.notAvailableDoses",
  canceled_orders: "marAnalytics.kpi.canceledOrders",
  duplicate_documentation_corrections: "marAnalytics.kpi.duplicateDocumentationCorrections",
  charted_not_given_corrections: "marAnalytics.kpi.chartedNotGivenCorrections",
  late_documentation_corrections: "marAnalytics.kpi.lateDocumentationCorrections",
  correction_rate: "marAnalytics.kpi.correctionRate",
  missed_dose_rate: "marAnalytics.kpi.missedDoseRate",
  refusal_rate: "marAnalytics.kpi.refusalRate",
  held_dose_rate: "marAnalytics.kpi.heldDoseRate",
  compliance_health_score: "marAnalytics.kpi.complianceHealthScore",
  audit_reconstruction_availability: "marAnalytics.kpi.auditReconstructionAvailability",
  rescheduled_doses: "marAnalytics.kpi.rescheduledDoses",
  early_reschedules: "marAnalytics.kpi.earlyReschedules",
  late_reschedules: "marAnalytics.kpi.lateReschedules",
  high_risk_reschedules: "marAnalytics.kpi.highRiskReschedules",
  reschedule_rate: "marAnalytics.kpi.rescheduleRate",
  on_time_administrations: "marAnalytics.kpi.onTimeAdministrations",
  early_administrations: "marAnalytics.kpi.earlyAdministrations",
  late_administrations: "marAnalytics.kpi.lateAdministrations",
  high_variance_administrations: "marAnalytics.kpi.highVarianceAdministrations",
  on_time_administration_rate: "marAnalytics.kpi.onTimeAdministrationRate",
  early_administration_rate: "marAnalytics.kpi.earlyAdministrationRate",
  late_administration_rate: "marAnalytics.kpi.lateAdministrationRate",
};

function kpiToCard(key: MarAnalyticsKpiKey, aggregates: MarAnalyticsAggregates): MarDashboardKpiCard {
  const kpi = aggregates.kpis[key];
  if (kpi.score != null) {
    return { metricKey: key, labelKey: KPI_LABEL_KEYS[key], value: kpi.score, format: "score" };
  }
  if (kpi.rate != null) {
    return {
      metricKey: key,
      labelKey: KPI_LABEL_KEYS[key],
      value: Math.round(kpi.rate.rate * 1000) / 10,
      format: "percent",
    };
  }
  return {
    metricKey: key,
    labelKey: KPI_LABEL_KEYS[key],
    value: kpi.count ?? 0,
    format: "count",
  };
}

function cardsForSection(
  sectionId: MarAnalyticsDashboardSectionId,
  aggregates: MarAnalyticsAggregates
): MarDashboardKpiCard[] {
  const section = MAR_ANALYTICS_DASHBOARD_SECTIONS.find((s) => s.id === sectionId);
  if (!section) return [];
  return section.kpiKeys.map((key) => kpiToCard(key, aggregates));
}

export function buildMarExecutiveOverviewDashboard(
  input: MarAnalyticsInput
): MarExecutiveOverviewDashboard {
  const aggregates = buildMarAnalyticsAggregates(input);
  return {
    sectionId: "executive_overview",
    generatedAt: aggregates.generatedAt,
    cards: cardsForSection("executive_overview", aggregates),
    summary: aggregates.executiveOverview,
    complianceHealthScore: aggregates.complianceHealth.score,
  };
}

export function buildMarComplianceDashboard(input: MarAnalyticsInput): MarComplianceDashboard {
  const aggregates = buildMarAnalyticsAggregates(input);
  return {
    sectionId: "compliance",
    generatedAt: aggregates.generatedAt,
    cards: cardsForSection("compliance", aggregates),
    complianceHealth: aggregates.complianceHealth,
  };
}

export function buildMarCorrectionDashboard(input: MarAnalyticsInput): MarCorrectionDashboard {
  const aggregates = buildMarAnalyticsAggregates(input);
  return {
    sectionId: "corrections",
    generatedAt: aggregates.generatedAt,
    cards: cardsForSection("corrections", aggregates),
    metrics: aggregates.corrections,
    highFrequencyAlerts: aggregates.corrections.highFrequencyAlerts,
  };
}

export function buildMarMissedDoseDashboard(input: MarAnalyticsInput): MarMissedDoseDashboard {
  const aggregates = buildMarAnalyticsAggregates(input);
  return {
    sectionId: "missed_doses",
    generatedAt: aggregates.generatedAt,
    cards: cardsForSection("missed_doses", aggregates),
    metrics: aggregates.missedDoses,
  };
}

export function buildMarInfusionDashboard(input: MarAnalyticsInput): MarInfusionDashboard {
  const aggregates = buildMarAnalyticsAggregates(input);
  return {
    sectionId: "infusions",
    generatedAt: aggregates.generatedAt,
    cards: cardsForSection("infusions", aggregates),
    metrics: aggregates.infusions,
  };
}

export function buildMarNursingPerformanceDashboard(
  input: MarAnalyticsInput
): MarNursingPerformanceDashboard {
  const aggregates = buildMarAnalyticsAggregates(input);
  return {
    sectionId: "nursing_performance",
    generatedAt: aggregates.generatedAt,
    cards: cardsForSection("nursing_performance", aggregates),
    byNurse: aggregates.administrations.byNurse,
    byShift: aggregates.administrations.byShift,
    correctionsByUser: aggregates.corrections.byUser,
  };
}

export function buildMarAnalyticsDashboardBundle(
  input: MarAnalyticsInput
): MarAnalyticsDashboardBundle {
  const aggregates = buildMarAnalyticsAggregates(input);
  return {
    readOnly: true,
    generatedAt: aggregates.generatedAt,
    aggregates,
    executive: {
      sectionId: "executive_overview",
      generatedAt: aggregates.generatedAt,
      cards: cardsForSection("executive_overview", aggregates),
      summary: aggregates.executiveOverview,
      complianceHealthScore: aggregates.complianceHealth.score,
    },
    compliance: {
      sectionId: "compliance",
      generatedAt: aggregates.generatedAt,
      cards: cardsForSection("compliance", aggregates),
      complianceHealth: aggregates.complianceHealth,
    },
    corrections: {
      sectionId: "corrections",
      generatedAt: aggregates.generatedAt,
      cards: cardsForSection("corrections", aggregates),
      metrics: aggregates.corrections,
      highFrequencyAlerts: aggregates.corrections.highFrequencyAlerts,
    },
    missedDoses: {
      sectionId: "missed_doses",
      generatedAt: aggregates.generatedAt,
      cards: cardsForSection("missed_doses", aggregates),
      metrics: aggregates.missedDoses,
    },
    infusions: {
      sectionId: "infusions",
      generatedAt: aggregates.generatedAt,
      cards: cardsForSection("infusions", aggregates),
      metrics: aggregates.infusions,
    },
    nursingPerformance: {
      sectionId: "nursing_performance",
      generatedAt: aggregates.generatedAt,
      cards: cardsForSection("nursing_performance", aggregates),
      byNurse: aggregates.administrations.byNurse,
      byShift: aggregates.administrations.byShift,
      correctionsByUser: aggregates.corrections.byUser,
    },
    sections: MAR_ANALYTICS_DASHBOARD_SECTIONS,
  };
}

export {
  buildMarAnalyticsAggregates,
  buildMarAdministrationMetrics,
  buildMarComplianceHealth,
  buildMarCorrectionMetrics,
  buildMarExecutiveOverview,
  buildMarInfusionMetrics,
  buildMarMissedDoseMetrics,
};

export function validateMarAnalyticsDashboardSections(): boolean {
  const required: MarAnalyticsDashboardSectionId[] = [
    "executive_overview",
    "compliance",
    "corrections",
    "missed_doses",
    "infusions",
    "nursing_performance",
  ];
  const present = new Set(MAR_ANALYTICS_DASHBOARD_SECTIONS.map((s) => s.id));
  return required.every((id) => present.has(id));
}
