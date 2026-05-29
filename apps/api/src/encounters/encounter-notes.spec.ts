import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { EncounterStatus } from "@prisma/client";
import {
  ALLOWED_ENCOUNTER_NOTE_AUDIT_KEYS,
  FORBIDDEN_ENCOUNTER_NOTE_AUDIT_KEYS,
} from "@medora/shared";
import { EncounterNotesService } from "./encounter-notes.service";

describe("EncounterNotesService (MEDNOTE.1 + MEDNOTE.2)", () => {
  const noteRow = {
    id: "note1",
    encounterId: "e1",
    noteType: "NURSING" as const,
    body: "Patient stable",
    authorUserId: "u1",
    authorDisplayNameSnapshot: "Jane Nurse",
    authorRoleSnapshot: "RN",
    createdAt: new Date("2026-05-28T12:00:00.000Z"),
    voidedAt: null,
    voidedByUserId: null,
    voidReasonCode: null,
    isAmendment: false,
    amendedFromNoteId: null,
    amendmentReason: null,
    requiresCosign: false,
    cosignedAt: null,
    cosignedByUserId: null,
    cosignRoleSnapshot: null,
  };

  function buildService(overrides?: {
    encounter?: Record<string, unknown> | null;
    notes?: Array<Record<string, unknown>>;
    noteFindFirst?: Record<string, unknown> | null;
  }) {
    const create = jest.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({
        ...noteRow,
        id: "note-new",
        body: String(data.body ?? noteRow.body),
        isAmendment: Boolean(data.isAmendment),
        amendedFromNoteId: (data.amendedFromNoteId as string | null) ?? null,
        amendmentReason: (data.amendmentReason as string | null) ?? null,
        requiresCosign: Boolean(data.requiresCosign),
      })
    );
    const update = jest.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({
        ...noteRow,
        ...data,
        voidedAt: data.voidedAt ?? noteRow.voidedAt,
        voidReasonCode: data.voidReasonCode ?? noteRow.voidReasonCode,
        cosignedAt: data.cosignedAt ?? noteRow.cosignedAt,
        cosignRoleSnapshot: data.cosignRoleSnapshot ?? noteRow.cosignRoleSnapshot,
      })
    );
    const findFirst = jest
      .fn()
      .mockResolvedValue(overrides?.noteFindFirst === undefined ? noteRow : overrides.noteFindFirst);
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
        findMany: jest.fn().mockResolvedValue(overrides?.notes ?? [noteRow]),
        findFirst,
        create,
        update,
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ firstName: "Jane", lastName: "Nurse" }),
      },
      userRole: {
        findMany: jest.fn().mockImplementation(({ where }: { where: { userId: string } }) => {
          if (where.userId === "reviewer") {
            return Promise.resolve([{ role: { code: "PROVIDER", name: "Médecin" } }]);
          }
          return Promise.resolve([{ role: { code: "RN", name: "Infirmier(ère)" } }]);
        }),
      },
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          encounterNote: { create, update },
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
      findFirst,
    };
  }

  it("lists relational and legacy notes including voided", async () => {
    const { svc, prisma } = buildService({
      notes: [{ ...noteRow, voidedAt: new Date("2026-05-28T14:00:00.000Z") }],
    });
    const result = await svc.listForEncounter("f1", "e1");
    expect(result.notes.some((n) => n.id === "note1")).toBe(true);
    expect(result.notes.some((n) => n.legacy)).toBe(true);
    expect(prisma.encounterNote.findMany).toHaveBeenCalled();
    const where = prisma.encounterNote.findMany.mock.calls[0]?.[0]?.where;
    expect(where.voidedAt).toBeUndefined();
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
    for (const key of Object.keys(meta)) {
      expect(ALLOWED_ENCOUNTER_NOTE_AUDIT_KEYS).toContain(key);
    }
    expect(meta.bodyLength).toBeGreaterThan(0);
    expect(meta.body).toBeUndefined();
  });

  it("each save creates a new row and never updates existing notes on create", async () => {
    const { svc, create, update, prisma } = buildService();
    await svc.createNote("f1", "e1", { noteType: "NURSING", body: "First" }, "u1");
    await svc.createNote("f1", "e1", { noteType: "NURSING", body: "Second" }, "u1");
    expect(create).toHaveBeenCalledTimes(2);
    expect(update).not.toHaveBeenCalled();
    expect(prisma.encounter.update).not.toHaveBeenCalled();
  });

  it("amendment creates linked note without updating original", async () => {
    const { svc, create, update } = buildService();
    const amended = await svc.amendNote(
      "f1",
      "e1",
      "note1",
      { body: "Corrected text", amendmentReason: "Entered wrong info" },
      "u1"
    );
    expect(amended.isAmendment).toBe(true);
    expect(amended.amendedFromNoteId).toBe("note1");
    expect(create).toHaveBeenCalledTimes(1);
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects amendment by non-author", async () => {
    const { svc } = buildService();
    await expect(
      svc.amendNote(
        "f1",
        "e1",
        "note1",
        { body: "x", amendmentReason: "reason" },
        "u2"
      )
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("void marks note with reason", async () => {
    const { svc, update } = buildService();
    const voided = await svc.voidNote(
      "f1",
      "e1",
      "note1",
      { voidReasonCode: "ENTERED_IN_ERROR" },
      "reviewer"
    );
    expect(voided.voidReasonCode).toBe("ENTERED_IN_ERROR");
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("rejects void without reviewer role", async () => {
    const { svc } = buildService();
    await expect(
      svc.voidNote("f1", "e1", "note1", { voidReasonCode: "OTHER" }, "u1")
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("cosign works for reviewer on pending note", async () => {
    const { svc, update } = buildService({
      noteFindFirst: { ...noteRow, requiresCosign: true },
    });
    const cosigned = await svc.cosignNote("f1", "e1", "note1", "reviewer");
    expect(cosigned.cosignedAt).toBeTruthy();
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("rejects unauthorized cosign", async () => {
    const { svc } = buildService({
      noteFindFirst: { ...noteRow, requiresCosign: true },
    });
    await expect(svc.cosignNote("f1", "e1", "note1", "u1")).rejects.toBeInstanceOf(
      ForbiddenException
    );
  });

  it("amendment audit is PHI-safe", async () => {
    const { svc, audit } = buildService();
    await svc.amendNote(
      "f1",
      "e1",
      "note1",
      { body: "Secret body", amendmentReason: "fix" },
      "u1"
    );
    const meta = audit.log.mock.calls[0]?.[2]?.metadata as Record<string, unknown>;
    expect(meta.body).toBeUndefined();
    expect(meta.amendedFromNoteId).toBe("note1");
    expect(meta.reasonCode).toBe("fix");
  });

  it("void audit is PHI-safe", async () => {
    const { svc, audit } = buildService();
    await svc.voidNote("f1", "e1", "note1", { voidReasonCode: "DUPLICATE_ENTRY" }, "reviewer");
    const meta = audit.log.mock.calls[0]?.[2]?.metadata as Record<string, unknown>;
    expect(meta.body).toBeUndefined();
    expect(meta.reasonCode).toBe("DUPLICATE_ENTRY");
  });

  it("cosign audit is PHI-safe", async () => {
    const { svc, audit } = buildService({
      noteFindFirst: { ...noteRow, requiresCosign: true },
    });
    await svc.cosignNote("f1", "e1", "note1", "reviewer");
    const meta = audit.log.mock.calls[0]?.[2]?.metadata as Record<string, unknown>;
    expect(meta.body).toBeUndefined();
    expect(meta.cosignedByUserId).toBe("reviewer");
  });
});
