import type { MarClinicalAction } from "./marClinicalAction.js";
import {
  normalizeMedicationFrequencyFromSig,
  type ResolveMedicationOrderItemFrequencyInput,
} from "../medication/medicationFrequencyNormalization.js";
import { parseMedicationFrequencyCode } from "../medication/medicationFrequencyCatalog.js";
import { getMedicationFrequencyDefinition } from "../medication/medicationFrequencyCatalog.js";
import { extractMarUserFreeTextNotes } from "./medicationAdministrationInjectionSite.js";
import {
  MAR_PRN_REASON_CODES,
  type MarPrnReasonCode,
  formatMarPrnReasonForLocale,
  isMarPrnReasonCode,
  marPrnReasonLabel,
} from "./marPrnReasonLocale.js";

export {
  MAR_PRN_REASON_CODES,
  type MarPrnReasonCode,
  marPrnReasonLabelFr,
  marPrnReasonLabelEn,
  marPrnReasonLabel,
  normalizeMarPrnReasonCodeFromStoredValue,
  normalizeMarPrnReasonCode,
  formatMarPrnReasonForLocale,
  isMarPrnReasonCode,
} from "./marPrnReasonLocale.js";

/** Machine-readable MAR notes line for PRN reason code. */
export const MAR_PRN_REASON_NOTE_PREFIX = "MAR_PRN_REASON:";
/** Human-readable PRN reason label persisted in MAR notes. */
export const MAR_PRN_REASON_LABEL_PREFIX = "MAR_PRN_REASON_LABEL:";
/** Ordered PRN indication from directions (reference). */
export const MAR_PRN_INDICATION_NOTE_PREFIX = "MAR_PRN_INDICATION:";
export const MAR_PAIN_SCORE_NOTE_PREFIX = "MAR_PAIN_SCORE:";
export const MAR_PAIN_LOCATION_NOTE_PREFIX = "MAR_PAIN_LOCATION:";

export const MAR_PRN_REASON_REQUIRED_MESSAGE =
  "A PRN reason is required before administering this medication.";

export const MAR_PRN_PAIN_SCORE_REQUIRED_MESSAGE =
  "Pain score (0–10) is required for this PRN pain medication.";

export const MAR_PRN_REASON_OTHER_REQUIRED_MESSAGE =
  "Document the PRN reason when selecting Other.";

export type MarPrnReasonGroup =
  | "pain"
  | "antiemetic"
  | "respiratory"
  | "allergy"
  | "cough"
  | "fever"
  | "anxiety_sleep"
  | "general";

export type MarPrnOrderMetadata = {
  isPrn: boolean;
  prnIndication: string | null;
  frequencyCode: string | null;
  prnReasonGroup: MarPrnReasonGroup | null;
};

export type ParsedMarPrnAdministration = {
  reasonCode: MarPrnReasonCode | null;
  reasonLabel: string | null;
  indication: string | null;
  painScore: number | null;
  painLocation: string | null;
};

