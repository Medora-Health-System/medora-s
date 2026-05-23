import { describe, expect, it } from "vitest";
import {
  isNursingAssistMonitoringPayload,
  isProviderProcedureDocumentationForBilling,
  nursingProcedureDocumentDtoSchema,
  readCanonicalProcedureTypeFromPayload,
  readDocumentationRoleFromPayload,
} from "./encounterProcedureNursing.js";

describe("encounterProcedureNursing (19M.3A)", () => {
  it("uses canonical procedureType with documentationRole NURSING — not duplicated procedure types", () => {
    const parsed = nursingProcedureDocumentDtoSchema.safeParse({
      procedureType: "INTUBATION",
      documentationRole: "NURSING",
      payloadVersion: 1,
      suppliesPrepared: true,
      timeoutWitness: "CONFIRMED",
      specimensCollected: false,
      specimensSentToLab: false,
      patientTolerance: "TOLERATED_WELL",
      postProcedureCareGiven: true,
      providerNotified: false,
    });
    expect(parsed.success).toBe(true);
    expect(parsed.data?.procedureType).toBe("INTUBATION");
    expect(parsed.data?.documentationRole).toBe("NURSING");
  });

  it("normalizes legacy NURSING_PROCEDURE_ASSIST rows to canonical procedure identity", () => {
    expect(
      readCanonicalProcedureTypeFromPayload({
        procedureType: "NURSING_PROCEDURE_ASSIST",
        assistedProcedureType: "CENTRAL_LINE",
        documentationRole: "NURSING",
      })
    ).toBe("CENTRAL_LINE");
  });

  it("detects nursing assist payloads for separate validation path", () => {
    expect(
      isNursingAssistMonitoringPayload({
        procedureType: "PROCEDURAL_SEDATION",
        documentationRole: "NURSING",
        suppliesPrepared: true,
        timeoutWitness: "CONFIRMED",
      })
    ).toBe(true);
    expect(
      isNursingAssistMonitoringPayload({
        procedureType: "GLUCOSE_CHECK",
        documentationRole: "NURSING",
        resultMgDl: "110",
      })
    ).toBe(false);
  });

  it("separates billing authority to provider documentation only", () => {
    expect(
      isProviderProcedureDocumentationForBilling({
        procedureType: "INTUBATION",
        documentationRole: "PROVIDER",
        payloadVersion: 1,
      })
    ).toBe(true);
    expect(
      isProviderProcedureDocumentationForBilling({
        procedureType: "INTUBATION",
        documentationRole: "NURSING",
        payloadVersion: 1,
      })
    ).toBe(false);
    expect(readDocumentationRoleFromPayload({ procedureType: "INTUBATION", documentationRole: "NURSING" })).toBe(
      "NURSING"
    );
  });
});
