import { z } from "zod";
import type { ClinicalDocumentationFieldOption } from "./clinicalDocumentationFieldOptions.js";
import { PAIN_SCORE_0_10_OPTIONS } from "./clinicalDocumentationFieldOptions.js";
import {
  pickLocalizedEnumLabel,
  type ClinicalDocumentationSummaryLocale,
  clinicalDocSummaryKey,
  clinicalDocYesNo,
} from "./clinicalDocumentationSummaryLocale.js";

/** EDOC.15 — cardiac monitoring & telemetry documentation card IDs. */
export const CONTINUOUS_CARDIAC_MONITORING_CARD_ID = "continuous_cardiac_monitoring" as const;
export const TELEMETRY_REASSESSMENT_CARD_ID = "telemetry_reassessment" as const;
export const ARRHYTHMIA_EVENT_CARD_ID = "arrhythmia_event" as const;
export const RHYTHM_STRIP_DOCUMENTATION_CARD_ID = "rhythm_strip_documentation" as const;
export const ECG_12_LEAD_DOCUMENTATION_CARD_ID = "ecg_12_lead_documentation" as const;
export const CHEST_PAIN_REASSESSMENT_CARD_ID = "chest_pain_reassessment" as const;
export const STEMI_ALERT_EVENT_CARD_ID = "stemi_alert_event" as const;
export const CARDIAC_ESCALATION_EVENT_CARD_ID = "cardiac_escalation_event" as const;
export const PACEMAKER_MONITORING_CARD_ID = "pacemaker_monitoring" as const;
export const QTC_MONITORING_CARD_ID = "qtc_monitoring" as const;

export const EDOC15_CARDIAC_MONITORING_DOCUMENTATION_CARD_IDS = [
  CONTINUOUS_CARDIAC_MONITORING_CARD_ID,
  TELEMETRY_REASSESSMENT_CARD_ID,
  ARRHYTHMIA_EVENT_CARD_ID,
  RHYTHM_STRIP_DOCUMENTATION_CARD_ID,
  ECG_12_LEAD_DOCUMENTATION_CARD_ID,
  CHEST_PAIN_REASSESSMENT_CARD_ID,
  STEMI_ALERT_EVENT_CARD_ID,
  CARDIAC_ESCALATION_EVENT_CARD_ID,
  PACEMAKER_MONITORING_CARD_ID,
  QTC_MONITORING_CARD_ID,
] as const;

export type Edoc15CardiacMonitoringDocumentationCardId =
  (typeof EDOC15_CARDIAC_MONITORING_DOCUMENTATION_CARD_IDS)[number];

/** QTc threshold (ms) requiring provider notification. */
export const QTC_PROVIDER_NOTIFICATION_THRESHOLD_MS = 500;

export const CARDIAC_YES_NO_VALUES = ["YES", "NO"] as const;

export const MONITOR_TYPE_VALUES = [
  "TELEMETRY",
  "BEDSIDE_MONITOR",
  "ICU_MONITOR",
  "TRANSPORT_MONITOR",
] as const;

export const CARDIAC_RHYTHM_VALUES = [
  "SINUS_RHYTHM",
  "SINUS_BRADYCARDIA",
  "SINUS_TACHYCARDIA",
  "AFIB",
  "AFLUTTER",
  "SVT",
  "VTACH",
  "VFIB",
  "PACED",
  "JUNCTIONAL",
  "UNKNOWN",
] as const;

export const ARRHYTHMIA_EVENT_TYPE_VALUES = [
  "AFIB_RVR",
  "SVT",
  "VTACH",
  "VFIB",
  "PAUSE",
  "HEART_BLOCK",
  "BRADYCARDIA",
  "TACHYCARDIA",
  "OTHER",
] as const;

export const STRIP_INTERPRETATION_VALUES = ["NORMAL", "ABNORMAL", "PENDING_PROVIDER_REVIEW"] as const;

export const ECG_REASON_VALUES = [
  "CHEST_PAIN",
  "ARRHYTHMIA",
  "SYNCOPE",
  "SHORTNESS_OF_BREATH",
  "STROKE_WORKUP",
  "OTHER",
] as const;

export const STEMI_ACTIVATION_REASON_VALUES = [
  "STEMI",
  "POSSIBLE_STEMI",
  "POST_ECG_REVIEW",
] as const;

