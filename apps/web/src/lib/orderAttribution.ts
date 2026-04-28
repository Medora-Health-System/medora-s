import type { SupportedLanguage } from "@/i18n/config";

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

function actionKey(action: string | null | undefined): string {
  switch ((action ?? "").trim().toUpperCase()) {
    case "CANCELLED":
      return "attribution.cancelledBy";
    case "COMPLETED":
    case "ADMINISTERED":
    case "RESULTED":
      return "attribution.completedBy";
    case "ACKNOWLEDGED":
      return "attribution.acknowledgedBy";
    default:
      return "attribution.actionBy";
  }
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
  language?: SupportedLanguage
): string[] {
  if (!input || typeof input !== "object") return [];
  const order = input as OrderAttributionCarrier;

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
        fillTemplate(t(actionKey(action)), {
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
