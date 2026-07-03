/**
 * Centered facility header for browser print HTML (ED packet, discharge summary).
 */

export type PrintFacilityInfo = {
  name?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  stateProvince?: string | null;
  postalCode?: string | null;
  country?: string | null;
  phone?: string | null;
};

export function printFacilityInfoFromName(name?: string | null): PrintFacilityInfo | null {
  const trimmed = name?.trim();
  return trimmed ? { name: trimmed } : null;
}

export function resolvePrintFacilityInfo(
  facility?: PrintFacilityInfo | null,
  facilityName?: string | null
): PrintFacilityInfo | null {
  if (facility?.name?.trim()) {
    return {
      name: facility.name.trim(),
      addressLine1: facility.addressLine1?.trim() || null,
      addressLine2: facility.addressLine2?.trim() || null,
      city: facility.city?.trim() || null,
      stateProvince: facility.stateProvince?.trim() || null,
      postalCode: facility.postalCode?.trim() || null,
      country: facility.country?.trim() || null,
      phone: facility.phone?.trim() || null,
    };
  }
  return printFacilityInfoFromName(facilityName);
}

export function formatPrintFacilityAddress(info: PrintFacilityInfo): string | null {
  const line1 = info.addressLine1?.trim();
  const line2 = info.addressLine2?.trim();
  const cityState = [info.city?.trim(), info.stateProvince?.trim()].filter(Boolean).join(", ");
  const cityLine = [cityState, info.postalCode?.trim()].filter(Boolean).join(" ").trim();
  const parts = [line1, line2, cityLine].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

export function buildPrintFacilityHeaderHtml(
  info: PrintFacilityInfo | null | undefined,
  esc: (value: string) => string
): string {
  const name = info?.name?.trim();
  if (!name) return "";

  const address = info ? formatPrintFacilityAddress(info) : null;
  const phone = info?.phone?.trim();
  const parts: string[] = [
    `<h1 style="font-size:20px;font-weight:700;text-align:center;margin:0 0 8px 0;line-height:1.3;">${esc(name)}</h1>`,
  ];
  if (address) {
    parts.push(
      `<p style="margin:0 0 4px 0;text-align:center;font-size:13px;line-height:1.45;color:#334155;">${esc(address)}</p>`
    );
  }
  if (phone) {
    parts.push(
      `<p style="margin:0 0 16px 0;text-align:center;font-size:13px;line-height:1.45;color:#334155;">${esc(phone)}</p>`
    );
  } else {
    parts.push(`<div style="margin-bottom:16px;"></div>`);
  }

  return `<header style="margin:0 0 20px 0;padding-bottom:16px;border-bottom:1px solid #e2e8f0;">${parts.join("")}</header>`;
}

export function buildPrintDocumentFooterHtml(
  language: "en" | "fr",
  printDate: string,
  esc: (value: string) => string,
  printT: (language: "en" | "fr", key: string) => string
): string {
  const footer = printT(language, "printOutput.common.documentFooter").replace("{date}", printDate);
  if (footer.includes("{date}") || footer === "printOutput.common.documentFooter") {
    const fallback =
      language === "en"
        ? `Document generated on ${printDate} — Medora-S`
        : `Document généré le ${printDate} — Medora-S`;
    return `<p style="margin-top:24px;font-size:11px;color:#64748b;text-align:center;">${esc(fallback)}</p>`;
  }
  return `<p style="margin-top:24px;font-size:11px;color:#64748b;text-align:center;">${esc(footer)}</p>`;
}
