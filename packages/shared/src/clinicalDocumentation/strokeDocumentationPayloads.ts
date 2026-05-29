import { z } from "zod";
import {
  deriveNihssSeverityBand,
  formatNihssItemSummary,
  NIHSS_FIELD_LABEL_FR,
  NIHSS_SCORED_FIELD_KEYS,
  NIHSS_SEVERITY_BAND_LABEL_FR,
  type NihssScoredFieldKey,
} from "./clinicalDocumentationFieldOptions.js";

/** EDOC.4 — stroke documentation card IDs (preserve registry IDs). */
export const STROKE_NIHSS_CARD_ID = "stroke_nihss" as const;
export const STROKE_SWALLOW_SCREEN_CARD_ID = "stroke_swallow_screen" as const;
export const STROKE_CINCINNATI_CARD_ID = "stroke_cincinnati" as const;
export const STROKE_VAN_ASSESSMENT_CARD_ID = "stroke_van_assessment" as const;
export const STROKE_ABCD2_CARD_ID = "stroke_abcd2" as const;
export const STROKE_TIMELINE_CARD_ID = "stroke_timeline" as const;
export const STROKE_NEURO_CHECKS_CARD_ID = "stroke_neuro_checks" as const;

export const EDOC4_STROKE_DOCUMENTATION_CARD_IDS = [
  STROKE_NIHSS_CARD_ID,
  STROKE_SWALLOW_SCREEN_CARD_ID,
  STROKE_CINCINNATI_CARD_ID,
  STROKE_VAN_ASSESSMENT_CARD_ID,
  STROKE_ABCD2_CARD_ID,
  STROKE_TIMELINE_CARD_ID,
  STROKE_NEURO_CHECKS_CARD_ID,
] as const;

export type Edoc4StrokeDocumentationCardId = (typeof EDOC4_STROKE_DOCUMENTATION_CARD_IDS)[number];

const optionalNotes = z.string().trim().max(2000).optional();
const optionalReason = z.string().trim().min(1).max(500).optional();

const isoDateTimeString = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .refine((s) => !Number.isNaN(Date.parse(s)), { message: "Invalid date/time" });

const optionalIsoDateTime = z
  .string()
  .trim()
  .max(40)
  .refine((s) => s === "" || !Number.isNaN(Date.parse(s)), { message: "Invalid date/time" })
  .optional()
  .transform((s) => (s?.trim() ? s.trim() : undefined));

const nihssItem = (min: number, max: number) => z.coerce.number().int().min(min).max(max);

export const nihssPayloadSchema = z
  .object({
    assessedAt: isoDateTimeString,
    levelOfConsciousness: nihssItem(0, 3),
    locQuestions: nihssItem(0, 2),
    locCommands: nihssItem(0, 2),
    bestGaze: nihssItem(0, 2),
    visualFields: nihssItem(0, 3),
    facialPalsy: nihssItem(0, 3),
    motorArmLeft: nihssItem(0, 4),
    motorArmRight: nihssItem(0, 4),
    motorLegLeft: nihssItem(0, 4),
    motorLegRight: nihssItem(0, 4),
    limbAtaxia: nihssItem(0, 2),
    sensory: nihssItem(0, 2),
    bestLanguage: nihssItem(0, 3),
    dysarthria: nihssItem(0, 2),
    extinctionInattention: nihssItem(0, 2),
    totalScore: nihssItem(0, 42),
    unableToAssessReason: optionalReason,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.unableToAssessReason?.trim()) return;
    const calculated = calculateNihssTotal(data);
    if (data.totalScore !== calculated) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "totalScore must equal sum of NIHSS item scores",
        path: ["totalScore"],
      });
    }
  });

export const swallowScreenPayloadSchema = z
  .object({
    screenedAt: isoDateTimeString,
    alertEnoughForScreen: z.boolean(),
    facialDroopOrWeakness: z.boolean(),
    speechDifficulty: z.boolean(),
    coughOrWetVoice: z.boolean(),
    failedWaterTrial: z.boolean(),
    result: z.enum(["PASSED", "FAILED", "DEFERRED"]),
    npoRecommended: z.boolean(),
    providerNotified: z.boolean(),
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.result === "FAILED" && !data.npoRecommended && !data.notes?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "FAILED swallow screen requires NPO recommendation or notes",
        path: ["npoRecommended"],
      });
    }
    if (data.result === "DEFERRED" && !data.notes?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "DEFERRED swallow screen requires notes",
        path: ["notes"],
      });
    }
  });

