import { FhirCapabilityRegistry } from "./fhir-capability.registry";
import { fhirInboundProposalSchema } from "./fhir-inbound-proposal.service";

const patientId = "11111111-1111-4111-8111-111111111111";
const encounterId = "22222222-2222-4222-8222-222222222222";
const coding = { system: "http://loinc.org", code: "8867-4", display: "Heart rate" };

describe("P0.3F staged FHIR proposal contract", () => {
  const previousInterop = process.env.MEDORA_INTEROP_ENABLED;

  afterAll(() => {
    if (previousInterop === undefined) delete process.env.MEDORA_INTEROP_ENABLED;
    else process.env.MEDORA_INTEROP_ENABLED = previousInterop;
  });

  it("accepts a bounded Observation proposal without treating it as a canonical write", () => {
    const parsed = fhirInboundProposalSchema.safeParse({
      externalMessageId: "ext-observation-1",
      resource: {
        resourceType: "Observation",
        status: "final",
        code: { coding: [coding] },
        subject: { reference: `Patient/${patientId}` },
        encounter: { reference: `Encounter/${encounterId}` },
        effectiveDateTime: "2026-09-13T12:00:00-05:00",
        valueQuantity: { value: 88, unit: "beats/min", system: "http://unitsofmeasure.org", code: "/min" },
      },
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects attachment-bearing DiagnosticReport payloads from the initial proposal contract", () => {
    const parsed = fhirInboundProposalSchema.safeParse({
      externalMessageId: "ext-report-1",
      resource: {
        resourceType: "DiagnosticReport",
        status: "final",
        code: { coding: [{ system: "http://loinc.org", code: "24323-8" }] },
        subject: { reference: `Patient/${patientId}` },
        presentedForm: [{ contentType: "application/pdf", data: "c2VjcmV0" }],
      },
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects unknown or broad payload fields rather than silently stripping them", () => {
    const parsed = fhirInboundProposalSchema.safeParse({
      externalMessageId: "ext-condition-1",
      resource: {
        resourceType: "Condition",
        code: { coding: [{ system: "http://hl7.org/fhir/sid/icd-10-cm", code: "I10" }] },
        subject: { reference: `Patient/${patientId}` },
        dangerousUnreviewedWrite: true,
      },
    });
    expect(parsed.success).toBe(false);
  });

  it("adds explicit propose grants without advertising FHIR create/update capabilities", () => {
    process.env.MEDORA_INTEROP_ENABLED = "true";
    const registry = new FhirCapabilityRegistry();
    const permissions = registry.permissionOptions();
    expect(permissions).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "observation.propose", resourceType: "Observation", interaction: "propose" }),
      expect.objectContaining({ code: "condition.propose", resourceType: "Condition", interaction: "propose" }),
      expect.objectContaining({ code: "serviceRequest.propose", resourceType: "ServiceRequest", interaction: "propose" }),
      expect.objectContaining({ code: "diagnosticReport.propose", resourceType: "DiagnosticReport", interaction: "propose" }),
    ]));
    expect(registry.enabled().some((capability) => ["create", "update", "patch", "delete"].includes(capability.interaction))).toBe(false);
  });
});