export const CARDIAC_ESCALATION_REASON_VALUES = [
  "NEW_ARRHYTHMIA",
  "CHEST_PAIN",
  "HEMODYNAMIC_CHANGE",
  "RAPID_RESPONSE",
  "CODE_BLUE",
  "STEMI_ALERT",
  "OTHER",
] as const;

const optionalNotes = z.string().trim().max(2000).optional();
const optionalText = z.string().trim().max(200).optional();
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
const cardiacYesNo = z.enum(CARDIAC_YES_NO_VALUES);
const heartRateBpm = z.coerce.number().int().min(0).max(300);
const painScore0to10 = z.coerce.number().int().min(0).max(10);
const qtcValueMs = z.coerce.number().int().min(200).max(700);

function enumOptions<T extends string>(
  values: readonly T[],
  labels: Record<T, { en: string; fr: string }>
): ClinicalDocumentationFieldOption<T>[] {
  return values.map((value) => ({
    value,
    labelEn: labels[value].en,
    labelFr: labels[value].fr,
  }));
}

function labelMap<T extends string>(options: ClinicalDocumentationFieldOption<T>[]) {
  return {
    en: Object.fromEntries(options.map((o) => [o.value, o.labelEn])),
    fr: Object.fromEntries(options.map((o) => [o.value, o.labelFr])),
  };
}

export function cardiacDocYesNoLabel(
  value: (typeof CARDIAC_YES_NO_VALUES)[number],
  locale: ClinicalDocumentationSummaryLocale
): string {
  return clinicalDocYesNo(value === "YES", locale);
}

export const CARDIAC_YES_NO_OPTIONS = enumOptions(CARDIAC_YES_NO_VALUES, {
  YES: { en: "Yes", fr: "Oui" },
  NO: { en: "No", fr: "Non" },
});

export const MONITOR_TYPE_OPTIONS = enumOptions(MONITOR_TYPE_VALUES, {
  TELEMETRY: { en: "Telemetry", fr: "Télémétrie" },
  BEDSIDE_MONITOR: { en: "Bedside monitor", fr: "Moniteur au chevet" },
  ICU_MONITOR: { en: "ICU monitor", fr: "Moniteur soins intensifs" },
  TRANSPORT_MONITOR: { en: "Transport monitor", fr: "Moniteur transport" },
});

export const CARDIAC_RHYTHM_OPTIONS = enumOptions(CARDIAC_RHYTHM_VALUES, {
  SINUS_RHYTHM: { en: "Sinus rhythm", fr: "Rythme sinusal" },
  SINUS_BRADYCARDIA: { en: "Sinus bradycardia", fr: "Bradycardie sinusale" },
  SINUS_TACHYCARDIA: { en: "Sinus tachycardia", fr: "Tachycardie sinusale" },
  AFIB: { en: "Atrial fibrillation", fr: "Fibrillation auriculaire" },
  AFLUTTER: { en: "Atrial flutter", fr: "Flutter auriculaire" },
  SVT: { en: "Supraventricular tachycardia", fr: "Tachycardie supraventriculaire" },
  VTACH: { en: "Ventricular tachycardia", fr: "Tachycardie ventriculaire" },
  VFIB: { en: "Ventricular fibrillation", fr: "Fibrillation ventriculaire" },
  PACED: { en: "Paced rhythm", fr: "Rythme stimulé" },
  JUNCTIONAL: { en: "Junctional rhythm", fr: "Rythme jonctionnel" },
  UNKNOWN: { en: "Unknown", fr: "Inconnu" },
});

export const ARRHYTHMIA_EVENT_TYPE_OPTIONS = enumOptions(ARRHYTHMIA_EVENT_TYPE_VALUES, {
  AFIB_RVR: { en: "Atrial fibrillation with RVR", fr: "Fibrillation auriculaire avec RVR" },
  SVT: { en: "Supraventricular tachycardia", fr: "Tachycardie supraventriculaire" },
  VTACH: { en: "Ventricular tachycardia", fr: "Tachycardie ventriculaire" },
  VFIB: { en: "Ventricular fibrillation", fr: "Fibrillation ventriculaire" },
  PAUSE: { en: "Pause", fr: "Pause" },
  HEART_BLOCK: { en: "Heart block", fr: "Bloc cardiaque" },
  BRADYCARDIA: { en: "Bradycardia", fr: "Bradycardie" },
  TACHYCARDIA: { en: "Tachycardia", fr: "Tachycardie" },
  OTHER: { en: "Other", fr: "Autre" },
});

