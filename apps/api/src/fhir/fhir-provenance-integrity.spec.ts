import { BadRequestException, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { hashCanonicalJson } from "../encounters/chart-export-hash.util";
import { FHIR_CAPABILITIES, FhirCapabilityRegistry } from "./fhir-capability.registry";
import { decorateFhirReadResource } from "./fhir-media.interceptor";
import { FhirProvenanceService } from "./fhir-provenance.service";
import { FhirSearchService } from "./fhir-search";
import { FHIR_TERMINOLOGY_SYSTEMS, verifiedCoding, verifiedTerminologyVersion } from "./fhir-terminology";

const row = (overrides: Record<string, unknown> = {}) => {
  const clinicalSnapshotJson = { schemaVersion: 1, signedClinicalContent: { providerNote: "stable signed text" } };
  return {
    id: "prov-1",
    encounterId: "enc-1",
    facilityId: "fac-a",
    patientId: "pat-1",
    versionNumber: 1,
    signedAt: new Date("2026-09-13T12:00:00.000Z"),
    signedByUserId: "provider-1",
    clinicalSnapshotJson,
    snapshotHash: hashCanonicalJson(clinicalSnapshotJson).hash,
    previousVersionId: null,
    createdAt: new Date("2026-09-13T12:00:00.000Z"),
    ...overrides,
  };
};

describe("MEDORA.RD.P0.3G FHIR provenance, integrity, terminology and concurrency hardening", () => {
  const previousInterop = process.env.MEDORA_INTEROP_ENABLED;
  const previousIcd = process.env.FHIR_ICD10CM_VERSION;

  afterEach(() => {
    if (previousInterop === undefined) delete process.env.MEDORA_INTEROP_ENABLED;
    else process.env.MEDORA_INTEROP_ENABLED = previousInterop;
    if (previousIcd === undefined) delete process.env.FHIR_ICD10CM_VERSION;
    else process.env.FHIR_ICD10CM_VERSION = previousIcd;
  });

  test("Provenance is read/search only and obtains exact machine scopes from the capability registry", () => {
    process.env.MEDORA_INTEROP_ENABLED = "true";
    const registry = new FhirCapabilityRegistry();
    const provenance = registry.enabled().filter((entry) => entry.resourceType === "Provenance");
    expect(provenance.map((entry) => [entry.interaction, entry.futureM2mScope])).toEqual([
      ["read", "provenance.read"],
      ["search-type", "provenance.search"],
    ]);
    expect(FHIR_CAPABILITIES.some((entry) => entry.resourceType === "Provenance" && ["create", "update", "patch", "delete"].includes(entry.interaction))).toBe(false);
  });

  test("terminology releases are emitted only when explicitly configured and invalid operator values fail closed", () => {
    delete process.env.FHIR_ICD10CM_VERSION;
    expect(verifiedTerminologyVersion(FHIR_TERMINOLOGY_SYSTEMS.ICD10_CM)).toBeUndefined();
    expect(verifiedCoding(FHIR_TERMINOLOGY_SYSTEMS.ICD10_CM, "I10")).toEqual({ system: FHIR_TERMINOLOGY_SYSTEMS.ICD10_CM, code: "I10" });

    process.env.FHIR_ICD10CM_VERSION = "2026";
    expect(verifiedCoding(FHIR_TERMINOLOGY_SYSTEMS.ICD10_CM, "I10")).toEqual({ system: FHIR_TERMINOLOGY_SYSTEMS.ICD10_CM, version: "2026", code: "I10" });

    process.env.FHIR_ICD10CM_VERSION = "invalid version with spaces";
    expect(() => verifiedTerminologyVersion(FHIR_TERMINOLOGY_SYSTEMS.ICD10_CM)).toThrow("Invalid FHIR_ICD10CM_VERSION");
  });

  test("same-facility signed documentation projects to Provenance after source hash verification", async () => {
    const source = row();
    const prisma = {
      encounterProviderDocumentationVersion: {
        findFirst: jest.fn(async ({ where }: any) => where.facilityId === "fac-a" && where.id === "prov-1" ? source : null),
      },
    } as any;
    const audit = { log: jest.fn() } as any;
    const service = new FhirProvenanceService(prisma, new FhirSearchService({ get: () => "https://fhir.example.test/fhir" } as any), audit);
    const resource: any = await service.read("fac-a", "prov-1");
    expect(resource).toMatchObject({
      resourceType: "Provenance",
      id: "prov-1",
      target: [{ reference: "Encounter/enc-1" }, { reference: "Patient/pat-1" }],
      recorded: "2026-09-13T12:00:00.000Z",
    });
    expect(resource.agent[0].who.reference).toBe("Practitioner/provider-1");
    expect(resource.entity[0].what.identifier.value).toBe(source.snapshotHash);
    expect(audit.log).not.toHaveBeenCalled();
  });

  test("foreign-facility Provenance reads are indistinguishable from missing resources", async () => {
    const prisma = { encounterProviderDocumentationVersion: { findFirst: jest.fn(async () => null) } } as any;
    const service = new FhirProvenanceService(prisma, new FhirSearchService({ get: () => "https://fhir.example.test/fhir" } as any), { log: jest.fn() } as any);
    await expect(service.read("fac-b", "prov-1")).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.encounterProviderDocumentationVersion.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "prov-1", facilityId: "fac-b" } }));
  });

  test("tampered signed snapshot fails closed and emits PHI-minimized integrity audit metadata", async () => {
    const tampered = row({ snapshotHash: "0".repeat(64) });
    const prisma = { encounterProviderDocumentationVersion: { findFirst: jest.fn(async () => tampered) } } as any;
    const audit = { log: jest.fn(async () => undefined) } as any;
    const service = new FhirProvenanceService(prisma, new FhirSearchService({ get: () => "https://fhir.example.test/fhir" } as any), audit);
    await expect(service.read("fac-a", "prov-1")).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(audit.log).toHaveBeenCalledTimes(1);
    const auditInput = audit.log.mock.calls[0][2];
    expect(auditInput.metadata).toEqual({ event: "FHIR_PROVENANCE_SOURCE_INTEGRITY_FAILURE", resourceType: "Provenance", versionNumber: 1 });
    expect(JSON.stringify(auditInput.metadata)).not.toContain("stable signed text");
    expect(JSON.stringify(auditInput.metadata)).not.toContain(tampered.snapshotHash);
  });

  test("Provenance search is tenant-bound and supports target/patient/agent/recorded filters", async () => {
    const source = row();
    const prisma = { encounterProviderDocumentationVersion: { findMany: jest.fn(async () => [source]) } } as any;
    const service = new FhirProvenanceService(prisma, new FhirSearchService({ get: () => "https://fhir.example.test/fhir" } as any), { log: jest.fn() } as any);
    const bundle: any = await service.searchProvenance("fac-a", {
      target: "Encounter/enc-1",
      patient: "Patient/pat-1",
      agent: "Practitioner/provider-1",
      recorded: "2026-09-13",
    });
    expect(bundle).toMatchObject({ resourceType: "Bundle", type: "searchset" });
    expect(bundle.entry[0].resource.id).toBe("prov-1");
    expect(prisma.encounterProviderDocumentationVersion.findMany.mock.calls[0][0].where).toMatchObject({
      facilityId: "fac-a",
      encounterId: "enc-1",
      patientId: "pat-1",
      signedByUserId: "provider-1",
    });
    await expect(service.searchProvenance("fac-a", { recorded: "09/13/2026" })).rejects.toBeInstanceOf(BadRequestException);
  });

  test("representation ETag/versionId is stable and changes when Provenance content changes", () => {
    const provenance = {
      resourceType: "Provenance",
      id: "prov-1",
      recorded: "2026-09-13T12:00:00.000Z",
      target: [{ reference: "Encounter/enc-1" }],
    };
    const first: any = decorateFhirReadResource(provenance);
    const same: any = decorateFhirReadResource({ ...provenance });
    const changed: any = decorateFhirReadResource({ ...provenance, recorded: "2026-09-13T12:01:00.000Z" });
    expect(first.etag).toBe(same.etag);
    expect(first.body.meta.versionId).toBe(same.body.meta.versionId);
    expect(changed.etag).not.toBe(first.etag);
  });
});
