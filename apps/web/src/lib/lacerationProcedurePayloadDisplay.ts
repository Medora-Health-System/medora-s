import type { SupportedLanguage } from "@/i18n/config";
import {
  isKnownLacerationAnesthesia,
  isKnownLacerationClosure,
  isKnownLacerationIrrigation,
  isKnownLacerationSite,
  isKnownLacerationSutures,
  isKnownLacerationWoundLength,
} from "@medora/shared";
import { formatEncounterChromeDateTime } from "@/lib/encounterChromeI18n";

export type ProcedurePayload = Record<string, unknown>;

function str(p: ProcedurePayload, k: string): string {
  const v = p[k];
  return typeof v === "string" ? v.trim() : "";
}

/** Read a trimmed string field from a procedure payload (for summary UI). */
export function readPayloadStr(p: ProcedurePayload, k: string): string {
  return str(p, k);
}

export function lacerationSiteDisplayText(p: ProcedurePayload, t: (k: string) => string): string {
  const site = str(p, "site");
  if (!site) return "—";
  if (isKnownLacerationSite(site)) {
    const base = t(`erProcedureLauncher.site.${site}`);
    if (site === "OTHER") {
      const o = str(p, "siteOther");
      return o ? `${base} (${o})` : base;
    }
    return base;
  }
  return site;
}

export function lacerationWoundLengthDisplayText(p: ProcedurePayload, t: (k: string) => string): string {
  const wl = str(p, "woundLength");
  if (wl && isKnownLacerationWoundLength(wl)) {
    if (wl === "OTHER") {
      const o = str(p, "woundLengthOther");
      return o || t("erProcedureLauncher.woundLength.OTHER");
    }
    return t(`erProcedureLauncher.woundLength.${wl}`);
  }
  const legacy = str(p, "woundLengthCm");
  return legacy || "—";
}

function codedEnumLine(
  p: ProcedurePayload,
  field: string,
  otherField: string,
  isKnown: (v: string) => boolean,
  i18nGroup: string,
  t: (k: string) => string
): string {
  const v = str(p, field);
  if (!v) return "";
  if (isKnown(v)) {
    if (v === "OTHER") {
      const o = str(p, otherField);
      return o || t(`erProcedureLauncher.${i18nGroup}.OTHER`);
    }
    return t(`erProcedureLauncher.${i18nGroup}.${v}`);
  }
  return v;
}

export function lacerationAnesthesiaDisplayText(p: ProcedurePayload, t: (k: string) => string): string {
  return codedEnumLine(p, "anesthesia", "anesthesiaOther", isKnownLacerationAnesthesia, "anesthesia", t);
}

export function lacerationIrrigationDisplayText(p: ProcedurePayload, t: (k: string) => string): string {
  return codedEnumLine(p, "irrigation", "irrigationOther", isKnownLacerationIrrigation, "irrigation", t);
}

export function lacerationClosureDisplayText(p: ProcedurePayload, t: (k: string) => string): string {
  return codedEnumLine(p, "closureMethod", "closureMethodOther", isKnownLacerationClosure, "closureMethod", t);
}

export function lacerationSuturesDisplayText(p: ProcedurePayload, t: (k: string) => string): string {
  return codedEnumLine(p, "suturesOrStaples", "suturesOrStaplesOther", isKnownLacerationSutures, "suturesOrStaples", t);
}

export function procedurePerformerDisplayNameWithTitle(
  p: ProcedurePayload,
  createdBy: { firstName: string | null; lastName: string | null },
  formatActor: (fn: string | null, ln: string | null) => string
): string {
  const name =
    str(p, "performedByDisplayName") ||
    str(p, "performerDisplayName") ||
    formatActor(createdBy.firstName, createdBy.lastName);
  const title = str(p, "performerTitle");
  if (title && name) return `${title} ${name}`;
  return name || "—";
}

