import { describe, expect, it } from "vitest";
import { isProviderProcedureDocumentationForBilling, PROCEDURE_DOCUMENT_PAYLOAD_VERSION } from "@medora/shared";

describe("splint application provider vs nursing tracks (19M.3B)", () => {
  it("provider splint uses canonical procedureType and PROVIDER role for billing support eligibility", () => {
    const payload = {
      procedureType: "SPLINT_APPLICATION",
      documentationRole: "PROVIDER",
      payloadVersion: PROCEDURE_DOCUMENT_PAYLOAD_VERSION,
      extremitySite: "RIGHT_WRIST",
      splintType: "VOLAR_SPLINT",
    };
    expect(payload.procedureType).toBe("SPLINT_APPLICATION");
    expect(isProviderProcedureDocumentationForBilling(payload)).toBe(true);
  });

  it("nursing splint uses canonical procedureType and NURSING role without billing authority", () => {
    const assistPayload = {
      procedureType: "SPLINT_APPLICATION",
      documentationRole: "NURSING",
      payloadVersion: PROCEDURE_DOCUMENT_PAYLOAD_VERSION,
      suppliesPrepared: true,
      timeoutWitness: "CONFIRMED",
      specimensCollected: false,
      specimensSentToLab: false,
      patientTolerance: "TOLERATED_WELL",
      postProcedureCareGiven: true,
      providerNotified: false,
    };
    expect(assistPayload.procedureType).toBe("SPLINT_APPLICATION");
    expect(isProviderProcedureDocumentationForBilling(assistPayload)).toBe(false);
  });
});
