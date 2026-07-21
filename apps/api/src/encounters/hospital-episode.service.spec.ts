import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { ED_DISCHARGE_MODE_ADMISSION, ED_DISCHARGE_MODE_HOME } from "@medora/shared";
import { HospitalEpisodeService } from "./hospital-episode.service";

function signedNursing() {
  return {
    erDispositionV1: {
      documentationStatus: "SIGNED",
      signedAt: "2026-07-20T12:00:00.000Z",
      signedByDisplayName: "Dr Test",
      revision: 1,
    },
  };
}

function eligibleEncounter(overrides: Record<string, unknown> = {}) {
  return {
    id: "enc-1",
    facilityId: "fac-a",
    patientId: "pat-1",
    type: "EMERGENCY",
    status: "OPEN",
    version: 3,
    hospitalEpisodeId: null,
    nursingAssessment: signedNursing(),
    dischargeSummaryJson: { dischargeMode: ED_DISCHARGE_MODE_ADMISSION },
    admissionSummaryJson: { careLevel: "Médecine" },
    ...overrides,
  };
}

function makeService(prisma: unknown, audit = { log: jest.fn().mockResolvedValue(undefined) }) {
  return new HospitalEpisodeService(prisma as never, audit as never);
}

function withSelfTx(partial: Record<string, unknown>): Record<string, unknown> {
  const prisma: Record<string, unknown> = { ...partial };
  prisma.$transaction = async (fn: (tx: Record<string, unknown>) => Promise<unknown>) =>
    fn(prisma);
  return prisma;
}

