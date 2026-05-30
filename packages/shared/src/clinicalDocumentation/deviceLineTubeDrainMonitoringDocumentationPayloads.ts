import { z } from "zod";
import type { ClinicalDocumentationFieldOption } from "./clinicalDocumentationFieldOptions.js";
import {
  pickLocalizedEnumLabel,
  type ClinicalDocumentationSummaryLocale,
} from "./clinicalDocumentationSummaryLocale.js";

/** EDOC.17 — device, line, tube & drain monitoring card IDs. */
export const PERIPHERAL_IV_ASSESSMENT_CARD_ID = "peripheral_iv_assessment" as const;
export const CENTRAL_LINE_ASSESSMENT_CARD_ID = "central_line_assessment" as const;
export const PICC_MIDLINE_ASSESSMENT_CARD_ID = "picc_midline_assessment" as const;
export const FOLEY_CATHETER_MONITORING_CARD_ID = "foley_catheter_monitoring" as const;
export const EXTERNAL_URINARY_DEVICE_MONITORING_CARD_ID =
  "external_urinary_device_monitoring" as const;
export const NG_OG_TUBE_MONITORING_CARD_ID = "ng_og_tube_monitoring" as const;
export const CHEST_TUBE_MONITORING_CARD_ID = "chest_tube_monitoring" as const;
export const SURGICAL_DRAIN_MONITORING_CARD_ID = "surgical_drain_monitoring" as const;
export const ENDOTRACHEAL_TUBE_MONITORING_CARD_ID = "endotracheal_tube_monitoring" as const;
export const TRACHEOSTOMY_MONITORING_CARD_ID = "tracheostomy_monitoring" as const;

export const EDOC17_DEVICE_LINE_TUBE_DRAIN_MONITORING_CARD_IDS = [
  PERIPHERAL_IV_ASSESSMENT_CARD_ID,
  CENTRAL_LINE_ASSESSMENT_CARD_ID,
  PICC_MIDLINE_ASSESSMENT_CARD_ID,
  FOLEY_CATHETER_MONITORING_CARD_ID,
  EXTERNAL_URINARY_DEVICE_MONITORING_CARD_ID,
  NG_OG_TUBE_MONITORING_CARD_ID,
  CHEST_TUBE_MONITORING_CARD_ID,
  SURGICAL_DRAIN_MONITORING_CARD_ID,
  ENDOTRACHEAL_TUBE_MONITORING_CARD_ID,
  TRACHEOSTOMY_MONITORING_CARD_ID,
] as const;

export type Edoc17DeviceLineTubeDrainMonitoringCardId =
  (typeof EDOC17_DEVICE_LINE_TUBE_DRAIN_MONITORING_CARD_IDS)[number];

/**
 * Future Phase — EDOC.17A Device Complication Escalation Automation
 * Do not implement automatic alerts now.
 */
export const EDOC_17A_FUTURE_DEVICE_COMPLICATION_ESCALATION_AUTOMATION = "EDOC.17A" as const;

export const DEVICE_YES_NO_VALUES = ["YES", "NO"] as const;

export const IV_STATUS_VALUES = [
  "PATENT",
  "INFILTRATED",
  "EXTRAVASATION",
  "OCCLUDED",
  "DISLODGED",
] as const;

export const DRESSING_STATUS_VALUES = ["CLEAN_DRY_INTACT", "LOOSE", "SOILED", "MISSING"] as const;

export const SITE_STATUS_VALUES = [
  "NORMAL",
  "REDNESS",
  "DRAINAGE",
  "SWELLING",
  "BLEEDING",
] as const;

export const SURGICAL_DRAIN_SITE_STATUS_VALUES = [
  "NORMAL",
  "REDNESS",
  "DRAINAGE",
  "SWELLING",
] as const;

export const DEVICE_CENTRAL_LINE_TYPE_VALUES = [
  "CVC",
  "TRIPLE_LUMEN",
  "CORDIS",
  "DIALYSIS",
  "OTHER",
] as const;

export const PICC_MIDLINE_DEVICE_TYPE_VALUES = ["PICC", "MIDLINE"] as const;

