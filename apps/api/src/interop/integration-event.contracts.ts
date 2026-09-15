/**
 * Medora interoperability contracts.
 *
 * External clinical content remains a proposal until the governed Medora
 * workflow accepts it. These contracts intentionally contain correlation and
 * lifecycle metadata only; raw PHI payloads and narrative belong in governed
 * clinical storage, never audit metadata.
 */

export type ExternalIntegrationSource =
  | "HL7_V2"
  | "FHIR_R4"
  | "CLEARINGHOUSE"
  | "EXTERNAL_LAB"
  | "EXTERNAL_RADIOLOGY"
  | "DEVICE_GATEWAY"
  | "MANUAL_ATTESTATION"
  | "UNKNOWN";

export type IntegrationIngestionStatus =
  | "received"
  | "parsed"
  | "pending_clinical_review"
  | "accepted"
  | "rejected"
  | "duplicate_suppressed"
  | "failed_technical";

export type ExternalObservationDraft = {
  source: ExternalIntegrationSource;
  deviceSourced: boolean;
  coding?: { system: string; code: string };
  effectiveAt?: string;
};

export type ExternalResultDraft = {
  source: ExternalIntegrationSource;
  correlationIds?: Record<string, string>;
  hasNarrativeContent: boolean;
};

export type ExternalPatientIdentityHint = {
  source: ExternalIntegrationSource;
  externalPatientId?: string;
  mrnSuffix?: string;
};

/** Phase 3A: domains eligible for bidirectional diagnostic exchange. */
export type DiagnosticExchangeDomain = "LAB" | "RADIOLOGY";

/**
 * Correlation identity carried across the outbound order and inbound result.
 * facilityId is mandatory: an accession or vendor identifier is never globally
 * trusted and can never authorize cross-facility correlation.
 */
export type DiagnosticExchangeCorrelation = {
  facilityId: string;
  orderId: string;
  orderItemId: string;
  /** Medora-generated opaque placer identifier; no patient demographics. */
  placerOrderId: string;
  /** Partner-assigned identifier after acknowledgement, when available. */
  fillerOrderId?: string;
  accessionNumber?: string;
};

/** Outbound diagnostic order envelope before partner-specific serialization. */
export type OutboundDiagnosticOrder = {
  source: "FHIR_R4";
  domain: DiagnosticExchangeDomain;
  correlation: DiagnosticExchangeCorrelation;
  /** Stable idempotency key for safe retry of the same logical order version. */
  idempotencyKey: string;
  /** ISO-8601 time at which this exchange version was produced. */
  generatedAt: string;
  /** FHIR ServiceRequest is the canonical Phase 3 FHIR order resource. */
  resourceType: "ServiceRequest";
};

/** Inbound status/result identity after authentication and parsing, pre-chart. */
export type InboundDiagnosticArtifact = {
  source: "FHIR_R4" | "EXTERNAL_LAB" | "EXTERNAL_RADIOLOGY";
  domain: DiagnosticExchangeDomain;
  facilityId: string;
  /** Stable Medora integration/partner identity; required for replay namespacing. */
  integrationId: string;
  /** Partner message/event identity. It is only unique inside the partner namespace. */
  externalMessageId: string;
  correlation: Partial<Omit<DiagnosticExchangeCorrelation, "facilityId">>;
  resourceType: "ServiceRequest" | "DiagnosticReport" | "Observation";
  status: IntegrationIngestionStatus;
  receivedAt: string;
  /** Narrative content, when present, forces governed human review. */
  hasNarrativeContent: boolean;
};

export const DIAGNOSTIC_EXCHANGE_INVARIANTS = Object.freeze({
  facilityScopeRequired: true,
  patientAutoMergeAllowed: false,
  resultAutoFileAllowed: false,
  rawPayloadAllowedInAuditMetadata: false,
  duplicateKey: "integrationId+facilityId+resourceType+externalMessageId",
  inboundLegalChartState: "pending_clinical_review",
} as const);