export const STRIP_INTERPRETATION_OPTIONS = enumOptions(STRIP_INTERPRETATION_VALUES, {
  NORMAL: { en: "Normal", fr: "Normal" },
  ABNORMAL: { en: "Abnormal", fr: "Anormal" },
  PENDING_PROVIDER_REVIEW: { en: "Pending provider review", fr: "En attente revue médecin" },
});

export const ECG_REASON_OPTIONS = enumOptions(ECG_REASON_VALUES, {
  CHEST_PAIN: { en: "Chest pain", fr: "Douleur thoracique" },
  ARRHYTHMIA: { en: "Arrhythmia", fr: "Arythmie" },
  SYNCOPE: { en: "Syncope", fr: "Syncope" },
  SHORTNESS_OF_BREATH: { en: "Shortness of breath", fr: "Dyspnée" },
  STROKE_WORKUP: { en: "Stroke workup", fr: "Bilan AVC" },
  OTHER: { en: "Other", fr: "Autre" },
});

export const STEMI_ACTIVATION_REASON_OPTIONS = enumOptions(STEMI_ACTIVATION_REASON_VALUES, {
  STEMI: { en: "STEMI", fr: "STEMI" },
  POSSIBLE_STEMI: { en: "Possible STEMI", fr: "STEMI possible" },
  POST_ECG_REVIEW: { en: "Post ECG review", fr: "Après revue ECG" },
});

export const CARDIAC_ESCALATION_REASON_OPTIONS = enumOptions(CARDIAC_ESCALATION_REASON_VALUES, {
  NEW_ARRHYTHMIA: { en: "New arrhythmia", fr: "Nouvelle arythmie" },
  CHEST_PAIN: { en: "Chest pain", fr: "Douleur thoracique" },
  HEMODYNAMIC_CHANGE: { en: "Hemodynamic change", fr: "Changement hémodynamique" },
  RAPID_RESPONSE: { en: "Rapid response", fr: "Équipe d'urgence" },
  CODE_BLUE: { en: "Code blue", fr: "Code bleu" },
  STEMI_ALERT: { en: "STEMI alert", fr: "Alerte STEMI" },
  OTHER: { en: "Other", fr: "Autre" },
});

export { PAIN_SCORE_0_10_OPTIONS };

const RHYTHM_MAP = labelMap(CARDIAC_RHYTHM_OPTIONS);
const ARRHYTHMIA_TYPE_MAP = labelMap(ARRHYTHMIA_EVENT_TYPE_OPTIONS);
const ECG_REASON_MAP = labelMap(ECG_REASON_OPTIONS);
const ESCALATION_REASON_MAP = labelMap(CARDIAC_ESCALATION_REASON_OPTIONS);

export function requiresQtcProviderNotification(qtcValue: number): boolean {
  return qtcValue >= QTC_PROVIDER_NOTIFICATION_THRESHOLD_MS;
}

export const continuousCardiacMonitoringPayloadSchema = z.object({
  assessmentTime: isoDateTimeString,
  monitorType: z.enum(MONITOR_TYPE_VALUES),
  rhythm: z.enum(CARDIAC_RHYTHM_VALUES),
  heartRate: heartRateBpm,
  ectopyPresent: cardiacYesNo,
  alarmEventsPresent: cardiacYesNo,
  patientSymptomatic: cardiacYesNo,
  providerNotified: cardiacYesNo,
  notes: optionalNotes,
});

export const telemetryReassessmentPayloadSchema = z.object({
  assessmentTime: isoDateTimeString,
  currentRhythm: z.enum(CARDIAC_RHYTHM_VALUES),
  heartRate: heartRateBpm,
  bloodPressure: z.string().trim().min(1).max(20),
  symptomatic: cardiacYesNo,
  chestPain: cardiacYesNo,
  palpitations: cardiacYesNo,
  shortnessOfBreath: cardiacYesNo,
  changeFromPrevious: cardiacYesNo,
  providerNotified: cardiacYesNo,
  notes: optionalNotes,
});