export const DEVICE_URINE_APPEARANCE_VALUES = [
  "CLEAR",
  "YELLOW",
  "AMBER",
  "CLOUDY",
  "BLOODY",
  "OTHER",
] as const;

export const EXTERNAL_URINARY_DEVICE_TYPE_VALUES = [
  "PUREWICK",
  "CONDOM_CATHETER",
  "OTHER",
] as const;

export const DEVICE_SKIN_INTEGRITY_VALUES = ["INTACT", "REDNESS", "BREAKDOWN"] as const;

export const NG_OG_TUBE_TYPE_VALUES = ["NG", "OG"] as const;

export const NG_OG_DRAINAGE_APPEARANCE_VALUES = [
  "CLEAR",
  "GREEN",
  "BROWN",
  "BLOODY",
  "OTHER",
] as const;

export const CHEST_TUBE_LOCATION_VALUES = ["LEFT", "RIGHT", "BILATERAL"] as const;

export const DRAIN_APPEARANCE_VALUES = [
  "SEROUS",
  "SEROSANGUINOUS",
  "BLOODY",
  "PURULENT",
] as const;

export const SURGICAL_DRAIN_TYPE_VALUES = ["JP", "HEMOVAC", "PENROSE", "OTHER"] as const;

export const TUBE_POSITION_UNIT_VALUES = ["CM"] as const;

export const TRACHEOSTOMY_TYPE_VALUES = ["CUFFED", "UNCUFFED"] as const;

const optionalNotes = z.string().trim().max(2000).optional();
const shortText = z.string().trim().min(1).max(200);
const isoDateTimeString = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .refine((s) => !Number.isNaN(Date.parse(s)), { message: "Invalid date/time" });
const deviceYesNo = z.enum(DEVICE_YES_NO_VALUES);
const drainageAmountMl = z.coerce.number().min(0).max(10000);
const tubePositionCm = z.coerce.number().min(0).max(50);

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

export function deviceDocYesNoLabel(
  value: (typeof DEVICE_YES_NO_VALUES)[number],
  locale: ClinicalDocumentationSummaryLocale
): string {
  return value === "YES"
    ? locale === "en"
      ? "Yes"
      : "Oui"
    : locale === "en"
      ? "No"
      : "Non";
}

export const DEVICE_YES_NO_OPTIONS = enumOptions(DEVICE_YES_NO_VALUES, {
  YES: { en: "Yes", fr: "Oui" },
  NO: { en: "No", fr: "Non" },
});

export const IV_STATUS_OPTIONS = enumOptions(IV_STATUS_VALUES, {
  PATENT: { en: "Patent", fr: "Perméable" },
  INFILTRATED: { en: "Infiltrated", fr: "Infiltré" },
  EXTRAVASATION: { en: "Extravasation", fr: "Extravasation" },
  OCCLUDED: { en: "Occluded", fr: "Occlus" },
  DISLODGED: { en: "Dislodged", fr: "Délogé" },
});

export const DRESSING_STATUS_OPTIONS = enumOptions(DRESSING_STATUS_VALUES, {
  CLEAN_DRY_INTACT: { en: "Clean, dry, intact", fr: "Propre, sec, intact" },
  LOOSE: { en: "Loose", fr: "Lâche" },
  SOILED: { en: "Soiled", fr: "Souillé" },
  MISSING: { en: "Missing", fr: "Absent" },
});

export const SITE_STATUS_OPTIONS = enumOptions(SITE_STATUS_VALUES, {
  NORMAL: { en: "Normal", fr: "Normal" },
  REDNESS: { en: "Redness", fr: "Rougeur" },
  DRAINAGE: { en: "Drainage", fr: "Sécrétion" },
  SWELLING: { en: "Swelling", fr: "Gonflement" },
  BLEEDING: { en: "Bleeding", fr: "Saignement" },
});

export const SURGICAL_DRAIN_SITE_STATUS_OPTIONS = enumOptions(SURGICAL_DRAIN_SITE_STATUS_VALUES, {
  NORMAL: { en: "Normal", fr: "Normal" },
  REDNESS: { en: "Redness", fr: "Rougeur" },
  DRAINAGE: { en: "Drainage", fr: "Sécrétion" },
  SWELLING: { en: "Swelling", fr: "Gonflement" },
});

