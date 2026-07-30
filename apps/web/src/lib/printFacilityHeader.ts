/**
 * Centered facility header for browser print HTML (ED packet, discharge summary).
 * MEDUI.D4C.7I — projects from enterprise facility identity (not session-only name).
 */

import {
  formatEnterpriseFacilityAddressLines,
  projectEnterpriseFacilityIdentity,
  resolveDocumentFacilityIdentitySource,
  enterpriseIdentityToPrintFacilityInfo,
} from "@medora/shared";

export type PrintFacilityInfo = {
  name?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  stateProvince?: string | null;
  postalCode?: string | null;
  country?: string | null;
  phone?: string | null;
  phoneSecondary?: string | null;
  fax?: string | null;
  email?: string | null;
  website?: string | null;
  legalName?: string | null;
};

export function printFacilityInfoFromName(name?: string | null): PrintFacilityInfo | null {
  const trimmed = name?.trim();
  return trimmed ? { name: trimmed } : null;
}

/** Build PrintFacilityInfo from enterprise care profile + facility name. */
export function printFacilityInfoFromEnterpriseSource(input: {
  facilityName?: string | null;
  facilityCountry?: string | null;
  careProfileJson?: unknown;
  billingLegalName?: string | null;
  billingAddress?: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    stateProvince?: string | null;
    postalCode?: string | null;
    country?: string | null;
    phone?: string | null;
  } | null;
}): PrintFacilityInfo | null {
  const identity = projectEnterpriseFacilityIdentity({
    facilityName: input.facilityName,
    facilityCountry: input.facilityCountry,
    careProfileJson: input.careProfileJson,
    billingLegalName: input.billingLegalName,
    billingAddress: input.billingAddress,
  });
  const mapped = enterpriseIdentityToPrintFacilityInfo(identity);
  if (!mapped.name?.trim()) return null;
  return mapped;
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
      phoneSecondary: facility.phoneSecondary?.trim() || null,
      fax: facility.fax?.trim() || null,
      email: facility.email?.trim() || null,
      website: facility.website?.trim() || null,
      legalName: facility.legalName?.trim() || null,
    };
  }
  return printFacilityInfoFromName(facilityName);
}

/**
 * Prefer document.facilityId over an unrelated selected facility when both are known.
 */
export function resolvePrintFacilityForDocument(input: {
  documentFacilityId?: string | null;
  selectedFacilityId?: string | null;
  documentFacility?: PrintFacilityInfo | null;
  selectedFacility?: PrintFacilityInfo | null;
  selectedFacilityName?: string | null;
}): { facility: PrintFacilityInfo | null; usedDocumentFacility: boolean; mismatch: boolean } {
  const link = resolveDocumentFacilityIdentitySource({
    documentFacilityId: input.documentFacilityId,
    selectedFacilityId: input.selectedFacilityId,
  });
  if (link.facilityId && input.documentFacilityId && link.facilityId === input.documentFacilityId) {
    const facility =
      resolvePrintFacilityInfo(input.documentFacility, input.documentFacility?.name) ??
      resolvePrintFacilityInfo(input.selectedFacility, input.selectedFacilityName);
    return {
      facility,
      usedDocumentFacility: true,
      mismatch: link.mismatch,
    };
  }
  return {
    facility: resolvePrintFacilityInfo(input.selectedFacility, input.selectedFacilityName),
    usedDocumentFacility: false,
    mismatch: false,
  };
}

/**
 * Resolve print identity for a document's facilityId from the session facility catalog.
 * Prefer document facility over the browser-selected facility when they differ.
 */
export function resolveEnterprisePrintFacilityFromCatalog(input: {
  documentFacilityId?: string | null;
  selectedFacilityId?: string | null;
  facilities: Array<{
    id: string;
    name: string;
    careProfileJson?: unknown;
    country?: string | null;
  }>;
}): { facility: PrintFacilityInfo | null; usedDocumentFacility: boolean; mismatch: boolean } {
  const link = resolveDocumentFacilityIdentitySource({
    documentFacilityId: input.documentFacilityId,
    selectedFacilityId: input.selectedFacilityId,
  });
  const targetId = link.facilityId;
  const row = targetId ? input.facilities.find((f) => f.id === targetId) : undefined;
  const selected = input.selectedFacilityId
    ? input.facilities.find((f) => f.id === input.selectedFacilityId)
    : undefined;
  const source = row ?? selected;
  return {
    facility: source
      ? printFacilityInfoFromEnterpriseSource({
          facilityName: source.name,
          facilityCountry: source.country,
          careProfileJson: source.careProfileJson,
        })
      : null,
    usedDocumentFacility: Boolean(row && input.documentFacilityId && row.id === input.documentFacilityId),
    mismatch: link.mismatch,
  };
}

export function formatPrintFacilityAddress(info: PrintFacilityInfo): string | null {
  const lines = formatEnterpriseFacilityAddressLines({
    line1: info.addressLine1 ?? null,
    line2: info.addressLine2 ?? null,
    city: info.city ?? null,
    stateProvince: info.stateProvince ?? null,
    postalCode: info.postalCode ?? null,
    country: info.country ?? null,
    phone: null,
    phoneSecondary: null,
    fax: null,
    email: null,
    website: null,
  });
  return lines.length > 0 ? lines.join(", ") : null;
}

export function buildPrintFacilityHeaderHtml(
  info: PrintFacilityInfo | null | undefined,
  esc: (value: string) => string
): string {
  const name = info?.name?.trim();
  if (!name) return "";

  const addressLines = formatEnterpriseFacilityAddressLines({
    line1: info?.addressLine1 ?? null,
    line2: info?.addressLine2 ?? null,
    city: info?.city ?? null,
    stateProvince: info?.stateProvince ?? null,
    postalCode: info?.postalCode ?? null,
    country: info?.country ?? null,
    phone: null,
    phoneSecondary: null,
    fax: null,
    email: null,
    website: null,
  });
  const phone = info?.phone?.trim();
  const phoneSecondary = info?.phoneSecondary?.trim();
  const fax = info?.fax?.trim();
  const email = info?.email?.trim();
  const parts: string[] = [
    `<h1 style="font-size:20px;font-weight:700;text-align:center;margin:0 0 8px 0;line-height:1.3;">${esc(name)}</h1>`,
  ];
  if (info?.legalName?.trim() && info.legalName.trim() !== name) {
    parts.push(
      `<p style="margin:0 0 4px 0;text-align:center;font-size:12px;line-height:1.45;color:#475569;">${esc(info.legalName.trim())}</p>`
    );
  }
  for (const line of addressLines) {
    parts.push(
      `<p style="margin:0 0 2px 0;text-align:center;font-size:13px;line-height:1.45;color:#334155;">${esc(line)}</p>`
    );
  }
  const contactBits: string[] = [];
  if (phone) contactBits.push(phone);
  if (phoneSecondary) contactBits.push(phoneSecondary);
  if (fax) contactBits.push(`Fax: ${fax}`);
  if (email) contactBits.push(email);
  if (contactBits.length > 0) {
    parts.push(
      `<p style="margin:4px 0 16px 0;text-align:center;font-size:13px;line-height:1.45;color:#334155;">${esc(contactBits.join(" · "))}</p>`
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
