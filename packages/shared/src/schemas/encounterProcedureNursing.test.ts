import { describe, expect, it } from "vitest";
import {
  isProviderProcedureDocumentationForBilling,
  nursingProcedureAssistDocumentDtoSchema,
  readDocumentationRoleFromPayload,
} from "./encounterProcedureNursing.js";

describe("encounterProcedureNursing (19M.3)", () => {
  it("parses nursing assist payload with documentationRole NURSING", () => {
    const parsed = nursingProcedureAssistDocumentDtoSchema.safeParse({
      procedureType: "NURSING_PROCEDURE_ASSIST",
      documentationRole: "NURSING",
      assistedProcedureType: "INTUBATION",
      suppliesPrepared: true,
      timeoutWitness: "CONFIRMED",
      specimensCollected: false,
      specimensSentToLab: false,
      patientTolerance: "TOLERATED_WELL",
      postProcedureCareGiven: true,
      providerNotified: false,
    });
    expect(parsed.success).toBe(true);
  });

  it("reads documentation role from payload with provider default", () => {
    expect(readDocumentationRoleFromPayload({ procedureType: "EKG" })).toBe("PROVIDER");
    expect(readDocumentationRoleFromPayload({ procedureType: "EKG", documentationRole: "NURSING" })).toBe("NURSING");
  });

  it("excludes nursing documentation from billing eligibility", () => {
    expect(
      isProviderProcedureDocumentationForBilling({
        procedureType: "LACERATION_REPAIR",
        documentationRole: "PROVIDER",
      })
    ).toBe(true);
    expect(
      isProviderProcedureDocumentationForBilling({
        procedureType: "GLUCOSE_CHECK",
        documentationRole: "NURSING",
      })
    ).toBe(false);
    expect(
      isProviderProcedureDocumentationForBilling({
        procedureType: "NURSING_PROCEDURE_ASSIST",
        documentationRole: "NURSING",
        assistedProcedureType: "INTUBATION",
      })
    ).toBe(false);
  });
});
