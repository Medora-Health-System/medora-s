import type { AiStructuredDocumentationEntry, EncounterAiSnapshot } from "@medora/shared";
import type { SuggestionContext } from "../review.types.js";
import { isAcuteCareSetting, parseIsoMs } from "../clinical-facts.js";
import { buildCopiedSuggestion } from "../review.utils.js";

function isReassessmentEntry(entry: AiStructuredDocumentationEntry): boolean {
  return entry.namespace.toLowerCase().includes("reassess");
}

function reassessmentClinicalTime(entry: AiStructuredDocumentationEntry): number | null {
  const payload = entry.payloadSummary;
  if (payload && typeof payload === "object") {
    const candidate = (payload as Record<string, unknown>).reassessmentAt;
    if (typeof candidate === "string") {
      const parsed = parseIsoMs(candidate);
      if (parsed !== null) return parsed;
    }
  }
  if (entry.namespace.toLowerCase() === "ernursingreassessmentv1") return null;
  return parseIsoMs(entry.documentedAt);
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
    const time = parseIsoMs(item.administeredAt);
    if (time === null || !item.administeredAt) continue;
    candidates.push({ time, iso: item.administeredAt, sourceType: "MEDICATION", sourceId: item.id });
  }
  for (const item of snapshot.treatments.procedures ?? []) {
    const time = parseIsoMs(item.performedAt);
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
 * Acute-care only: structured reassessment vs latest treatment before transition.
 * Does not apply clinic assumptions to ED or vice versa.
 */
export function rule7TransitionReassessment(
  snapshot: EncounterAiSnapshot,
  ctx: SuggestionContext
) {
  if (!isAcuteCareSetting(snapshot.encounterContext.careSetting)) return [];
  if (!hasTransitionOfCare(snapshot)) return [];

  const treatment = latestRecordedTreatmentTime(snapshot);
  if (!treatment) return [];

  const entries = [
    ...(snapshot.clinicalDocumentation.reassessments ?? []),
    ...(snapshot.clinicalDocumentation.structuredEntries ?? []),
  ].filter(isReassessmentEntry);

  const evidence = [
    {
      sourceType: treatment.sourceType,
      sourceId: treatment.sourceId,
      label: "Latest recorded treatment event",
      value: treatment.iso,
    },
  ];

  if (entries.length === 0) {
    return [
      buildCopiedSuggestion(ctx, {
        category: "REASSESSMENT_GAP",
        priority: "MEDIUM",
        copyKey: "transitionReassessmentMissing",
        evidence,
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
      buildCopiedSuggestion(ctx, {
        category: "DOCUMENTATION_GAP",
        priority: "LOW",
        copyKey: "transitionReassessmentUntimed",
        evidence,
        recommendedActions: [
          { actionType: "NAVIGATE", targetSection: "nursing", label: "Review reassessment timing" },
        ],
      }),
    ];
  }

  const latest = timedEntries.reduce((a, b) => (b.time > a.time ? b : a));
  if (latest.time >= treatment.time) return [];

  return [
    buildCopiedSuggestion(ctx, {
      category: "REASSESSMENT_GAP",
      priority: "MEDIUM",
      copyKey: "transitionReassessmentPredatesTreatment",
      evidence,
      recommendedActions: [
        { actionType: "NAVIGATE", targetSection: "nursing", label: "Review reassessment documentation" },
      ],
    }),
  ];
}
