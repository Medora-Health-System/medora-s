/**
 * MEDUI.D4C.7I — Enterprise facility identity, onboarding address/contact,
 * and document-header projection.
 *
 * Canonical authority: Facility.name + Facility.country + Facility.facilityCareProfileJson
 * (operational address / print identity) with billing columns as fallback only.
 * No ClinicFacilityAddress / PrescriptionFacilityAddress forks.
 */

import {
  normalizeFacilityOperationalAddress,
  parseFacilityCareProfileJson,
  projectFacilityPrintIdentity,
  type FacilityOperationalAddress,
  type FacilityPrintIdentity,
} from "./facilityClinicCareProfileD4c1.js";

export const ENTERPRISE_FACILITY_IDENTITY_ONBOARDING_PRINT_CERTIFICATION_ID =
  "MEDUI.D4C.7I" as const;

export const D4C7I_FORBIDDEN_CLINIC_AUTHORITIES = [
  "ClinicFacilityAddress",
  "PrescriptionFacilityAddress",
  "DentalFacilityAddress",
  "HospitalFacilityPhone",
] as const;

/** Future D5A dental service-line tokens — registry prep only; not selectable in D4C.7I. */
export const D5A_FUTURE_DENTAL_SERVICE_LINES = [
  "DENTAL",
  "GENERAL_DENTISTRY",
  "ORTHODONTICS",
] as const;

export type D5aFutureDentalServiceLine = (typeof D5A_FUTURE_DENTAL_SERVICE_LINES)[number];

export const D4C7I_ERROR_CODES = {
  FACILITY_IDENTITY_NAME_REQUIRED: "FACILITY_IDENTITY_NAME_REQUIRED",
  FACILITY_IDENTITY_COUNTRY_REQUIRED: "FACILITY_IDENTITY_COUNTRY_REQUIRED",
  FACILITY_IDENTITY_ADDRESS_LINE1_REQUIRED: "FACILITY_IDENTITY_ADDRESS_LINE1_REQUIRED",
  FACILITY_IDENTITY_CITY_REQUIRED: "FACILITY_IDENTITY_CITY_REQUIRED",
  FACILITY_IDENTITY_PHONE_REQUIRED: "FACILITY_IDENTITY_PHONE_REQUIRED",
  FACILITY_IDENTITY_EMAIL_INVALID: "FACILITY_IDENTITY_EMAIL_INVALID",
  FACILITY_IDENTITY_WEBSITE_INVALID: "FACILITY_IDENTITY_WEBSITE_INVALID",
  FACILITY_IDENTITY_DOCUMENT_FACILITY_MISMATCH: "FACILITY_IDENTITY_DOCUMENT_FACILITY_MISMATCH",
} as const;

export type D4c7iErrorCode = (typeof D4C7I_ERROR_CODES)[keyof typeof D4C7I_ERROR_CODES];

export type EnterpriseFacilityContact = {
  phone: string | null;
  phoneSecondary: string | null;
  fax: string | null;
  email: string | null;
  website: string | null;
};

/** Full enterprise letterhead / onboarding identity projection. */
export type EnterpriseFacilityIdentity = FacilityPrintIdentity & {
  legalName: string | null;
  contact: EnterpriseFacilityContact;
  /** Schema `Facility.country` when known; else operational address country. */
  countryCodeOrName: string | null;
};

export type FacilityOperationalIdentityInput = Partial<FacilityOperationalAddress> & {
  printDisplayName?: string | null;
  legalName?: string | null;
};

