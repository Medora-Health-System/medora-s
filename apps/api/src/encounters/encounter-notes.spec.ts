import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { EncounterStatus } from "@prisma/client";
import {
  ALLOWED_ENCOUNTER_NOTE_AUDIT_KEYS,
  FORBIDDEN_ENCOUNTER_NOTE_AUDIT_KEYS,
} from "@medora/shared";
import { EncounterNotesService } from "./encounter-notes.service";

describe("EncounterNotesService (MEDNOTE.1)", () => {
  function buildService(overrides?: {
    encounter?: Record<string, unknown> | null;
    notes?: Array<Record<string, unknown>>;
  }) {
    const create = jest.fn()
      .mockResolvedValueOnce({
        id: "note1",
        encounterId: "e1",
        noteType: "NURSING",
        body: "Patient stable",
        authorDisplayNameSnapshot: "Jane Nurse",
        authorRoleSnapshot: "RN",
        createdAt: new Date("2026-05-28T12:00:00.000Z"),
      })
      .mockResolvedValueOnce({
        id: "note2",
        encounterId: "e1",
        noteType: "NURSING",
        body: "Second note",
        authorDisplayNameSnapshot: "Jane Nurse",
        authorRoleSnapshot: "RN",
        createdAt: new Date("2026-05-28T13:00:00.000Z"),
      });
    const update = jest.fn();
    const prisma = {
      encounter: {
        findFirst: jest.fn().mockResolvedValue(
          overrides?.encounter === null
            ? null
            : {
                id: "e1",
                patientId: "p1",
                facilityId: "f1",
                status: EncounterStatus.OPEN,
                nursingAssessment: {
                  erNotesV1: { nursing: "legacy note", categoryLastSaved: {} },
                },
                ...(overrides?.encounter ?? {}),
              }
        ),
        update: jest.fn(),
      },
      encounterNote: {
        findMany: jest.fn().mockResolvedValue(overrides?.notes ?? []),
        create,
        update,
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ firstName: "Jane", lastName: "Nurse" }),
      },
      userRole: {
        findMany: jest.fn().mockResolvedValue([
          { role: { code: "RN", name: "Infirmier(ère)" } },
        ]),
      },
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          encounterNote: { create },
        })
      ),
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    return {
      svc: new EncounterNotesService(prisma as never, audit as never),
      prisma,
      audit,
      create,
      update,
    };
  }

  it("lists relational and legacy notes", async () => {
    const { svc, prisma } = buildService({
      notes: [
        {
          id: "n1",
          encounterId: "e1",
          noteType: "PROVIDER",
          body: "New note",
          authorDisplayNameSnapshot: "Dr B",
          authorRoleSnapshot: "Provider",
          createdAt: new Date("2026-05-28T13:00:00.000Z"),
        },
      ],
    });
    const result = await svc.listForEncounter("f1", "e1");
    expect(result.notes.some((n) => n.id === "n1")).toBe(true);
    expect(result.notes.some((n) => n.legacy)).toBe(true);
    expect(prisma.encounterNote.findMany).toHaveBeenCalled();
  });

  it("creates append-only note", async () => {
    const { svc, create } = buildService();
    const saved = await svc.createNote(
      "f1",
      "e1",
      { noteType: "NURSING", body: "Patient stable" },
      "u1"
    );
    expect(saved.body).toBe("Patient stable");
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("rejects when encounter missing", async () => {
    const { svc } = buildService({ encounter: null });
    await expect(
      svc.createNote("f1", "e1", { noteType: "OTHER", body: "x" }, "u1")
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("requires auth", async () => {
    const { svc } = buildService();
    await expect(
      svc.createNote("f1", "e1", { noteType: "OTHER", body: "x" }, undefined)
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("audit metadata excludes note body and uses allowlist only", async () => {
    const { svc, audit } = buildService();
    await svc.createNote(
      "f1",
      "e1",
      { noteType: "PROVIDER", body: "Secret clinical narrative" },
      "u1"
    );
    const meta = audit.log.mock.calls[0]?.[2]?.metadata as Record<string, unknown>;
    for (const forbidden of FORBIDDEN_ENCOUNTER_NOTE_AUDIT_KEYS) {
      expect(meta).not.toHaveProperty(forbidden);
    }
    expect(Object.keys(meta).sort()).toEqual([...ALLOWED_ENCOUNTER_NOTE_AUDIT_KEYS].sort());
    expect(meta.bodyLength).toBeGreaterThan(0);
    expect(meta.body).toBeUndefined();
  });

  it("each save creates a new row and never updates existing notes", async () => {
    const { svc, create, update, prisma } = buildService();
    await svc.createNote("f1", "e1", { noteType: "NURSING", body: "First" }, "u1");
    await svc.createNote("f1", "e1", { noteType: "NURSING", body: "Second" }, "u1");
    expect(create).toHaveBeenCalledTimes(2);
    expect(update).not.toHaveBeenCalled();
    expect(prisma.encounter.update).not.toHaveBeenCalled();
  });

  it("does not mutate nursingAssessment when saving relational notes", async () => {
    const { svc, prisma } = buildService();
    await svc.createNote("f1", "e1", { noteType: "NURSING", body: "New row only" }, "u1");
    expect(prisma.encounter.update).not.toHaveBeenCalled();
  });
});
