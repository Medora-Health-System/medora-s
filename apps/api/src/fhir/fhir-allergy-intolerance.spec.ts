import { NotFoundException } from "@nestjs/common";
import { FhirAllergyIntoleranceService, allergyLogicalId, mapAllergyIntolerance } from "./fhir-allergy-intolerance.service";
import { FhirSearchService } from "./fhir-search";
import { FHIR_CAPABILITIES } from "./fhir-capability.registry";

const FACILITY_A = "11111111-1111-1111-1111-111111111111";
const FACILITY_B = "22222222-2222-2222-2222-222222222222";
const PATIENT_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PATIENT_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function profile(entries: unknown[], nkda = false) {
  return {
    version: "19T.3",
    updatedAt: "2026-09-14T20:00:00.000Z",
    provenance: {},
    allergies: { entries, nkda },
  };
}

function makeService() {
  const patients = [
    {
      id: PATIENT_A,
      facilityId: FACILITY_A,
      clinicalHistoryProfileJson: profile([
        {
          id: "penicillin",
          substance: "Penicillin",
          reaction: "Hives",
          severity: "SEVERE",
          verificationStatus: "CLINICIAN_VERIFIED",
          status: "ACTIVE",
          updatedAt: "2026-09-14T18:30:00.000Z",
        },
        {
          id: "latex",
          substance: "Latex",
          reaction: "Rash",
          severity: "MILD",
          verificationStatus: "PATIENT_REPORTED",
          status: "INACTIVE",
          updatedAt: "2026-09-13T18:30:00.000Z",
        },
      ]),
    },
    {
      id: PATIENT_B,
      facilityId: FACILITY_B,
      clinicalHistoryProfileJson: profile([
        {
          id: "secret-other-facility",
          substance: "Other facility allergy",
          status: "ACTIVE",
          verificationStatus: "CLINICIAN_VERIFIED",
        },
      ]),
    },
  ];

  const prisma: any = {
    patient: {
      findFirst: jest.fn(async ({ where }: any) =>
        patients.find((p) => p.id === where.id && p.facilityId === where.facilityId) ?? null
      ),
      findMany: jest.fn(async ({ where, take }: any) => {
        let rows = patients.filter((p) => p.facilityId === where.facilityId);
        if (typeof where.id === "string") rows = rows.filter((p) => p.id === where.id);
        else if (where.id?.gte) rows = rows.filter((p) => p.id >= where.id.gte);
        else if (where.id?.gt) rows = rows.filter((p) => p.id > where.id.gt);
        return rows.sort((a, b) => a.id.localeCompare(b.id)).slice(0, take);
      }),
    },
  };
  const search = new FhirSearchService({ get: (key: string) => key === "FHIR_PUBLIC_BASE_URL" ? "https://api.medoras.com/fhir" : undefined } as any);
  return { service: new FhirAllergyIntoleranceService(prisma, search), prisma };
}

describe("FHIR Phase 2A AllergyIntolerance", () => {
  it("advertises only read/search scopes and standard safe search parameters", () => {
    const caps = FHIR_CAPABILITIES.filter((c) => c.resourceType === "AllergyIntolerance");
    expect(caps).toHaveLength(2);
    expect(caps.map((c) => c.futureM2mScope)).toEqual([
      "allergyIntolerance.read",
      "allergyIntolerance.search",
    ]);
    expect(caps.find((c) => c.interaction === "search-type")?.searchParameters).toEqual([
      "_id", "patient", "clinical-status", "verification-status", "date", "_count", "_cursor",
    ]);
  });

  it("maps the governed structured allergy entry without inventing coding", () => {
    const resource = mapAllergyIntolerance(PATIENT_A, {
      id: "penicillin",
      substance: "Penicillin",
      reaction: "Hives",
      severity: "ANAPHYLAXIS",
      verificationStatus: "CLINICIAN_VERIFIED",
      status: "ACTIVE",
      updatedAt: "2026-09-14T18:30:00.000Z",
    });
    expect(resource).toMatchObject({
      resourceType: "AllergyIntolerance",
      clinicalStatus: { coding: [{ code: "active" }] },
      verificationStatus: { coding: [{ code: "confirmed" }] },
      code: { text: "Penicillin" },
      patient: { reference: `Patient/${PATIENT_A}` },
      reaction: [{ manifestation: [{ text: "Hives" }], severity: "severe" }],
    });
    expect(JSON.stringify(resource)).not.toMatch(/RxNorm|SNOMED|medicationAllergiesDetail/);
  });

  it("keeps reads facility scoped and returns 404 for a foreign-facility logical id", async () => {
    const { service } = makeService();
    const ownId = allergyLogicalId(PATIENT_A, "penicillin");
    await expect(service.read(FACILITY_A, ownId)).resolves.toMatchObject({
      id: ownId,
      code: { text: "Penicillin" },
    });

    const foreignId = allergyLogicalId(PATIENT_B, "secret-other-facility");
    await expect(service.read(FACILITY_A, foreignId)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("searches only the authorized facility and supports patient/status/date filters", async () => {
    const { service } = makeService();
    const bundle: any = await service.find(FACILITY_A, {
      patient: `Patient/${PATIENT_A}`,
      "clinical-status": "active",
      "verification-status": "confirmed",
      date: "2026-09-14",
      _count: "10",
    });
    expect(bundle.resourceType).toBe("Bundle");
    expect(bundle.type).toBe("searchset");
    expect(bundle.entry).toHaveLength(1);
    expect(bundle.entry[0].resource.code.text).toBe("Penicillin");
    expect(JSON.stringify(bundle)).not.toContain("Other facility allergy");
  });

  it("paginates by stable opaque logical ids without duplicating rows", async () => {
    const { service } = makeService();
    const first: any = await service.find(FACILITY_A, { patient: `Patient/${PATIENT_A}`, _count: "1" });
    expect(first.entry).toHaveLength(1);
    const nextUrl = first.link.find((x: any) => x.relation === "next")?.url;
    expect(nextUrl).toBeTruthy();
    const cursor = new URL(nextUrl).searchParams.get("_cursor")!;
    const second: any = await service.find(FACILITY_A, { patient: `Patient/${PATIENT_A}`, _count: "1", _cursor: cursor });
    expect(second.entry).toHaveLength(1);
    expect(second.entry[0].resource.id).not.toBe(first.entry[0].resource.id);
  });

  it("does not synthesize AllergyIntolerance resources from NKDA or legacy free text alone", async () => {
    const search = new FhirSearchService({ get: () => "https://api.medoras.com/fhir" } as any);
    const prisma: any = {
      patient: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: PATIENT_A,
            clinicalHistoryProfileJson: {
              version: "19T.3",
              updatedAt: "2026-09-14T20:00:00.000Z",
              provenance: {},
              allergies: { nkda: true, allergyNote: "NKDA", medicationAllergiesDetail: "legacy text" },
            },
          },
        ]),
      },
    };
    const service = new FhirAllergyIntoleranceService(prisma, search);
    const bundle: any = await service.find(FACILITY_A, { _count: "10" });
    expect(bundle.entry).toEqual([]);
  });
});
