import {
  clinicalDatetimeLocalFromInstant,
  clinicalDatetimeLocalToUtcDate,
  medicationDirectionQuickPicksForIvFluid,
  medicationDirectionQuickPicksForClinicalLabel,
  medicationDirectionQuickPicksForPrnCategory,
  normalizeMedicationRoute,
  parseMedicationFrequencyCode,
  resolveMedicationOrderItemFrequencyCode,
  shouldReplaceUntouchedPlannedAdminLocal,
  type MedicationOrderRoute,
} from "@medora/shared";
import type { CreateOrderLineItem, MedicationRoute } from "./types";

export type OrderDraftTypeKey = "LAB" | "IMAGING" | "MEDICATION" | "CARE";

/** Fallback when route is unset or unrecognized (M1.8B.7J.6). */
export const MEDICATION_DIRECTION_QUICK_PICKS_GENERIC = [
  "now",
  "once",
  "give now",
  "take as directed",
] as const;

export const MEDICATION_DIRECTION_QUICK_PICKS_PO = [
  "1 tablet now",
  "1 tab PO now",
  "1 tab PO daily",
  "1 tab PO BID",
  "1 tab PO TID",
  "1 tab PO QID",
  "1 tab PO q6h PRN",
  "1 tab PO q8h PRN",
  "take as directed",
] as const;

export const MEDICATION_DIRECTION_QUICK_PICKS_IVPB = [
  "now",
  "once",
  "give IVPB now",
  "IVPB once",
  "1 g IVPB q24h",
  "1 g IVPB q12h",
  "1 g IVPB q8h",
  "1 g IVPB q6h",
  "500 mg IVPB q12h",
  "500 mg IVPB q8h",
  "Vancomycin 1 g IVPB q12h",
  "Cefepime 2 g IVPB q8h",
  "Ceftriaxone 1 g IVPB q24h",
  "Piperacillin-tazobactam 4.5 g IVPB q6h",
  "take as directed",
] as const;

export const MEDICATION_DIRECTION_QUICK_PICKS_IVP = [
  "1 mL IVP now",
  "give IVP now",
  "IVP once",
  "take as directed",
] as const;

export const MEDICATION_DIRECTION_QUICK_PICKS_IM = [
  "IM now",
  "IM once",
  "take as directed",
] as const;

export const MEDICATION_DIRECTION_QUICK_PICKS_SQ = [
  "SQ now",
  "SQ daily",
  "SQ BID",
  "take as directed",
] as const;

export const MEDICATION_DIRECTION_QUICK_PICKS_IO = [
  "IO now",
  "IO once",
  "take as directed",
] as const;

function dedupeDirectionQuickPicks(...groups: readonly (readonly string[])[]): readonly string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const group of groups) {
    for (const pick of group) {
      const key = pick.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(pick);
    }
  }
  return out;
}

/** @deprecated Use {@link medicationDirectionQuickPicksForRoute} — generic fallback only. */
export const MEDICATION_DIRECTION_QUICK_PICKS = MEDICATION_DIRECTION_QUICK_PICKS_GENERIC;