export const arrhythmiaEventPayloadSchema = z
  .object({
    eventTime: isoDateTimeString,
    eventType: z.enum(ARRHYTHMIA_EVENT_TYPE_VALUES),
    durationMinutes: z.coerce.number().int().min(0).max(1440),
    patientSymptomatic: cardiacYesNo,
    bloodPressureAffected: cardiacYesNo,
    interventionRequired: cardiacYesNo,
    providerNotified: cardiacYesNo,
    providerNotificationTime: optionalIsoDateTime,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    const requiresNotification =
      data.interventionRequired === "YES" || data.bloodPressureAffected === "YES";
    if (requiresNotification && data.providerNotified !== "YES") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provider notification required for arrhythmia with intervention or BP change",
        path: ["providerNotified"],
      });
    }
  });

export const rhythmStripDocumentationPayloadSchema = z.object({
  assessmentTime: isoDateTimeString,
  rhythm: z.enum(CARDIAC_RHYTHM_VALUES),
  rate: heartRateBpm,
  stripReviewedByClinician: cardiacYesNo,
  reviewerName: optionalText,
  interpretation: z.enum(STRIP_INTERPRETATION_VALUES),
  providerNotified: cardiacYesNo,
  notes: optionalNotes,
});

export const ecg12LeadDocumentationPayloadSchema = z
  .object({
    ecgTime: isoDateTimeString,
    reason: z.enum(ECG_REASON_VALUES),
    performed: cardiacYesNo,
    transmittedToProvider: cardiacYesNo,
    providerReviewed: cardiacYesNo,
    criticalFindingPresent: cardiacYesNo,
    providerNotified: cardiacYesNo,
    providerNotificationTime: optionalIsoDateTime,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.criticalFindingPresent === "YES" && data.providerNotified !== "YES") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provider notification required when critical ECG finding present",
        path: ["providerNotified"],
      });
    }
  });

export const chestPainReassessmentPayloadSchema = z.object({
  assessmentTime: isoDateTimeString,
  painScore: painScore0to10,
  painImproved: cardiacYesNo,
  painResolved: cardiacYesNo,
  radiationPresent: cardiacYesNo,
  shortnessOfBreath: cardiacYesNo,
  diaphoresis: cardiacYesNo,
  repeatECGPerformed: cardiacYesNo,
  providerNotified: cardiacYesNo,
  notes: optionalNotes,
});

export const stemiAlertEventPayloadSchema = z.object({
  activationTime: isoDateTimeString,
  activationReason: z.enum(STEMI_ACTIVATION_REASON_VALUES),
  cathLabActivated: cardiacYesNo,
  providerAtBedside: cardiacYesNo,
  cardiologyNotified: cardiacYesNo,
  transferRequired: cardiacYesNo,
  notes: optionalNotes,
});

export const cardiacEscalationEventPayloadSchema = z
  .object({
    eventTime: isoDateTimeString,
    escalationReason: z.enum(CARDIAC_ESCALATION_REASON_VALUES),
    providerNotified: cardiacYesNo,
    providerNotificationTime: isoDateTimeString,
    responseReceived: cardiacYesNo,
    responseTime: optionalIsoDateTime,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.providerNotified !== "YES") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provider notification required for cardiac escalation",
        path: ["providerNotified"],
      });
    }
  });

export const pacemakerMonitoringPayloadSchema = z.object({
  assessmentTime: isoDateTimeString,
  pacedRhythmObserved: cardiacYesNo,
  capturePresent: cardiacYesNo,
  patientStable: cardiacYesNo,
  providerNotified: cardiacYesNo,
  notes: optionalNotes,
});

export const qtcMonitoringPayloadSchema = z
  .object({
    assessmentTime: isoDateTimeString,
    qtcValue: qtcValueMs,
    highRiskMedicationPresent: cardiacYesNo,
    providerNotified: cardiacYesNo,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (requiresQtcProviderNotification(data.qtcValue) && data.providerNotified !== "YES") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provider notification required when QTc ≥ 500 ms",
        path: ["providerNotified"],
      });
    }
  });

