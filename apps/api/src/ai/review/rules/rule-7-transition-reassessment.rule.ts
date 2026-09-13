import type { AiStructuredDocumentationEntry, EncounterAiSnapshot } from "@medora/shared";
import type { SuggestionContext } from "../review.types.js";
import { buildAiSuggestion } from "../review.utils.js";

const ACUTE_CARE_SETTINGS = new Set([
  "EMERGENCY_DEPARTMENT",
  "HOSPITAL_INPATIENT_OBSERVATION",
  "CRITICAL_CARE",
]);

function parseIso(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isReassessmentEntry(entry: AiStructuredDocumentationEntry): boolean {
  return entry.namespace.toLowerCase().includes("reassess");
}

function reassessmentClinicalTime(entry: AiStructuredDocumentationEntry): number | null {
  const payload = entry.payloadSummary;
  if (payload && typeof payload === "object") {
    const candidate = (payload as Record<string, unknown>).reassessmentAt;
    if (typeof candidate === "string") {
      const parsed = parseIso(candidate);
      if (parsed !== null) return parsed;
    }
  }

  if (entry.namespace.toLowerCase() === "ernursingreassessmentv1") {
    return null;
  }

  return parseIso(entry.documentedAt);
}

function latestRecordedTreatmentTime(snapshot: EncounterAiSnapshot): {
  time: number;
  iso: string;
  sourceType: "MEDICATION" | "PROCEDURE";
  sourceId?: string;
} | null {
  const candidates: Array<{
    time: number;
    iso: string;
    sourceType: "MEDICATION" | "PROCEDURE";
    sourceId?: string;
  }> = [];

  for (const item of snapshot.treatments.medicationAdministrations ?? []) {
    const time = parseIso(item.administeredAt);
    if (time === null || !item.administeredAt) continue;
    candidates.push({ time, iso: item.administeredAt, sourceType: "MEDICATION", sourceId: item.id });
  }

  for (const item of snapshot.treatments.procedures ?? []) {
    const time = parseIso(item.performedAt);
    if (time === null || !item.performedAt) continue;
    candidates.push({ time, iso: item.performedAt, sourceType: "PROCEDURE", sourceId: item.id });
  }

  if (candidates.length === 0) return null;
  return candidates.reduce((latest, current) => (current.time > latest.time ? current : latest));
}

function hasTransitionOfCare(snapshot: EncounterAiSnapshot): boolean {
  if (String(snapshot.disposition.disposition ?? "").trim()) return true;
  if (String(snapshot.disposition.dischargeStatus ?? "").trim()) return true;
  const status = String(snapshot.encounterContext.status ?? "").trim().toUpperCase();
  return Boolean(status && status !== "OPEN");
}

/**
 * Phase 2A: review whether structured reassessment documentation is temporally aligned with the
 * latest recorded treatment event when an acute-care encounter is entering a transition of care.
 * This is a documentation review only and does not infer that bedside care did or did not occur.
 */
export function rule7TransitionReassessment(
  snapshot: EncounterAiSnapshot,
  ctx: SuggestionContext
) {
  if (!ACUTE_CARE_SETTINGS.has(snapshot.encounterContext.careSetting)) return [];
  if (!hasTransitionOfCare(snapshot)) return [];

  const treatment = latestRecordedTreatmentTime(snapshot);
  if (!treatment) return [];

  const entries = [
    ...(snapshot.clinicalDocumentation.reassessments ?? []),
    ...(snapshot.clinicalDocumentation.structuredEntries ?? []),
  ].filter(isReassessmentEntry);

  const transitionValue =
    snapshot.disposition.disposition ??
    snapshot.disposition.dischargeStatus ??
    snapshot.encounterContext.status;

  if (entries.length === 0) {
    return [
      buildAiSuggestion(ctx, {
        category: "REASSESSMENT_GAP",
        priority: "MEDIUM",
        title: "Post-treatment reassessment documentation not found before disposition",
        summary:
          "The acute-care record has entered a transition of care after a recorded treatment event, but no structured reassessment entry is present.",
        reasoningSummary:
          "This finding compares only structured timestamps and documentation presence. It does not infer whether reassessment occurred outside the captured structured record.",
        evidence: [
          {
            sourceType: treatment.sourceType,
            sourceId: treatment.sourceId,
            label: "Latest recorded treatment event",
            value: treatment.iso,
          },
          {
            sourceType: "DISPOSITION",
            label: "Transition of care",
            value: transitionValue,
          },
          {
            sourceType: "NOTE",
            label: "Structured reassessment entries",
            value: 0,
          },
        ],
        recommendedActions: [
          { actionType: "NAVIGATE", targetSection: "nursing", label: "Review reassessment documentation" },
        ],
      }),
    ];
  }

  const timedEntries = entries
    .map((entry) => ({ entry, time: reassessmentClinicalTime(entry) }))
    .filter((item): item is { entry: AiStructuredDocumentationEntry; time: number } => item.time !== null);

  if (timedEntries.length === 0) {
    return [
      buildAiSuggestion(ctx, {
        category: "DOCUMENTATION_GAP",
        priority: "LOW",
        title: "Reassessment time is not available before disposition",
        summary:
          "Structured reassessment documentation is present, but the record does not contain a reliable clinical reassessment time for comparison with the latest treatment event.",
        reasoningSummary:
          "The review intentionally does not substitute a snapshot-generation timestamp for a missing clinical reassessment time.",
        evidence: [
          {
            sourceType: treatment.sourceType,
            sourceId: treatment.sourceId,
            label: "Latest recorded treatment event",
            value: treatment.iso,
          },
          {
            sourceType: "NOTE",
            label: "Structured reassessment entries without reliable clinical time",
            value: entries.length,
          },
        ],
        recommendedActions: [
          { actionType: "NAVIGATE", targetSection: "nursing", label: "Review reassessment timing" },
        ],
      }),
    ];
  }

  const latest = timedEntries.reduce((a, b) => (b.time > a.time ? b : a));
  if (latest.time >= treatment.time) return [];

  return [
    buildAiSuggestion(ctx, {
      category: "REASSESSMENT_GAP",
      priority: "MEDIUM",
      title: "Latest structured reassessment predates treatment before disposition",
      summary:
        "The encounter has entered a transition of care, and the latest reliable structured reassessment time precedes the latest recorded treatment event.",
      reasoningSummary:
        "The comparison uses only structured chart timestamps and does not infer the patient's clinical status.",
      evidence: [
        {
          sourceType: treatment.sourceType,
          sourceId: treatment.sourceId,
          label: "Latest recorded treatment event",
          value: treatment.iso,
        },
        {
          sourceType: "NOTE",
          sourceId: latest.entry.id,
          label: "Latest structured reassessment",
          value: new Date(latest.time).toISOString(),
        },
        {
          sourceType: "DISPOSITION",
          label: "Transition of care",
          value: transitionValue,
        },
      ],
      recommendedActions: [
        { actionType: "NAVIGATE", targetSection: "nursing", label: "Review reassessment documentation" },
      ],
    }),
  ];
}
