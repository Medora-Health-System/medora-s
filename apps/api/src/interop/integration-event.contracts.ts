/**
 * Phase 11B — interoperability **contracts only** (no persistence, no inbound adapters).
 *
 * Future inbound services (HL7, FHIR, device gateways) should map external payloads
 * into these shapes before human review / acceptance workflows exist.
 */

/** Identifies the external technical family (not a vendor trademark in code). */
export type ExternalIntegrationSource =
  | "HL7_V2"
  | "FHIR_R4"
  | "CLEARINGHOUSE"
  | "EXTERNAL_LAB"
  | "EXTERNAL_RADIOLOGY"
  | "DEVICE_GATEWAY"
  | "MANUAL_ATTESTATION"
  | "UNKNOWN";

/**
 * Lifecycle for a single inbound integration artifact (message, bundle, device batch).
 * Does not imply DB storage — UI/workflow may persist under a future schema.
 */
export type IntegrationIngestionStatus =
  | "received"
  | "parsed"
  | "pending_clinical_review"
  | "accepted"
  | "rejected"
  | "duplicate_suppressed"
  | "failed_technical";

/** Non-PHI hints for matching vitals/Observation payloads to an encounter (future). */
export type ExternalObservationDraft = {
  source: ExternalIntegrationSource;
  /** When true, data originated from a device stream — never auto-file to legal chart without policy. */
  deviceSourced: boolean;
  /** LOINC or vendor code system + code (no free text). */
  coding?: { system: string; code: string };
  /** ISO-8601 instant if known from payload. */
  effectiveAt?: string;
};

/** Structured hints for lab/imaging result correlation — no narrative text in this contract. */
export type ExternalResultDraft = {
  source: ExternalIntegrationSource;
  /** Filler / placer / accession style identifiers (non-PHI preferred). */
  correlationIds?: Record<string, string>;
  /** Whether the payload included unstructured narrative (must force human review if true). */
  hasNarrativeContent: boolean;
};

/**
 * Patient matching hint only — **must not** drive automatic merge or create.
 * Used for UI “possible match” lists under future integration UX.
 */
export type ExternalPatientIdentityHint = {
  source: ExternalIntegrationSource;
  /** External system patient id (opaque string; still treat as sensitive in logs). */
  externalPatientId?: string;
  /** Last 4 of MRN-style identifiers only if policy allows; prefer omit from audit metadata. */
  mrnSuffix?: string;
};