export const DEVICE_CENTRAL_LINE_TYPE_OPTIONS = enumOptions(DEVICE_CENTRAL_LINE_TYPE_VALUES, {
  CVC: { en: "CVC", fr: "CVC" },
  TRIPLE_LUMEN: { en: "Triple lumen", fr: "Triple lumière" },
  CORDIS: { en: "Cordis", fr: "Cordis" },
  DIALYSIS: { en: "Dialysis", fr: "Dialyse" },
  OTHER: { en: "Other", fr: "Autre" },
});

export const PICC_MIDLINE_DEVICE_TYPE_OPTIONS = enumOptions(PICC_MIDLINE_DEVICE_TYPE_VALUES, {
  PICC: { en: "PICC", fr: "PICC" },
  MIDLINE: { en: "Midline", fr: "Midline" },
});

export const DEVICE_URINE_APPEARANCE_OPTIONS = enumOptions(DEVICE_URINE_APPEARANCE_VALUES, {
  CLEAR: { en: "Clear", fr: "Clair" },
  YELLOW: { en: "Yellow", fr: "Jaune" },
  AMBER: { en: "Amber", fr: "Ambre" },
  CLOUDY: { en: "Cloudy", fr: "Trouble" },
  BLOODY: { en: "Bloody", fr: "Sanglant" },
  OTHER: { en: "Other", fr: "Autre" },
});

export const EXTERNAL_URINARY_DEVICE_TYPE_OPTIONS = enumOptions(
  EXTERNAL_URINARY_DEVICE_TYPE_VALUES,
  {
    PUREWICK: { en: "Purewick", fr: "Purewick" },
    CONDOM_CATHETER: { en: "Condom catheter", fr: "Sonde externe" },
    OTHER: { en: "Other", fr: "Autre" },
  }
);

export const DEVICE_SKIN_INTEGRITY_OPTIONS = enumOptions(DEVICE_SKIN_INTEGRITY_VALUES, {
  INTACT: { en: "Intact", fr: "Intact" },
  REDNESS: { en: "Redness", fr: "Rougeur" },
  BREAKDOWN: { en: "Breakdown", fr: "Lésion cutanée" },
});

export const NG_OG_TUBE_TYPE_OPTIONS = enumOptions(NG_OG_TUBE_TYPE_VALUES, {
  NG: { en: "NG", fr: "NG" },
  OG: { en: "OG", fr: "OG" },
});

export const NG_OG_DRAINAGE_APPEARANCE_OPTIONS = enumOptions(NG_OG_DRAINAGE_APPEARANCE_VALUES, {
  CLEAR: { en: "Clear", fr: "Clair" },
  GREEN: { en: "Green", fr: "Vert" },
  BROWN: { en: "Brown", fr: "Brun" },
  BLOODY: { en: "Bloody", fr: "Sanglant" },
  OTHER: { en: "Other", fr: "Autre" },
});

export const CHEST_TUBE_LOCATION_OPTIONS = enumOptions(CHEST_TUBE_LOCATION_VALUES, {
  LEFT: { en: "Left", fr: "Gauche" },
  RIGHT: { en: "Right", fr: "Droit" },
  BILATERAL: { en: "Bilateral", fr: "Bilatéral" },
});

export const DRAIN_APPEARANCE_OPTIONS = enumOptions(DRAIN_APPEARANCE_VALUES, {
  SEROUS: { en: "Serous", fr: "Séreux" },
  SEROSANGUINOUS: { en: "Serosanguineous", fr: "Sérosanguin" },
  BLOODY: { en: "Bloody", fr: "Sanguinolent" },
  PURULENT: { en: "Purulent", fr: "Purulent" },
});

export const SURGICAL_DRAIN_TYPE_OPTIONS = enumOptions(SURGICAL_DRAIN_TYPE_VALUES, {
  JP: { en: "JP", fr: "JP" },
  HEMOVAC: { en: "Hemovac", fr: "Hemovac" },
  PENROSE: { en: "Penrose", fr: "Penrose" },
  OTHER: { en: "Other", fr: "Autre" },
});