describe("HospitalEpisodeService D3B", () => {
  const prevFlag = process.env.HOSPITAL_EPISODE_FOUNDATION_ENABLED;

  afterEach(() => {
    if (prevFlag === undefined) delete process.env.HOSPITAL_EPISODE_FOUNDATION_ENABLED;
    else process.env.HOSPITAL_EPISODE_FOUNDATION_ENABLED = prevFlag;
    delete process.env.NEXT_PUBLIC_HOSPITAL_EPISODE_FOUNDATION_ENABLED;
  });

  it("isFoundationEnabled defaults OFF", () => {
    delete process.env.HOSPITAL_EPISODE_FOUNDATION_ENABLED;
    delete process.env.NEXT_PUBLIC_HOSPITAL_EPISODE_FOUNDATION_ENABLED;
    const svc = makeService({});
    expect(svc.isFoundationEnabled()).toBe(false);
  });

  it("refuses create when feature flag OFF", async () => {
    delete process.env.HOSPITAL_EPISODE_FOUNDATION_ENABLED;
    const prisma = { encounter: { findFirst: jest.fn() } };
    const svc = makeService(prisma);
    await expect(svc.createEpisodeForEncounter("fac-a", "enc-1", "u1")).rejects.toBeInstanceOf(
      ForbiddenException
    );
    expect(prisma.encounter.findFirst).not.toHaveBeenCalled();
  });

  it("creates episode for eligible ED encounter when flag forced ON", async () => {
    const createdEpisode = {
      id: "he-1",
      facilityId: "fac-a",
      patientId: "pat-1",
      status: "ACTIVE",
      openedAt: new Date("2026-07-20T10:00:00.000Z"),
      closedAt: null,
      closeReason: null,
      originatingEncounterId: "enc-1",
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdByUserId: "u1",
      updatedByUserId: "u1",
      encounters: [{ id: "enc-1" }],
    };
    const enc = eligibleEncounter();
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    const prisma = withSelfTx({
      encounter: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(enc)
          .mockResolvedValueOnce(enc),
        update: jest.fn().mockResolvedValue({}),
      },
      hospitalEpisode: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(null) // activeOther
          .mockResolvedValueOnce(createdEpisode), // after create
        create: jest.fn().mockResolvedValue({
          ...createdEpisode,
          encounters: undefined,
        }),
      },
    });
    const svc = makeService(prisma, audit);
    const result = await svc.createEpisodeForEncounter("fac-a", "enc-1", "u1", {
      featureFlagEnabled: true,
    });
    expect(result.created).toBe(true);
    expect(result.episode.id).toBe("he-1");
    expect(result.episode.edEncounterCloseClosesEpisode).toBe(false);
    expect((prisma.hospitalEpisode as { create: jest.Mock }).create).toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(
      "CREATE",
      "HospitalEpisode",
      expect.objectContaining({
        facilityId: "fac-a",
        patientId: "pat-1",
        encounterId: "enc-1",
        critical: true,
      })
    );
  });

  it("is idempotent when encounter already linked", async () => {
    const enc = eligibleEncounter({ hospitalEpisodeId: "he-1" });
    const episode = {
      id: "he-1",
      facilityId: "fac-a",
      patientId: "pat-1",
      status: "ACTIVE",
      openedAt: new Date("2026-07-20T10:00:00.000Z"),
      closedAt: null,
      closeReason: null,
      originatingEncounterId: "enc-1",
      version: 2,
      encounters: [{ id: "enc-1" }],
    };
    const prisma = {
      encounter: { findFirst: jest.fn().mockResolvedValue(enc) },
      hospitalEpisode: {
        findFirst: jest.fn().mockResolvedValue(episode),
      },
      $transaction: jest.fn(),
    };
    const svc = makeService(prisma);
    const result = await svc.createEpisodeForEncounter("fac-a", "enc-1", "u1", {
      featureFlagEnabled: true,
    });
    expect(result.created).toBe(false);
    expect(result.episode.id).toBe("he-1");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects concurrent duplicate active episode for same patient", async () => {
    const enc = eligibleEncounter();
    const prisma = withSelfTx({
      encounter: {
        findFirst: jest.fn().mockResolvedValue(enc),
      },
      hospitalEpisode: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue({ id: "he-other" }),
      },
    });
    const svc = makeService(prisma);
    await expect(
      svc.createEpisodeForEncounter("fac-a", "enc-1", "u1", { featureFlagEnabled: true })
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("recovers idempotently from unique race on originatingEncounterId", async () => {
    const enc = eligibleEncounter();
    const recovered = {
      id: "he-race",
      facilityId: "fac-a",
      patientId: "pat-1",
      status: "ACTIVE",
      openedAt: new Date("2026-07-20T10:00:00.000Z"),
      closedAt: null,
      closeReason: null,
      originatingEncounterId: "enc-1",
      version: 1,
      encounters: [{ id: "enc-1" }],
    };
    const prisma = {
      encounter: { findFirst: jest.fn().mockResolvedValue(enc) },
      hospitalEpisode: {
        findUnique: jest.fn().mockResolvedValue(recovered),
      },
      $transaction: jest.fn().mockRejectedValue({ code: "P2002" }),
    };
    const svc = makeService(prisma);
    const result = await svc.createEpisodeForEncounter("fac-a", "enc-1", "u1", {
      featureFlagEnabled: true,
    });
    expect(result.created).toBe(false);
    expect(result.episode.id).toBe("he-race");
  });

  it("denies cross-facility episode read", async () => {
    const prisma = {
      hospitalEpisode: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const svc = makeService(prisma);
    await expect(svc.getEpisodeById("fac-a", "he-other-fac")).resolves.toBeNull();
    expect(prisma.hospitalEpisode.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "he-other-fac", facilityId: "fac-a" },
      })
    );
  });

  it("denies create when encounter outside facility", async () => {
    const prisma = {
      encounter: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const svc = makeService(prisma);
    await expect(
      svc.createEpisodeForEncounter("fac-a", "enc-x", "u1", { featureFlagEnabled: true })
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("denies patient mismatch on create", async () => {
    const prisma = {
      encounter: { findFirst: jest.fn().mockResolvedValue(eligibleEncounter()) },
    };
    const svc = makeService(prisma);
    await expect(
      svc.createEpisodeForEncounter("fac-a", "enc-1", "u1", {
        featureFlagEnabled: true,
        expectedPatientId: "pat-other",
      })
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects home discharge eligibility path", async () => {
    const enc = eligibleEncounter({
      dischargeSummaryJson: { dischargeMode: ED_DISCHARGE_MODE_HOME },
      admissionSummaryJson: null,
    });
    const prisma = {
      encounter: { findFirst: jest.fn().mockResolvedValue(enc) },
    };
    const svc = makeService(prisma);
    await expect(
      svc.createEpisodeForEncounter("fac-a", "enc-1", "u1", { featureFlagEnabled: true })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects patient/facility mismatch on safelyLinkEncounter", async () => {
    process.env.HOSPITAL_EPISODE_FOUNDATION_ENABLED = "true";
    const prisma = withSelfTx({
      hospitalEpisode: {
        findFirst: jest.fn().mockResolvedValue({
          id: "he-1",
          facilityId: "fac-a",
          patientId: "pat-1",
          status: "ACTIVE",
          version: 1,
        }),
      },
      encounter: {
        findFirst: jest.fn().mockResolvedValue({
          id: "enc-2",
          facilityId: "fac-a",
          patientId: "pat-OTHER",
          hospitalEpisodeId: null,
          version: 1,
        }),
      },
    });
    const svc = makeService(prisma);
    await expect(
      svc.safelyLinkEncounter("fac-a", "he-1", "enc-2", "u1")
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("ED close does not imply episode close (state invariant)", () => {
    const svc = makeService({});
    expect(
      svc.assertEpisodeRemainsActiveIndependentOfEdClose({
        episodeStatus: "ACTIVE",
        encounterStatus: "CLOSED",
      })
    ).toBe(true);
  });

  it("getEpisodeForEncounter returns null when unlinked (summary-safe absence)", async () => {
    const prisma = {
      encounter: {
        findFirst: jest.fn().mockResolvedValue({ hospitalEpisodeId: null }),
      },
    };
    const svc = makeService(prisma);
    await expect(svc.getEpisodeForEncounter("fac-a", "enc-1")).resolves.toBeNull();
  });

  it("does not expose unrestricted public create routes in encounters controller", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const src = fs.readFileSync(path.join(__dirname, "encounters.controller.ts"), "utf8");
    expect(src).not.toContain("createEpisodeForEncounter");
    expect(src).not.toContain("hospital-episodes");
  });

  it("encounters module registers HospitalEpisodeService", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const src = fs.readFileSync(path.join(__dirname, "encounters.module.ts"), "utf8");
    expect(src).toContain("HospitalEpisodeService");
  });
});
