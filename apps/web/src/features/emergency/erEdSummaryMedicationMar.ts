import {
  parseInjectionSiteFromMarNotes,
  sanitizeMarAdministrationVisibleNote,
  parseMarMedicationResponseNotes,
  parseRespiratoryMedicationResponseNotes,
  sortMarMedicationResponsesNewestFirst,
  sortRespiratoryMedicationResponsesNewestFirst,
  buildMedicationInfusionEncounterSummaryRows,
  resolveMedicationInfusionEncounterSummaryStatusLabel,
  resolveMedicationInfusionStopReasonSummaryLabel,
  extractMedicationOrderLifecycleInputFromItem,
  resolveMedicationOrderLifecycleDisplay,
  type ParsedMarMedicationResponse,
  type ParsedRespiratoryMedicationResponse,
  type MedicationInfusionEncounterSummaryRow,
} from "@medora/shared";
import { resolveProductUiLanguageOrDefault, type SupportedLanguage } from "@/i18n/config";
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
  lifecycleStatus?: string | null;
  lifecycleStatusLabel?: string | null;
  lifecycleEffectiveAt?: string | null;
  lifecycleReason?: string | null;
  lifecycleNote?: string | null;
  lifecycleProvider?: string | null;
  replacesOrderItemId?: string | null;
  replacementOrderItemId?: string | null;
  previousDoseSummary?: string | null;
  newDoseSummary?: string | null;
  lifecycleSummaryLine?: string | null;
  lifecycleGovernanceDeferred?: boolean;
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
  responseKind: "pain" | "respiratory";
  response: ParsedMarMedicationResponse | ParsedRespiratoryMedicationResponse;
};

export type ErEdSummaryContinuousInfusionRow = {
  id: string;
  medicationName: string;
  statusLabel: string;
  startedAt: string;
  stoppedAt: string;
  duration: string;
  currentRate: string;
  finalRate: string;
  highestRate: string;
  bagChanges: string;
  pumpChanges: string;
  lineChanges: string;
  pauseRestart: string;
  stopReason: string;
  documentedBy: string;
  timeline: Array<{ label: string; detail: string; at: string; by: string }>;
};

function formatDurationMinutes(minutes: number | null, t: (key: string) => string): string {
  if (minutes == null || !Number.isFinite(minutes) || minutes < 0) return "—";
  if (minutes < 60) return t("emergencyVisitSummaryPanel.infusionDurationMinutes").replace("{minutes}", String(minutes));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return t("emergencyVisitSummaryPanel.infusionDurationHours")
    .replace("{hours}", String(h))
    .replace("{minutes}", String(m));
}

function dash(value: string | null | undefined): string {
  return value?.trim() ? value.trim() : "—";
}

function indexOrderEventsByOrderId(orderEvents: unknown[]): Map<string, Array<{ metadata: unknown }>> {
  const map = new Map<string, Array<{ metadata: unknown }>>();
  for (const raw of orderEvents) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const ev = raw as Record<string, unknown>;
    const orderId = readStr(ev.orderId);
    if (!orderId) continue;
    const list = map.get(orderId) ?? [];
    list.push({ metadata: ev.metadata });
    map.set(orderId, list);
  }
  return map;
}

function collectMedicationOrderItemsForInfusionSummary(input: {
  orders: unknown[];
  language: SupportedLanguage;
  t: (key: string) => string;
}): Array<{ orderItemId: string; orderId: string; medicationLabel: string }> {
  const items: Array<{ orderItemId: string; orderId: string; medicationLabel: string }> = [];
  for (const orderRaw of input.orders) {
    if (!orderRaw || typeof orderRaw !== "object" || Array.isArray(orderRaw)) continue;
    const order = orderRaw as Record<string, unknown>;
    const orderId = readStr(order.id);
    if (!orderId) continue;
    const orderItems = Array.isArray(order.items) ? order.items : [];
    for (const itemRaw of orderItems) {
      if (!itemRaw || typeof itemRaw !== "object" || Array.isArray(itemRaw)) continue;
      const item = itemRaw as Record<string, unknown>;
      if (readStr(item.catalogItemType) !== "MEDICATION") continue;
      const orderItemId = readStr(item.id);
      if (!orderItemId) continue;
      items.push({
        orderItemId,
        orderId,
        medicationLabel: medicationOrderItemLabel(item, input.language, input.t),
      });
    }
  }
  return items;
}

export function buildErEdSummaryContinuousInfusionRows(input: {
  orders: unknown[];
  orderEvents: unknown[];
  language: SupportedLanguage;
  t: (key: string) => string;
}): ErEdSummaryContinuousInfusionRow[] {
  const locale = resolveProductUiLanguageOrDefault(input.language);
  const orderItems = collectMedicationOrderItemsForInfusionSummary(input);
  const eventsByOrderId = indexOrderEventsByOrderId(input.orderEvents);
  const summaryRows = buildMedicationInfusionEncounterSummaryRows({
    orderItems,
    eventsByOrderId,
    locale,
  });

  return summaryRows.map((row) => mapInfusionSummaryRowForDisplay(row, input.language, input.t));
}

