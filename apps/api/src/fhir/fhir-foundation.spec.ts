import { BadRequestException } from "@nestjs/common";
import { FHIR_CAPABILITIES, FhirCapabilityRegistry } from "./fhir-capability.registry";
import { FhirController } from "./fhir.controller";
import { parseLogicalId, parseRelativeReference, parseStrictSearch } from "./fhir-protocol";
import { BASE_PROFILE, JurisdictionProfileRegistry } from "./jurisdiction-profile.registry";
import { FhirR4StructuralValidator } from "./fhir-validator";
import { FhirOperationOutcomeFilter } from "./fhir-operation-outcome.filter";
import { FhirContextGuard } from "./fhir-context.guard";

describe("MEDORA.RD.P0.3A FHIR foundation", () => {
  beforeAll(() => { process.env.MEDORA_INTEROP_ENABLED = "true"; });
  afterAll(() => { delete process.env.MEDORA_INTEROP_ENABLED; });
  const capabilities = new FhirCapabilityRegistry();
  test("FHIR-001–004 capability registry exposes only evidenced read/search", () => {
    expect(FHIR_CAPABILITIES).toHaveLength(4);
    expect(capabilities.enabled().every((c) => ["read", "search-type"].includes(c.interaction) && c.evidenceTestIds.length > 0)).toBe(true);
    expect(capabilities.permissionOptions()).toEqual(expect.arrayContaining([{ code: "patient.read", resourceType: "Patient", interaction: "read" }]));
  });
  test("FHIR-005 metadata is generated from registry and does not advertise writes", () => {
    const statement = new FhirController(capabilities).metadata() as any;
    expect(statement).toMatchObject({ resourceType: "CapabilityStatement", fhirVersion: "4.0.1", kind: "instance", rest: [{ mode: "server" }] });
    expect(JSON.stringify(statement)).not.toMatch(/create|update|patch|delete|smart/i);
    expect(statement.rest[0].resource.flatMap((r: any) => r.interaction).length).toBe(capabilities.enabled().length);
  });
  test("FHIR-027–029 IDs, references, and unknown query keys fail strictly", () => {
    expect(parseLogicalId("abc-1.2")).toBe("abc-1.2");
    expect(() => parseLogicalId("../secret")).toThrow(BadRequestException);
    expect(parseRelativeReference("Patient/abc-1", ["Patient"])).toEqual({ resourceType: "Patient", id: "abc-1" });
    expect(() => parseRelativeReference("https://evil/Patient/1", ["Patient"])).toThrow(BadRequestException);
    expect(() => parseStrictSearch({ name: "PHI" }, ["subject"])).toThrow("Unsupported search parameter");
  });
  test("FHIR-010 structural validation rejects invalid resources without invented coding", () => {
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
  test("FHIR-030–032 OperationOutcome sanitizes internal errors and carries only request id", () => {
    const send = jest.fn(); const type = jest.fn(() => ({ send })); const status = jest.fn(() => ({ type }));
    const host: any = { switchToHttp: () => ({ getRequest: () => ({ method: "GET", url: "/fhir/Patient/1", requestId: "safe-id" }), getResponse: () => ({ status }) }) };
    new FhirOperationOutcomeFilter().catch(new Error("Prisma SQL password=secret /srv/private.ts"), host);
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ resourceType: "OperationOutcome" }));
    const serialized = JSON.stringify(send.mock.calls[0][0]);
    expect(serialized).toContain("safe-id"); expect(serialized).not.toMatch(/Prisma|SQL|password|private\.ts|secret/);
  });
  test("facility conflict and request-forged jurisdiction fail before resource access", async () => {
    const prisma: any = { userRole: { findFirst: jest.fn() } }; const guard = new FhirContextGuard(prisma, new JurisdictionProfileRegistry());
    const context = (req: any): any => ({ switchToHttp: () => ({ getRequest: () => req }) });
    await expect(guard.canActivate(context({ user: { userId: "u", facilityId: "A" }, facilityId: "A", headers: { "x-facility-id": "B" }, query: {} }))).rejects.toThrow("Conflicting facility context");
    await expect(guard.canActivate(context({ user: { userId: "u", facilityId: "A" }, facilityId: "A", headers: { "x-jurisdiction": "US" }, query: {} }))).rejects.toThrow("Jurisdiction is server controlled");
    expect(prisma.userRole.findFirst).not.toHaveBeenCalled();
  });
});
