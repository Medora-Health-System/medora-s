/**
 * MEDUI.D4C.7H — Enterprise MAR safety acknowledgement + prescription print authority.
 * No ClinicMar* / ClinicPrescriptionPrint engines — extends shared MAR + RxPrintLayout.
 */

export const CLINIC_ENTERPRISE_MAR_SAFETY_RX_PRINT_CERTIFICATION_ID =
  "MEDUI.D4C.7H" as const;

/** Acknowledgement contract version stored on administration audit metadata. */
export const MAR_ALLERGY_ACKNOWLEDGEMENT_VERSION = "d4c7h.v1" as const;

export const D4C7H_FORBIDDEN_CLINIC_AUTHORITIES = [
  "ClinicMarAllergyConfirmation",
  "ClinicMedicationSafetyAcknowledgement",
  "ClinicPrescriptionPrint",
  "ClinicFacilityPrintHeader",
] as const;

export const D4C7H_MAR_ERROR_CODES = {
  MAR_ALLERGY_REVIEW_REQUIRED: "MAR_ALLERGY_REVIEW_REQUIRED",
  MAR_ALLERGY_STATUS_UNKNOWN: "MAR_ALLERGY_STATUS_UNKNOWN",
  MAR_MEDICATION_ALLERGY_CONFLICT: "MAR_MEDICATION_ALLERGY_CONFLICT",
  MAR_ALLERGY_OVERRIDE_REQUIRED: "MAR_ALLERGY_OVERRIDE_REQUIRED",
  MAR_ADMINISTRATION_STALE_STATE: "MAR_ADMINISTRATION_STALE_STATE",
} as const;

export type D4c7hMarErrorCode =
  (typeof D4C7H_MAR_ERROR_CODES)[keyof typeof D4C7H_MAR_ERROR_CODES];

export const D4C7H_RX_PRINT_ERROR_CODES = {
  RX_PRINT_PROJECTION_NOT_FOUND: "RX_PRINT_PROJECTION_NOT_FOUND",
  RX_PRINT_NO_LINES: "RX_PRINT_NO_LINES",
  RX_PRINT_FACILITY_IDENTITY_MISSING: "RX_PRINT_FACILITY_IDENTITY_MISSING",
  RX_PRINT_DOCUMENT_EMPTY: "RX_PRINT_DOCUMENT_EMPTY",
  RX_PRINT_WINDOW_BLOCKED: "RX_PRINT_WINDOW_BLOCKED",
  RX_PRINT_RENDER_FAILED: "RX_PRINT_RENDER_FAILED",
} as const;

export type D4c7hRxPrintErrorCode =
  (typeof D4C7H_RX_PRINT_ERROR_CODES)[keyof typeof D4C7H_RX_PRINT_ERROR_CODES];

/** i18n message keys for typed Rx print failures (mirrored in en.ts / fr.ts). */
export const D4C7H_RX_PRINT_MESSAGE_KEYS: Record<D4c7hRxPrintErrorCode, string> = {
  RX_PRINT_PROJECTION_NOT_FOUND: "clinicCareD4c7h.rx.printProjectionNotFound",
  RX_PRINT_NO_LINES: "clinicCareD4c7h.rx.printNoLines",
  RX_PRINT_FACILITY_IDENTITY_MISSING: "clinicCareD4c7h.rx.printFacilityIdentityMissing",
  RX_PRINT_DOCUMENT_EMPTY: "clinicCareD4c7h.rx.printDocumentEmpty",
  RX_PRINT_WINDOW_BLOCKED: "clinicCareD4c7h.rx.printWindowBlocked",
  RX_PRINT_RENDER_FAILED: "clinicCareD4c7h.rx.printRenderFailed",
};

/**
 * `window.open(..., "noopener,noreferrer")` returns a Window whose document is not
 * the opened tab — writes land nowhere and print shows empty about:blank.
 */
export function isUnsafeNoopenerPrintWindowOpenFeatures(features: string | undefined): boolean {
  if (!features) return false;
  const normalized = features.toLowerCase();
  return normalized.includes("noopener") || normalized.includes("noreferrer");
}

/** Minimum HTML body content length before invoking window.print(). */
export function isRxPrintHtmlDocumentReady(html: string | null | undefined): boolean {
  if (!html || typeof html !== "string") return false;
  const trimmed = html.trim();
  if (trimmed.length < 40) return false;
  if (!/<body[\s>]/i.test(trimmed)) return false;
  if (!/<\/body>/i.test(trimmed)) return false;
  // Reject empty body (only whitespace between body tags).
  const bodyMatch = trimmed.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (!bodyMatch || !bodyMatch[1] || bodyMatch[1].replace(/\s+/g, "").length < 8) return false;
  return true;
}

export type RxPrintFacilityIdentityInput = {
  name?: string | null;
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  stateProvince?: string | null;
  postalCode?: string | null;
  country?: string | null;
  phone?: string | null;
  fax?: string | null;
};

/** Facility display name is required; address/contact are preferred but optional. */
export function evaluateRxPrintFacilityIdentity(
  identity: RxPrintFacilityIdentityInput | null | undefined
): {
  ok: boolean;
  code: D4c7hRxPrintErrorCode | null;
  missingFields: string[];
} {
  const missing: string[] = [];
  const name = identity?.name?.trim() ?? "";
  if (!name) missing.push("name");
  if (missing.length > 0) {
    return {
      ok: false,
      code: D4C7H_RX_PRINT_ERROR_CODES.RX_PRINT_FACILITY_IDENTITY_MISSING,
      missingFields: missing,
    };
  }
  return { ok: true, code: null, missingFields: [] };
}

/** Format address lines without US-only assumptions (Haiti / international safe). */
export function formatRxPrintFacilityAddressLines(
  identity: RxPrintFacilityIdentityInput
): string[] {
  const lines: string[] = [];
  const line1 = identity.line1?.trim();
  const line2 = identity.line2?.trim();
  if (line1) lines.push(line1);
  if (line2) lines.push(line2);
  const locality = [identity.city, identity.stateProvince, identity.postalCode]
    .map((p) => (typeof p === "string" ? p.trim() : ""))
    .filter(Boolean)
    .join(", ");
  if (locality) lines.push(locality);
  const country = identity.country?.trim();
  if (country) lines.push(country);
  return lines;
}
