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

  // The legacy/current ER nursing reassessment namespace is stored in Encounter.nursingAssessment.
  // Older snapshot construction stamped its wrapper entry with the snapshot build time, not the
  // clinical reassessment time. Never treat that wrapper timestamp as clinical evidence.
  if (entry.namespace.toLowerCase() === "ernursingreassessmentv1") {
    return null;
  }

  return parseIso(entry.documentedAt);
}

function latestTreatmentEvent(snapshot: EncounterAiSnapshot): {
  occurredAt: number;
  occurredAtIso: string;
  sourceType: "MEDICATION" | "PROCEDURE";
  sourceId?: string;
  label: string;
} | null {
  const candidates: Array<{
    occurredAt: number;
    occurredAtIso: string;
    sourceType: "MEDICATION" | "PROCEDURE";
    sourceId?: string;
    label: string;
  }> = [];

  for (const administration of snapshot.treatments.medicationAdministrations ?? []) {
    const occurredAt = parseIso(administration.administeredAt);
    if (occurredAt === null || !administration.administeredAt) continue;
    candidates.push({
      occurredAt,
      occurredAtIso: administration.administeredAt,
      sourceType: "MEDICATION",
      sourceId: administration.id,
      label: "Medication administration",
    });
  }

  for (const procedure of snapshot.treatments.procedures ?? []) {
    const occurredAt = parseIso(procedure.performedAt);
    if (occurredAt === null || !procedure.performedAt) continue;
    candidates.push({
      occurredAt,
      occurredAtIso: procedure.performedAt,
      sourceType: "PROCEDURE",
      sourceId: procedure.id,
      label: "Procedure performed",
    });
  }

  if (candidates.length === 0) return null;
  return candidates.reduce((latest, current) =>
    current.occurredAt > latest.occurredAt ? current : latest
  );
}

/**
 * Phase 2A — reassessment-after-treatment intelligence.
 *
 * This rule is intentionally conservative. It applies only to acute-care settings and only when
 * the chart contains a timestamp proving that a medication was administered or a procedure was
 * performed. It never infers that care was clinically inadequate; it flags only the absence or
 * timing of structured reassessment documentation relative to that recorded treatment event.
 */
export function rule7ReassessmentAfterTreatment(
  snapshot: EncounterAiSnapshot,
  ctx: SuggestionContext
) {
  if (!ACUTE_CARE_SETTINGS.has(snapshot.encounterContext.careSetting)) {
    return [];
  }

  const treatment = latestTreatmentEvent(snapshot);
  if (!treatment) return [];

  const documentationEntries = [
    ...(snapshot.clinicalDocumentation.reassessments ?? []),
    ...(snapshot.clinicalDocumentation.structuredEntries ?? []),
  ];
  const reassessmentEntries = documentationEntries.filter(isReassessmentEntry);

  if (reassessmentEntries.length === 0) {
    return [
      buildAiSuggestion(ctx, {
        category: "REASSESSMENT_GAP",
        priority: "MEDIUM",
        title: "Reassessment documentation not found after treatment",
        summary:
          "The acute-care snapshot contains a documented medication administration or performed procedure, but no structured reassessment entry is present.",
        reasoningSummary:
          "This finding compares only recorded treatment timestamps with structured reassessment documentation; it does not infer whether bedside reassessment occurred outside the captured record.",
        evidence: [
          {
            sourceType: treatment.sourceType,
            sourceId: treatment.sourceId,
            label: treatment.label,
            value: treatment.occurredAtIso,
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

  const reliableTimes = reassessmentEntries
    .map((entry) => ({ entry, time: reassessmentClinicalTime(entry) }))
    .filter((item): item is { entry: AiStructuredDocumentationEntry; time: number } => item.time !== null);

  if (reliableTimes.length === 0) {
    return [
      buildAiSuggestion(ctx, {
        category: "DOCUMENTATION_GAP",
        priority: "LOW",
        title: "Reassessment time is not available",
        summary:
          "Structured reassessment documentation is present, but the snapshot does not contain a reliable clinical reassessment timestamp for comparison with the recorded treatment event.",
        reasoningSummary:
          "The AI does not substitute the snapshot-generation time for a missing clinical reassessment time.",
        evidence: [
          {
            sourceType: treatment.sourceType,
            sourceId: treatment.sourceId,
            label: treatment.label,
            value: treatment.occurredAtIso,
          },
          {
            sourceType: "NOTE",
            label: "Structured reassessment entries without reliable clinical time",
            value: reassessmentEntries.length,
          },
        ],
        recommendedActions: [
          { actionType: "NAVIGATE", targetSection: "nursing", label: "Review reassessment timing" },
        ],
      }),
    ];
  }

  const latestReassessment = reliableTimes.reduce((latest, current) =>
    current.time > latest.time ? current : latest
  );

  if (latestReassessment.time >= treatment.occurredAt) {
    return [];
  }

  return [
    buildAiSuggestion(ctx, {
      category: "REASSESSMENT_GAP",
      priority: "MEDIUM",
      title: "Latest structured reassessment predates treatment",
      summary:
        "The latest reliable structured reassessment timestamp precedes the most recent recorded medication administration or performed procedure.",
      reasoningSummary:
        "The comparison uses only structured chart timestamps. It does not infer the patient's clinical status or claim that an undocumented reassessment did not occur.",
      evidence: [
        {
          sourceType: treatment.sourceType,
          sourceId: treatment.sourceId,
          label: treatment.label,
          value: treatment.occurredAtIso,
        },
        {
          sourceType: "NOTE",
          sourceId: latestReassessment.entry.id,
          label: "Latest structured reassessment",
          value: new Date(latestReassessment.time).toISOString(),
        },
      ],
      recommendedActions: [
        { actionType: "NAVIGATE", targetSection: "nursing", label: "Review reassessment documentation" },
      ],
    }),
  ];
}