const PAYLOAD_SCHEMA_BY_CARD_ID: Record<string, z.ZodType<Record<string, unknown>>> = {
  [CONTINUOUS_CARDIAC_MONITORING_CARD_ID]: continuousCardiacMonitoringPayloadSchema,
  [TELEMETRY_REASSESSMENT_CARD_ID]: telemetryReassessmentPayloadSchema,
  [ARRHYTHMIA_EVENT_CARD_ID]: arrhythmiaEventPayloadSchema,
  [RHYTHM_STRIP_DOCUMENTATION_CARD_ID]: rhythmStripDocumentationPayloadSchema,
  [ECG_12_LEAD_DOCUMENTATION_CARD_ID]: ecg12LeadDocumentationPayloadSchema,
  [CHEST_PAIN_REASSESSMENT_CARD_ID]: chestPainReassessmentPayloadSchema,
  [STEMI_ALERT_EVENT_CARD_ID]: stemiAlertEventPayloadSchema,
  [CARDIAC_ESCALATION_EVENT_CARD_ID]: cardiacEscalationEventPayloadSchema,
  [PACEMAKER_MONITORING_CARD_ID]: pacemakerMonitoringPayloadSchema,
  [QTC_MONITORING_CARD_ID]: qtcMonitoringPayloadSchema,
};

export function isEdoc15CardiacMonitoringDocumentationCardId(
  cardId: string
): cardId is Edoc15CardiacMonitoringDocumentationCardId {
  return (EDOC15_CARDIAC_MONITORING_DOCUMENTATION_CARD_IDS as readonly string[]).includes(cardId);
}

export function validateCardiacMonitoringDocumentationPayloadForCard(
  cardId: string,
  payload: Record<string, unknown>
): { ok: true; data: Record<string, unknown> } | { ok: false; message: string } {
  const schema = PAYLOAD_SCHEMA_BY_CARD_ID[cardId];
  if (!schema) {
    return { ok: false, message: "Card is not available for structured save" };
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, message: "Invalid clinical documentation payload" };
  }
  return { ok: true, data: parsed.data as Record<string, unknown> };
}

