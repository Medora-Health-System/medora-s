/**
 * MEDUI.INP.2B.2B — Map Nursing Admission rapid answers onto existing EDOC payloads.
 *
 * Does not invent Morse items, wound inventories, or device types.
 * Defaults exist only where the authoritative card schema requires a field
 * the rapid screen does not capture; provenance is recorded in notes.
 */

import {
  BELONGINGS_INVENTORY_CARD_ID,
  belongingsInventoryPayloadSchema,
} from "../clinicalDocumentation/belongingsValuablesDocumentationPayloads.js";
import { getClinicalDocumentationCardById } from "../clinicalDocumentation/clinicalDocumentationRegistry.js";
import type { ClinicalDocumentationCategory } from "../clinicalDocumentation/clinicalDocumentationTypes.js";
import {
  SAFETY_PRECAUTIONS_DOCUMENTATION_CARD_ID,
  safetyPrecautionsDocumentationPayloadSchema,
} from "../clinicalDocumentation/fallRiskSafetyDocumentationPayloads.js";
import {
  PAIN_INITIAL_ASSESSMENT_CARD_ID,
  PAIN_LOCATION_VALUES,
  PAIN_SEVERE_NUMERIC_THRESHOLD,
  painInitialAssessmentPayloadSchema,
} from "../clinicalDocumentation/painDocumentationPayloads.js";
import {
  PATIENT_EDUCATION_SESSION_CARD_ID,
  patientEducationSessionPayloadSchema,
} from "../clinicalDocumentation/patientEducationDischargeTeachingDocumentationPayloads.js";
import {
  SKIN_INTEGRITY_ASSESSMENT_CARD_ID,
  SKIN_WOUND_SKIN_STATUS_VALUES,
  skinIntegrityAssessmentPayloadSchema,
} from "../clinicalDocumentation/skinWoundPressureInjuryDocumentationPayloads.js";
import { domainRequiresPersistedEdocId } from "./authoritativeDomainLinkageD4a26h.js";
import type { InpatientAdmissionClinicalSection } from "./connectedInpatientAdmissionIntakeD4a0.js";
import {
  nursingSectionIntegration,
  type NursingAdmissionDomainKey,
} from "./nursingAdmissionDomainIntegrationD4a25a.js";

export const NURSING_ADMISSION_WRITE_THROUGH_CERTIFICATION_ID =
  "MEDUI.INP.2B.2B" as const;

export const NURSING_ADMISSION_WRITE_THROUGH_NOTE =
  "Nursing admission bedside screen. Fields not captured on this screen were not invented as extra clinical findings; schema defaults record only what the screen documented.";

export type NursingAdmissionWriteThroughPlan =
  | { ok: true; skip: true }
  | {
      ok: true;
      skip: false;
      sectionId: InpatientAdmissionClinicalSection;
      domain: NursingAdmissionDomainKey;
      cardId: string;
      category: ClinicalDocumentationCategory;
      payload: Record<string, unknown>;
    }
  | { ok: false; code: "SECTION_VALIDATION_FAILED"; missing: string[] };

function asCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim().toUpperCase();
  return t || null;
}

function yn(value: unknown): "YES" | "NO" | "UNKNOWN" | null {
  const c = asCode(value);
  if (c === "YES" || c === "NO" || c === "UNKNOWN") return c;
  return null;
}

function codes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((x) => String(x).trim().toUpperCase()).filter(Boolean);
}

function atIso(clinicalDocumentedAt?: string | null): string {
  if (typeof clinicalDocumentedAt === "string" && !Number.isNaN(Date.parse(clinicalDocumentedAt))) {
    return new Date(clinicalDocumentedAt).toISOString();
  }
  return new Date().toISOString();
}

function cardCategory(cardId: string): ClinicalDocumentationCategory | null {
  const card = getClinicalDocumentationCardById(cardId);
  return card?.category ?? null;
}

function painLocationFromAnswers(answers: Record<string, unknown>): (typeof PAIN_LOCATION_VALUES)[number] {
  const raw = String(answers.location ?? "").trim().toUpperCase().replace(/\s+/g, "_");
  if ((PAIN_LOCATION_VALUES as readonly string[]).includes(raw)) {
    return raw as (typeof PAIN_LOCATION_VALUES)[number];
  }
  return "OTHER";
}