export function buildLacerationProcedureTimelineDetailLine(
  p: ProcedurePayload,
  rowCreatedAtIso: string,
  language: SupportedLanguage,
  t: (k: string) => string,
  createdBy: { firstName: string | null; lastName: string | null },
  formatActor: (fn: string | null, ln: string | null) => string
): string {
  const sep = t("erProcedureLauncher.timelineDetail.sep");
  const performedIso = str(p, "performedAt") || rowCreatedAtIso;
  let timeStr = "";
  try {
    timeStr = formatEncounterChromeDateTime(performedIso, language);
  } catch {
    timeStr = performedIso;
  }

  const head = `${procedurePerformerDisplayNameWithTitle(p, createdBy, formatActor)} — ${timeStr}`;
  const clinical: string[] = [];

  const wLen = lacerationWoundLengthDisplayText(p, t);
  if (wLen && wLen !== "—") clinical.push(wLen);

  const an = lacerationAnesthesiaDisplayText(p, t);
  if (an) clinical.push(an);

  const ir = lacerationIrrigationDisplayText(p, t);
  if (ir) clinical.push(ir);

  const cl = lacerationClosureDisplayText(p, t);
  if (cl) clinical.push(cl);

  const su = lacerationSuturesDisplayText(p, t);
  if (su) clinical.push(su);

  if (p.asepticTechnique === true) clinical.push(t("erProcedureLauncher.timelineDetail.asepticYes"));
  else if (p.asepticTechnique === false) clinical.push(t("erProcedureLauncher.timelineDetail.asepticNo"));

  if (p.dressingApplied === true) clinical.push(t("erProcedureLauncher.timelineDetail.dressingYes"));
  else if (p.dressingApplied === false) clinical.push(t("erProcedureLauncher.timelineDetail.dressingNo"));

  if (p.toleratedWell === true) clinical.push(t("erProcedureLauncher.timelineDetail.toleratedYes"));
  else if (p.toleratedWell === false) clinical.push(t("erProcedureLauncher.timelineDetail.toleratedNo"));

  const tail = clinical.join(sep);
  return tail ? `${head} — ${tail}` : head;
}

const PROCEDURE_NAME_I18N: Record<string, string> = {
  LACERATION_REPAIR: "lacerationRepair",
  WOUND_CARE: "woundCare",
  INCISION_AND_DRAINAGE: "incisionAndDrainage",
  SPLINT_APPLICATION: "splintApplication",
  FOLEY_CATHETER: "foleyCatheter",
  EKG: "ekg",
  GLUCOSE_CHECK: "glucoseCheck",
  URINE_COLLECTION: "urineCollection",
  PREGNANCY_TEST: "pregnancyTest",
  CHEST_TUBE: "chestTube",
  INTUBATION: "intubation",
  CENTRAL_LINE: "centralLine",
  PROCEDURAL_SEDATION: "proceduralSedation",
  REDUCTION: "reduction",
  THORACENTESIS_PARACENTESIS: "thoracentesisParacentesis",
  PELVIC_EXAM: "pelvicExam",
  LUMBAR_PUNCTURE: "lumbarPuncture",
};

export function procedureTypeDisplayName(t: (k: string) => string, procedureType: string): string {
  const key = PROCEDURE_NAME_I18N[procedureType];
  if (key) return t(`erProcedureLauncher.procedureNames.${key}`);
  return procedureType || "—";
}

export function formatProcedureEnumField(
  p: ProcedurePayload,
  field: string,
  otherField: string,
  group: string,
  t: (k: string) => string
): string {
  const v = str(p, field);
  if (!v) return "";
  if (v === "OTHER") {
    const o = str(p, otherField);
    return o || t(`erProcedureLauncher.${group}.OTHER`);
  }
  return t(`erProcedureLauncher.${group}.${v}`);
}

function tEnum(
  p: ProcedurePayload,
  field: string,
  otherField: string,
  group: string,
  t: (k: string) => string
): string {
  return formatProcedureEnumField(p, field, otherField, group, t);
}

function boolShort(v: unknown, t: (k: string) => string): string {
  if (v === true) return t("erProcedureLauncher.boolYes");
  if (v === false) return t("erProcedureLauncher.boolNo");
  return "";
}

