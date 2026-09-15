import {
  DIAGNOSTIC_EXCHANGE_INVARIANTS,
  type InboundDiagnosticArtifact,
  type OutboundDiagnosticOrder,
} from "./integration-event.contracts";

describe("FHIR Phase 3 diagnostic exchange contracts", () => {
  it("keeps inbound diagnostic content pending and facility scoped", () => {
    expect(DIAGNOSTIC_EXCHANGE_INVARIANTS).toEqual(
      expect.objectContaining({
        facilityScopeRequired: true,
        patientAutoMergeAllowed: false,
        resultAutoFileAllowed: false,
        rawPayloadAllowedInAuditMetadata: false,
        duplicateKey: "source+facilityId+externalMessageId",
        inboundLegalChartState: "pending_clinical_review",
      }),
    );
  });

  it("uses ServiceRequest as the outbound FHIR diagnostic order contract", () => {
    const order: OutboundDiagnosticOrder = {
      source: "FHIR_R4",
      domain: "LAB",
      correlation: {
        facilityId: "facility-a",
        orderId: "order-a",
        orderItemId: "item-a",
        placerOrderId: "opaque-placer-a",
      },
      idempotencyKey: "facility-a:item-a:v1",
      generatedAt: "2026-09-15T00:00:00.000Z",
      resourceType: "ServiceRequest",
    };
    expect(order.resourceType).toBe("ServiceRequest");
    expect(order.correlation.facilityId).toBeTruthy();
  });

  it("models inbound results as pre-chart artifacts", () => {
    const artifact: InboundDiagnosticArtifact = {
      source: "EXTERNAL_LAB",
      domain: "LAB",
      facilityId: "facility-a",
      externalMessageId: "message-a",
      correlation: { placerOrderId: "opaque-placer-a" },
      resourceType: "DiagnosticReport",
      status: "pending_clinical_review",
      receivedAt: "2026-09-15T00:01:00.000Z",
      hasNarrativeContent: true,
    };
    expect(artifact.status).toBe("pending_clinical_review");
    expect(artifact.externalMessageId).toBeTruthy();
  });
});
