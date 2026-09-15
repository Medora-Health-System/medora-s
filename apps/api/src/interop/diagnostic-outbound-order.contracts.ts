import type { DiagnosticExchangeDomain } from "./integration-event.contracts";

export type DiagnosticOutboundDeliveryState =
  | "prepared"
  | "dispatched"
  | "acknowledged"
  | "retryable_failure"
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

export const DIAGNOSTIC_OUTBOUND_INVARIANTS = Object.freeze({
  requiresFacilityAuthorization: true,
  requiresConfiguredFhirIntegration: true,
  requiresDiagnosticOrder: true,
  automaticCredentialFallbackAllowed: false,
  rawClinicalPayloadAllowedInAuditMetadata: false,
  retryMustReuseIdempotencyKey: true,
} as const);