function normalizeLabelText(raw: string | null | undefined): string {
  return (raw ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const PRN_MARKERS = [/\bprn\b/i, /\bp\.r\.n\.\b/i, /\bas needed\b/i, /\bselon besoin\b/i];

/** Extract indication text after PRN marker in directions sig (K.10B.7). */
export function parsePrnIndicationFromDirections(
  directionsSig: string | null | undefined
): string | null {
  const raw = directionsSig?.trim();
  if (!raw) return null;
  for (const marker of PRN_MARKERS) {
    const match = raw.match(marker);
    if (!match || match.index == null) continue;
    const tail = raw.slice(match.index + match[0].length).trim();
    if (!tail) return null;
    const cleaned = tail.replace(/^[:;,.\-–—]+/, "").trim();
    return cleaned || null;
  }
  return null;
}

const PRN_CLASSIFICATION_MARKERS = [
  /\bprn\b/i,
  /\bp\.r\.n\.\b/i,
  /\bas needed\b/i,
  /\bselon besoin\b/i,
  /\bpain\s+prn\b/i,
  /\bnausea\s+prn\b/i,
  /\bfever\s+prn\b/i,
  /\bcough\s+prn\b/i,
] as const;

/** Whether medication order is PRN (standalone PRN or interval + PRN modifier). */
export function isPrnMedicationOrder(input: ResolveMedicationOrderItemFrequencyInput): boolean {
  const explicit = parseMedicationFrequencyCode(
    input.frequencyCode == null ? null : String(input.frequencyCode)
  );
  if (explicit === "PRN") return true;
  const fromSig = normalizeMedicationFrequencyFromSig(input.directionsSig);
  if (fromSig.prnModifier === true) return true;
  const hay = `${input.frequencyCode ?? ""} ${input.directionsSig ?? ""}`.trim();
  if (!hay) return false;
  return PRN_CLASSIFICATION_MARKERS.some((marker) => marker.test(hay));
}

/** Classify PRN reason group from medication label / class (K.10B.7). */
export function classifyMarPrnReasonGroup(input: {
  medicationLabel?: string | null;
  genericName?: string | null;
  therapeuticClass?: string | null;
  prnIndication?: string | null;
}): MarPrnReasonGroup {
  const text = normalizeLabelText(
    `${input.medicationLabel ?? ""} ${input.genericName ?? ""} ${input.therapeuticClass ?? ""} ${input.prnIndication ?? ""}`
  );
  if (
    text.includes("morphine") ||
    text.includes("hydromorphone") ||
    text.includes("dilaudid") ||
    text.includes("acetaminophen") ||
    text.includes("tylenol") ||
    text.includes("ibuprofen") ||
    text.includes("ketorolac") ||
    text.includes("tramadol") ||
    /\bnsaid\b/.test(text) ||
    text.includes("analges") ||
    text.includes("severe pain") ||
    text.includes("moderate pain") ||
    text.includes("mild pain")
  ) {
    return "pain";
  }
  if (
    text.includes("ondansetron") ||
    text.includes("zofran") ||
    text.includes("metoclopramide") ||
    text.includes("promethazine") ||
    text.includes("antiemetic") ||
    text.includes("nausea") ||
    text.includes("vomiting")
  ) {
    return "antiemetic";
  }
  if (
    text.includes("albuterol") ||
    text.includes("salbutamol") ||
    text.includes("ipratropium") ||
    text.includes("bronchodilator") ||
    text.includes("wheez") ||
    text.includes("shortness of breath") ||
    text.includes("sob") ||
    text.includes("dyspnea")
  ) {
    return "respiratory";
  }
  if (
    text.includes("diphenhydramine") ||
    text.includes("loratadine") ||
    text.includes("cetirizine") ||
    text.includes("antihistamine") ||
    text.includes("allergy") ||
    text.includes("itch") ||
    text.includes("hives") ||
    text.includes("rash")
  ) {
    return "allergy";
  }
  if (
    text.includes("dextromethorphan") ||
    text.includes("guaifenesin") ||
    text.includes("benzonatate") ||
    text.includes("cough")
  ) {
    return "cough";
  }
  if (text.includes("fever") || text.includes("antipyretic")) {
    return "fever";
  }
  if (
    text.includes("lorazepam") ||
    text.includes("diazepam") ||
    text.includes("melatonin") ||
    text.includes("anxiety") ||
    text.includes("insomnia") ||
    text.includes("sleep") ||
    text.includes("agitation")
  ) {
    return "anxiety_sleep";
  }
  return "general";
}

export function resolveMarPrnOrderMetadata(
  input: ResolveMedicationOrderItemFrequencyInput & {
    medicationLabel?: string | null;
    genericName?: string | null;
    therapeuticClass?: string | null;
  }
): MarPrnOrderMetadata {
  const prnIndication = parsePrnIndicationFromDirections(input.directionsSig);
  const isPrn = isPrnMedicationOrder(input);
  const frequencyCode =
    input.frequencyCode?.trim() ||
    normalizeMedicationFrequencyFromSig(input.directionsSig).frequencyCode;
  return {
    isPrn,
    prnIndication,
    frequencyCode: frequencyCode ?? null,
    prnReasonGroup: isPrn
      ? classifyMarPrnReasonGroup({
          medicationLabel: input.medicationLabel,
          genericName: input.genericName,
          therapeuticClass: input.therapeuticClass,
          prnIndication,
        })
      : null,
  };
}

export function marPrnReasonCodesForGroup(group: MarPrnReasonGroup): readonly MarPrnReasonCode[] {
  switch (group) {
    case "pain":
      return ["mild_pain", "moderate_pain", "severe_pain", "other"];
    case "antiemetic":
      return ["nausea", "vomiting", "nausea_vomiting", "other"];
    case "respiratory":
      return ["wheezing", "shortness_of_breath", "cough", "low_o2", "other"];
    case "allergy":
      return ["itching", "rash", "allergic_reaction", "hives", "other"];
    case "cough":
      return ["cough", "other"];
    case "fever":
      return ["fever", "other"];
    case "anxiety_sleep":
      return ["insomnia", "anxiety", "agitation", "other"];
    default:
      return ["other"];
  }
}

/** Pain PRN meds require 0–10 pain score at administration. */
export function marPrnAdministrationRequiresPainScore(input: {
  medicationLabel?: string | null;
  genericName?: string | null;
  therapeuticClass?: string | null;
  prnIndication?: string | null;
  prnReasonGroup?: MarPrnReasonGroup | null;
}): boolean {
  const group =
    input.prnReasonGroup ??
    classifyMarPrnReasonGroup({
      medicationLabel: input.medicationLabel,
      genericName: input.genericName,
      therapeuticClass: input.therapeuticClass,
      prnIndication: input.prnIndication,
    });
  return group === "pain";
}

export function isOpioidPainMedicationLabel(
  medicationLabel?: string | null,
  genericName?: string | null
): boolean {
  const text = normalizeLabelText(`${medicationLabel ?? ""} ${genericName ?? ""}`);
  return (
    text.includes("morphine") ||
    text.includes("hydromorphone") ||
    text.includes("dilaudid") ||
    text.includes("fentanyl") ||
    text.includes("oxycodone") ||
    text.includes("hydrocodone") ||
    text.includes("codeine") ||
    text.includes("tramadol")
  );
}

function parsePainScoreLine(line: string): number | null {
  if (!line.startsWith(MAR_PAIN_SCORE_NOTE_PREFIX)) return null;
  const raw = line.slice(MAR_PAIN_SCORE_NOTE_PREFIX.length).trim();
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0 || n > 10) return null;
  return n;
}

/** Parse structured PRN administration from MAR notes. */
export function parseMarPrnAdministrationFromNotes(
  notes: string | null | undefined
): ParsedMarPrnAdministration {
  const result: ParsedMarPrnAdministration = {
    reasonCode: null,
    reasonLabel: null,
    indication: null,
    painScore: null,
    painLocation: null,
  };
  if (!notes?.trim()) return result;
  for (const line of notes.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith(MAR_PRN_REASON_NOTE_PREFIX)) {
      const code = trimmed.slice(MAR_PRN_REASON_NOTE_PREFIX.length).trim();
      if (isMarPrnReasonCode(code)) result.reasonCode = code;
    } else if (trimmed.startsWith(MAR_PRN_REASON_LABEL_PREFIX)) {
      result.reasonLabel = trimmed.slice(MAR_PRN_REASON_LABEL_PREFIX.length).trim() || null;
    } else if (trimmed.startsWith(MAR_PRN_INDICATION_NOTE_PREFIX)) {
      result.indication = trimmed.slice(MAR_PRN_INDICATION_NOTE_PREFIX.length).trim() || null;
    } else if (trimmed.startsWith(MAR_PAIN_SCORE_NOTE_PREFIX)) {
      result.painScore = parsePainScoreLine(trimmed);
    } else if (trimmed.startsWith(MAR_PAIN_LOCATION_NOTE_PREFIX)) {
      result.painLocation = trimmed.slice(MAR_PAIN_LOCATION_NOTE_PREFIX.length).trim() || null;
    }
  }
  return result;
}

