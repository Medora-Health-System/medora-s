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