const cincinnatiElement = z.enum(["NORMAL", "ABNORMAL", "UNABLE_TO_ASSESS"]);

export const cincinnatiStrokeScalePayloadSchema = z
  .object({
    assessedAt: isoDateTimeString,
    facialDroop: cincinnatiElement,
    armDrift: cincinnatiElement,
    speech: cincinnatiElement,
    result: z.enum(["NEGATIVE", "POSITIVE", "INCOMPLETE"]),
    providerNotified: z.boolean(),
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    const derived = deriveCincinnatiResult(data);
    if (data.result !== derived) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "result must match derived Cincinnati scale result",
        path: ["result"],
      });
    }
  });

export const vanAssessmentPayloadSchema = z
  .object({
    assessedAt: isoDateTimeString,
    armWeaknessPresent: z.boolean(),
    visualDisturbance: z.boolean(),
    aphasia: z.boolean(),
    neglect: z.boolean(),
    result: z.enum(["NEGATIVE", "POSITIVE", "INCOMPLETE"]),
    providerNotified: z.boolean(),
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    const derived = deriveVanResult(data);
    if (data.result !== derived) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "result must match derived VAN assessment result",
        path: ["result"],
      });
    }
  });

export const abcd2PayloadSchema = z
  .object({
    assessedAt: isoDateTimeString,
    age60OrOlder: z.boolean(),
    bloodPressureElevated: z.boolean(),
    clinicalFeature: z.enum(["UNILATERAL_WEAKNESS", "SPEECH_WITHOUT_WEAKNESS", "OTHER"]),
    duration: z.enum(["GREATER_EQUAL_60_MIN", "TEN_TO_59_MIN", "LESS_THAN_10_MIN"]),
    diabetes: z.boolean(),
    totalScore: z.coerce.number().int().min(0).max(7),
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    const calculated = calculateAbcd2Total(data);
    if (data.totalScore !== calculated) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "totalScore must equal calculated ABCD2 score",
        path: ["totalScore"],
      });
    }
  });

export const strokeTimelinePayloadSchema = z.object({
  lastKnownWellTime: isoDateTimeString,
  symptomDiscoveryTime: optionalIsoDateTime,
  arrivalTime: optionalIsoDateTime,
  strokeAlertCalledTime: optionalIsoDateTime,
  providerEvaluationTime: optionalIsoDateTime,
  ctOrderedTime: optionalIsoDateTime,
  ctCompletedTime: optionalIsoDateTime,
  radiologyResultTime: optionalIsoDateTime,
  thrombolyticDecisionTime: optionalIsoDateTime,
  thrombolyticGivenTime: optionalIsoDateTime,
  transferDecisionTime: optionalIsoDateTime,
  notes: optionalNotes,
});

export const neuroChecksPayloadSchema = z
  .object({
    assessedAt: isoDateTimeString,
    levelOfConsciousness: z.string().trim().min(1).max(120),
    orientation: z.string().trim().min(1).max(120),
    pupils: z.string().trim().min(1).max(120),
    gripLeft: z.string().trim().min(1).max(120),
    gripRight: z.string().trim().min(1).max(120),
    motorLeft: z.string().trim().min(1).max(120),
    motorRight: z.string().trim().min(1).max(120),
    sensation: z.string().trim().min(1).max(120),
    speech: z.string().trim().min(1).max(120),
    changesFromPrior: z.enum(["YES", "NO", "UNKNOWN"]),
    providerNotified: z.boolean(),
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.changesFromPrior === "YES" && !data.providerNotified && !data.notes?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Neuro changes require provider notification or notes",
        path: ["providerNotified"],
      });
    }
  });

export type NihssPayload = z.infer<typeof nihssPayloadSchema>;
export type SwallowScreenPayload = z.infer<typeof swallowScreenPayloadSchema>;
export type CincinnatiStrokeScalePayload = z.infer<typeof cincinnatiStrokeScalePayloadSchema>;
export type VanAssessmentPayload = z.infer<typeof vanAssessmentPayloadSchema>;
export type Abcd2Payload = z.infer<typeof abcd2PayloadSchema>;
export type StrokeTimelinePayload = z.infer<typeof strokeTimelinePayloadSchema>;
export type NeuroChecksPayload = z.infer<typeof neuroChecksPayloadSchema>;