/** Compact second segment for timeline title (after procedure name). */
export function procedureTimelineCompactSuffix(p: ProcedurePayload, t: (k: string) => string): string {
  const pt = str(p, "procedureType");
  switch (pt) {
    case "LACERATION_REPAIR":
      return lacerationSiteDisplayText(p, t);
    case "WOUND_CARE": {
      const site = lacerationSiteDisplayText(p, t);
      const wt = tEnum(p, "woundType", "woundTypeOther", "woundType", t);
      return [site, wt].filter(Boolean).join(` ${t("erProcedureLauncher.timelineDetail.sep")} `);
    }
    case "INCISION_AND_DRAINAGE":
      return lacerationSiteDisplayText(p, t);
    case "SPLINT_APPLICATION":
      return tEnum(p, "extremitySite", "extremitySiteOther", "extremitySite", t);
    case "FOLEY_CATHETER":
      return tEnum(p, "catheterSize", "catheterSizeOther", "catheterSize", t);
    case "EKG":
      return tEnum(p, "rhythm", "rhythmOther", "ekgRhythm", t);
    case "GLUCOSE_CHECK": {
      const mg = str(p, "resultMgDl");
      return mg ? `${mg} mg/dL` : "—";
    }
    case "URINE_COLLECTION":
      return tEnum(p, "method", "methodOther", "urineMethod", t);
    case "PREGNANCY_TEST":
      return tEnum(p, "result", "resultOther", "pregnancyResult", t);
    case "CHEST_TUBE":
      return tEnum(p, "side", "sideOther", "laterality", t);
    case "INTUBATION":
      return tEnum(p, "indication", "indicationOther", "intubationIndication", t);
    case "CENTRAL_LINE":
      return tEnum(p, "site", "siteOther", "centralLineSite", t);
    case "PROCEDURAL_SEDATION":
      return tEnum(p, "indication", "indicationOther", "sedationIndication", t);
    case "REDUCTION":
      return tEnum(p, "bodyPart", "bodyPartOther", "reductionBodyPart", t);
    case "THORACENTESIS_PARACENTESIS":
      return tEnum(p, "fluidProcedureType", "fluidProcedureTypeOther", "fluidProcedureType", t);
    case "PELVIC_EXAM":
      return tEnum(p, "indication", "indicationOther", "pelvicExamIndication", t);
    case "LUMBAR_PUNCTURE":
      return tEnum(p, "indication", "indicationOther", "lpIndication", t);
    default:
      return str(p, "site") || "—";
  }
}

