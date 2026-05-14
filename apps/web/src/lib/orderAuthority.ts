import { OBSERVATION_ORDER_TEMPLATE_ID } from "@medora/shared";

export type OrderAuthoritySource = "PROVIDER_ORDER" | "VERBAL_ORDER" | "NURSING_PROTOCOL" | "PROTOCOL" | "PATHWAY";

export type OrderAuthority = {
  source?: OrderAuthoritySource | string | null;
  readbackConfirmed?: boolean | null;
  protocolName?: string | null;
};

export type OrderAuthorityCarrier = {
  source?: OrderAuthoritySource | string | null;
  authority?: OrderAuthority | null;
};

function authorityFrom(input: OrderAuthority | OrderAuthorityCarrier | null | undefined): OrderAuthority {
  if (!input || typeof input !== "object") return { source: null };
  const maybeCarrier = input as OrderAuthorityCarrier;
  if (maybeCarrier.authority && typeof maybeCarrier.authority === "object") {
    return maybeCarrier.authority;
  }
  return input as OrderAuthority;
}

export function formatOrderAuthorityLines(
  input: OrderAuthority | OrderAuthorityCarrier | null | undefined,
  t: (key: string) => string
): string[] {
  const authority = authorityFrom(input);
  const source = authority.source;

  if (source === "VERBAL_ORDER") {
    const lines = [t("orderAuthority.verbalOrder")];
    if (authority.readbackConfirmed === true) lines.push(t("orderAuthority.readbackConfirmed"));
    return lines;
  }

  if (source === "NURSING_PROTOCOL") {
    const lines = [t("orderAuthority.nursingProtocol")];
    const protocolName = authority.protocolName?.trim();
    if (protocolName) {
      lines.push(t("orderAuthority.protocolName").replace("{protocolName}", protocolName));
    }
    return lines;
  }

  if (source === "PROTOCOL" || source === "PATHWAY") {
    const lines = [t("orderAuthority.pathwayProtocol")];
    const protocolName = authority.protocolName?.trim();
    if (protocolName) {
      lines.push(t("orderAuthority.protocolName").replace("{protocolName}", protocolName));
    }
    return lines;
  }

  const lines = [t("orderAuthority.providerOrder")];
  const protocolName = authority.protocolName?.trim();
  if (protocolName) {
    if (protocolName === OBSERVATION_ORDER_TEMPLATE_ID) {
      lines.push(t("orderAuthority.observationOrderTemplateBundle"));
    } else {
      lines.push(t("orderAuthority.protocolName").replace("{protocolName}", protocolName));
    }
  }
  return lines;
}

export function formatOrderAuthority(
  input: OrderAuthority | OrderAuthorityCarrier | null | undefined,
  t: (key: string) => string
): string {
  return formatOrderAuthorityLines(input, t).join(" · ");
}