const STROKE_PAYLOAD_SCHEMA_BY_CARD_ID: Record<string, z.ZodType<Record<string, unknown>>> = {
  [STROKE_NIHSS_CARD_ID]: nihssPayloadSchema,
  [STROKE_SWALLOW_SCREEN_CARD_ID]: swallowScreenPayloadSchema,
  [STROKE_CINCINNATI_CARD_ID]: cincinnatiStrokeScalePayloadSchema,
  [STROKE_VAN_ASSESSMENT_CARD_ID]: vanAssessmentPayloadSchema,
  [STROKE_ABCD2_CARD_ID]: abcd2PayloadSchema,
  [STROKE_TIMELINE_CARD_ID]: strokeTimelinePayloadSchema,
  [STROKE_NEURO_CHECKS_CARD_ID]: neuroChecksPayloadSchema,
};

export function isEdoc4StrokeDocumentationCardId(cardId: string): cardId is Edoc4StrokeDocumentationCardId {
  return (EDOC4_STROKE_DOCUMENTATION_CARD_IDS as readonly string[]).includes(cardId);
}

export function validateStrokePayloadForCard(
  cardId: string,
  payload: Record<string, unknown>
): { ok: true; data: Record<string, unknown> } | { ok: false; message: string } {
  const schema = STROKE_PAYLOAD_SCHEMA_BY_CARD_ID[cardId];
  if (!schema) {
    return { ok: false, message: "Card is not available for structured save" };
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, message: "Invalid clinical documentation payload" };
  }
  return { ok: true, data: parsed.data as Record<string, unknown> };
}

export function calculateNihssTotal(
  payload: Pick<
    NihssPayload,
    | "levelOfConsciousness"
    | "locQuestions"
    | "locCommands"
    | "bestGaze"
    | "visualFields"
    | "facialPalsy"
    | "motorArmLeft"
    | "motorArmRight"
    | "motorLegLeft"
    | "motorLegRight"
    | "limbAtaxia"
    | "sensory"
    | "bestLanguage"
    | "dysarthria"
    | "extinctionInattention"
  >
): number {
  return (
    payload.levelOfConsciousness +
    payload.locQuestions +
    payload.locCommands +
    payload.bestGaze +
    payload.visualFields +
    payload.facialPalsy +
    payload.motorArmLeft +
    payload.motorArmRight +
    payload.motorLegLeft +
    payload.motorLegRight +
    payload.limbAtaxia +
    payload.sensory +
    payload.bestLanguage +
    payload.dysarthria +
    payload.extinctionInattention
  );
}

export function calculateAbcd2Total(
  payload: Pick<
    Abcd2Payload,
    "age60OrOlder" | "bloodPressureElevated" | "clinicalFeature" | "duration" | "diabetes"
  >
): number {
  let score = 0;
  if (payload.age60OrOlder) score += 1;
  if (payload.bloodPressureElevated) score += 1;
  if (payload.clinicalFeature === "UNILATERAL_WEAKNESS") score += 2;
  else if (payload.clinicalFeature === "SPEECH_WITHOUT_WEAKNESS") score += 1;
  if (payload.duration === "GREATER_EQUAL_60_MIN") score += 2;
  else if (payload.duration === "TEN_TO_59_MIN") score += 1;
  if (payload.diabetes) score += 1;
  return score;
}

export function deriveCincinnatiResult(
  payload: Pick<CincinnatiStrokeScalePayload, "facialDroop" | "armDrift" | "speech">
): "NEGATIVE" | "POSITIVE" | "INCOMPLETE" {
  const values = [payload.facialDroop, payload.armDrift, payload.speech];
  if (values.some((v) => v === "ABNORMAL")) return "POSITIVE";
  if (values.some((v) => v === "UNABLE_TO_ASSESS")) return "INCOMPLETE";
  return "NEGATIVE";
}

export function deriveVanResult(
  payload: Pick<
    VanAssessmentPayload,
    "armWeaknessPresent" | "visualDisturbance" | "aphasia" | "neglect"
  >
): "NEGATIVE" | "POSITIVE" | "INCOMPLETE" {
  const cortical = payload.visualDisturbance || payload.aphasia || payload.neglect;
  if (payload.armWeaknessPresent && cortical) return "POSITIVE";
  if (!payload.armWeaknessPresent && cortical) return "INCOMPLETE";
  return "NEGATIVE";
}

function yesNoFr(v: boolean): string {
  return v ? "Oui" : "Non";
}

const SWALLOW_RESULT_FR: Record<string, string> = {
  PASSED: "Réussi",
  FAILED: "Échoué",
  DEFERRED: "Reporté",
};

