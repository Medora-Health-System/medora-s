import type { DiagnosticExchangeDomain } from "./integration-event.contracts";

export type DiagnosticOutboundDeliveryState =
  | "prepared"
  | "dispatched"
  | "acknowledged"
  | "retryable_failure"
  | "dead_lettered"
  | "permanent_failure";

export type DiagnosticOutboundDeliveryTarget = {
  integrationId: string;
  facilityId: string;
  domain: DiagnosticExchangeDomain;
  baseUrl: string;
  authMethod: "NONE" | "PRIVATE_KEY_JWT" | "MTLS";
};

/**
 * Governed Phase 3B ServiceRequest prepared for the durable delivery layer.
 * The FHIR body can contain PHI and must never be copied into audit metadata.
 */
export type PreparedDiagnosticServiceRequest = {
  integrationId: string;
  facilityId: string;
  orderItemId: string;
  resourceType: "ServiceRequest";
  idempotencyKey: string;
  target: DiagnosticOutboundDeliveryTarget;
  serviceRequest: Record<string, unknown>;
};

/** PHI-minimized durable state. Raw FHIR payloads belong in governed transport storage. */
export type DiagnosticOutboundDeliveryAttempt = {
  integrationId: string;
  facilityId: string;
  orderItemId: string;
  idempotencyKey: string;
  state: DiagnosticOutboundDeliveryState;
  attemptNumber: number;
  nextAttemptAt?: string;
  acknowledgedAt?: string;
  partnerStatusCode?: number;
  /** Opaque partner correlation only; never patient/result narrative. */
  partnerMessageId?: string;
};

export const DIAGNOSTIC_OUTBOUND_RETRY_POLICY = Object.freeze({
  maxAttempts: 5,
  initialBackoffSeconds: 30,
  maxBackoffSeconds: 900,
  retryableHttpStatuses: [408, 425, 429, 500, 502, 503, 504] as const,
  deadLetterAfterMaxAttempts: true,
} as const);

export const DIAGNOSTIC_OUTBOUND_INVARIANTS = Object.freeze({
  requiresFacilityAuthorization: true,
  requiresConfiguredFhirIntegration: true,
  requiresDiagnosticOrder: true,
  automaticCredentialFallbackAllowed: false,
  rawClinicalPayloadAllowedInAuditMetadata: false,
  retryMustReuseIdempotencyKey: true,
  acknowledgementMustMatchIntegrationAndFacility: true,
  transportMustFailClosedWithoutAuthentication: true,
} as const);