export type FacilityOnboardingIdentityValidationResult =
  | { ok: true }
  | { ok: false; code: D4c7iErrorCode; field: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function trimOrNull(value: string | null | undefined): string | null {
  const t = String(value ?? "").trim();
  return t.length > 0 ? t : null;
}

/** Soft website check — allow international hosts; do not require https. */
export function isPlausibleFacilityWebsite(value: string | null | undefined): boolean {
  const t = trimOrNull(value);
  if (!t) return true;
  if (/\s/.test(t)) return false;
  if (t.includes("://")) {
    try {
      const u = new URL(t);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }
  return /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}([/?#].*)?$/i.test(t);
}

export function isPlausibleFacilityEmail(value: string | null | undefined): boolean {
  const t = trimOrNull(value);
  if (!t) return true;
  return EMAIL_RE.test(t);
}

/**
 * Onboarding / edit validation for operational identity.
 * Does not require US state or ZIP — Haiti commune + département optional.
 */
export function validateFacilityOperationalIdentityOnboarding(
  input: FacilityOperationalIdentityInput & { facilityName?: string | null }
): FacilityOnboardingIdentityValidationResult {
  if (!trimOrNull(input.facilityName) && !trimOrNull(input.printDisplayName)) {
    return {
      ok: false,
      code: D4C7I_ERROR_CODES.FACILITY_IDENTITY_NAME_REQUIRED,
      field: "name",
    };
  }
  if (!trimOrNull(input.country)) {
    return {
      ok: false,
      code: D4C7I_ERROR_CODES.FACILITY_IDENTITY_COUNTRY_REQUIRED,
      field: "country",
    };
  }
  if (!trimOrNull(input.line1)) {
    return {
      ok: false,
      code: D4C7I_ERROR_CODES.FACILITY_IDENTITY_ADDRESS_LINE1_REQUIRED,
      field: "line1",
    };
  }
  if (!trimOrNull(input.city)) {
    return {
      ok: false,
      code: D4C7I_ERROR_CODES.FACILITY_IDENTITY_CITY_REQUIRED,
      field: "city",
    };
  }
  if (!trimOrNull(input.phone)) {
    return {
      ok: false,
      code: D4C7I_ERROR_CODES.FACILITY_IDENTITY_PHONE_REQUIRED,
      field: "phone",
    };
  }
  if (!isPlausibleFacilityEmail(input.email)) {
    return {
      ok: false,
      code: D4C7I_ERROR_CODES.FACILITY_IDENTITY_EMAIL_INVALID,
      field: "email",
    };
  }
  if (!isPlausibleFacilityWebsite(input.website)) {
    return {
      ok: false,
      code: D4C7I_ERROR_CODES.FACILITY_IDENTITY_WEBSITE_INVALID,
      field: "website",
    };
  }
  return { ok: true };
}

/** Country-aware region label key suffix (UI maps via i18n). */
export function facilityIdentityRegionLabelKey(country: string | null | undefined): string {
  const c = String(country ?? "")
    .trim()
    .toLowerCase();
  if (c === "us" || c === "usa" || c === "united states" || c === "united states of america") {
    return "facilityIdentityD4c7i.regionUs";
  }
  if (c === "ht" || c === "haiti" || c === "haïti") {
    return "facilityIdentityD4c7i.regionHaiti";
  }
  return "facilityIdentityD4c7i.regionGeneric";
}

export function facilityIdentityCityLabelKey(country: string | null | undefined): string {
  const c = String(country ?? "")
    .trim()
    .toLowerCase();
  if (c === "ht" || c === "haiti" || c === "haïti") {
    return "facilityIdentityD4c7i.cityHaiti";
  }
  return "facilityIdentityD4c7i.cityGeneric";
}

/** International address lines — never force US state+ZIP layout. */
export function formatEnterpriseFacilityAddressLines(
  address: Partial<FacilityOperationalAddress> | null | undefined
): string[] {
  const a = normalizeFacilityOperationalAddress(address);
  const lines: string[] = [];
  if (a.line1) lines.push(a.line1);
  if (a.line2) lines.push(a.line2);
  const locality = [a.city, a.stateProvince, a.postalCode].filter(Boolean).join(", ");
  if (locality) lines.push(locality);
  if (a.country) lines.push(a.country);
  return lines;
}

export function projectEnterpriseFacilityIdentity(input: {
  facilityName?: string | null;
  facilityCountry?: string | null;
  careProfileJson?: unknown;
  billingLegalName?: string | null;
  billingAddress?: Partial<FacilityOperationalAddress> | null;
}): EnterpriseFacilityIdentity {
  const print = projectFacilityPrintIdentity({
    facilityName: input.facilityName,
    careProfileJson: input.careProfileJson,
    billingAddress: input.billingAddress,
  });
  const stored = parseFacilityCareProfileJson(input.careProfileJson);
  const address = print.address;
  return {
    displayName: print.displayName,
    legalName: trimOrNull(stored?.legalName) ?? trimOrNull(input.billingLegalName),
    address,
    contact: {
      phone: address.phone,
      phoneSecondary: address.phoneSecondary ?? null,
      fax: address.fax ?? null,
      email: address.email ?? null,
      website: address.website ?? null,
    },
    countryCodeOrName: trimOrNull(input.facilityCountry) ?? address.country,
  };
}

/**
 * Historical / document print must use the facility linked to the encounter/order,
 * not an unrelated browser-selected facility.
 */
export function resolveDocumentFacilityIdentitySource(input: {
  documentFacilityId: string | null | undefined;
  selectedFacilityId: string | null | undefined;
}): {
  facilityId: string | null;
  mismatch: boolean;
  code: D4c7iErrorCode | null;
} {
  const doc = trimOrNull(input.documentFacilityId);
  const selected = trimOrNull(input.selectedFacilityId);
  if (!doc) {
    return { facilityId: selected, mismatch: false, code: null };
  }
  if (selected && doc !== selected) {
    return {
      facilityId: doc,
      mismatch: true,
      code: D4C7I_ERROR_CODES.FACILITY_IDENTITY_DOCUMENT_FACILITY_MISMATCH,
    };
  }
  return { facilityId: doc, mismatch: false, code: null };
}

/** Map enterprise identity → web PrintFacilityInfo / Rx print shape. */
export function enterpriseIdentityToPrintFacilityInfo(identity: EnterpriseFacilityIdentity): {
  name: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  stateProvince: string | null;
  postalCode: string | null;
  country: string | null;
  phone: string | null;
  phoneSecondary: string | null;
  fax: string | null;
  email: string | null;
  website: string | null;
  legalName: string | null;
} {
  return {
    name: identity.displayName,
    addressLine1: identity.address.line1,
    addressLine2: identity.address.line2,
    city: identity.address.city,
    stateProvince: identity.address.stateProvince,
    postalCode: identity.address.postalCode,
    country: identity.countryCodeOrName ?? identity.address.country,
    phone: identity.contact.phone,
    phoneSecondary: identity.contact.phoneSecondary,
    fax: identity.contact.fax,
    email: identity.contact.email,
    website: identity.contact.website,
    legalName: identity.legalName,
  };
}

/** D5A integration point: dental lines reserved; chart engines deferred. */
export function describeD5aDentalServiceLineIntegrationPoint(): {
  milestone: "D5A";
  serviceLines: readonly D5aFutureDentalServiceLine[];
  registryFile: string;
  note: string;
} {
  return {
    milestone: "D5A",
    serviceLines: D5A_FUTURE_DENTAL_SERVICE_LINES,
    registryFile: "packages/shared/src/auth/facilityTypeRegistry.ts",
    note:
      "Add DENTAL / GENERAL_DENTISTRY / ORTHODONTICS to MedoraServiceLine + facilityTypeRegistry defaults when Dental chart ships; reuse enterprise facility identity — do not create DentalFacilityAddress.",
  };
}