export const TUBE_POSITION_UNIT_OPTIONS = enumOptions(TUBE_POSITION_UNIT_VALUES, {
  CM: { en: "cm", fr: "cm" },
});

export const TRACHEOSTOMY_TYPE_OPTIONS = enumOptions(TRACHEOSTOMY_TYPE_VALUES, {
  CUFFED: { en: "Cuffed", fr: "Ballonnet" },
  UNCUFFED: { en: "Uncuffed", fr: "Sans ballonnet" },
});

const IV_STATUS_MAP = labelMap(IV_STATUS_OPTIONS);
const DRESSING_STATUS_MAP = labelMap(DRESSING_STATUS_OPTIONS);
const SITE_STATUS_MAP = labelMap(SITE_STATUS_OPTIONS);
const DEVICE_LINE_TYPE_MAP = labelMap(DEVICE_CENTRAL_LINE_TYPE_OPTIONS);
const DEVICE_URINE_APPEARANCE_MAP = labelMap(DEVICE_URINE_APPEARANCE_OPTIONS);
const NG_OG_DRAINAGE_MAP = labelMap(NG_OG_DRAINAGE_APPEARANCE_OPTIONS);
const DRAIN_APPEARANCE_MAP = labelMap(DRAIN_APPEARANCE_OPTIONS);
const SURGICAL_DRAIN_TYPE_MAP = labelMap(SURGICAL_DRAIN_TYPE_OPTIONS);
const SURGICAL_SITE_MAP = labelMap(SURGICAL_DRAIN_SITE_STATUS_OPTIONS);
const DEVICE_SKIN_INTEGRITY_MAP = labelMap(DEVICE_SKIN_INTEGRITY_OPTIONS);

function requireProviderNotified(
  data: { providerNotified: (typeof DEVICE_YES_NO_VALUES)[number] },
  ctx: z.RefinementCtx,
  message: string
) {
  if (data.providerNotified !== "YES") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message,
      path: ["providerNotified"],
    });
  }
}

export const peripheralIvAssessmentPayloadSchema = z
  .object({
    assessmentTime: isoDateTimeString,
    siteLocation: shortText,
    gauge: shortText,
    status: z.enum(IV_STATUS_VALUES),
    bloodReturnPresent: deviceYesNo,
    flushesWithoutResistance: deviceYesNo,
    dressingStatus: z.enum(DRESSING_STATUS_VALUES),
    painPresent: deviceYesNo,
    swellingPresent: deviceYesNo,
    providerNotified: deviceYesNo,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (
      (data.status === "INFILTRATED" ||
        data.status === "EXTRAVASATION" ||
        data.status === "DISLODGED") &&
      data.providerNotified !== "YES"
    ) {
      requireProviderNotified(
        data,
        ctx,
        "Provider notification required for infiltrated, extravasation, or dislodged IV"
      );
    }
  });

export const centralLineAssessmentPayloadSchema = z
  .object({
    assessmentTime: isoDateTimeString,
    lineType: z.enum(DEVICE_CENTRAL_LINE_TYPE_VALUES),
    siteStatus: z.enum(SITE_STATUS_VALUES),
    dressingStatus: z.enum(DRESSING_STATUS_VALUES),
    securementIntact: deviceYesNo,
    infectionConcern: deviceYesNo,
    providerNotified: deviceYesNo,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.infectionConcern === "YES") {
      requireProviderNotified(data, ctx, "Provider notification required for infection concern");
    }
  });

export const piccMidlineAssessmentPayloadSchema = z
  .object({
    assessmentTime: isoDateTimeString,
    deviceType: z.enum(PICC_MIDLINE_DEVICE_TYPE_VALUES),
    siteStatus: z.enum(SITE_STATUS_VALUES),
    bloodReturnPresent: deviceYesNo,
    flushesWithoutResistance: deviceYesNo,
    infectionConcern: deviceYesNo,
    providerNotified: deviceYesNo,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.infectionConcern === "YES") {
      requireProviderNotified(data, ctx, "Provider notification required for infection concern");
    }
  });