/** Compact MAR cell summary e.g. "Pain 8/10" or "Nausea". */
export function formatPrnMarAdministrationCellSummary(
  notes: string | null | undefined,
  locale: "fr" | "en" = "fr"
): string | null {
  const parsed = parseMarPrnAdministrationFromNotes(notes);
  if (parsed.painScore != null) {
    const painWord = locale === "en" ? "Pain" : "Douleur";
    return `${painWord} ${parsed.painScore}/10`;
  }
  if (parsed.reasonCode) {
    return marPrnReasonLabel(parsed.reasonCode, locale);
  }
  const fromLegacyLabel = formatMarPrnReasonForLocale({ label: parsed.reasonLabel }, locale);
  if (fromLegacyLabel) return fromLegacyLabel;
  return parsed.reasonLabel?.trim() || null;
}

export function mergePrnAdministrationIntoMarNotes(input: {
  notes: string | null | undefined;
  prnReasonCode: MarPrnReasonCode;
  prnReasonOther?: string | null;
  prnIndication?: string | null;
  painScore?: number | null;
  painLocation?: string | null;
  locale?: "fr" | "en";
}): string {
  const locale = input.locale ?? "fr";
  const base = extractMarUserFreeTextNotes(input.notes);
  const reasonLabel =
    input.prnReasonCode === "other"
      ? input.prnReasonOther?.trim() || marPrnReasonLabel("other", locale)
      : marPrnReasonLabel(input.prnReasonCode, locale);

  const machineLines = [
    `${MAR_PRN_REASON_NOTE_PREFIX}${input.prnReasonCode}`,
    `${MAR_PRN_REASON_LABEL_PREFIX}${reasonLabel}`,
  ];
  if (input.prnIndication?.trim()) {
    machineLines.push(`${MAR_PRN_INDICATION_NOTE_PREFIX}${input.prnIndication.trim()}`);
  }
  if (input.painScore != null) {
    machineLines.push(`${MAR_PAIN_SCORE_NOTE_PREFIX}${input.painScore}`);
  }
  if (input.painLocation?.trim()) {
    machineLines.push(`${MAR_PAIN_LOCATION_NOTE_PREFIX}${input.painLocation.trim()}`);
  }

  const humanReason =
    locale === "en" ? `PRN reason: ${reasonLabel}` : `Motif PRN : ${reasonLabel}`;
  const parts = [base, humanReason, ...machineLines].filter((p) => p?.trim());
  return parts.join("\n");
}

