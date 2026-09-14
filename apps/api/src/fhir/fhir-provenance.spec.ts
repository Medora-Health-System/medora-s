import { BadRequestException, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { hashCanonicalJson } from "../encounters/chart-export-hash.util";
import { FHIR_CAPABILITIES, FhirCapabilityRegistry } from "./fhir-capability.registry";
import { FhirProvenanceService } from "./fhir-provenance.service";
import { FhirSearchService } from "./fhir-search";

function sourceRow(overrides: Record<string, unknown> = {}) {
  const clinicalSnapshotJson = { schemaVersion: 1, signedClinicalContent: { providerNote: "signed snapshot" } };
  return {
    id: "prov-1",
    encounterId: "enc-1",
    facilityId: "fac-a",
    patientId: "pat-1",
    versionNumber: 1,
    signedAt: new Date("2026-09-14T12:00:00.000Z"),
    signedByUserId: "provider-1",
    clinicalSnapshotJson,
    snapshotHash: hashCanonicalJson(clinicalSnapshotJson).hash,
    previousVersionId: null,
    ...overrides,
  };
}

describe("FHIR Phase 2D Provenance", () => {
  beforeEach(() => { process.env.MEDORA_INTEROP_ENABLED = "true"; });
  afterEach(() => { delete process.env.MEDORA_INTEROP_ENABLED; });

  test("registry exposes exact read/search scopes only", () => {
    const registry = new FhirCapabilityRegistry();
    expect(registry.enabled().filter((entry) => entry.resourceType === "Provenance").map((entry) => [entry.interaction, entry.futureM2mScope])).toEqual([
      ["read", "provenance.read"],
      ["search-type", "provenance.search"],
    ]);
    expect(FHIR_CAPABILITIES.some((entry) => entry.resourceType === "Provenance" && ["create", "update", "patch", "delete"].includes(entry.interaction))).toBe(false);
  });

  test("verified signed documentation projects without narrative disclosure", async () => {
    const row = sourceRow();
    const prisma = { encounterProviderDocumentationVersion: { findFirst: jest.fn(async () => row) } } as any;
    const audit = { log: jest.fn() } as any;
    const service = new FhirProvenanceService(prisma, new FhirSearchService({ get: () => "https://fhir.example.test/fhir" } as any), audit);
    const resource = await service.read("fac-a", "prov-1");
    expect(resource).toMatchObject({
      resourceType: "Provenance",
      id: "prov-1",
      target: [{ reference: "Encounter/enc-1" }, { reference: "Patient/pat-1" }],
      recorded: "2026-09-14T12:00:00.000Z",
      agent: [{ who: { reference: "Practitioner/provider-1" }, onBehalfOf: { reference: "Organization/fac-a" } }],
    });
    expect(JSON.stringify(resource)).not.toContain("signed snapshot");
    expect(audit.log).not.toHaveBeenCalled();
  });

  test("foreign facility read is indistinguishable from missing", async () => {
    const prisma = { encounterProviderDocumentationVersion: { findFirst: jest.fn(async () => null) } } as any;
    const service = new FhirProvenanceService(prisma, new FhirSearchService({ get: () => "https://fhir.example.test/fhir" } as any), { log: jest.fn() } as any);
    await expect(service.read("fac-b", "prov-1")).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.encounterProviderDocumentationVersion.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "prov-1", facilityId: "fac-b" } }));
  });

  test("tampered signed snapshot fails closed with PHI-minimized audit metadata", async () => {
    const row = sourceRow({ snapshotHash: "0".repeat(64) });
    const prisma = { encounterProviderDocumentationVersion: { findFirst: jest.fn(async () => row) } } as any;
    const audit = { log: jest.fn(async () => undefined) } as any;
    const service = new FhirProvenanceService(prisma, new FhirSearchService({ get: () => "https://fhir.example.test/fhir" } as any), audit);
    await expect(service.read("fac-a", "prov-1")).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(audit.log).toHaveBeenCalledTimes(1);
    const metadata = audit.log.mock.calls[0][2].metadata;
    expect(metadata).toEqual({ event: "FHIR_PROVENANCE_SOURCE_INTEGRITY_FAILURE", resourceType: "Provenance", versionNumber: 1 });
    expect(JSON.stringify(metadata)).not.toContain("signed snapshot");
    expect(JSON.stringify(metadata)).not.toContain(row.snapshotHash);
  });

  test("search remains facility scoped and filters signed lineage", async () => {
    const row = sourceRow();
    const prisma = { encounterProviderDocumentationVersion: { findMany: jest.fn(async () => [row]) } } as any;
    const service = new FhirProvenanceService(prisma, new FhirSearchService({ get: () => "https://fhir.example.test/fhir" } as any), { log: jest.fn() } as any);
    const bundle: any = await service.find("fac-a", {
      target: "Encounter/enc-1",
      patient: "Patient/pat-1",
      agent: "Practitioner/provider-1",
      recorded: "2026-09-14",
    });
    expect(bundle).toMatchObject({ resourceType: "Bundle", type: "searchset" });
    expect(bundle.entry[0].resource.id).toBe("prov-1");
    expect(prisma.encounterProviderDocumentationVersion.findMany.mock.calls[0][0].where).toMatchObject({
      facilityId: "fac-a",
      encounterId: "enc-1",
      patientId: "pat-1",
      signedByUserId: "provider-1",
    });
    await expect(service.find("fac-a", { recorded: "09/14/2026" })).rejects.toBeInstanceOf(BadRequestException);
  });
});
