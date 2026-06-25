import {
  parseInjectionSiteFromMarNotes,
  sanitizeMarAdministrationVisibleNote,
  parseMarMedicationResponseNotes,
  sortMarMedicationResponsesNewestFirst,
  type ParsedMarMedicationResponse,
} from "@medora/shared";
import type { SupportedLanguage } from "@/i18n/config";
import { formatEncounterChromeDateTime } from "@/lib/encounterChromeI18n";
import { getOrderItemDisplayLabelForLanguage } from "@/lib/orderItemDisplayFr";

export type ErEdSummaryMedicationOrderRow = {
  id: string;
  medicationName: string;
  dose: string;
  route: string;
  instructions: string;
  orderedBy: string;
  orderedAt: string;
  status: string;
};

export type ErEdSummaryMarEventRow = {
  id: string;
  medicationName: string;
  action: string;
  dose: string;
  route: string;
  injectionSite: string;
  administeredBy: string;
  administeredAt: string;
  notes: string;
};

export type ErEdSummaryMedicationResponseRow = {
  id: string;
  medicationName: string;
  dose: string;
  route: string;
  administeredAt: string;
  response: ParsedMarMedicationResponse;
};

function readStr(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function formatWhen(iso: string | null | undefined, language: SupportedLanguage): string {
  if (!iso?.trim()) return "—";
  try {
    return formatEncounterChromeDateTime(iso, language);
  } catch {
    return iso;
  }
}

function actorName(firstName?: string | null, lastName?: string | null): string {
  const name = `${firstName ?? ""} ${lastName ?? ""}`.trim();
  return name || "—";
}

function medicationOrderItemLabel(
  item: Record<string, unknown>,
  language: SupportedLanguage,
  t: (key: string) => string
): string {
  return getOrderItemDisplayLabelForLanguage(
    item as Parameters<typeof getOrderItemDisplayLabelForLanguage>[0],
    language,
    t
  );
}

export function buildErEdSummaryMedicationOrderRows(input: {
  orders: unknown[];
  language: SupportedLanguage;
  t: (key: string) => string;
}): ErEdSummaryMedicationOrderRow[] {
  const rows: ErEdSummaryMedicationOrderRow[] = [];
  for (const orderRaw of input.orders) {
    if (!orderRaw || typeof orderRaw !== "object" || Array.isArray(orderRaw)) continue;
    const order = orderRaw as Record<string, unknown>;
    const items = Array.isArray(order.items) ? order.items : [];
    const orderedAt = readStr(order.createdAt);
    const orderedByUser = order.createdByUser;
    const orderedBy =
      orderedByUser && typeof orderedByUser === "object" && !Array.isArray(orderedByUser)
        ? actorName(
            (orderedByUser as { firstName?: string | null }).firstName,
            (orderedByUser as { lastName?: string | null }).lastName
          )
        : readStr(order.createdByDisplayName) || "—";
    for (const itemRaw of items) {
      if (!itemRaw || typeof itemRaw !== "object" || Array.isArray(itemRaw)) continue;
      const item = itemRaw as Record<string, unknown>;
      if (readStr(item.catalogItemType) !== "MEDICATION") continue;
      const id = readStr(item.id);
      if (!id) continue;
      const doseParts = [readStr(item.doseValue), readStr(item.doseUnit)].filter(Boolean);
      const strength = readStr(item.strength);
      const dose = doseParts.length > 0 ? doseParts.join(" ") : strength || "—";
      const route = readStr(item.route) || readStr((item.catalogMedication as { route?: string } | undefined)?.route) || "—";
      rows.push({
        id,
        medicationName: medicationOrderItemLabel(item, input.language, input.t),
        dose,
        route,
        instructions: readStr(item.notes) || "—",
        orderedBy,
        orderedAt: formatWhen(orderedAt, input.language),
        status: readStr(item.status) || readStr(item.lifecycleState) || "—",
      });
    }
  }
  return rows;
}

export function buildErEdSummaryMarEventRows(input: {
  admins: unknown[];
  language: SupportedLanguage;
  t: (key: string) => string;
}): ErEdSummaryMarEventRow[] {
  const rows: ErEdSummaryMarEventRow[] = [];
  for (const adminRaw of input.admins) {
    if (!adminRaw || typeof adminRaw !== "object" || Array.isArray(adminRaw)) continue;
    const admin = adminRaw as Record<string, unknown>;
    const id = readStr(admin.id);
    if (!id) continue;
    const marAction = readStr(admin.marAction) || "administered";
    const actionKey = `marTab.actions.${marAction}`;
    const action = input.t(actionKey) !== actionKey ? input.t(actionKey) : marAction;
    const doseParts = [readStr(admin.doseValue), readStr(admin.doseUnit)].filter(Boolean);
    const administeredQuantity =
      admin.administeredQuantity != null && admin.administeredQuantity !== ""
        ? String(admin.administeredQuantity)
        : "";
    const dose = doseParts.length > 0 ? doseParts.join(" ") : administeredQuantity || "—";
    const route = readStr(admin.route) || "—";
    const notesRaw = readStr(admin.notes);
    const notes = sanitizeMarAdministrationVisibleNote(
      notesRaw,
      input.language === "fr" ? "fr" : "en"
    );
    const injectionSiteId = parseInjectionSiteFromMarNotes(notesRaw);
    const injectionSite = injectionSiteId ? input.t(`marTab.injectionSites.${injectionSiteId}`) : "—";
    const administeredByUser = admin.administeredBy;
    const administeredBy =
      administeredByUser && typeof administeredByUser === "object" && !Array.isArray(administeredByUser)
        ? actorName(
            (administeredByUser as { firstName?: string | null }).firstName,
            (administeredByUser as { lastName?: string | null }).lastName
          )
        : readStr(admin.administeredByDisplayFr) || "—";
    rows.push({
      id,
      medicationName: readStr(admin.medicationLabelSnapshot) || "—",
      action,
      dose,
      route,
      injectionSite,
      administeredBy,
      administeredAt: formatWhen(readStr(admin.administeredAt), input.language),
      notes: notes || "—",
    });
  }
  return rows;
}

function readMedicationResponsesFromAdmin(admin: Record<string, unknown>): ParsedMarMedicationResponse[] {
  const embedded = admin.medicationResponses;
  if (Array.isArray(embedded) && embedded.length > 0) {
    return embedded as ParsedMarMedicationResponse[];
  }
  return parseMarMedicationResponseNotes(readStr(admin.notes));
}

export function buildErEdSummaryMedicationResponseRows(input: {
  admins: unknown[];
  language: SupportedLanguage;
}): ErEdSummaryMedicationResponseRow[] {
  const rows: ErEdSummaryMedicationResponseRow[] = [];
  const seen = new Set<string>();

  for (const adminRaw of input.admins) {
    if (!adminRaw || typeof adminRaw !== "object" || Array.isArray(adminRaw)) continue;
    const admin = adminRaw as Record<string, unknown>;
    const adminId = readStr(admin.id);
    if (!adminId) continue;

    const medicationName = readStr(admin.medicationLabelSnapshot) || "—";
    const doseParts = [readStr(admin.doseValue), readStr(admin.doseUnit)].filter(Boolean);
    const administeredQuantity =
      admin.administeredQuantity != null && admin.administeredQuantity !== ""
        ? String(admin.administeredQuantity)
        : "";
    const dose = doseParts.length > 0 ? doseParts.join(" ") : administeredQuantity || "—";
    const route = readStr(admin.route) || "—";
    const administeredAt = formatWhen(readStr(admin.administeredAt), input.language);

    const responses = sortMarMedicationResponsesNewestFirst(readMedicationResponsesFromAdmin(admin));
    for (const response of responses) {
      const dedupeKey = `${adminId}:${response.documentedAt}:${response.responseCode}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      rows.push({
        id: `${adminId}:response:${response.documentedAt}`,
        medicationName,
        dose,
        route,
        administeredAt,
        response,
      });
    }
  }

  return rows.sort(
    (a, b) =>
      new Date(b.response.documentedAt).getTime() - new Date(a.response.documentedAt).getTime()
  );
}
