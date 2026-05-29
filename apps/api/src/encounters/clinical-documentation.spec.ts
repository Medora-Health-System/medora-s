import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { AuditAction, EncounterStatus } from "@prisma/client";
import {
  ALLOWED_CLINICAL_DOCUMENTATION_AUDIT_KEYS,
  EDOC_BASIC_STRUCTURED_CARD_ID,
  FORBIDDEN_CLINICAL_DOCUMENTATION_AUDIT_KEYS,
  IO_BLOOD_PRODUCT_INTAKE_CARD_ID,
  IO_PO_INTAKE_CARD_ID,
  IO_URINE_OUTPUT_CARD_ID,
  OBS_AMBULATION_TRIAL_CARD_ID,
  OBS_PO_CHALLENGE_CARD_ID,
  STROKE_NIHSS_CARD_ID,
  STROKE_SWALLOW_SCREEN_CARD_ID,
} from "@medora/shared";
import { ClinicalDocumentationService } from "./clinical-documentation.service";

describe("ClinicalDocumentationService (EDOC.2 / EDOC.4)", () => {
  const entryRow = {
    id: "edoc1",
    encounterId: "e1",
    category: "OBSERVATION_DOCUMENTATION",
    cardId: EDOC_BASIC_STRUCTURED_CARD_ID,
    authorUserId: "u1",
    authorDisplayNameSnapshot: "Jane Nurse",
    authorRoleSnapshot: "RN",
    createdAt: new Date("2026-05-28T12:00:00.000Z"),
    payloadJson: { items: [{ key: "Pain", value: "2/10" }] },
    voidedAt: null,
    requiresWitnessSignature: false,
    witnessedAt: null,
    witnessedByUserId: null,
    witnessDisplayNameSnapshot: null,
    witnessRoleSnapshot: null,
  };

  function buildService(overrides?: {
    encounter?: Record<string, unknown> | null;
    entries?: Array<Record<string, unknown>>;
    facilityPolicy?: Record<string, unknown> | null;
    existingEntry?: Record<string, unknown> | null;
  }) {
    const create = jest.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({
        ...entryRow,
        id: "edoc-new",
        cardId: String(data.cardId ?? entryRow.cardId),
        category: String(data.category ?? entryRow.category),
        payloadJson: data.payloadJson ?? entryRow.payloadJson,
        requiresWitnessSignature: Boolean(data.requiresWitnessSignature),
        authorUserId: String(data.authorUserId ?? entryRow.authorUserId),
      })
    );
    const update = jest.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({
        ...(overrides?.existingEntry ?? entryRow),
        witnessedAt: data.witnessedAt ?? new Date("2026-05-28T13:00:00.000Z"),
        witnessedByUserId: data.witnessedByUserId ?? "u2",
        witnessDisplayNameSnapshot: data.witnessDisplayNameSnapshot ?? "Bob Witness",
        witnessRoleSnapshot: data.witnessRoleSnapshot ?? "RN",
      })
    );
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
      facility: {
        findFirst: jest.fn().mockResolvedValue({
          clinicalDocumentationWitnessPolicyJson: overrides?.facilityPolicy ?? null,
        }),
      },
      encounterClinicalDocumentationEntry: {
        findMany: jest.fn().mockResolvedValue(overrides?.entries ?? [entryRow]),
        findFirst: jest.fn().mockResolvedValue(overrides?.existingEntry ?? entryRow),
        create,
        update,
      },
      user: {
        findUnique: jest.fn().mockImplementation(({ where }: { where: { id: string } }) => {
          if (where.id === "u2") {
            return Promise.resolve({ firstName: "Bob", lastName: "Witness" });
          }
          return Promise.resolve({ firstName: "Jane", lastName: "Nurse" });
        }),
      },
      userRole: {
        findMany: jest.fn().mockImplementation(({ where }: { where: { userId: string } }) => {
          if (where.userId === "u2") {
            return Promise.resolve([{ role: { code: "RN", name: "Infirmier(ère)" } }]);
          }
          return Promise.resolve([{ role: { code: "RN", name: "Infirmier(ère)" } }]);
        }),
      },
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          encounterClinicalDocumentationEntry: { create, update },
        })
      ),
    };
    const audit = { log: jest.fn().mockResolvedValue(undefined) };
    return {
      svc: new ClinicalDocumentationService(prisma as never, audit as never),
      prisma,
      audit,
      create,
      update,
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
    expect(saved.witnessStatus).toBe("NOT_REQUIRED");
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("sets requiresWitnessSignature from facility policy (EDOC.4)", async () => {
    const { svc, create } = buildService({
      facilityPolicy: { additionalCardIds: [OBS_PO_CHALLENGE_CARD_ID] },
    });
    await svc.createEntry(
      "f1",
      "e1",
      {
        category: "OBSERVATION_DOCUMENTATION",
        cardId: OBS_PO_CHALLENGE_CARD_ID,
        payloadJson: {
          startTime: "2026-05-28T14:00:00.000Z",
          substance: "Water",
          amount: "8 oz",
          tolerated: "YES",
          nausea: false,
          vomiting: false,
          abdominalPain: false,
          result: "PASSED",
        },
      },
      "u1"
    );
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ requiresWitnessSignature: true }),
      })
    );
  });

  it("witnesses pending entry and audits signer ids (EDOC.4)", async () => {
    const pendingEntry = {
      ...entryRow,
      id: "edoc-pending",
      cardId: OBS_PO_CHALLENGE_CARD_ID,
      requiresWitnessSignature: true,
      witnessedAt: null,
    };
    const { svc, audit, update } = buildService({ existingEntry: pendingEntry });
    const witnessed = await svc.witnessEntry("f1", "e1", "edoc-pending", "u2");
    expect(witnessed.witnessStatus).toBe("WITNESSED");
    expect(witnessed.witnessDisplayName).toBe("Bob Witness");
    expect(update).toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(
      AuditAction.ENCOUNTER_CLINICAL_DOCUMENTATION_WITNESSED,
      "ENCOUNTER_CLINICAL_DOCUMENTATION_ENTRY",
      expect.objectContaining({
        metadata: expect.objectContaining({
          entryId: "edoc-pending",
          authorUserId: "u1",
          witnessUserId: "u2",
          witnessRole: "Infirmier(ère)",
        }),
      })
    );
    const meta = audit.log.mock.calls[0]?.[2]?.metadata as Record<string, unknown>;
    for (const forbidden of FORBIDDEN_CLINICAL_DOCUMENTATION_AUDIT_KEYS) {
      expect(meta).not.toHaveProperty(forbidden);
    }
    for (const key of ["encounterId", "patientId", "entryId", "authorUserId", "witnessUserId"]) {
      expect(ALLOWED_CLINICAL_DOCUMENTATION_AUDIT_KEYS).toContain(key);
    }
  });

  it("rejects self-witness", async () => {
    const pendingEntry = {
      ...entryRow,
      requiresWitnessSignature: true,
      witnessedAt: null,
    };
    const { svc, update } = buildService({ existingEntry: pendingEntry });
    await expect(svc.witnessEntry("f1", "e1", "edoc1", "u1")).rejects.toBeInstanceOf(
      BadRequestException
    );
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects witness when not required", async () => {
    const { svc } = buildService({ existingEntry: entryRow });
    await expect(svc.witnessEntry("f1", "e1", "edoc1", "u2")).rejects.toBeInstanceOf(
      BadRequestException
    );
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
          entryId: "edoc-new",
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
      if (allowed === "witnessUserId" || allowed === "witnessRole") continue;
      expect(meta).toHaveProperty(allowed);
    }
  });

  it("POST PO Challenge persists append-only entry (EDOC.3)", async () => {
    const { svc, create } = buildService();
    const payload = {
      startTime: "2026-05-28T14:00:00.000Z",
      substance: "Water",
      amount: "8 oz",
      tolerated: "YES",
      nausea: false,
      vomiting: false,
      abdominalPain: false,
      result: "PASSED",
    };
    const saved = await svc.createEntry(
      "f1",
      "e1",
      {
        category: "OBSERVATION_DOCUMENTATION",
        cardId: OBS_PO_CHALLENGE_CARD_ID,
        payloadJson: payload,
      },
      "u1"
    );
    expect(saved.cardId).toBe(OBS_PO_CHALLENGE_CARD_ID);
    expect((saved.payloadJson as typeof payload).substance).toBe("Water");
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("POST Ambulation Trial persists (EDOC.3)", async () => {
    const { svc } = buildService();
    const saved = await svc.createEntry(
      "f1",
      "e1",
      {
        category: "OBSERVATION_DOCUMENTATION",
        cardId: OBS_AMBULATION_TRIAL_CARD_ID,
        payloadJson: {
          assistanceLevel: "ONE_PERSON",
          distance: 100,
          distanceUnit: "FEET",
          gaitSteady: true,
          dizziness: false,
          shortnessOfBreath: false,
          pain: false,
          oxygenDesaturation: false,
          result: "PARTIAL",
        },
      },
      "u1"
    );
    expect(saved.cardId).toBe(OBS_AMBULATION_TRIAL_CARD_ID);
    expect(saved.payloadSummary.some((l) => l.key === "Distance")).toBe(true);
  });

  it("rejects invalid PO Challenge payload", async () => {
    const { svc, create } = buildService();
    await expect(
      svc.createEntry(
        "f1",
        "e1",
        {
          category: "OBSERVATION_DOCUMENTATION",
          cardId: OBS_PO_CHALLENGE_CARD_ID,
          payloadJson: { result: "PASSED" },
        },
        "u1"
      )
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(create).not.toHaveBeenCalled();
  });

  it("audit metadata excludes notes for PO Challenge (EDOC.3)", async () => {
    const { svc, audit } = buildService();
    await svc.createEntry(
      "f1",
      "e1",
      {
        category: "OBSERVATION_DOCUMENTATION",
        cardId: OBS_PO_CHALLENGE_CARD_ID,
        payloadJson: {
          startTime: "2026-05-28T14:00:00.000Z",
          substance: "Jello",
          amount: "1 cup",
          tolerated: "YES",
          nausea: false,
          vomiting: false,
          abdominalPain: false,
          result: "PASSED",
          notes: "Patient tolerated well — should not appear in audit",
        },
      },
      "u1"
    );
    const meta = audit.log.mock.calls[0]?.[2]?.metadata as Record<string, unknown>;
    expect(meta).not.toHaveProperty("notes");
    expect(meta).not.toHaveProperty("payloadJson");
    expect(meta.payloadKeyCount).toBeGreaterThan(0);
  });

  const NIHSS_PAYLOAD = {
    assessedAt: "2026-05-28T14:00:00.000Z",
    levelOfConsciousness: 0,
    locQuestions: 1,
    locCommands: 0,
    bestGaze: 0,
    visualFields: 0,
    facialPalsy: 1,
    motorArmLeft: 2,
    motorArmRight: 0,
    motorLegLeft: 1,
    motorLegRight: 0,
    limbAtaxia: 0,
    sensory: 0,
    bestLanguage: 0,
    dysarthria: 0,
    extinctionInattention: 0,
    totalScore: 5,
  };

  it("POST NIHSS persists (EDOC.4 stroke)", async () => {
    const { svc, create } = buildService();
    const saved = await svc.createEntry(
      "f1",
      "e1",
      {
        category: "STROKE_DOCUMENTATION",
        cardId: STROKE_NIHSS_CARD_ID,
        payloadJson: NIHSS_PAYLOAD,
      },
      "u1"
    );
    expect(saved.cardId).toBe(STROKE_NIHSS_CARD_ID);
    expect(saved.payloadSummary.some((l) => l.key === "Score NIHSS total")).toBe(true);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("POST Swallow Screen persists (EDOC.4 stroke)", async () => {
    const { svc } = buildService();
    const saved = await svc.createEntry(
      "f1",
      "e1",
      {
        category: "STROKE_DOCUMENTATION",
        cardId: STROKE_SWALLOW_SCREEN_CARD_ID,
        payloadJson: {
          screenedAt: "2026-05-28T14:00:00.000Z",
          alertEnoughForScreen: true,
          facialDroopOrWeakness: false,
          speechDifficulty: false,
          coughOrWetVoice: false,
          failedWaterTrial: false,
          result: "PASSED",
          npoRecommended: false,
          providerNotified: true,
        },
      },
      "u1"
    );
    expect(saved.cardId).toBe(STROKE_SWALLOW_SCREEN_CARD_ID);
  });

  it("rejects invalid NIHSS payload (EDOC.4 stroke)", async () => {
    const { svc, create } = buildService();
    await expect(
      svc.createEntry(
        "f1",
        "e1",
        {
          category: "STROKE_DOCUMENTATION",
          cardId: STROKE_NIHSS_CARD_ID,
          payloadJson: { ...NIHSS_PAYLOAD, totalScore: 99 },
        },
        "u1"
      )
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(create).not.toHaveBeenCalled();
  });

  it("witness policy can mark NIHSS pending when configured (EDOC.4 stroke)", async () => {
    const { svc, create } = buildService({
      facilityPolicy: { additionalCardIds: [STROKE_NIHSS_CARD_ID] },
    });
    await svc.createEntry(
      "f1",
      "e1",
      {
        category: "STROKE_DOCUMENTATION",
        cardId: STROKE_NIHSS_CARD_ID,
        payloadJson: NIHSS_PAYLOAD,
      },
      "u1"
    );
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ requiresWitnessSignature: true }),
      })
    );
  });

  const PO_INTAKE_PAYLOAD = {
    recordedAt: "2026-05-28T14:00:00.000Z",
    amount: 240,
    unit: "ML",
    substance: "water",
    tolerated: "YES",
    nausea: false,
    vomiting: false,
  };

  const URINE_OUTPUT_PAYLOAD = {
    recordedAt: "2026-05-28T15:00:00.000Z",
    amount: 400,
    unit: "ML",
    method: "FOLEY",
  };

  const BLOOD_PRODUCT_INTAKE_PAYLOAD = {
    recordedAt: "2026-05-28T16:00:00.000Z",
    amount: 350,
    unit: "ML",
    productType: "PRBC",
    transfusionRecordLinked: false,
    reactionSuspected: false,
  };

  it("POST PO Intake persists (EDOC.5)", async () => {
    const { svc, create } = buildService();
    const saved = await svc.createEntry(
      "f1",
      "e1",
      {
        category: "INTAKE_OUTPUT",
        cardId: IO_PO_INTAKE_CARD_ID,
        payloadJson: PO_INTAKE_PAYLOAD,
      },
      "u1"
    );
    expect(saved.cardId).toBe(IO_PO_INTAKE_CARD_ID);
    expect(saved.payloadSummary.some((l) => l.key === "PO")).toBe(true);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("POST Urine Output persists (EDOC.5)", async () => {
    const { svc } = buildService();
    const saved = await svc.createEntry(
      "f1",
      "e1",
      {
        category: "INTAKE_OUTPUT",
        cardId: IO_URINE_OUTPUT_CARD_ID,
        payloadJson: URINE_OUTPUT_PAYLOAD,
      },
      "u1"
    );
    expect(saved.cardId).toBe(IO_URINE_OUTPUT_CARD_ID);
    expect(saved.payloadSummary.some((l) => l.key === "Méthode")).toBe(true);
  });

  it("POST Blood Product Intake persists as I&O only (EDOC.5)", async () => {
    const { svc, create } = buildService();
    const saved = await svc.createEntry(
      "f1",
      "e1",
      {
        category: "INTAKE_OUTPUT",
        cardId: IO_BLOOD_PRODUCT_INTAKE_CARD_ID,
        payloadJson: BLOOD_PRODUCT_INTAKE_PAYLOAD,
      },
      "u1"
    );
    expect(saved.cardId).toBe(IO_BLOOD_PRODUCT_INTAKE_CARD_ID);
    expect(saved.payloadSummary.some((l) => l.key === "Apport produit sanguin")).toBe(true);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid negative I&O amount (EDOC.5)", async () => {
    const { svc, create } = buildService();
    await expect(
      svc.createEntry(
        "f1",
        "e1",
        {
          category: "INTAKE_OUTPUT",
          cardId: IO_PO_INTAKE_CARD_ID,
          payloadJson: { ...PO_INTAKE_PAYLOAD, amount: -10 },
        },
        "u1"
      )
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(create).not.toHaveBeenCalled();
  });

  it("witness policy can mark Blood Product Intake pending when configured (EDOC.5)", async () => {
    const { svc, create } = buildService({
      facilityPolicy: { additionalCardIds: [IO_BLOOD_PRODUCT_INTAKE_CARD_ID] },
    });
    await svc.createEntry(
      "f1",
      "e1",
      {
        category: "INTAKE_OUTPUT",
        cardId: IO_BLOOD_PRODUCT_INTAKE_CARD_ID,
        payloadJson: BLOOD_PRODUCT_INTAKE_PAYLOAD,
      },
      "u1"
    );
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ requiresWitnessSignature: true }),
      })
    );
  });
});