function buildGenericProcedureTimelineDetailLine(
  p: ProcedurePayload,
  rowCreatedAtIso: string,
  language: SupportedLanguage,
  t: (k: string) => string,
  createdBy: { firstName: string | null; lastName: string | null },
  formatActor: (fn: string | null, ln: string | null) => string
): string {
  const sep = t("erProcedureLauncher.timelineDetail.sep");
  const performedIso = str(p, "performedAt") || rowCreatedAtIso;
  let timeStr = "";
  try {
    timeStr = formatEncounterChromeDateTime(performedIso, language);
  } catch {
    timeStr = performedIso;
  }
  const head = `${procedurePerformerDisplayNameWithTitle(p, createdBy, formatActor)} — ${timeStr}`;
  const parts: string[] = [];
  const pt = str(p, "procedureType");

  const pushEnum = (field: string, other: string, group: string) => {
    const s = tEnum(p, field, other, group, t);
    if (s) parts.push(s);
  };

  if (pt === "WOUND_CARE") {
    const siteLine = lacerationSiteDisplayText(p, t);
    if (siteLine && siteLine !== "—") parts.push(siteLine);
    pushEnum("woundType", "woundTypeOther", "woundType");
    pushEnum("cleaningSolution", "cleaningSolutionOther", "cleaningSolution");
    pushEnum("dressingType", "dressingTypeOther", "dressingType");
    const tw = boolShort(p.toleratedWell, t);
    if (tw) parts.push(`${t("erProcedureLauncher.fieldTolerated")}: ${tw}`);
  }
  if (pt === "INCISION_AND_DRAINAGE") {
    const siteLine = lacerationSiteDisplayText(p, t);
    if (siteLine && siteLine !== "—") parts.push(siteLine);
    pushEnum("abscessSize", "abscessSizeOther", "abscessSize");
    const an = lacerationAnesthesiaDisplayText(p, t);
    if (an) parts.push(an);
    const ip = boolShort(p.incisionPerformed, t);
    if (ip) parts.push(`${t("erProcedureLauncher.incisionPerformed")}: ${ip}`);
    pushEnum("drainageAmount", "drainageAmountOther", "drainageAmount");
    const pk = boolShort(p.packingPlaced, t);
    if (pk) parts.push(`${t("erProcedureLauncher.packingPlaced")}: ${pk}`);
    const dr = boolShort(p.dressingApplied, t);
    if (dr) parts.push(`${t("erProcedureLauncher.fieldDressing")}: ${dr}`);
    const twi = boolShort(p.toleratedWell, t);
    if (twi) parts.push(`${t("erProcedureLauncher.fieldTolerated")}: ${twi}`);
  }
  if (pt === "SPLINT_APPLICATION") {
    const ex = tEnum(p, "extremitySite", "extremitySiteOther", "extremitySite", t);
    if (ex) parts.push(ex);
    pushEnum("splintType", "splintTypeOther", "splintType");
    parts.push(`${t("erProcedureLauncher.neuroBefore")}: ${tEnum(p, "neurovascularBefore", "neurovascularBeforeOther", "neurovascularStatus", t)}`);
    parts.push(`${t("erProcedureLauncher.neuroAfter")}: ${tEnum(p, "neurovascularAfter", "neurovascularAfterOther", "neurovascularStatus", t)}`);
    parts.push(`${t("erProcedureLauncher.fieldTolerated")}: ${boolShort(p.patientToleratedWell, t)}`);
    parts.push(`${t("erProcedureLauncher.instructionsGiven")}: ${boolShort(p.instructionsGiven, t)}`);
  }
  if (pt === "FOLEY_CATHETER") {
    pushEnum("catheterSize", "catheterSizeOther", "catheterSize");
    pushEnum("indication", "indicationOther", "foleyIndication");
    parts.push(`${t("erProcedureLauncher.urineReturn")}: ${boolShort(p.urineReturn, t)}`);
    pushEnum("urineAppearance", "urineAppearanceOther", "urineAppearance");
    pushEnum("balloonVolume", "balloonVolumeOther", "balloonVolume");
    parts.push(`${t("erProcedureLauncher.fieldTolerated")}: ${boolShort(p.toleratedWell, t)}`);
  }
  if (pt === "EKG") {
    pushEnum("indication", "indicationOther", "ekgIndication");
    pushEnum("rhythm", "rhythmOther", "ekgRhythm");
    pushEnum("rateRange", "rateRangeOther", "rateRange");
    parts.push(`${t("erProcedureLauncher.providerNotified")}: ${boolShort(p.providerNotified, t)}`);
    parts.push(`${t("erProcedureLauncher.copyInChart")}: ${boolShort(p.copyPlacedInChart, t)}`);
  }
  if (pt === "GLUCOSE_CHECK") {
    const mg = str(p, "resultMgDl");
    if (mg) parts.push(`${mg} mg/dL`);
    pushEnum("specimenSource", "specimenSourceOther", "specimenSource");
    pushEnum("actionTaken", "actionTakenOther", "glucoseAction");
    parts.push(`${t("erProcedureLauncher.providerNotified")}: ${boolShort(p.providerNotified, t)}`);
  }
  if (pt === "URINE_COLLECTION") {
    pushEnum("method", "methodOther", "urineMethod");
    parts.push(`${t("erProcedureLauncher.specimenToLab")}: ${boolShort(p.specimenSentToLab, t)}`);
    pushEnum("urineAppearance", "urineAppearanceOther", "urineAppearance");
  }
  if (pt === "PREGNANCY_TEST") {
    pushEnum("specimen", "specimenOther", "pregnancySpecimen");
    pushEnum("result", "resultOther", "pregnancyResult");
    const pn = boolShort(p.providerNotified, t);
    if (pn) parts.push(`${t("erProcedureLauncher.providerNotified")}: ${pn}`);
  }

  const compStr = str(p, "complications");
  if (compStr) parts.push(`${t("erProcedureLauncher.fieldComplications")}: ${compStr.slice(0, 160)}`);
  const notesStr = str(p, "notes");
  if (notesStr) parts.push(`${t("erProcedureLauncher.fieldNotes")}: ${notesStr.slice(0, 200)}`);

  const filtered = parts.filter((x) => x && x.trim());
  const tail = filtered.join(sep);
  return tail ? `${head} — ${tail}` : head;
}

export function buildProcedureTimelineDetailLine(
  p: ProcedurePayload,
  rowCreatedAtIso: string,
  language: SupportedLanguage,
  t: (k: string) => string,
  createdBy: { firstName: string | null; lastName: string | null },
  formatActor: (fn: string | null, ln: string | null) => string
): string {
  if (str(p, "procedureType") === "LACERATION_REPAIR") {
    return buildLacerationProcedureTimelineDetailLine(p, rowCreatedAtIso, language, t, createdBy, formatActor);
  }
  return buildGenericProcedureTimelineDetailLine(p, rowCreatedAtIso, language, t, createdBy, formatActor);
}