export function mapInfusionSummaryRowForDisplay(
  row: MedicationInfusionEncounterSummaryRow,
  language: SupportedLanguage,
  t: (key: string) => string
): ErEdSummaryContinuousInfusionRow {
  const locale = resolveProductUiLanguageOrDefault(language);
  const statusLabel = resolveMedicationInfusionEncounterSummaryStatusLabel(row.status, locale);
  const stopReasonLabel =
    resolveMedicationInfusionStopReasonSummaryLabel(row.stopReason, locale) ?? "—";

  return {
    id: row.orderItemId,
    medicationName: row.medicationLabel,
    statusLabel,
    startedAt: formatWhen(row.startedAt, language),
    stoppedAt: formatWhen(row.stoppedAt, language),
    duration: formatDurationMinutes(row.totalRuntimeMinutes, t),
    currentRate: dash(row.currentRate),
    finalRate: dash(row.finalRate),
    highestRate: dash(row.highestRate),
    bagChanges: String(row.bagChangeCount),
    pumpChanges: String(row.pumpChangeCount),
    lineChanges: String(row.lineChangeCount),
    pauseRestart: String(row.pauseCount + row.restartCount),
    stopReason: stopReasonLabel,
    documentedBy: dash(row.documentedBy),
    timeline: row.timelineRows.map((event) => {
      const resolvedReason =
        event.reason != null
          ? resolveMedicationInfusionStopReasonSummaryLabel(event.reason, locale) ?? event.reason
          : null;
      return {
        label: event.label,
        detail:
          [event.newValue, event.detail, resolvedReason].filter(Boolean).join(" · ") || "—",
        at: formatWhen(event.eventAt, language),
        by: dash(event.documentedBy),
      };
    }),
  };
}