export type MarPrnAdministrationValidationCode =
  | "prn_reason_required"
  | "prn_reason_other_required"
  | "prn_pain_score_required"
  | "prn_early_override_required";

export const MAR_PRN_EARLY_OVERRIDE_REQUIRED_MESSAGE =
  "A reason is required when administering this PRN medication before the next eligible time.";

/** PRN drawer / timeline item fields from order directions + administration notes. */
export function resolveMarTimelinePrnDisplayFields(input: {
  directionsSig?: string | null;
  administrationNotes?: string | null;
}): {
  orderPrnIndication: string | null;
  prnReasonCode: string | null;
  prnReasonLabel: string | null;
  prnPainScore: number | null;
  prnPainLocation: string | null;
} {
  const parsed = parseMarPrnAdministrationFromNotes(input.administrationNotes);
  return {
    orderPrnIndication:
      parsePrnIndicationFromDirections(input.directionsSig) ?? parsed.indication,
    prnReasonCode: parsed.reasonCode,
    prnReasonLabel: parsed.reasonLabel,
    prnPainScore: parsed.painScore,
    prnPainLocation: parsed.painLocation,
  };
}

export function validatePrnAdministrationForMarCreate(input: {
  marAction: MarClinicalAction;
  frequencyCode?: string | null;
  directionsSig?: string | null;
  medicationLabel?: string | null;
  genericName?: string | null;
  therapeuticClass?: string | null;
  prnReasonCode?: string | null;
  prnReasonOther?: string | null;
  painScore?: number | null;
  proposedAdministeredAt?: Date | string | null;
  lastAdministeredAt?: Date | string | null;
  prnEarlyOverrideReason?: string | null;
}): { code: MarPrnAdministrationValidationCode; message: string } | null {
  if (input.marAction !== "administered") return null;
  if (
    !isPrnMedicationOrder({
      frequencyCode: input.frequencyCode,
      directionsSig: input.directionsSig,
    })
  ) {
    return null;
  }

  if (!isMarPrnReasonCode(input.prnReasonCode ?? null)) {
    return { code: "prn_reason_required", message: MAR_PRN_REASON_REQUIRED_MESSAGE };
  }

  if (input.prnReasonCode === "other" && !input.prnReasonOther?.trim()) {
    return {
      code: "prn_reason_other_required",
      message: MAR_PRN_REASON_OTHER_REQUIRED_MESSAGE,
    };
  }

  if (
    marPrnAdministrationRequiresPainScore({
      medicationLabel: input.medicationLabel,
      genericName: input.genericName,
      therapeuticClass: input.therapeuticClass,
      prnIndication: parsePrnIndicationFromDirections(input.directionsSig),
    })
  ) {
    const score = input.painScore;
    if (score == null || !Number.isInteger(score) || score < 0 || score > 10) {
      return {
        code: "prn_pain_score_required",
        message: MAR_PRN_PAIN_SCORE_REQUIRED_MESSAGE,
      };
    }
  }

  if (input.proposedAdministeredAt) {
    const lastMs = parsePrnGovernanceInstant(input.lastAdministeredAt);
    if (lastMs != null) {
      const def = getMedicationFrequencyDefinition(input.frequencyCode ?? null);
      const intervalMinutes = def?.intervalMinutes;
      if (intervalMinutes != null && intervalMinutes > 0) {
        const nextEligibleMs = lastMs + intervalMinutes * 60_000;
        const proposedMs = parsePrnGovernanceInstant(input.proposedAdministeredAt);
        if (proposedMs != null && proposedMs < nextEligibleMs && !input.prnEarlyOverrideReason?.trim()) {
          return {
            code: "prn_early_override_required",
            message: MAR_PRN_EARLY_OVERRIDE_REQUIRED_MESSAGE,
          };
        }
      }
    }
  }

  return null;
}

function parsePrnGovernanceInstant(value: Date | string | null | undefined): number | null {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value);
  const t = d.getTime();
  return Number.isNaN(t) ? null : t;
}
