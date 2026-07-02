"use client";

/**
 * Composes EncounterClinicalRecord from ER Summary data already loaded in the panel.
 * Does not fetch — reuses existing summary state only.
 */

import { useMemo } from "react";
import { buildEncounterClinicalRecord, type EncounterClinicalRecord } from "@medora/shared";
import type { SupportedLanguage } from "@/i18n/config";
import type { UnifiedTimelineApiItem } from "@/lib/unifiedEncounterTimelineUi";
import type { EncounterResultsLabRadSnapshot } from "@/components/encounters/EncounterResultsTab";
import type { VitalsHistoryEntry } from "@/lib/encounterClinicalSafetyUi";
import {
  buildEncounterClinicalRecordInputFromEmergencySummary,
  summarizeEmergencySummaryAdapterSources,
  type EmergencySummaryClinicalRecordAdapterEncounter,
} from "./encounterClinicalRecordAdapter";
import {
  buildClinicalRecordParitySnapshot,
  logEncounterClinicalRecordParityDev,
  type ClinicalRecordParitySnapshot,
} from "./encounterClinicalRecordParity";
import type {
  ClinicalDocumentationEventApiEntry,
  EmergencyVisitSummaryModel,
  NursingReassessmentApiEntry,
} from "./emergencyVisitSummaryModel";

export type UseEncounterClinicalRecordInput = {
  enabled?: boolean;
  locale: SupportedLanguage;
  encounter: EmergencySummaryClinicalRecordAdapterEncounter;
  triageSnapshot?: Record<string, unknown> | null;
  summaryModel: EmergencyVisitSummaryModel;
  orders?: unknown[];
  medicationAdministrations?: unknown[];
  procedures?: unknown[];
  documentationEvents?: ClinicalDocumentationEventApiEntry[];
  nursingReassessmentEvents?: NursingReassessmentApiEntry[];
  resultsSnapshot?: EncounterResultsLabRadSnapshot | null;
  unifiedTimelineItems?: UnifiedTimelineApiItem[];
  clinicalTimelineLegacyCount?: number;
  vitalsHistory?: VitalsHistoryEntry[];
};

export type UseEncounterClinicalRecordResult = {
  record: EncounterClinicalRecord | null;
  parity: ClinicalRecordParitySnapshot | null;
  projectionFailed: boolean;
};

export function composeEncounterClinicalRecordFromEmergencySummary(
  input: UseEncounterClinicalRecordInput
): UseEncounterClinicalRecordResult {
  if (input.enabled === false) {
    return { record: null, parity: null, projectionFailed: false };
  }

  try {
    const adapterInput = buildEncounterClinicalRecordInputFromEmergencySummary({
      locale: input.locale,
      encounter: input.encounter,
      triageSnapshot: input.triageSnapshot,
      summaryModel: input.summaryModel,
      orders: input.orders,
      medicationAdministrations: input.medicationAdministrations,
      procedures: input.procedures,
      documentationEvents: input.documentationEvents,
      nursingReassessmentEvents: input.nursingReassessmentEvents,
      resultsSnapshot: input.resultsSnapshot,
      unifiedTimelineItems: input.unifiedTimelineItems,
      vitalsHistory: input.vitalsHistory,
    });

    const record = buildEncounterClinicalRecord(adapterInput);
    const sourceSummary = summarizeEmergencySummaryAdapterSources({
      orders: input.orders,
      medicationAdministrations: input.medicationAdministrations,
      procedures: input.procedures,
      documentationEvents: input.documentationEvents,
      resultsSnapshot: input.resultsSnapshot,
    });

    const parity = buildClinicalRecordParitySnapshot({
      encounterId: input.encounter.id,
      summaryModel: input.summaryModel,
      clinicalRecord: record,
      clinicalTimelineLegacyCount: input.clinicalTimelineLegacyCount ?? 0,
      orderItemCount: sourceSummary.orderItemCount,
      marCount: sourceSummary.marCount,
      procedureCount: sourceSummary.procedureCount,
      documentationEventCount: sourceSummary.documentationEventCount,
      labResultPreviewCount: sourceSummary.labResultPreviewCount,
      imagingResultPreviewCount: sourceSummary.imagingResultPreviewCount,
    });

    logEncounterClinicalRecordParityDev(parity);

    return { record, parity, projectionFailed: false };
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[EncounterClinicalRecord] projection failed — legacy Summary fallback", error);
    }
    return { record: null, parity: null, projectionFailed: true };
  }
}

export function useEncounterClinicalRecord(
  input: UseEncounterClinicalRecordInput
): UseEncounterClinicalRecordResult {
  const enabled = input.enabled !== false;

  return useMemo(() => composeEncounterClinicalRecordFromEmergencySummary({ ...input, enabled }), [
    enabled,
    input.locale,
    input.encounter,
    input.triageSnapshot,
    input.summaryModel,
    input.orders,
    input.medicationAdministrations,
    input.procedures,
    input.documentationEvents,
    input.nursingReassessmentEvents,
    input.resultsSnapshot,
    input.unifiedTimelineItems,
    input.clinicalTimelineLegacyCount,
    input.vitalsHistory,
  ]);
}