export const foleyCatheterMonitoringPayloadSchema = z
  .object({
    assessmentTime: isoDateTimeString,
    indicationPresent: deviceYesNo,
    catheterSecure: deviceYesNo,
    urineFlowPresent: deviceYesNo,
    urineAppearance: z.enum(DEVICE_URINE_APPEARANCE_VALUES),
    catheterCareCompleted: deviceYesNo,
    obstructionConcern: deviceYesNo,
    providerNotified: deviceYesNo,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.obstructionConcern === "YES") {
      requireProviderNotified(data, ctx, "Provider notification required for obstruction concern");
    }
  });

export const externalUrinaryDeviceMonitoringPayloadSchema = z
  .object({
    assessmentTime: isoDateTimeString,
    deviceType: z.enum(EXTERNAL_URINARY_DEVICE_TYPE_VALUES),
    deviceIntact: deviceYesNo,
    skinIntegrity: z.enum(DEVICE_SKIN_INTEGRITY_VALUES),
    functioningProperly: deviceYesNo,
    providerNotified: deviceYesNo,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.skinIntegrity === "BREAKDOWN") {
      requireProviderNotified(data, ctx, "Provider notification required for skin breakdown");
    }
  });

export const ngOgTubeMonitoringPayloadSchema = z
  .object({
    assessmentTime: isoDateTimeString,
    tubeType: z.enum(NG_OG_TUBE_TYPE_VALUES),
    placementVerified: deviceYesNo,
    markingAtNares: shortText,
    suctionActive: deviceYesNo,
    drainagePresent: deviceYesNo,
    drainageAppearance: z.enum(NG_OG_DRAINAGE_APPEARANCE_VALUES),
    providerNotified: deviceYesNo,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.placementVerified === "NO" || data.drainageAppearance === "BLOODY") {
      requireProviderNotified(
        data,
        ctx,
        "Provider notification required when placement not verified or drainage is bloody"
      );
    }
  });

export const chestTubeMonitoringPayloadSchema = z
  .object({
    assessmentTime: isoDateTimeString,
    tubeLocation: z.enum(CHEST_TUBE_LOCATION_VALUES),
    suctionActive: deviceYesNo,
    waterSealPresent: deviceYesNo,
    airLeakPresent: deviceYesNo,
    drainageAmount: drainageAmountMl,
    drainageAppearance: z.enum(DRAIN_APPEARANCE_VALUES),
    tubeSecure: deviceYesNo,
    providerNotified: deviceYesNo,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.airLeakPresent === "YES" || data.tubeSecure === "NO") {
      requireProviderNotified(
        data,
        ctx,
        "Provider notification required for air leak or unsecured chest tube"
      );
    }
  });

export const surgicalDrainMonitoringPayloadSchema = z.object({
  assessmentTime: isoDateTimeString,
  drainType: z.enum(SURGICAL_DRAIN_TYPE_VALUES),
  drainageAmount: drainageAmountMl,
  drainageAppearance: z.enum(DRAIN_APPEARANCE_VALUES),
  drainCompressed: deviceYesNo,
  siteStatus: z.enum(SURGICAL_DRAIN_SITE_STATUS_VALUES),
  providerNotified: deviceYesNo,
  notes: optionalNotes,
});

export const endotrachealTubeMonitoringPayloadSchema = z
  .object({
    assessmentTime: isoDateTimeString,
    tubePosition: tubePositionCm,
    positionUnit: z.enum(TUBE_POSITION_UNIT_VALUES),
    securementIntact: deviceYesNo,
    oralCareCompleted: deviceYesNo,
    airwayPatent: deviceYesNo,
    displacementConcern: deviceYesNo,
    providerNotified: deviceYesNo,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.displacementConcern === "YES" || data.airwayPatent === "NO") {
      requireProviderNotified(
        data,
        ctx,
        "Provider notification required for displacement concern or non-patent airway"
      );
    }
  });