function normalizeDirectionQuickPickRouteToken(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/[._-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Resolve structured route for direction quick-picks (M1.8B.7J.6A).
 * Uses shared catalog normalization first, then IVPB display-label aliases.
 * Plain IV / intravenous without piggyback semantics stays unresolved (generic quick-picks).
 */
export function resolveMedicationDirectionQuickPickRoute(
  route?: MedicationRoute | string | null
): MedicationOrderRoute | null {
  if (route == null) return null;
  const raw = String(route).trim();
  if (!raw) return null;

  const structured = normalizeMedicationRoute(raw);
  if (structured) return structured;

  const token = normalizeDirectionQuickPickRouteToken(raw);
  if (!token) return null;

  if (
    token === "IVPB" ||
    token === "IV PIGGYBACK" ||
    token === "IV PIGGY BACK" ||
    token === "PIGGYBACK" ||
    token === "INTRAVENOUS PIGGYBACK" ||
    token.includes("PIGGYBACK")
  ) {
    return "IVPB";
  }

  return null;
}

/**
 * Route-aware direction datalist suggestions for medication order entry (M1.8B.7J.6).
 * Does not mutate user-entered directions; suggestions only.
 */
/** Fluid-aware direction quick-picks when route + label indicate IV solution (K.10B.4). */
export function medicationDirectionQuickPicksForMedicationLine(input: {
  route?: MedicationRoute | string | null;
  catalogRoute?: string | null;
  label?: string | null;
  therapeuticClass?: string | null;
}): readonly string[] {
  const routeToken = input.route?.trim() || input.catalogRoute?.trim() || null;
  const clinicalPicks = medicationDirectionQuickPicksForClinicalLabel(routeToken, input.label);
  if (clinicalPicks) return clinicalPicks;
  const fluidPicks = medicationDirectionQuickPicksForIvFluid(
    routeToken,
    input.label,
    input.therapeuticClass
  );
  if (fluidPicks) return fluidPicks;
  const routePicks = medicationDirectionQuickPicksForRoute(input.route ?? input.catalogRoute);
  const prnPicks = medicationDirectionQuickPicksForPrnCategory(input.label, input.therapeuticClass);
  if (prnPicks?.length) {
    return dedupeDirectionQuickPicks(routePicks, prnPicks);
  }
  return routePicks;
}

export function medicationDirectionQuickPicksForRoute(
  route?: MedicationRoute | string | null
): readonly string[] {
  const routeToken = normalizeDirectionQuickPickRouteToken(String(route ?? ""));
  if (routeToken === "IO" || routeToken === "INTRAOSSEOUS" || routeToken === "INTRA OSSEOUS") {
    return MEDICATION_DIRECTION_QUICK_PICKS_IO;
  }
  switch (resolveMedicationDirectionQuickPickRoute(route)) {
    case "PO":
      return MEDICATION_DIRECTION_QUICK_PICKS_PO;
    case "IVPB":
      return MEDICATION_DIRECTION_QUICK_PICKS_IVPB;
    case "IVP":
      return MEDICATION_DIRECTION_QUICK_PICKS_IVP;
    case "IM":
      return MEDICATION_DIRECTION_QUICK_PICKS_IM;
    case "SQ":
      return MEDICATION_DIRECTION_QUICK_PICKS_SQ;
    default:
      return MEDICATION_DIRECTION_QUICK_PICKS_GENERIC;
  }
}

/** Apply facility-TZ planned administration when adding a medication line (K.10B.6). */
export function prepareMedicationOrderLinePlannedAdmin(
  line: CreateOrderLineItem,
  facilityTimeZone?: string | null,
  now = new Date()
): CreateOrderLineItem {
  if (line.catalogItemType !== "MEDICATION") return line;
  return applyDefaultPlannedAdministrationIfNeeded(line, facilityTimeZone, now);
}

export function isAdministerToPatientIntent(
  intent: CreateOrderLineItem["medicationFulfillmentIntent"] | undefined
): boolean {
  return (intent ?? "PHARMACY_DISPENSE") === "ADMINISTER_CHART";
}

/** @deprecated Use facility TZ via {@link defaultPlannedAdministrationLocal} — browser-local only for artifact detection. */
export function toDatetimeLocalValue(d: Date): string {
  const x = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return x.toISOString().slice(0, 16);
}

export function defaultPlannedAdministrationLocal(
  facilityTimeZone?: string | null,
  now = new Date()
): string {
  const tz = facilityTimeZone?.trim();
  if (!tz) return "";
  return clinicalDatetimeLocalFromInstant(now, tz);
}

/** Force-refresh untouched planned admin when facility timezone becomes available (K.10B.4). */
export function refreshUntouchedPlannedAdministrationLocal(
  item: CreateOrderLineItem,
  facilityTimeZone: string,
  now = new Date()
): CreateOrderLineItem {
  if (!isAdministerToPatientIntent(item.medicationFulfillmentIntent)) return item;
  const tz = facilityTimeZone.trim();
  if (!tz) return item;
  if (
    !shouldReplaceUntouchedPlannedAdminLocal({
      localValue: item.intendedAdministrationAt,
      plannedAdminAtTouched: item._plannedAdminAtTouched,
      facilityTimeZone: tz,
      now,
    })
  ) {
    return item;
  }
  return {
    ...item,
    intendedAdministrationAt: defaultPlannedAdministrationLocal(tz, now),
  };
}

export function applyDefaultPlannedAdministrationIfNeeded(
  item: CreateOrderLineItem,
  facilityTimeZone?: string | null,
  now = new Date()
): CreateOrderLineItem {
  if (!isAdministerToPatientIntent(item.medicationFulfillmentIntent)) return item;
  const tz = facilityTimeZone?.trim();
  if (!tz) return item;
  if (
    !shouldReplaceUntouchedPlannedAdminLocal({
      localValue: item.intendedAdministrationAt,
      plannedAdminAtTouched: item._plannedAdminAtTouched,
      facilityTimeZone: tz,
      now,
    })
  ) {
    return item;
  }
  const planned = defaultPlannedAdministrationLocal(tz, now);
  if (!planned) return item;
  return { ...item, intendedAdministrationAt: planned };
}

export function patchMedicationLineWithPlannedAdminRules(
  item: CreateOrderLineItem,
  patch: Partial<CreateOrderLineItem>,
  facilityTimeZone?: string | null,
  now = new Date()
): CreateOrderLineItem {
  const merged: CreateOrderLineItem = { ...item, ...patch };

  if ("intendedAdministrationAt" in patch) {
    merged._plannedAdminAtTouched = true;
  }

  if ("medicationFulfillmentIntent" in patch) {
    if (patch.medicationFulfillmentIntent === "PHARMACY_DISPENSE") {
      return {
        ...merged,
        intendedAdministrationAt: undefined,
        _plannedAdminAtTouched: false,
      };
    }
    if (patch.medicationFulfillmentIntent === "ADMINISTER_CHART") {
      return applyDefaultPlannedAdministrationIfNeeded(
        { ...merged, _plannedAdminAtTouched: merged._plannedAdminAtTouched ?? false },
        facilityTimeZone,
        now
      );
    }
  }

  return applyDefaultPlannedAdministrationIfNeeded(merged, facilityTimeZone, now);
}

/**
 * UTC intendedAdministrationAt for order submit (K.10B.3).
 * Omits auto-default planned time for untouched NOW/STAT so MAR anchors to createdAt.
 */
export function resolveMedicationOrderItemIntendedUtcForSubmit(input: {
  intendedAdministrationAtLocal?: string | null;
  plannedAdminAtTouched?: boolean;
  frequencyCode?: string | null;
  directionsSig?: string | null;
  facilityTimeZone?: string | null;
}): Date | undefined {
  const raw = input.intendedAdministrationAtLocal?.trim();
  if (!raw) return undefined;
  const resolvedFrequency = resolveMedicationOrderItemFrequencyCode({
    frequencyCode: input.frequencyCode,
    directionsSig: input.directionsSig,
  });
  const parsed = parseMedicationFrequencyCode(resolvedFrequency);
  if ((parsed === "NOW" || parsed === "STAT") && !input.plannedAdminAtTouched) {
    return undefined;
  }
  const tz = input.facilityTimeZone?.trim();
  if (!tz) return undefined;
  const date = clinicalDatetimeLocalToUtcDate(raw, tz);
  return date ?? undefined;
}

export type OrderDraftMedicationStrippable = {
  stagedItems: Record<OrderDraftTypeKey, CreateOrderLineItem[]>;
  formData: { type: OrderDraftTypeKey; items: CreateOrderLineItem[] };
};

/** M1.7B.6 — medication lines must not survive cross-session local draft restore. */
export function stripMedicationFromOrderDraftPayload<T extends OrderDraftMedicationStrippable>(
  payload: T
): T {
  return {
    ...payload,
    stagedItems: { ...payload.stagedItems, MEDICATION: [] },
    formData:
      payload.formData.type === "MEDICATION"
        ? { ...payload.formData, items: [] }
        : payload.formData,
  };
}

export function emptyMedicationStagedItems(): Record<OrderDraftTypeKey, CreateOrderLineItem[]> {
  return { LAB: [], IMAGING: [], MEDICATION: [], CARE: [] };
}
