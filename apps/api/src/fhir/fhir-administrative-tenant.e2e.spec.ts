import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { DepartmentCode, EncounterStatus, EncounterType, RoleCode } from "@prisma/client";
import * as argon2 from "argon2";
import { randomBytes } from "crypto";
import * as request from "supertest";
import { AppModule } from "../app.module";
import { PrismaService } from "../prisma/prisma.service";
import { closeE2eApp, createE2eApp } from "../test-utils/e2e-app";
import { applyE2eAuthTestEnv, assertE2eLoginAccessToken } from "../test-utils/e2e-auth-env";

// Real AppModule, PostgreSQL, and Argon2 fixture creation exceed Jest's five-second default.
jest.setTimeout(30_000);

describe("P0.3B FHIR PostgreSQL tenant isolation (e2e)", () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let token: string;
  let facilityA: string; let facilityB: string;
  let patientA: string; let patientA2: string; let patientB: string;
  let encounterA: string; let encounterB: string;
  let practitionerA: string; let practitionerB: string;
  let roleA: string; let roleB: string;
  let locationA: string; let locationB: string;
  const suffix = randomBytes(5).toString("hex");
  const auth = () => ({ Authorization: `Bearer ${token}`, "x-facility-id": facilityA, Accept: "application/fhir+json" });

  beforeAll(async () => {
    applyE2eAuthTestEnv();
    process.env.MEDORA_INTEROP_ENABLED = "true";
    process.env.FHIR_PUBLIC_BASE_URL = "https://fhir.test.example/fhir";
    moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = await createE2eApp(moduleRef);
    prisma = moduleRef.get(PrismaService);
    const [fa, fb] = await Promise.all([
      prisma.facility.create({ data: { code: `FHIR-A-${suffix}`, name: "FHIR Facility A", country: "US", timezone: "UTC" } }),
      prisma.facility.create({ data: { code: `FHIR-B-${suffix}`, name: "FHIR Facility B", country: "US", timezone: "UTC" } }),
    ]);
    facilityA = fa.id; facilityB = fb.id;
    const provider = await prisma.role.upsert({ where: { code: RoleCode.PROVIDER }, update: {}, create: { code: RoleCode.PROVIDER, name: "Provider" } });
    const password = "Test123!";
    const [ua, ub] = await Promise.all([
      prisma.user.create({ data: { email: `a+${suffix}@fhir.test`, firstName: "Alice", lastName: "Provider", passwordHash: await argon2.hash(password), billingNpi: "1234567893" } }),
      prisma.user.create({ data: { email: `b+${suffix}@fhir.test`, firstName: "Bob", lastName: "Provider", passwordHash: await argon2.hash(password), billingNpi: "1245319599" } }),
    ]);
    practitionerA = ua.id; practitionerB = ub.id;
    const [ra, rb] = await Promise.all([
      prisma.userRole.create({ data: { userId: ua.id, roleId: provider.id, facilityId: facilityA, professionCode: "PROVIDER_UNSPECIFIED" } }),
      prisma.userRole.create({ data: { userId: ub.id, roleId: provider.id, facilityId: facilityB, professionCode: "PROVIDER_UNSPECIFIED" } }),
    ]);
    roleA = ra.id; roleB = rb.id;
    const [la, lb] = await Promise.all([
      prisma.department.create({ data: { facilityId: facilityA, code: DepartmentCode.PRIMARY_CARE, name: "A Primary Care" } }),
      prisma.department.create({ data: { facilityId: facilityB, code: DepartmentCode.PRIMARY_CARE, name: "B Primary Care" } }),
    ]);
    locationA = la.id; locationB = lb.id;
    const [pa, pa2, pb] = await Promise.all([
      prisma.patient.create({ data: { facilityId: facilityA, registeredAtFacilityId: facilityA, firstName: "Alpha", lastName: "Tenant", globalMrn: `GA-${suffix}`, mrn: `A-${suffix}` } }),
      prisma.patient.create({ data: { facilityId: facilityA, registeredAtFacilityId: facilityA, firstName: "Alpha2", lastName: "Tenant", globalMrn: `GA2-${suffix}`, mrn: `A2-${suffix}` } }),
      prisma.patient.create({ data: { facilityId: facilityB, registeredAtFacilityId: facilityB, firstName: "Beta", lastName: "Tenant", globalMrn: `GB-${suffix}`, mrn: `B-${suffix}` } }),
    ]);
    patientA = pa.id; patientA2 = pa2.id; patientB = pb.id;
    const [ea, eb] = await Promise.all([
      prisma.encounter.create({ data: { facilityId: facilityA, patientId: patientA, type: EncounterType.OUTPATIENT, status: EncounterStatus.OPEN } }),
      prisma.encounter.create({ data: { facilityId: facilityB, patientId: patientB, type: EncounterType.OUTPATIENT, status: EncounterStatus.OPEN } }),
    ]);
    encounterA = ea.id; encounterB = eb.id;
    const login = await request(app.getHttpServer()).post("/auth/login").send({ username: ua.email, password }).expect(201);
    token = assertE2eLoginAccessToken(login.body, ua.email);
  });

  afterAll(async () => {
    try {
      if (prisma) {
        await prisma.encounter.deleteMany({ where: { id: { in: [encounterA, encounterB].filter(Boolean) } } });
        await prisma.patient.deleteMany({ where: { id: { in: [patientA, patientA2, patientB].filter(Boolean) } } });
        await prisma.department.deleteMany({ where: { id: { in: [locationA, locationB].filter(Boolean) } } });
        await prisma.userRole.deleteMany({ where: { id: { in: [roleA, roleB].filter(Boolean) } } });
        await prisma.user.updateMany({ where: { id: { in: [practitionerA, practitionerB].filter(Boolean) } }, data: { isActive: false } });
        await prisma.facility.updateMany({ where: { id: { in: [facilityA, facilityB].filter(Boolean) } }, data: { isActive: false } });
      }
    } finally { await closeE2eApp({ app, moduleRef, prisma }); }
  });

  it("TENANT-01–06 scopes Patient and Encounter reads/searches", async () => {
    await request(app.getHttpServer()).get(`/fhir/Patient/${patientA}`).set(auth()).expect(200);
    await request(app.getHttpServer()).get(`/fhir/Patient/${patientB}`).set(auth()).expect(404);
    const patients = await request(app.getHttpServer()).get("/fhir/Patient").set(auth()).expect(200);
    expect(JSON.stringify(patients.body)).not.toContain(patientB);
    await request(app.getHttpServer()).get(`/fhir/Encounter/${encounterA}`).set(auth()).expect(200);
    await request(app.getHttpServer()).get(`/fhir/Encounter/${encounterB}`).set(auth()).expect(404);
    const encounters = await request(app.getHttpServer()).get("/fhir/Encounter").set(auth()).expect(200);
    expect(JSON.stringify(encounters.body)).not.toContain(encounterB);
  });

  it("TENANT-07–13 scopes Practitioner, role, Organization and Location", async () => {
    await request(app.getHttpServer()).get(`/fhir/Practitioner/${practitionerA}`).set(auth()).expect(200);
    await request(app.getHttpServer()).get(`/fhir/Practitioner/${practitionerB}`).set(auth()).expect(404);
    await request(app.getHttpServer()).get(`/fhir/PractitionerRole/${roleB}`).set(auth()).expect(404);
    const organizations = await request(app.getHttpServer()).get("/fhir/Organization").set(auth()).expect(200);
    expect(JSON.stringify(organizations.body)).toContain(facilityA); expect(JSON.stringify(organizations.body)).not.toContain(facilityB);
    await request(app.getHttpServer()).get(`/fhir/Organization/${facilityB}`).set(auth()).expect(404);
    await request(app.getHttpServer()).get(`/fhir/Location/${locationB}`).set(auth()).expect(404);
    const locations = await request(app.getHttpServer()).get("/fhir/Location").set(auth()).expect(200);
    expect(JSON.stringify(locations.body)).not.toContain(locationB);
  });

  it("TENANT-14/15 and cross-resource references resolve only inside A", async () => {
    const patient = await request(app.getHttpServer()).get(`/fhir/Patient/${patientA}`).set(auth()).expect(200);
    expect(patient.body.managingOrganization.reference).toBe(`Organization/${facilityA}`);
    const encounter = await request(app.getHttpServer()).get(`/fhir/Encounter/${encounterA}`).set(auth()).expect(200);
    expect(encounter.body.subject.reference).toBe(`Patient/${patientA}`); expect(encounter.body.serviceProvider.reference).toBe(`Organization/${facilityA}`);
    const role = await request(app.getHttpServer()).get(`/fhir/PractitionerRole/${roleA}`).set(auth()).expect(200);
    expect(role.body.practitioner.reference).toBe(`Practitioner/${practitionerA}`); expect(role.body.organization.reference).toBe(`Organization/${facilityA}`);
    const location = await request(app.getHttpServer()).get(`/fhir/Location/${locationA}`).set(auth()).expect(200);
    expect(location.body.managingOrganization.reference).toBe(`Organization/${facilityA}`);
    const missing = "00000000-0000-4000-8000-000000000000";
    const foreign = await request(app.getHttpServer()).get(`/fhir/Patient/${patientB}`).set(auth()).expect(404);
    const absent = await request(app.getHttpServer()).get(`/fhir/Patient/${missing}`).set(auth()).expect(404);
    expect(foreign.body).toEqual(absent.body);
  });

  it("TENANT-16–20 keeps pagination and reference filters tenant-safe", async () => {
    const first = await request(app.getHttpServer()).get("/fhir/Patient?_count=1").set(auth()).expect(200);
    expect(JSON.stringify(first.body)).not.toContain(patientB); expect(first.body).not.toHaveProperty("total");
    const next = first.body.link.find((l: { relation: string }) => l.relation === "next")?.url;
    expect(next).toBeTruthy();
    const cursor = new URL(next).searchParams.get("_cursor");
    const second = await request(app.getHttpServer()).get(`/fhir/Patient?_count=1&_cursor=${cursor}`).set(auth()).expect(200);
    expect(JSON.stringify(second.body)).not.toContain(patientB);
    const org = await request(app.getHttpServer()).get(`/fhir/Location?organization=Organization/${facilityB}`).set(auth()).expect(200);
    expect(org.body.entry).toEqual([]);
    const practitioner = await request(app.getHttpServer()).get(`/fhir/PractitionerRole?practitioner=Practitioner/${practitionerB}`).set(auth()).expect(200);
    expect(practitioner.body.entry).toEqual([]);
  });

  it("REF-02/06/08/10–12 return sanitized 400 OperationOutcome", async () => {
    for (const path of [
      "/fhir/PractitionerRole?practitioner=Patient/123",
      "/fhir/Location?organization=Practitioner/123",
      "/fhir/Encounter?patient=Organization/123",
      "/fhir/PractitionerRole?practitioner=https://attacker.test/Practitioner/123",
      "/fhir/PractitionerRole?practitioner=Practitioner/123/extra",
      "/fhir/PractitionerRole?practitioner=Practitioner/%252e%252e",
    ]) {
      const response = await request(app.getHttpServer()).get(path).set(auth()).expect(400);
      expect(response.body).toEqual(expect.objectContaining({ resourceType: "OperationOutcome", issue: [expect.objectContaining({ diagnostics: "Invalid FHIR request" })] }));
      expect(JSON.stringify(response.body)).not.toMatch(/Prisma|attacker|stack/i);
    }
  });

  it("ROUTE-01–10 static routes are unshadowed; unsupported routes fail safely", async () => {
    const metadata = await request(app.getHttpServer()).get("/fhir/metadata").set("Accept", "application/fhir+json").expect(200);
    expect(metadata.body.resourceType).toBe("CapabilityStatement");
    await request(app.getHttpServer()).get(`/fhir/Patient/${patientA}`).set(auth()).expect(200);
    await request(app.getHttpServer()).get(`/fhir/Encounter/${encounterA}`).set(auth()).expect(200);
    await request(app.getHttpServer()).get("/fhir/Observation/not-a-real-observation").set(auth()).expect(404);
    await request(app.getHttpServer()).get(`/fhir/Practitioner/${practitionerA}`).set(auth()).expect(200);
    await request(app.getHttpServer()).get(`/fhir/Organization/${facilityA}`).set(auth()).expect(200);
    await request(app.getHttpServer()).get("/fhir/Foo").set(auth()).expect(404);
    await request(app.getHttpServer()).get("/fhir/Foo/123").set(auth()).expect(404);
  });

  it("no-write and no-store gates remain enforced", async () => {
    for (const method of ["post", "put", "patch", "delete"] as const) {
      const response = await request(app.getHttpServer())[method](`/fhir/Patient/${patientA}`).set(auth()).send({}).expect(405);
      expect(response.body.resourceType).toBe("OperationOutcome");
    }
    const response = await request(app.getHttpServer()).get(`/fhir/Patient/${patientA}`).set(auth()).expect(200);
    expect(response.headers["cache-control"]).toBe("no-store");
  });
});
