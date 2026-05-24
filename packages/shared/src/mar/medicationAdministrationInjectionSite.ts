import type { MarClinicalAction } from "./marClinicalAction.js";

/** Stable ids persisted in MAR notes (`IM_INJECTION_SITE:<id>` line). */
export const imInjectionSiteValues = [
  "right_deltoid",
  "left_deltoid",
  "right_vastus_lateralis",
  "left_vastus_lateralis",
  "right_ventrogluteal",
  "left_ventrogluteal",
  "right_dorsogluteal",
  "left_dorsogluteal",
  "other",
] as const;

export type ImInjectionSiteId = (typeof imInjectionSiteValues)[number];

/** Machine-readable MAR notes line prefix for injection site (locale-independent). */
export const IM_INJECTION_SITE_NOTE_PREFIX = "IM_INJECTION_SITE:";

export const IM_INJECTION_SITE_REQUIRED_MESSAGE =
  "Injection site is required for IM administration.";

export const IM_INJECTION_SITE_OTHER_NOTES_REQUIRED_MESSAGE =
  "Document the injection site in notes when selecting Other.";

/** French product labels (canonical persistence / parse). */
export const imInjectionSiteLabelsFr: Record<ImInjectionSiteId, string> = {
  right_deltoid: "Deltoïde droit",
  left_deltoid: "Deltoïde gauche",
  right_vastus_lateralis: "Vaste latéral droit",
  left_vastus_lateralis: "Vaste latéral gauche",
  right_ventrogluteal: "Ventroglutéal droit",
  left_ventrogluteal: "Ventroglutéal gauche",
  right_dorsogluteal: "Dorsoglutéal droit",
  left_dorsogluteal: "Dorsoglutéal gauche",
  other: "Autre / documenté dans les notes",
};

/** English dev/locale labels (same keys as i18n). */
export const imInjectionSiteLabelsEn: Record<ImInjectionSiteId, string> = {
  right_deltoid: "Right deltoid",
  left_deltoid: "Left deltoid",
  right_vastus_lateralis: "Right vastus lateralis",
  left_vastus_lateralis: "Left vastus lateralis",
  right_ventrogluteal: "Right ventrogluteal",
  left_ventrogluteal: "Left ventrogluteal",
  right_dorsogluteal: "Right dorsogluteal",
  left_dorsogluteal: "Left dorsogluteal",
  other: "Other / documented in notes",
};

const NOTE_INJECTION_SITE_PREFIXES = [
  "site d'injection :",
  "site d'injection:",
  "injection site:",
  "injection site :",
] as const;

function normalizeRouteToken(route: string): string {
  return route.trim().toLowerCase().replace(/\s+/g, " ");
}

/** True when MAR route documents intramuscular administration. */
export function isIntramuscularMarRoute(route: string | null | undefined): boolean {
  const raw = route?.trim();
  if (!raw) return false;
  const n = normalizeRouteToken(raw);
  if (n === "im" || n === "i.m." || n === "i.m" || n === "i m") return true;
  if (n.includes("intramuscular") || n.includes("intramusculaire")) return true;
  return false;
}

function isImInjectionSiteId(value: string | null | undefined): value is ImInjectionSiteId {
  const v = value?.trim();
  return Boolean(v && (imInjectionSiteValues as readonly string[]).includes(v));
}

function labelToInjectionSiteId(label: string): ImInjectionSiteId | null {
  const t = label.trim();
  if (!t) return null;
  for (const id of imInjectionSiteValues) {
    if (imInjectionSiteLabelsFr[id] === t || imInjectionSiteLabelsEn[id] === t) return id;
  }
  return null;
}

/** Parse injection site id from persisted MAR notes. */
export function parseInjectionSiteFromMarNotes(notes: string | null | undefined): ImInjectionSiteId | null {
  if (!notes || typeof notes !== "string") return null;
  for (const line of notes.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith(IM_INJECTION_SITE_NOTE_PREFIX)) {
      const id = trimmed.slice(IM_INJECTION_SITE_NOTE_PREFIX.length).trim();
      if (isImInjectionSiteId(id)) return id;
    }
    const lower = trimmed.toLowerCase();
    for (const prefix of NOTE_INJECTION_SITE_PREFIXES) {
      if (lower.startsWith(prefix)) {
        const tail = trimmed.slice(prefix.length).trim();
        const parsed = labelToInjectionSiteId(tail);
        if (parsed) return parsed;
      }
    }
  }
  return null;
}