export const tracheostomyMonitoringPayloadSchema = z
  .object({
    assessmentTime: isoDateTimeString,
    trachType: z.enum(TRACHEOSTOMY_TYPE_VALUES),
    siteStatus: z.enum(SITE_STATUS_VALUES),
    innerCannulaChecked: deviceYesNo,
    airwayPatent: deviceYesNo,
    dislodgementConcern: deviceYesNo,
    providerNotified: deviceYesNo,
    notes: optionalNotes,
  })
  .superRefine((data, ctx) => {
    if (data.dislodgementConcern === "YES" || data.airwayPatent === "NO") {
      requireProviderNotified(
        data,
        ctx,
        "Provider notification required for dislodgement concern or non-patent airway"
      );
    }
  });

const PAYLOAD_SCHEMA_BY_CARD_ID: Record<
  Edoc17DeviceLineTubeDrainMonitoringCardId,
  z.ZodTypeAny
> = {
  [PERIPHERAL_IV_ASSESSMENT_CARD_ID]: peripheralIvAssessmentPayloadSchema,
  [CENTRAL_LINE_ASSESSMENT_CARD_ID]: centralLineAssessmentPayloadSchema,
  [PICC_MIDLINE_ASSESSMENT_CARD_ID]: piccMidlineAssessmentPayloadSchema,
  [FOLEY_CATHETER_MONITORING_CARD_ID]: foleyCatheterMonitoringPayloadSchema,
  [EXTERNAL_URINARY_DEVICE_MONITORING_CARD_ID]: externalUrinaryDeviceMonitoringPayloadSchema,
  [NG_OG_TUBE_MONITORING_CARD_ID]: ngOgTubeMonitoringPayloadSchema,
  [CHEST_TUBE_MONITORING_CARD_ID]: chestTubeMonitoringPayloadSchema,
  [SURGICAL_DRAIN_MONITORING_CARD_ID]: surgicalDrainMonitoringPayloadSchema,
  [ENDOTRACHEAL_TUBE_MONITORING_CARD_ID]: endotrachealTubeMonitoringPayloadSchema,
  [TRACHEOSTOMY_MONITORING_CARD_ID]: tracheostomyMonitoringPayloadSchema,
};

export function isEdoc17DeviceLineTubeDrainMonitoringCardId(
  cardId: string
): cardId is Edoc17DeviceLineTubeDrainMonitoringCardId {
  return (EDOC17_DEVICE_LINE_TUBE_DRAIN_MONITORING_CARD_IDS as readonly string[]).includes(cardId);
}

export function validateDeviceLineTubeDrainMonitoringPayloadForCard(
  cardId: string,
  payload: Record<string, unknown>
): { ok: true; data: Record<string, unknown> } | { ok: false; message: string } {
  if (!isEdoc17DeviceLineTubeDrainMonitoringCardId(cardId)) {
    return { ok: false, message: "Card is not available for structured save" };
  }
  const schema = PAYLOAD_SCHEMA_BY_CARD_ID[cardId];
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, message: "Invalid clinical documentation payload" };
  }
  return { ok: true, data: parsed.data as Record<string, unknown> };
}