const SCREEN_RESULT_FR: Record<string, string> = {
  NEGATIVE: "Négatif",
  POSITIVE: "Positif",
  INCOMPLETE: "Incomplet",
};

const CHANGES_FR: Record<string, string> = {
  YES: "Oui",
  NO: "Non",
  UNKNOWN: "Inconnu",
};

/** French legal summary lines for stroke cards. */
export function summarizeStrokeDocumentationPayload(
  cardId: string,
  payload: Record<string, unknown>
): Array<{ key: string; value: string }> {
  switch (cardId) {
    case STROKE_NIHSS_CARD_ID: {
      const p = nihssPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      const lines: Array<{ key: string; value: string }> = [
        { key: "Score NIHSS total", value: String(d.totalScore) },
        {
          key: "Bande de sévérité NIHSS",
          value: NIHSS_SEVERITY_BAND_LABEL_FR[deriveNihssSeverityBand(d.totalScore)],
        },
        { key: "Évalué le", value: d.assessedAt },
      ];
      for (const fieldKey of NIHSS_SCORED_FIELD_KEYS) {
        const score = d[fieldKey as NihssScoredFieldKey];
        const summary = formatNihssItemSummary(fieldKey, score, "fr");
        if (summary) {
          lines.push({ key: NIHSS_FIELD_LABEL_FR[fieldKey], value: summary });
        }
      }
      if (d.unableToAssessReason?.trim()) {
        lines.push({ key: "Raison non évaluable", value: d.unableToAssessReason.trim() });
      }
      return lines;
    }
    case STROKE_SWALLOW_SCREEN_CARD_ID: {
      const p = swallowScreenPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        { key: "Résultat", value: SWALLOW_RESULT_FR[d.result] ?? d.result },
        { key: "NPO recommandé", value: yesNoFr(d.npoRecommended) },
        { key: "Médecin avisé", value: yesNoFr(d.providerNotified) },
      ];
    }
    case STROKE_CINCINNATI_CARD_ID: {
      const p = cincinnatiStrokeScalePayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      const abnormal: string[] = [];
      if (d.facialDroop === "ABNORMAL") abnormal.push("asymétrie faciale");
      if (d.armDrift === "ABNORMAL") abnormal.push("dérive du bras");
      if (d.speech === "ABNORMAL") abnormal.push("parole");
      const lines: Array<{ key: string; value: string }> = [
        { key: "Résultat", value: SCREEN_RESULT_FR[d.result] ?? d.result },
      ];
      if (abnormal.length > 0) {
        lines.push({ key: "Éléments anormaux", value: abnormal.join(", ") });
      }
      return lines;
    }
    case STROKE_VAN_ASSESSMENT_CARD_ID: {
      const p = vanAssessmentPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      const signs: string[] = [];
      if (d.visualDisturbance) signs.push("trouble visuel");
      if (d.aphasia) signs.push("aphasie");
      if (d.neglect) signs.push("négligence");
      const lines: Array<{ key: string; value: string }> = [
        { key: "Résultat", value: SCREEN_RESULT_FR[d.result] ?? d.result },
      ];
      if (signs.length > 0) {
        lines.push({ key: "Signes corticaux", value: signs.join(", ") });
      }
      return lines;
    }
    case STROKE_ABCD2_CARD_ID: {
      const p = abcd2PayloadSchema.safeParse(payload);
      if (!p.success) return [];
      return [{ key: "Score ABCD2", value: String(p.data.totalScore) }];
    }
    case STROKE_TIMELINE_CARD_ID: {
      const p = strokeTimelinePayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      const lines: Array<{ key: string; value: string }> = [
        { key: "LKW", value: d.lastKnownWellTime },
      ];
      if (d.ctCompletedTime) lines.push({ key: "TDM terminée", value: d.ctCompletedTime });
      if (d.thrombolyticDecisionTime) {
        lines.push({ key: "Décision thrombolyse", value: d.thrombolyticDecisionTime });
      }
      if (d.thrombolyticGivenTime) {
        lines.push({ key: "Thrombolyse administrée", value: d.thrombolyticGivenTime });
      }
      return lines;
    }
    case STROKE_NEURO_CHECKS_CARD_ID: {
      const p = neuroChecksPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: "Changement vs précédent",
          value: CHANGES_FR[d.changesFromPrior] ?? d.changesFromPrior,
        },
        { key: "Médecin avisé", value: yesNoFr(d.providerNotified) },
      ];
    }
    default:
      return [];
  }
}