/** Free-text MAR notes excluding action/route/injection-site system lines. */
export function extractMarUserFreeTextNotes(notes: string | null | undefined): string {
  if (!notes || typeof notes !== "string") return "";
  const kept: string[] = [];
  for (const line of notes.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const lower = trimmed.toLowerCase();
    if (lower.startsWith("action :") || lower.startsWith("action:")) continue;
    if (lower.startsWith("voie :") || lower.startsWith("voie:")) continue;
    if (lower.startsWith("route :") || lower.startsWith("route:")) continue;
    if (trimmed.startsWith(IM_INJECTION_SITE_NOTE_PREFIX)) continue;
    let isSiteLine = false;
    for (const prefix of NOTE_INJECTION_SITE_PREFIXES) {
      if (lower.startsWith(prefix)) {
        isSiteLine = true;
        break;
      }
    }
    if (isSiteLine) continue;
    kept.push(trimmed);
  }
  return kept.join("\n").trim();
}

export function buildMarInjectionSiteNoteLine(
  injectionSite: ImInjectionSiteId,
  locale: "fr" | "en" = "fr"
): string {
  const label =
    locale === "en" ? imInjectionSiteLabelsEn[injectionSite] : imInjectionSiteLabelsFr[injectionSite];
  const prefix = locale === "en" ? "Injection site:" : "Site d'injection :";
  return `${prefix} ${label}`;
}

/** Append human + machine injection-site lines to MAR notes when IM administered. */
export function mergeInjectionSiteIntoMarNotes(
  notes: string | null | undefined,
  injectionSite: ImInjectionSiteId | null | undefined,
  locale: "fr" | "en" = "fr"
): string | null {
  const base = notes?.trim() ? notes.trim() : "";
  if (!injectionSite) return base || null;
  const human = buildMarInjectionSiteNoteLine(injectionSite, locale);
  const machine = `${IM_INJECTION_SITE_NOTE_PREFIX}${injectionSite}`;
  const withoutExisting = base
    .split("\n")
    .filter((line) => {
      const t = line.trim();
      if (!t) return false;
      if (t.startsWith(IM_INJECTION_SITE_NOTE_PREFIX)) return false;
      const lower = t.toLowerCase();
      return !NOTE_INJECTION_SITE_PREFIXES.some((p) => lower.startsWith(p));
    })
    .join("\n")
    .trim();
  const parts = withoutExisting ? [withoutExisting, human, machine] : [human, machine];
  return parts.join("\n");
}

export type ImInjectionSiteMarValidationCode =
  | "injection_site_required"
  | "injection_site_other_notes_required";

export function validateImInjectionSiteForMarCreate(input: {
  marAction: MarClinicalAction;
  route?: string | null;
  injectionSite?: string | null;
  /** Full MAR notes (action/route/user) or user-only free text for client-side checks. */
  notes?: string | null;
  /** When true, `notes` is user free text only (modal notes field). */
  userNotesOnly?: boolean;
}): { code: ImInjectionSiteMarValidationCode; message: string } | null {
  if (input.marAction !== "administered") return null;
  if (!isIntramuscularMarRoute(input.route)) return null;
  if (!isImInjectionSiteId(input.injectionSite ?? null)) {
    return { code: "injection_site_required", message: IM_INJECTION_SITE_REQUIRED_MESSAGE };
  }
  if (input.injectionSite === "other") {
    const freeText = input.userNotesOnly
      ? input.notes?.trim() ?? ""
      : extractMarUserFreeTextNotes(input.notes);
    if (!freeText) {
      return {
        code: "injection_site_other_notes_required",
        message: IM_INJECTION_SITE_OTHER_NOTES_REQUIRED_MESSAGE,
      };
    }
  }
  return null;
}

/** Whether IM + administered requires an injection site selection in the MAR modal. */
export function marModalRequiresInjectionSite(input: {
  marAction: MarClinicalAction;
  route?: string | null;
}): boolean {
  return input.marAction === "administered" && isIntramuscularMarRoute(input.route);
}