export function summarizeDeviceLineTubeDrainMonitoringPayload(
  cardId: string,
  payload: Record<string, unknown>,
  locale: ClinicalDocumentationSummaryLocale
): Array<{ key: string; value: string }> {
  switch (cardId) {
    case PERIPHERAL_IV_ASSESSMENT_CARD_ID: {
      const p = peripheralIvAssessmentPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: locale === "en" ? "Site" : "Site",
          value: d.siteLocation,
        },
        {
          key: locale === "en" ? "Status" : "Statut",
          value: pickLocalizedEnumLabel(IV_STATUS_MAP.en, IV_STATUS_MAP.fr, d.status, locale),
        },
        {
          key: locale === "en" ? "Dressing" : "Pansement",
          value: pickLocalizedEnumLabel(
            DRESSING_STATUS_MAP.en,
            DRESSING_STATUS_MAP.fr,
            d.dressingStatus,
            locale
          ),
        },
        {
          key: locale === "en" ? "Provider notified" : "Médecin avisé",
          value: deviceDocYesNoLabel(d.providerNotified, locale),
        },
      ];
    }
    case CENTRAL_LINE_ASSESSMENT_CARD_ID: {
      const p = centralLineAssessmentPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: locale === "en" ? "Line type" : "Type de ligne",
          value: pickLocalizedEnumLabel(
            DEVICE_LINE_TYPE_MAP.en,
            DEVICE_LINE_TYPE_MAP.fr,
            d.lineType,
            locale
          ),
        },
        {
          key: locale === "en" ? "Site status" : "Statut du site",
          value: pickLocalizedEnumLabel(
            SITE_STATUS_MAP.en,
            SITE_STATUS_MAP.fr,
            d.siteStatus,
            locale
          ),
        },
        {
          key: locale === "en" ? "Infection concern" : "Préoccupation infection",
          value: deviceDocYesNoLabel(d.infectionConcern, locale),
        },
        {
          key: locale === "en" ? "Provider notified" : "Médecin avisé",
          value: deviceDocYesNoLabel(d.providerNotified, locale),
        },
      ];
    }
    case PICC_MIDLINE_ASSESSMENT_CARD_ID: {
      const p = piccMidlineAssessmentPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: locale === "en" ? "Site status" : "Statut du site",
          value: pickLocalizedEnumLabel(
            SITE_STATUS_MAP.en,
            SITE_STATUS_MAP.fr,
            d.siteStatus,
            locale
          ),
        },
        {
          key: locale === "en" ? "Infection concern" : "Préoccupation infection",
          value: deviceDocYesNoLabel(d.infectionConcern, locale),
        },
        {
          key: locale === "en" ? "Provider notified" : "Médecin avisé",
          value: deviceDocYesNoLabel(d.providerNotified, locale),
        },
      ];
    }
    case FOLEY_CATHETER_MONITORING_CARD_ID: {
      const p = foleyCatheterMonitoringPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: locale === "en" ? "Urine flow present" : "Écoulement urinaire",
          value: deviceDocYesNoLabel(d.urineFlowPresent, locale),
        },
        {
          key: locale === "en" ? "Appearance" : "Aspect",
          value: pickLocalizedEnumLabel(
            DEVICE_URINE_APPEARANCE_MAP.en,
            DEVICE_URINE_APPEARANCE_MAP.fr,
            d.urineAppearance,
            locale
          ),
        },
        {
          key: locale === "en" ? "Obstruction concern" : "Préoccupation obstruction",
          value: deviceDocYesNoLabel(d.obstructionConcern, locale),
        },
        {
          key: locale === "en" ? "Provider notified" : "Médecin avisé",
          value: deviceDocYesNoLabel(d.providerNotified, locale),
        },
      ];
    }
    case EXTERNAL_URINARY_DEVICE_MONITORING_CARD_ID: {
      const p = externalUrinaryDeviceMonitoringPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: locale === "en" ? "Skin integrity" : "Intégrité cutanée",
          value: pickLocalizedEnumLabel(
            DEVICE_SKIN_INTEGRITY_MAP.en,
            DEVICE_SKIN_INTEGRITY_MAP.fr,
            d.skinIntegrity,
            locale
          ),
        },
        {
          key: locale === "en" ? "Functioning properly" : "Fonctionnement correct",
          value: deviceDocYesNoLabel(d.functioningProperly, locale),
        },
        {
          key: locale === "en" ? "Provider notified" : "Médecin avisé",
          value: deviceDocYesNoLabel(d.providerNotified, locale),
        },
      ];
    }
    case NG_OG_TUBE_MONITORING_CARD_ID: {
      const p = ngOgTubeMonitoringPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: locale === "en" ? "Placement verified" : "Position vérifiée",
          value: deviceDocYesNoLabel(d.placementVerified, locale),
        },
        {
          key: locale === "en" ? "Suction active" : "Aspiration active",
          value: deviceDocYesNoLabel(d.suctionActive, locale),
        },
        {
          key: locale === "en" ? "Drainage appearance" : "Aspect des sécrétions",
          value: pickLocalizedEnumLabel(
            NG_OG_DRAINAGE_MAP.en,
            NG_OG_DRAINAGE_MAP.fr,
            d.drainageAppearance,
            locale
          ),
        },
        {
          key: locale === "en" ? "Provider notified" : "Médecin avisé",
          value: deviceDocYesNoLabel(d.providerNotified, locale),
        },
      ];
    }
    case CHEST_TUBE_MONITORING_CARD_ID: {
      const p = chestTubeMonitoringPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: locale === "en" ? "Suction" : "Aspiration",
          value: deviceDocYesNoLabel(d.suctionActive, locale),
        },
        {
          key: locale === "en" ? "Air leak" : "Fuite d'air",
          value: deviceDocYesNoLabel(d.airLeakPresent, locale),
        },
        {
          key: locale === "en" ? "Drainage amount" : "Volume de drainage",
          value: `${d.drainageAmount} mL`,
        },
        {
          key: locale === "en" ? "Tube secure" : "Drain fixé",
          value: deviceDocYesNoLabel(d.tubeSecure, locale),
        },
        {
          key: locale === "en" ? "Provider notified" : "Médecin avisé",
          value: deviceDocYesNoLabel(d.providerNotified, locale),
        },
      ];
    }
    case SURGICAL_DRAIN_MONITORING_CARD_ID: {
      const p = surgicalDrainMonitoringPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: locale === "en" ? "Drain type" : "Type de drain",
          value: pickLocalizedEnumLabel(
            SURGICAL_DRAIN_TYPE_MAP.en,
            SURGICAL_DRAIN_TYPE_MAP.fr,
            d.drainType,
            locale
          ),
        },
        {
          key: locale === "en" ? "Drainage amount" : "Volume de drainage",
          value: `${d.drainageAmount} mL`,
        },
        {
          key: locale === "en" ? "Appearance" : "Aspect",
          value: pickLocalizedEnumLabel(
            DRAIN_APPEARANCE_MAP.en,
            DRAIN_APPEARANCE_MAP.fr,
            d.drainageAppearance,
            locale
          ),
        },
        {
          key: locale === "en" ? "Site status" : "Statut du site",
          value: pickLocalizedEnumLabel(
            SURGICAL_SITE_MAP.en,
            SURGICAL_SITE_MAP.fr,
            d.siteStatus,
            locale
          ),
        },
      ];
    }
    case ENDOTRACHEAL_TUBE_MONITORING_CARD_ID: {
      const p = endotrachealTubeMonitoringPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: locale === "en" ? "Position" : "Position",
          value: `${d.tubePosition} ${d.positionUnit}`,
        },
        {
          key: locale === "en" ? "Securement" : "Fixation",
          value: deviceDocYesNoLabel(d.securementIntact, locale),
        },
        {
          key: locale === "en" ? "Airway patent" : "Voie aérienne perméable",
          value: deviceDocYesNoLabel(d.airwayPatent, locale),
        },
        {
          key: locale === "en" ? "Displacement concern" : "Préoccupation déplacement",
          value: deviceDocYesNoLabel(d.displacementConcern, locale),
        },
      ];
    }
    case TRACHEOSTOMY_MONITORING_CARD_ID: {
      const p = tracheostomyMonitoringPayloadSchema.safeParse(payload);
      if (!p.success) return [];
      const d = p.data;
      return [
        {
          key: locale === "en" ? "Site status" : "Statut du site",
          value: pickLocalizedEnumLabel(
            SITE_STATUS_MAP.en,
            SITE_STATUS_MAP.fr,
            d.siteStatus,
            locale
          ),
        },
        {
          key: locale === "en" ? "Inner cannula checked" : "Canule interne vérifiée",
          value: deviceDocYesNoLabel(d.innerCannulaChecked, locale),
        },
        {
          key: locale === "en" ? "Airway patent" : "Voie aérienne perméable",
          value: deviceDocYesNoLabel(d.airwayPatent, locale),
        },
        {
          key: locale === "en" ? "Dislodgement concern" : "Préoccupation délogement",
          value: deviceDocYesNoLabel(d.dislodgementConcern, locale),
        },
      ];
    }
    default:
      return [];
  }
}