export function summarizeCardiacMonitoringDocumentationPayload(
  cardId: string,
  payload: Record<string, unknown>,
  locale: ClinicalDocumentationSummaryLocale
): Array<{ key: string; value: string }> {
  switch (cardId) {
    case CONTINUOUS_CARDIAC_MONITORING_CARD_ID: {
      const p = continuousCardiacMonitoringPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: clinicalDocSummaryKey(locale, "Rhythm", "Rythme"),
          value: pickLocalizedEnumLabel(RHYTHM_MAP.en, RHYTHM_MAP.fr, d.rhythm, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "HR", "FC"),
          value: `${d.heartRate} bpm`,
        },
        {
          key: clinicalDocSummaryKey(locale, "Symptomatic", "Symptomatique"),
          value: cardiacDocYesNoLabel(d.patientSymptomatic, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Provider notified", "Médecin avisé"),
          value: cardiacDocYesNoLabel(d.providerNotified, locale),
        },
      ];
    }
    case ARRHYTHMIA_EVENT_CARD_ID: {
      const p = arrhythmiaEventPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: clinicalDocSummaryKey(locale, "Event", "Événement"),
          value: pickLocalizedEnumLabel(
            ARRHYTHMIA_TYPE_MAP.en,
            ARRHYTHMIA_TYPE_MAP.fr,
            d.eventType,
            locale
          ),
        },
        {
          key: clinicalDocSummaryKey(locale, "Duration", "Durée"),
          value: `${d.durationMinutes} min`,
        },
        {
          key: clinicalDocSummaryKey(locale, "Intervention required", "Intervention requise"),
          value: cardiacDocYesNoLabel(d.interventionRequired, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Provider notified", "Médecin avisé"),
          value: cardiacDocYesNoLabel(d.providerNotified, locale),
        },
      ];
    }
    case ECG_12_LEAD_DOCUMENTATION_CARD_ID: {
      const p = ecg12LeadDocumentationPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: clinicalDocSummaryKey(locale, "Reason", "Motif"),
          value: pickLocalizedEnumLabel(ECG_REASON_MAP.en, ECG_REASON_MAP.fr, d.reason, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Critical finding", "Anomalie critique"),
          value: cardiacDocYesNoLabel(d.criticalFindingPresent, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Provider reviewed", "Revue médecin"),
          value: cardiacDocYesNoLabel(d.providerReviewed, locale),
        },
      ];
    }
    case TELEMETRY_REASSESSMENT_CARD_ID: {
      const p = telemetryReassessmentPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: clinicalDocSummaryKey(locale, "Rhythm", "Rythme"),
          value: pickLocalizedEnumLabel(RHYTHM_MAP.en, RHYTHM_MAP.fr, d.currentRhythm, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "HR", "FC"),
          value: `${d.heartRate} bpm`,
        },
        {
          key: clinicalDocSummaryKey(locale, "Chest pain", "Douleur thoracique"),
          value: cardiacDocYesNoLabel(d.chestPain, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Provider notified", "Médecin avisé"),
          value: cardiacDocYesNoLabel(d.providerNotified, locale),
        },
      ];
    }
    case CHEST_PAIN_REASSESSMENT_CARD_ID: {
      const p = chestPainReassessmentPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: clinicalDocSummaryKey(locale, "Pain score", "Score douleur"),
          value: String(d.painScore),
        },
        {
          key: clinicalDocSummaryKey(locale, "Pain improved", "Douleur améliorée"),
          value: cardiacDocYesNoLabel(d.painImproved, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Provider notified", "Médecin avisé"),
          value: cardiacDocYesNoLabel(d.providerNotified, locale),
        },
      ];
    }
    case STEMI_ALERT_EVENT_CARD_ID: {
      const p = stemiAlertEventPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: clinicalDocSummaryKey(locale, "Activation reason", "Motif activation"),
          value: pickLocalizedEnumLabel(
            labelMap(STEMI_ACTIVATION_REASON_OPTIONS).en,
            labelMap(STEMI_ACTIVATION_REASON_OPTIONS).fr,
            d.activationReason,
            locale
          ),
        },
        {
          key: clinicalDocSummaryKey(locale, "Cardiology notified", "Cardiologie avisée"),
          value: cardiacDocYesNoLabel(d.cardiologyNotified, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Cath lab activated", "Salle cath activée"),
          value: cardiacDocYesNoLabel(d.cathLabActivated, locale),
        },
      ];
    }
    case CARDIAC_ESCALATION_EVENT_CARD_ID: {
      const p = cardiacEscalationEventPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: clinicalDocSummaryKey(locale, "Reason", "Motif"),
          value: pickLocalizedEnumLabel(
            ESCALATION_REASON_MAP.en,
            ESCALATION_REASON_MAP.fr,
            d.escalationReason,
            locale
          ),
        },
        {
          key: clinicalDocSummaryKey(locale, "Provider notified", "Médecin avisé"),
          value: cardiacDocYesNoLabel(d.providerNotified, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Response received", "Réponse reçue"),
          value: cardiacDocYesNoLabel(d.responseReceived, locale),
        },
      ];
    }
    case QTC_MONITORING_CARD_ID: {
      const p = qtcMonitoringPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: clinicalDocSummaryKey(locale, "QTc", "QTc"),
          value: `${d.qtcValue} ms`,
        },
        {
          key: clinicalDocSummaryKey(locale, "High-risk medication", "Médicament à risque"),
          value: cardiacDocYesNoLabel(d.highRiskMedicationPresent, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Provider notified", "Médecin avisé"),
          value: cardiacDocYesNoLabel(d.providerNotified, locale),
        },
      ];
    }
    case RHYTHM_STRIP_DOCUMENTATION_CARD_ID: {
      const p = rhythmStripDocumentationPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: clinicalDocSummaryKey(locale, "Rhythm", "Rythme"),
          value: pickLocalizedEnumLabel(RHYTHM_MAP.en, RHYTHM_MAP.fr, d.rhythm, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Rate", "Fréquence"),
          value: `${d.rate} bpm`,
        },
        {
          key: clinicalDocSummaryKey(locale, "Interpretation", "Interprétation"),
          value: pickLocalizedEnumLabel(
            labelMap(STRIP_INTERPRETATION_OPTIONS).en,
            labelMap(STRIP_INTERPRETATION_OPTIONS).fr,
            d.interpretation,
            locale
          ),
        },
      ];
    }
    case PACEMAKER_MONITORING_CARD_ID: {
      const p = pacemakerMonitoringPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: clinicalDocSummaryKey(locale, "Paced rhythm", "Rythme stimulé"),
          value: cardiacDocYesNoLabel(d.pacedRhythmObserved, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Capture present", "Capture présente"),
          value: cardiacDocYesNoLabel(d.capturePresent, locale),
        },
        {
          key: clinicalDocSummaryKey(locale, "Patient stable", "Patient stable"),
          value: cardiacDocYesNoLabel(d.patientStable, locale),
        },
      ];
    }
    default:
      return [];
  }
}