/** Shared HTML block for print packet and chart live preview. */
export function renderErEdSummaryContinuousInfusionHtml(input: {
  rows: ErEdSummaryContinuousInfusionRow[];
  language: SupportedLanguage;
  t: (key: string) => string;
}): string {
  if (input.rows.length === 0) return "";
  const esc = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  const title = esc(input.t("emergencyVisitSummaryPanel.continuousInfusionsTitle"));
  const blocks = input.rows
    .map((row) => {
      const timeline =
        row.timeline.length > 0
          ? `<ul style="margin:4px 0 0 0;padding-left:18px;">${row.timeline
              .map(
                (ev) =>
                  `<li><strong>${esc(ev.label)}</strong>${ev.detail !== "—" ? ` · ${esc(ev.detail)}` : ""}<div style="font-size:11px;color:#475569;">${esc(ev.at)}${ev.by !== "—" ? ` · ${esc(ev.by)}` : ""}</div></li>`
              )
              .join("")}</ul>`
          : "";
      return `<div style="margin:8px 0 12px 0;border-top:1px solid #f1f5f9;padding-top:8px;">
        <strong>${esc(row.medicationName)}</strong> — ${esc(row.statusLabel)}
        <div>${esc(input.t("emergencyVisitSummaryPanel.infusionStartedAt"))}: ${esc(row.startedAt)}</div>
        <div>${esc(input.t("emergencyVisitSummaryPanel.infusionStoppedAt"))}: ${esc(row.stoppedAt)}</div>
        <div>${esc(input.t("emergencyVisitSummaryPanel.infusionDuration"))}: ${esc(row.duration)}</div>
        <div>${esc(input.t("emergencyVisitSummaryPanel.infusionFinalRate"))}: ${esc(row.finalRate)} · ${esc(input.t("emergencyVisitSummaryPanel.infusionHighestRate"))}: ${esc(row.highestRate)}</div>
        <div>${esc(input.t("emergencyVisitSummaryPanel.infusionBagChanges"))}: ${esc(row.bagChanges)} · ${esc(input.t("emergencyVisitSummaryPanel.infusionPumpChanges"))}: ${esc(row.pumpChanges)} · ${esc(input.t("emergencyVisitSummaryPanel.infusionLineChanges"))}: ${esc(row.lineChanges)} · ${esc(input.t("emergencyVisitSummaryPanel.infusionPauseRestart"))}: ${esc(row.pauseRestart)}</div>
        <div>${esc(input.t("emergencyVisitSummaryPanel.infusionStopReason"))}: ${esc(row.stopReason)} · ${esc(input.t("emergencyVisitSummaryPanel.infusionDocumentedBy"))}: ${esc(row.documentedBy)}</div>
        ${timeline}
      </div>`;
    })
    .join("");
  return `<h3 style="font-size:13px;margin:12px 0 6px 0;font-weight:700;">${title}</h3>${blocks}`;
}

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
      const lifecycleInput = extractMedicationOrderLifecycleInputFromItem(item, input.orders);
      const lifecycleDisplay = resolveMedicationOrderLifecycleDisplay(lifecycleInput);
      const lifecycleStatusLabel = lifecycleDisplay.showLifecycleBadge
        ? input.t(`medicationOrderLifecycle.status.${lifecycleDisplay.status}`)
        : null;
      const lifecycleEffectiveAt = lifecycleDisplay.effectiveAtIso
        ? formatWhen(lifecycleDisplay.effectiveAtIso, input.language)
        : null;
      const lifecycleSummaryParts: string[] = [];
      if (lifecycleDisplay.showLifecycleBadge && lifecycleStatusLabel) {
        lifecycleSummaryParts.push(
          `${input.t("medicationOrderLifecycle.summary.status")}: ${lifecycleStatusLabel}`
        );
      }
      if (lifecycleDisplay.reason) {
        lifecycleSummaryParts.push(
          `${input.t("medicationOrderLifecycle.summary.reason")}: ${lifecycleDisplay.reason}`
        );
      }
      if (lifecycleEffectiveAt) {
        lifecycleSummaryParts.push(
          `${input.t("medicationOrderLifecycle.summary.effectiveAt")}: ${lifecycleEffectiveAt}`
        );
      }
      if (lifecycleDisplay.providerDisplay) {
        lifecycleSummaryParts.push(
          `${input.t("medicationOrderLifecycle.summary.provider")}: ${lifecycleDisplay.providerDisplay}`
        );
      }
      if (lifecycleDisplay.previousDoseSummary && lifecycleDisplay.status === "SUPERSEDED") {
        lifecycleSummaryParts.push(
          `${input.t("medicationOrderLifecycle.summary.previousDose")}: ${lifecycleDisplay.previousDoseSummary}`
        );
      }
      if (lifecycleDisplay.doseSummary && lifecycleDisplay.replacesOrderItemId) {
        lifecycleSummaryParts.push(
          `${input.t("medicationOrderLifecycle.summary.newDose")}: ${lifecycleDisplay.doseSummary}`
        );
      }
      if (lifecycleDisplay.isGovernanceDeferred) {
        lifecycleSummaryParts.push(input.t("medicationOrderLifecycle.summary.governanceDeferred"));
      }
      rows.push({
        id,
        medicationName: medicationOrderItemLabel(item, input.language, input.t),
        dose,
        route,
        instructions: readStr(item.notes) || "—",
        orderedBy,
        orderedAt: formatWhen(orderedAt, input.language),
        status:
          lifecycleStatusLabel ??
          (readStr(item.status) || readStr(item.lifecycleState) || "—"),
        lifecycleStatus: lifecycleDisplay.showLifecycleBadge ? lifecycleDisplay.status : null,
        lifecycleStatusLabel,
        lifecycleEffectiveAt,
        lifecycleReason: lifecycleDisplay.reason,
        lifecycleNote: lifecycleDisplay.note,
        lifecycleProvider: lifecycleDisplay.providerDisplay,
        replacesOrderItemId: lifecycleDisplay.replacesOrderItemId,
        replacementOrderItemId: lifecycleDisplay.replacementOrderItemId,
        previousDoseSummary: lifecycleDisplay.previousDoseSummary,
        newDoseSummary: lifecycleDisplay.replacesOrderItemId ? lifecycleDisplay.doseSummary : null,
        lifecycleSummaryLine: lifecycleSummaryParts.length > 0 ? lifecycleSummaryParts.join(" · ") : null,
        lifecycleGovernanceDeferred: lifecycleDisplay.isGovernanceDeferred,
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
      input.language
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

function readRespiratoryMedicationResponsesFromAdmin(
  admin: Record<string, unknown>
): ParsedRespiratoryMedicationResponse[] {
  const embedded = admin.respiratoryMedicationResponses;
  if (Array.isArray(embedded) && embedded.length > 0) {
    return embedded as ParsedRespiratoryMedicationResponse[];
  }
  return parseRespiratoryMedicationResponseNotes(readStr(admin.notes));
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

    const painResponses = sortMarMedicationResponsesNewestFirst(readMedicationResponsesFromAdmin(admin));
    for (const response of painResponses) {
      const dedupeKey = `${adminId}:pain:${response.documentedAt}:${response.responseCode}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      rows.push({
        id: `${adminId}:response:${response.documentedAt}`,
        medicationName,
        dose,
        route,
        administeredAt,
        responseKind: "pain",
        response,
      });
    }

    const respiratoryResponses = sortRespiratoryMedicationResponsesNewestFirst(
      readRespiratoryMedicationResponsesFromAdmin(admin)
    );
    for (const response of respiratoryResponses) {
      const dedupeKey = `${adminId}:respiratory:${response.documentedAt}:${response.responseCode}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      rows.push({
        id: `${adminId}:respiratory-response:${response.documentedAt}`,
        medicationName,
        dose,
        route,
        administeredAt,
        responseKind: "respiratory",
        response,
      });
    }
  }

  return rows.sort(
    (a, b) =>
      new Date(b.response.documentedAt).getTime() - new Date(a.response.documentedAt).getTime()
  );
}
