import { BadRequestException } from "@nestjs/common";
import { FHIR_CAPABILITIES, FhirCapabilityRegistry } from "./fhir-capability.registry";
import { FhirController } from "./fhir.controller";
import { parseLogicalId, parseRelativeReference, parseStrictSearch } from "./fhir-protocol";
import { BASE_PROFILE, JurisdictionProfileRegistry } from "./jurisdiction-profile.registry";
import { FhirR4StructuralValidator } from "./fhir-validator";
import { FhirOperationOutcomeFilter } from "./fhir-operation-outcome.filter";
import { FhirContextGuard } from "./fhir-context.guard";
import { RoleCode } from "@prisma/client";
import { FHIR_CAPABILITY_METADATA } from "./fhir-capability.guard";
import { FhirPatientController } from "./fhir-patient.controller";
import { FhirEncounterController } from "./fhir-encounter.controller";
import { FhirObservationController } from "./fhir-observation.controller";
import { FhirAllergyIntoleranceController } from "./fhir-allergy-intolerance.controller";
import { FhirMedicationAdministrationController, FhirMedicationRequestController } from "./fhir-medication.controller";

describe("MEDORA.RD.P0.3A FHIR foundation", () => {
  beforeAll(() => { process.env.MEDORA_INTEROP_ENABLED = "true"; });
  afterAll(() => { delete process.env.MEDORA_INTEROP_ENABLED; });
  const capabilities = new FhirCapabilityRegistry();
  test("FHIR capability registry exposes only evidenced read/search", () => {
    expect(FHIR_CAPABILITIES).toHaveLength(20);
    expect(capabilities.enabled().every((c) => ["read", "search-type"].includes(c.interaction) && c.evidenceTestIds.length > 0)).toBe(true);
    expect(capabilities.permissionOptions()).toEqual(expect.arrayContaining([
      { code: "patient.read", resourceType: "Patient", interaction: "read" },
      { code: "allergyIntolerance.read", resourceType: "AllergyIntolerance", interaction: "read" },
      { code: "allergyIntolerance.search", resourceType: "AllergyIntolerance", interaction: "search-type" },
      { code: "medicationRequest.read", resourceType: "MedicationRequest", interaction: "read" },
      { code: "medicationRequest.search", resourceType: "MedicationRequest", interaction: "search-type" },
      { code: "medicationAdministration.read", resourceType: "MedicationAdministration", interaction: "read" },
      { code: "medicationAdministration.search", resourceType: "MedicationAdministration", interaction: "search-type" },
    ]));
    for (const resourceType of ["Observation", "AllergyIntolerance", "MedicationRequest", "MedicationAdministration"] as const) {
      expect(capabilities.enabled().find((c) => c.resourceType === resourceType && c.interaction === "read")?.humanRoles).not.toContain(RoleCode.FRONT_DESK);
    }
  });
  test("admin onboarding can stage evidenced scopes while runtime FHIR exposure remains fail-closed", () => {
    process.env.MEDORA_INTEROP_ENABLED = "false";
    expect(capabilities.enabled()).toEqual([]);
    expect(capabilities.permissionOptions()).toEqual(expect.arrayContaining([{ code: "patient.read", resourceType: "Patient", interaction: "read" }]));
    expect(() => capabilities.assertPermissionCodes(["patient.read"])).not.toThrow();
    expect(() => capabilities.assertPermissionCodes(["patient.delete"])).toThrow("UNSUPPORTED_INTEGRATION_PERMISSION");
    process.env.MEDORA_INTEROP_ENABLED = "true";
  });
  test("FHIR metadata is generated from registry and does not advertise writes", () => {
    const statement = new FhirController(capabilities).metadata() as any;
    expect(statement).toMatchObject({ resourceType: "CapabilityStatement", fhirVersion: "4.0.1", kind: "instance", rest: [{ mode: "server" }] });
    expect(JSON.stringify(statement)).not.toMatch(/create|update|patch|delete|smart/i);
    expect(statement.rest[0].resource.flatMap((r: any) => r.interaction).length).toBe(capabilities.enabled().length);
  });
  test("FHIR IDs, references, and unknown query keys fail strictly", () => {
    expect(parseLogicalId("abc-1.2")).toBe("abc-1.2");
    expect(() => parseLogicalId("../secret")).toThrow(BadRequestException);
    expect(parseRelativeReference("Patient/abc-1", ["Patient"])).toEqual({ resourceType: "Patient", id: "abc-1" });
    expect(() => parseRelativeReference("https://evil/Patient/1", ["Patient"])).toThrow(BadRequestException);
    expect(() => parseStrictSearch({ name: "PHI" }, ["subject"])).toThrow("Unsupported search parameter");
  });
  test("FHIR structural validation rejects invalid resources without invented coding", () => {
    const validator = new FhirR4StructuralValidator();
    expect(validator.validate({ resourceType: "Patient", id: "valid-1" })).toEqual([]);
    expect(validator.validate({ id: "valid-1" })).toEqual(expect.arrayContaining([expect.objectContaining({ path: "resourceType" })]));
  });
  test("jurisdiction registry fails closed on conflict, checksum, retirement, dependencies", () => {
    expect(new JurisdictionProfileRegistry().resolve("HT")[0]).toBe(BASE_PROFILE);
    expect(() => new JurisdictionProfileRegistry([{ ...BASE_PROFILE, checksum: "bad" }])).toThrow("FHIR_PROFILE_INVALID");
    expect(() => new JurisdictionProfileRegistry([BASE_PROFILE, { ...BASE_PROFILE }])).toThrow("FHIR_PROFILE_CONFLICT");
    expect(new JurisdictionProfileRegistry().resolve("US")).toEqual(new JurisdictionProfileRegistry().resolve("HT"));
  });
  test("OperationOutcome sanitizes internal errors and carries only request id", () => {
    const send = jest.fn(); const type = jest.fn(() => ({ send })); const status = jest.fn(() => ({ type }));
    const host: any = { switchToHttp: () => ({ getRequest: () => ({ method: "GET", url: "/fhir/Patient/1", requestId: "safe-id" }), getResponse: () => ({ status }) }) };
    new FhirOperationOutcomeFilter().catch(new Error("Internal database diagnostic /srv/private.ts"), host);
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ resourceType: "OperationOutcome" }));
    const serialized = JSON.stringify(send.mock.calls[0][0]);
    expect(serialized).toContain("safe-id"); expect(serialized).not.toMatch(/database diagnostic|private\.ts/);
    send.mockClear();
    new FhirOperationOutcomeFilter().catch(new BadRequestException("MRN 123 hostile internal detail /srv/app.ts SQL"), host);
    const hostile = JSON.stringify(send.mock.calls[0][0]);
    expect(hostile).toContain("Invalid FHIR request");
    expect(hostile).not.toMatch(/MRN|hostile|srv|SQL|123/);
  });
  test("facility conflict and request-forged jurisdiction fail before resource access", async () => {
    const prisma: any = { userRole: { findFirst: jest.fn() } }; const guard = new FhirContextGuard(prisma, new JurisdictionProfileRegistry());
    const context = (req: any): any => ({ switchToHttp: () => ({ getRequest: () => req }) });
    await expect(guard.canActivate(context({ user: { userId: "u", facilityId: "A" }, facilityId: "A", headers: { "x-facility-id": "B" }, query: {} }))).rejects.toThrow("Conflicting facility context");
    await expect(guard.canActivate(context({ user: { userId: "u", facilityId: "A" }, facilityId: "A", headers: { "x-jurisdiction": "US" }, query: {} }))).rejects.toThrow("Jurisdiction is server controlled");
    expect(prisma.userRole.findFirst).not.toHaveBeenCalled();
  });
  test("every enabled route declares the matching registry capability and role metadata cannot exceed it", () => {
    const routes = [
      [FhirPatientController.prototype.read, "Patient", "read"],
      [FhirEncounterController.prototype.read, "Encounter", "read"],
      [FhirObservationController.prototype.read, "Observation", "read"],
      [FhirObservationController.prototype.search, "Observation", "search-type"],
      [FhirAllergyIntoleranceController.prototype.read, "AllergyIntolerance", "read"],
      [FhirAllergyIntoleranceController.prototype.find, "AllergyIntolerance", "search-type"],
      [FhirMedicationRequestController.prototype.read, "MedicationRequest", "read"],
      [FhirMedicationRequestController.prototype.find, "MedicationRequest", "search-type"],
      [FhirMedicationAdministrationController.prototype.read, "MedicationAdministration", "read"],
      [FhirMedicationAdministrationController.prototype.find, "MedicationAdministration", "search-type"],
    ] as const;
    for (const [handler, resourceType, interaction] of routes) {
      expect(Reflect.getMetadata(FHIR_CAPABILITY_METADATA, handler)).toEqual({ resourceType, interaction });
      const capability = capabilities.enabled().find((c) => c.resourceType === resourceType && c.interaction === interaction)!;
      expect(Reflect.getMetadata("roles", handler).every((role: RoleCode) => capability.humanRoles.includes(role))).toBe(true);
    }
  });
});