export function sectionNeedsAuthoritativeEdocWriteThrough(
  sectionId: InpatientAdmissionClinicalSection
): boolean {
  const integration = nursingSectionIntegration(sectionId);
  if (integration.authoritativeDomain === "ADMISSION_OWNED") return false;
  if (!domainRequiresPersistedEdocId(integration.authoritativeDomain)) return false;
  return (
    integration.writeMode === "EMBED_CANONICAL_EDITOR" ||
    integration.writeMode === "CREATE_DOMAIN_RECORD" ||
    integration.writeMode === "LINK_EXISTING_RECORD"
  );
}

function finish(
  sectionId: InpatientAdmissionClinicalSection,
  domain: NursingAdmissionDomainKey,
  cardId: string,
  payload: Record<string, unknown>,
  missing: string[]
): NursingAdmissionWriteThroughPlan {
  const category = cardCategory(cardId);
  if (!category) {
    return { ok: false, code: "SECTION_VALIDATION_FAILED", missing };
  }
  return {
    ok: true,
    skip: false,
    sectionId,
    domain,
    cardId,
    category,
    payload,
  };
}

export function buildNursingAdmissionWriteThrough(input: {
  sectionId: InpatientAdmissionClinicalSection;
  answers: Record<string, unknown>;
  clinicalDocumentedAt?: string | null;
}): NursingAdmissionWriteThroughPlan {
  if (!sectionNeedsAuthoritativeEdocWriteThrough(input.sectionId)) {
    return { ok: true, skip: true };
  }
  const when = atIso(input.clinicalDocumentedAt);
  const answers = input.answers ?? {};
  const note = NURSING_ADMISSION_WRITE_THROUGH_NOTE;

  if (input.sectionId === "PAIN") {
    const presence = asCode(answers.rapidPainPresence);
    const presentYn = yn(answers.painPresent);
    const painPresent =
      presence === "PAIN_PRESENT" ||
      (presence !== "NO_PAIN" && presentYn === "YES");
    const scoreRaw = answers.score;
    const score =
      typeof scoreRaw === "number" && Number.isFinite(scoreRaw)
        ? Math.max(0, Math.min(10, Math.round(scoreRaw)))
        : painPresent
          ? null
          : 0;
    if (painPresent && score == null) {
      return { ok: false, code: "SECTION_VALIDATION_FAILED", missing: ["score"] };
    }
    const payload = {
      assessmentTime: when,
      painScale: "NUMERIC" as const,
      painScore: score ?? 0,
      painLocation: painPresent ? painLocationFromAnswers(answers) : "OTHER",
      painQuality: "OTHER" as const,
      painDuration: "NEW" as const,
      painRadiation: "NONE" as const,
      functionalImpact: "NONE" as const,
      providerNotified: (score ?? 0) >= PAIN_SEVERE_NUMERIC_THRESHOLD,
      notes: [
        note,
        painPresent ? String(answers.rapidPainDetail ?? answers.location ?? "").trim() : "No pain on nursing admission screen.",
      ]
        .filter(Boolean)
        .join(" "),
    };
    const parsed = painInitialAssessmentPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return { ok: false, code: "SECTION_VALIDATION_FAILED", missing: ["painPresent"] };
    }
    return finish("PAIN", "PAIN_EDOC13", PAIN_INITIAL_ASSESSMENT_CARD_ID, parsed.data, ["painPresent"]);
  }

  if (input.sectionId === "FALL_SAFETY") {
    const chips = codes(answers.rapidFallPrecautions ?? answers.precautionsInitiated);
    const payload = {
      documentationTime: when,
      bedAlarmActive: chips.includes("BED_ALARM"),
      chairAlarmActive: false,
      nonSlipFootwearApplied: chips.includes("NONSKID"),
      callLightWithinReach: chips.includes("CALL_LIGHT"),
      bedInLowestPosition: chips.includes("BED_LOW_LOCKED"),
      sideRailsAppropriate: false,
      assistiveDeviceAvailable: chips.includes("ASSIST_AMBULATION"),
      fallRiskBandApplied: false,
      familyEducated: false,
      patientEducated: false,
      notes: note,
    };
    const parsed = safetyPrecautionsDocumentationPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return { ok: false, code: "SECTION_VALIDATION_FAILED", missing: ["rapidFallPrecautions"] };
    }
    return finish(
      "FALL_SAFETY",
      "FALL_SAFETY_EDOC14",
      SAFETY_PRECAUTIONS_DOCUMENTATION_CARD_ID,
      parsed.data,
      ["rapidFallPrecautions"]
    );
  }

  if (input.sectionId === "SKIN_WOUND") {
    const rapid = asCode(answers.rapidSkinStatus);
    if (!rapid || rapid === "NOT_ASSESSED") {
      return { ok: false, code: "SECTION_VALIDATION_FAILED", missing: ["rapidSkinStatus"] };
    }
    const pressure = yn(answers.pressureInjury);
    const openWound = yn(answers.openWound);
    let skinStatus: (typeof SKIN_WOUND_SKIN_STATUS_VALUES)[number] = "INTACT";
    if (rapid === "INTACT") skinStatus = "INTACT";
    else if (rapid === "PRESSURE_INJURY" || rapid === "WOUND_PRESENT") skinStatus = "BREAKDOWN_PRESENT";
    else if (rapid === "RASH" || rapid === "BRUISING") skinStatus = "REDNESS";
    else if (rapid === "MOISTURE_ASSOCIATED") skinStatus = "DRY";
    else skinStatus = "MULTIPLE_FINDINGS";
    const pressureInjuryPresent =
      pressure === "YES" || rapid === "PRESSURE_INJURY" ? "YES" : "NO";
    const woundPresent = openWound === "YES" || rapid === "WOUND_PRESENT" ? "YES" : "NO";
    const masdPresent = rapid === "MOISTURE_ASSOCIATED" ? "YES" : "NO";
    const providerNotified =
      pressureInjuryPresent === "YES" || skinStatus === "BREAKDOWN_PRESENT" ? "YES" : "NO";
    const payload = {
      assessmentTime: when,
      skinStatus,
      pressureInjuryPresent,
      woundPresent,
      skinTearPresent: "NO" as const,
      masdPresent,
      providerNotified,
      notes: [note, rapid === "OTHER" ? String(answers.rapidSkinOther ?? "").trim() : ""]
        .filter(Boolean)
        .join(" "),
    };
    const parsed = skinIntegrityAssessmentPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return { ok: false, code: "SECTION_VALIDATION_FAILED", missing: ["rapidSkinStatus"] };
    }
    return finish(
      "SKIN_WOUND",
      "SKIN_WOUND_EDOC20",
      SKIN_INTEGRITY_ASSESSMENT_CARD_ID,
      parsed.data,
      ["rapidSkinStatus"]
    );
  }

  if (input.sectionId === "BELONGINGS_VALUABLES") {
    const present = yn(answers.rapidBelongingsPresent);
    const reviewed = yn(answers.inventoryReviewed);
    const valuables = yn(answers.valuablesPresent);
    const payload = {
      documentedAt: when,
      patientAbleToParticipate: reviewed === "YES",
      clothingItems: [] as string[],
      personalItems: present === "YES" ? ["Present on nursing admission screen"] : [],
      assistiveDevices: [] as string[],
      medicationsBroughtFromHome: false,
      belongingsKeptWithPatient: present === "YES",
      belongingsBagged: false,
      notes: [
        note,
        valuables === "YES" ? "Valuables present (admission screen)." : "",
        valuables === "NO" ? "No valuables on admission screen." : "",
      ]
        .filter(Boolean)
        .join(" "),
    };
    const parsed = belongingsInventoryPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return { ok: false, code: "SECTION_VALIDATION_FAILED", missing: ["inventoryReviewed"] };
    }
    return finish(
      "BELONGINGS_VALUABLES",
      "BELONGINGS_EDOC9",
      BELONGINGS_INVENTORY_CARD_ID,
      parsed.data,
      ["inventoryReviewed"]
    );
  }

  if (input.sectionId === "EDUCATION_COMMUNICATION") {
    const teachBack = yn(answers.teachBack);
    if (!teachBack) {
      return { ok: false, code: "SECTION_VALIDATION_FAILED", missing: ["teachBack"] };
    }
    const understanding = teachBack === "YES" ? "YES" : teachBack === "NO" ? "NO" : "PARTIAL";
    const payload = {
      educationTime: when,
      topic: "SAFETY" as const,
      audience: "PATIENT" as const,
      interpreterUsed: "NO" as const,
      educationProvided: "YES" as const,
      understandingDemonstrated: understanding,
      providerNotified: "NO" as const,
      notes: note,
    };
    const parsed = patientEducationSessionPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return { ok: false, code: "SECTION_VALIDATION_FAILED", missing: ["teachBack"] };
    }
    return finish(
      "EDUCATION_COMMUNICATION",
      "EDUCATION_EDOC22",
      PATIENT_EDUCATION_SESSION_CARD_ID,
      parsed.data,
      ["teachBack"]
    );
  }

  return { ok: true, skip: true };
}
