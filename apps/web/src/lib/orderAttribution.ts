import type { SupportedLanguage } from "@/i18n/config";
import {
  orderAttributionActionForOrderType,
  orderAttributionLabelKey,
  orderCreatorMustNotDisplayAsPerformer,
  type OrderAttributionActionKind,
} from "@medora/shared";

export type OrderAttributionDisplay = {
  userId?: string | null;
  name?: string | null;
  role?: string | null;
  at?: string | Date | null;
};

export type OrderLastActionDisplay = OrderAttributionDisplay & {
  action?: string | null;
};

export type OrderAttributionCarrier = {
  createdAt?: string | Date | null;
  createdByDisplay?: OrderAttributionDisplay | null;
  lastActionDisplay?: OrderLastActionDisplay | null;
};

function fillTemplate(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce((out, [key, value]) => out.split(`{${key}}`).join(value), template);
}

function dateLocale(language?: SupportedLanguage): string | undefined {
  if (language === "en") return "en-US";
  if (language === "fr") return "fr-FR";
  return undefined;
}

function formatDateTime(value: string | Date | null | undefined, language?: SupportedLanguage): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(dateLocale(language));
}

function displayRole(role: string | null | undefined): string {
  const trimmed = role?.trim();
  return trimmed ? `, ${trimmed}` : "";
}

function displayName(name: string | null | undefined, t: (key: string) => string): string {
  const trimmed = name?.trim();
  return trimmed || t("attribution.unknownUser");
}

function actionKey(action: string | null | undefined, orderType?: string | null): string {
  const kind = orderAttributionActionForOrderType(action, orderType);
  if (kind) return orderAttributionLabelKey(kind);
  return "attribution.actionBy";
}

function sameActionAsCreate(
  createdBy: OrderAttributionDisplay | null | undefined,
  action: OrderLastActionDisplay | null | undefined
): boolean {
  if (!createdBy || !action) return false;
  if ((action.action ?? "").trim().toUpperCase() !== "CREATED") return false;
  return (
    (createdBy.name ?? "").trim() === (action.name ?? "").trim() &&
    String(createdBy.at ?? "") === String(action.at ?? "")
  );
}

export function formatOrderAttributionLines(
  input: unknown,
  t: (key: string) => string,
  language?: SupportedLanguage,
  orderType?: string | null
): string[] {
  if (!input || typeof input !== "object") return [];
  const order = input as OrderAttributionCarrier;
  const typeFromOrder =
    orderType ??
    (typeof (order as { type?: string }).type === "string" ? (order as { type: string }).type : null);

  const lines: string[] = [];
  const createdBy = order.createdByDisplay;
  const createdAt = createdBy?.at ?? order.createdAt ?? null;
  const createdAtText = formatDateTime(createdAt, language);
  if (createdBy || createdAtText) {
    lines.push(
      fillTemplate(t("attribution.orderedBy"), {
        name: displayName(createdBy?.name, t),
        role: displayRole(createdBy?.role),
        datetime: createdAtText,
      })
    );
  }

  const lastAction = order.lastActionDisplay;
  if (lastAction && !sameActionAsCreate(createdBy, lastAction)) {
    const action = (lastAction.action ?? "").trim().toUpperCase();
    if (action && action !== "CREATED") {
      lines.push(
        fillTemplate(t(actionKey(action, typeFromOrder)), {
          name: displayName(lastAction.name, t),
          role: displayRole(lastAction.role),
          datetime: formatDateTime(lastAction.at, language),
        })
      );
    }
  }

  return lines.filter((line) => line.trim().length > 0);
}

export function formatOrderAttribution(
  order: unknown,
  t: (key: string) => string,
  language?: SupportedLanguage
): string {
  return formatOrderAttributionLines(order, t, language).join(" · ");
}

function namesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  return orderCreatorMustNotDisplayAsPerformer({ creatorName: a, actorName: b });
}

type ErOrderEventAttributionInput = {
  eventType?: string | null;
  performedByDisplayName?: string | null;
  roleSnapshot?: string | null;
  performedAt?: string | null;
};

function lineForActionKind(
  lines: string[],
  kind: OrderAttributionActionKind,
  t: (key: string) => string
): string | undefined {
  const prefix = t(orderAttributionLabelKey(kind)).split("{")[0]?.trim() ?? "";
  if (!prefix) return undefined;
  return lines.find((line) => line.startsWith(prefix));
}

/**
 * ER orders table (completed / cancelled): Ordered by vs Performed/Acknowledged/Cancelled by — never conflate creator with performer.
 */
export function formatErOrderEventAttributionCell(
  order: unknown,
  orderEvent: ErOrderEventAttributionInput | null,
  t: (key: string) => string,
  language?: SupportedLanguage
): string {
  const orderType =
    order && typeof order === "object" && typeof (order as { type?: string }).type === "string"
      ? (order as { type: string }).type
      : null;
  const lines = formatOrderAttributionLines(order, t, language, orderType);
  const eventType = (orderEvent?.eventType ?? "").trim().toUpperCase();

  if (eventType === "CANCELLED") {
    const cancelledLine = lineForActionKind(lines, "CANCELLED", t);
    if (cancelledLine) return cancelledLine;
    const createdBy =
      order && typeof order === "object"
        ? ((order as OrderAttributionCarrier).createdByDisplay?.name ?? null)
        : null;
    const eventName = orderEvent?.performedByDisplayName?.trim() || null;
    if (eventName && !namesMatch(eventName, createdBy)) {
      return fillTemplate(t("attribution.cancelledBy"), {
        name: displayName(eventName, t),
        role: displayRole(orderEvent?.roleSnapshot),
        datetime: formatDateTime(orderEvent?.performedAt, language),
      });
    }
    return t("attribution.performedByUnset");
  }

  const performerLine =
    lineForActionKind(lines, "PERFORMED", t) ??
    lineForActionKind(lines, "RESULTED", t) ??
    lineForActionKind(lines, "ACKNOWLEDGED", t);
  if (performerLine) return performerLine;

  const createdBy =
    order && typeof order === "object"
      ? ((order as OrderAttributionCarrier).createdByDisplay?.name ?? null)
      : null;
  const eventName = orderEvent?.performedByDisplayName?.trim() || null;
  if (eventType === "COMPLETED" && eventName && !namesMatch(eventName, createdBy)) {
    const kind = orderAttributionActionForOrderType("COMPLETED", orderType) ?? "PERFORMED";
    return fillTemplate(t(orderAttributionLabelKey(kind)), {
      name: displayName(eventName, t),
      role: displayRole(orderEvent?.roleSnapshot),
      datetime: formatDateTime(orderEvent?.performedAt, language),
    });
  }

  return t("attribution.performedByUnset");
}
