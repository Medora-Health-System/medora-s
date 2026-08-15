/**
 * MEDUI.D4C.10C — real PostgreSQL concurrency for GENERAL_CREATE race hardening.
 * Skips unless TEST_DATABASE_URL or DATABASE_URL points at a reachable Postgres.
 */
import { randomBytes } from "crypto";
import { PrismaClient } from "@prisma/client";
import { evaluateConcurrentEncounterCreate } from "@medora/shared";
import { acquireEnterpriseEncounterCreateRaceLock } from "./encounter-create-race-lock.util";

const url = process.env.TEST_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim();
const describeDb = url ? describe : describe.skip;

jest.setTimeout(60_000);

describeDb("MEDUI.D4C.10C PostgreSQL encounter-create race hardening", () => {
  const prisma = new PrismaClient({ datasourceUrl: url });
  const suffix = randomBytes(4).toString("hex");

  let facilityId: string;
  let facilityIdB: string;
  let patientId: string;
  let patientIdB: string;

  beforeAll(async () => {
    const facility = await prisma.facility.create({
      data: {
        code: `D4C10C-A-${suffix}`,
        name: "D4C.10C Race Facility A",
        country: "HT",
        timezone: "America/Port-au-Prince",
      },
    });
    const facilityB = await prisma.facility.create({
      data: {
        code: `D4C10C-B-${suffix}`,
        name: "D4C.10C Race Facility B",
        country: "HT",
        timezone: "America/Port-au-Prince",
      },
    });
    facilityId = facility.id;
    facilityIdB = facilityB.id;

    const patient = await prisma.patient.create({
      data: {
        facilityId,
        registeredAtFacilityId: facilityId,
        firstName: "Race",
        lastName: `Dental${suffix}`,
        mrn: `D4C10C-${suffix}`,
        globalMrn: `GM-D4C10C-${suffix}`,
      },
    });
    const patientB = await prisma.patient.create({
      data: {
        facilityId: facilityIdB,
        registeredAtFacilityId: facilityIdB,
        firstName: "Race",
        lastName: `Cross${suffix}`,
        mrn: `D4C10C-X-${suffix}`,
        globalMrn: `GM-D4C10C-X-${suffix}`,
      },
    });
    patientId = patient.id;
    patientIdB = patientB.id;
  });

  afterAll(async () => {
    await prisma.appointment.deleteMany({
      where: { OR: [{ facilityId }, { facilityId: facilityIdB }] },
    });
    await prisma.encounter.deleteMany({
      where: { OR: [{ facilityId }, { facilityId: facilityIdB }] },
    });
    await prisma.patient.deleteMany({
      where: { id: { in: [patientId, patientIdB].filter(Boolean) } },
    });
    await prisma.facility.deleteMany({
      where: { id: { in: [facilityId, facilityIdB].filter(Boolean) } },
    });
    await prisma.$disconnect();
  });

  async function generalCreateUnderLock(input: {
    facilityId: string;
    patientId: string;
    serviceLine: string;
    appointmentId?: string | null;
    type?: "OUTPATIENT" | "EMERGENCY";
  }): Promise<{ kind: "created" | "reuse"; id: string }> {
    const type = input.type ?? "OUTPATIENT";
    return prisma.$transaction(async (tx) => {
      await acquireEnterpriseEncounterCreateRaceLock(tx, {
        facilityId: input.facilityId,
        patientId: input.patientId,
        serviceLine: input.serviceLine,
        appointmentId: input.appointmentId ?? null,
      });

      if (input.appointmentId) {
        const apptLocked = await tx.appointment.findFirst({
          where: { id: input.appointmentId, facilityId: input.facilityId },
          select: { encounterId: true },
        });
        if (apptLocked?.encounterId) {
          return { kind: "reuse", id: apptLocked.encounterId };
        }
      }

      const openRows = await tx.encounter.findMany({
        where: {
          patientId: input.patientId,
          facilityId: input.facilityId,
          status: "OPEN",
        },
        select: {
          id: true,
          type: true,
          status: true,
          serviceLine: true,
          appointment: { select: { id: true } },
        },
      });

      const decision = evaluateConcurrentEncounterCreate({
        pathway: "GENERAL_CREATE",
        requestedType: type,
        requestedServiceLine: input.serviceLine,
        requestedAppointmentId: input.appointmentId ?? null,
        existingOpen: openRows.map((row) => ({
          id: row.id,
          type: row.type,
          status: row.status,
          serviceLine: row.serviceLine,
          appointmentId: row.appointment?.id ?? null,
        })),
      });

      if (decision.allowed && decision.code === "IDEMPOTENT_REUSE" && decision.reuseEncounterId) {
        if (input.appointmentId) {
          await tx.appointment.update({
            where: { id: input.appointmentId },
            data: { encounterId: decision.reuseEncounterId, status: "CHECKED_IN", checkedInAt: new Date() },
          });
        }
        return { kind: "reuse", id: decision.reuseEncounterId };
      }
      if (!decision.allowed) {
        throw new Error(`${decision.code}:${decision.existingEncounterId ?? ""}`);
      }

      const created = await tx.encounter.create({
        data: {
          patientId: input.patientId,
          facilityId: input.facilityId,
          type,
          status: "OPEN",
          serviceLine: input.serviceLine,
          chiefComplaint: `d4c10c-${input.serviceLine}-${suffix}`,
        },
        select: { id: true },
      });
      if (input.appointmentId) {
        await tx.appointment.update({
          where: { id: input.appointmentId },
          data: { encounterId: created.id, status: "CHECKED_IN", checkedInAt: new Date() },
        });
      }
      return { kind: "created", id: created.id };
    });
  }

  it("1–2: Promise.all two Dental creates → one encounter row / same id", async () => {
    const tag = `dental-race-${suffix}`;
    await prisma.encounter.deleteMany({
      where: { patientId, facilityId, chiefComplaint: { startsWith: "d4c10c-DENTAL" } },
    });

    const [a, b] = await Promise.all([
      generalCreateUnderLock({ facilityId, patientId, serviceLine: "DENTAL" }),
      generalCreateUnderLock({ facilityId, patientId, serviceLine: "DENTAL" }),
    ]);

    expect(a.id).toBe(b.id);
    expect([a.kind, b.kind].sort()).toEqual(["created", "reuse"].sort());

    const count = await prisma.encounter.count({
      where: { patientId, facilityId, status: "OPEN", serviceLine: "DENTAL" },
    });
    expect(count).toBe(1);
    expect(tag).toBeTruthy();
  });

  it("3: two Clinic unbound creates → one active episode", async () => {
    await prisma.encounter.deleteMany({
      where: { patientId, facilityId, serviceLine: "CLINIC", status: "OPEN" },
    });

    const [a, b] = await Promise.all([
      generalCreateUnderLock({ facilityId, patientId, serviceLine: "CLINIC" }),
      generalCreateUnderLock({ facilityId, patientId, serviceLine: "CLINIC" }),
    ]);
    expect(a.id).toBe(b.id);
    const count = await prisma.encounter.count({
      where: { patientId, facilityId, status: "OPEN", serviceLine: "CLINIC" },
    });
    expect(count).toBe(1);
  });

  it("4: Clinic + Dental concurrent → two distinct encounterIds", async () => {
    await prisma.encounter.deleteMany({
      where: {
        patientId,
        facilityId,
        status: "OPEN",
        serviceLine: { in: ["CLINIC", "DENTAL"] },
      },
    });

    const [clinic, dental] = await Promise.all([
      generalCreateUnderLock({ facilityId, patientId, serviceLine: "CLINIC" }),
      generalCreateUnderLock({ facilityId, patientId, serviceLine: "DENTAL" }),
    ]);
    expect(clinic.id).not.toBe(dental.id);
    expect(clinic.kind).toBe("created");
    expect(dental.kind).toBe("created");
  });

  it("5: Dental + ED concurrent → two distinct encounterIds", async () => {
    await prisma.encounter.deleteMany({
      where: {
        patientId,
        facilityId,
        status: "OPEN",
        serviceLine: { in: ["DENTAL", "EMERGENCY"] },
      },
    });

    const [dental, ed] = await Promise.all([
      generalCreateUnderLock({ facilityId, patientId, serviceLine: "DENTAL" }),
      generalCreateUnderLock({
        facilityId,
        patientId,
        serviceLine: "EMERGENCY",
        type: "EMERGENCY",
      }),
    ]);
    expect(dental.id).not.toBe(ed.id);
  });

  it("6: same appointment concurrent check-in → one encounter", async () => {
    await prisma.appointment.deleteMany({ where: { patientId, facilityId } });
    await prisma.encounter.deleteMany({
      where: { patientId, facilityId, serviceLine: "CLINIC", status: "OPEN" },
    });

    const start = new Date();
    const appt = await prisma.appointment.create({
      data: {
        facilityId,
        patientId,
        scheduledStartAt: start,
        reason: `d4c10c-same-${suffix}`,
      },
    });

    const [a, b] = await Promise.all([
      generalCreateUnderLock({
        facilityId,
        patientId,
        serviceLine: "CLINIC",
        appointmentId: appt.id,
      }),
      generalCreateUnderLock({
        facilityId,
        patientId,
        serviceLine: "CLINIC",
        appointmentId: appt.id,
      }),
    ]);
    expect(a.id).toBe(b.id);
    const linked = await prisma.appointment.findUnique({
      where: { id: appt.id },
      select: { encounterId: true },
    });
    expect(linked?.encounterId).toBe(a.id);
    const count = await prisma.encounter.count({
      where: { patientId, facilityId, status: "OPEN", serviceLine: "CLINIC" },
    });
    expect(count).toBe(1);
  });

  it("7: different appointment IDs → two valid Clinic encounters", async () => {
    await prisma.appointment.deleteMany({ where: { patientId, facilityId } });
    await prisma.encounter.deleteMany({
      where: { patientId, facilityId, serviceLine: "CLINIC", status: "OPEN" },
    });

    const start = new Date();
    const apptA = await prisma.appointment.create({
      data: {
        facilityId,
        patientId,
        scheduledStartAt: start,
        reason: `d4c10c-a-${suffix}`,
      },
    });
    const apptB = await prisma.appointment.create({
      data: {
        facilityId,
        patientId,
        scheduledStartAt: new Date(start.getTime() + 3_600_000),
        reason: `d4c10c-b-${suffix}`,
      },
    });

    const [a, b] = await Promise.all([
      generalCreateUnderLock({
        facilityId,
        patientId,
        serviceLine: "CLINIC",
        appointmentId: apptA.id,
      }),
      generalCreateUnderLock({
        facilityId,
        patientId,
        serviceLine: "CLINIC",
        appointmentId: apptB.id,
      }),
    ]);
    expect(a.id).not.toBe(b.id);
    expect(a.kind).toBe("created");
    expect(b.kind).toBe("created");
  });

  it("8: cross-facility same name/MRN pattern does not reuse", async () => {
    await prisma.encounter.deleteMany({
      where: {
        OR: [
          { patientId, facilityId, serviceLine: "DENTAL", status: "OPEN" },
          { patientId: patientIdB, facilityId: facilityIdB, serviceLine: "DENTAL", status: "OPEN" },
        ],
      },
    });

    const [a, b] = await Promise.all([
      generalCreateUnderLock({ facilityId, patientId, serviceLine: "DENTAL" }),
      generalCreateUnderLock({
        facilityId: facilityIdB,
        patientId: patientIdB,
        serviceLine: "DENTAL",
      }),
    ]);
    expect(a.id).not.toBe(b.id);
  });

  it("advisory lock serializes same key before second proceeds", async () => {
    const order: string[] = [];
    let release!: () => void;
    let lockedResolve!: () => void;
    let lockedReject!: (e: unknown) => void;
    const held = new Promise<void>((r) => {
      release = r;
    });
    const locked = new Promise<void>((r, j) => {
      lockedResolve = r;
      lockedReject = j;
    });

    const first = prisma
      .$transaction(async (tx) => {
        await acquireEnterpriseEncounterCreateRaceLock(tx, {
          facilityId,
          patientId,
          serviceLine: "DENTAL",
        });
        order.push("first-locked");
        lockedResolve();
        await held;
        order.push("first-release");
      })
      .catch((e) => {
        lockedReject(e);
        throw e;
      });

    await locked;
    const second = prisma.$transaction(async (tx) => {
      await acquireEnterpriseEncounterCreateRaceLock(tx, {
        facilityId,
        patientId,
        serviceLine: "DENTAL",
      });
      order.push("second-locked");
    });

    await new Promise((r) => setTimeout(r, 100));
    expect(order).toEqual(["first-locked"]);
    release();
    await Promise.all([first, second]);
    expect(order).toEqual(["first-locked", "first-release", "second-locked"]);
  });
});
