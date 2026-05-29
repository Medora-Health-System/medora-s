import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { AuditAction, EncounterStatus } from "@prisma/client";
import {
  ALLOWED_CLINICAL_DOCUMENTATION_AUDIT_KEYS,
  EDOC_BASIC_STRUCTURED_CARD_ID,
  FORBIDDEN_CLINICAL_DOCUMENTATION_AUDIT_KEYS,
} from "@medora/shared";
import { ClinicalDocumentationService } from "./clinical-documentation.service";

describe("ClinicalDocumentationService (EDOC.2)", () => {
  const entryRow = {
    id: "edoc1",
    encounterId: "e1",
    category: "OBSERVATION_DOCUMENTATION",
    cardId: EDOC_BASIC_STRUCTURED_CARD_ID,
    authorDisplayNameSnapshot: "Jane Nurse",
    authorRoleSnapshot: "RN",
    createdAt: new Date("2026-05-28T12:00:00.000Z"),
    payloadJson: { items: [{ key: "Pain", value: "2/10" }] },
    voidedAt: null,
  };

  function buildService(overrides?: {
    encounter?: Record<string, unknown> | null;
    entries?: Array<Record<string, unknown>>;
  }) {
    const create = jest.fn().mockResolvedValue(entryRow);
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
                ...(overrides?.encounter ?? {}),
              }
        ),
      },
      encounterClinicalDocumentationEntry: {
        findMany: jest.fn().mockResolvedValue(overrides?.entries ?? [entryRow]),
        create,
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ firstName: "Jane", lastName: "Nurse" }),
      },
      userRole: {
        findMany: jest.fn().mockResolvedValue([{ role: { code: "RN", name: "Infirmier(ère)" } }]),
      },
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          encounterClinicalDocumentationEntry: { create },
        })
      ),
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    return {
      svc: new ClinicalDocumentationService(prisma as never, audit as never),
      prisma,
      audit,
      create,
    };
  }

  it("lists entries for encounter", async () => {
    const { svc } = buildService();
    const result = await svc.listForEncounter("f1", "e1");
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]?.cardId).toBe(EDOC_BASIC_STRUCTURED_CARD_ID);
  });

  it("creates append-only entry with author snapshots", async () => {
    const { svc, create } = buildService();
    const saved = await svc.createEntry(
      "f1",
      "e1",
      {
        category: "OBSERVATION_DOCUMENTATION",
        cardId: EDOC_BASIC_STRUCTURED_CARD_ID,
        payloadJson: { items: [{ key: "Pain", value: "2/10" }] },
      },
      "u1"
    );
    expect(saved.authorDisplayName).toBe("Jane Nurse");
    expect(saved.authorRoleTitle).toBe("RN");
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("two creates produce two rows (service called twice)", async () => {
    const { svc, create } = buildService();
    await svc.createEntry(
      "f1",
      "e1",
      {
        category: "OBSERVATION_DOCUMENTATION",
        cardId: EDOC_BASIC_STRUCTURED_CARD_ID,
        payloadJson: { items: [{ key: "A", value: "1" }] },
      },
      "u1"
    );
    await svc.createEntry(
      "f1",
      "e1",
      {
        category: "OBSERVATION_DOCUMENTATION",
        cardId: EDOC_BASIC_STRUCTURED_CARD_ID,
        payloadJson: { items: [{ key: "B", value: "2" }] },
      },
      "u1"
    );
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("rejects invalid cardId", async () => {
    const { svc } = buildService();
    await expect(
      svc.createEntry(
        "f1",
        "e1",
        {
          category: "OBSERVATION_DOCUMENTATION",
          cardId: "invalid_card",
          payloadJson: { items: [{ key: "x", value: "y" }] },
        },
        "u1"
      )
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects wrong facility (encounter missing)", async () => {
    const { svc } = buildService({ encounter: null });
    await expect(
      svc.createEntry(
        "f-other",
        "e1",
        {
          category: "OBSERVATION_DOCUMENTATION",
          cardId: EDOC_BASIC_STRUCTURED_CARD_ID,
          payloadJson: { items: [{ key: "x", value: "y" }] },
        },
        "u1"
      )
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("requires auth", async () => {
    const { svc } = buildService();
    await expect(
      svc.createEntry(
        "f1",
        "e1",
        {
          category: "OBSERVATION_DOCUMENTATION",
          cardId: EDOC_BASIC_STRUCTURED_CARD_ID,
          payloadJson: { items: [{ key: "x", value: "y" }] },
        },
        undefined
      )
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("audit metadata excludes payloadJson", async () => {
    const { svc, audit } = buildService();
    await svc.createEntry(
      "f1",
      "e1",
      {
        category: "OBSERVATION_DOCUMENTATION",
        cardId: EDOC_BASIC_STRUCTURED_CARD_ID,
        payloadJson: { items: [{ key: "Pain", value: "secret clinical text" }] },
      },
      "u1"
    );
    expect(audit.log).toHaveBeenCalledWith(
      AuditAction.ENCOUNTER_CLINICAL_DOCUMENTATION_CREATED,
      "ENCOUNTER_CLINICAL_DOCUMENTATION_ENTRY",
      expect.objectContaining({
        metadata: expect.objectContaining({
          entryId: "edoc1",
          cardId: EDOC_BASIC_STRUCTURED_CARD_ID,
          payloadKeyCount: 1,
        }),
      })
    );
    const meta = audit.log.mock.calls[0]?.[2]?.metadata as Record<string, unknown>;
    for (const forbidden of FORBIDDEN_CLINICAL_DOCUMENTATION_AUDIT_KEYS) {
      expect(meta).not.toHaveProperty(forbidden);
    }
    for (const allowed of ALLOWED_CLINICAL_DOCUMENTATION_AUDIT_KEYS) {
      expect(meta).toHaveProperty(allowed);
    }
  });
});
