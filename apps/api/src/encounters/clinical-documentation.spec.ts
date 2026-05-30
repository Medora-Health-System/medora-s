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
  GLASGOW_COMA_SCALE_CARD_ID,
  NEURO_CHECKS_CARD_ID,
  NEURO_ESCALATION_EVENT_CARD_ID,
  NIHSS_REASSESSMENT_CARD_ID,
  POST_THROMBOLYTIC_MONITORING_CARD_ID,
  RESP_ASSESSMENT_CARD_ID,
  OXYGEN_THERAPY_INITIATION_CARD_ID,
  OXYGEN_TITRATION_CARD_ID,
  NEBULIZER_REASSESSMENT_CARD_ID,
  CPAP_BIPAP_MONITORING_CARD_ID,
  RESPIRATORY_DISTRESS_REASSESSMENT_CARD_ID,
  VENTILATOR_OBSERVATION_CARD_ID,
  PEAK_FLOW_DOCUMENTATION_CARD_ID,
  PAIN_INITIAL_ASSESSMENT_CARD_ID,
  PAIN_REASSESSMENT_CARD_ID,
  PAIN_POST_INTERVENTION_REASSESSMENT_CARD_ID,
  CHRONIC_PAIN_ASSESSMENT_CARD_ID,
  ADULT_NONVERBAL_PAIN_ASSESSMENT_CARD_ID,
  PEDIATRIC_PAIN_ASSESSMENT_CARD_ID,
  PAIN_ESCALATION_EVENT_CARD_ID,
  NEUROLOGICAL_INITIAL_ASSESSMENT_CARD_ID,
  NEUROLOGICAL_REASSESSMENT_CARD_ID,
  GLASGOW_COMA_SCALE_ASSESSMENT_CARD_ID,
  STROKE_ALERT_EVENT_CARD_ID,
  NIHSS_ASSESSMENT_CARD_ID,
  SEIZURE_EVENT_DOCUMENTATION_CARD_ID,
  NEUROLOGICAL_POST_THROMBOLYTIC_MONITORING_CARD_ID,
  NEUROLOGICAL_ESCALATION_EVENT_CARD_ID,
  MORSE_FALL_RISK_ASSESSMENT_CARD_ID,
  FALL_RISK_REASSESSMENT_CARD_ID,
  SAFETY_PRECAUTIONS_DOCUMENTATION_CARD_ID,
  MOBILITY_AMBULATION_ASSESSMENT_CARD_ID,
  NEAR_FALL_EVENT_CARD_ID,
  FALL_EVENT_DOCUMENTATION_CARD_ID,
  POST_FALL_ASSESSMENT_CARD_ID,
  FALL_ESCALATION_EVENT_CARD_ID,
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
    expect(saved.payloadSummaryEn.some((l) => l.key === "Distance")).toBe(true);
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
    expect(saved.payloadSummaryEn.some((l) => l.key === "NIHSS total score")).toBe(true);
    expect(saved.payloadSummaryFr.some((l) => l.key === "Score NIHSS total")).toBe(true);
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
    expect(saved.payloadSummaryEn.some((l) => l.key === "PO")).toBe(true);
    expect(saved.payloadSummaryFr.some((l) => l.key === "PO")).toBe(true);
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
    expect(saved.payloadSummaryFr.some((l) => l.key === "Méthode")).toBe(true);
    expect(saved.payloadSummaryEn.some((l) => l.key === "Method")).toBe(true);
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
    expect(saved.payloadSummaryFr.some((l) => l.key === "Apport produit sanguin")).toBe(true);
    expect(saved.payloadSummaryEn.some((l) => l.key === "Blood product intake")).toBe(true);
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

  it("POST NIHSS reassessment persists (EDOC.11)", async () => {
    const { svc } = buildService();
    const saved = await svc.createEntry(
      "f1",
      "e1",
      {
        category: "STROKE_DOCUMENTATION",
        cardId: NIHSS_REASSESSMENT_CARD_ID,
        payloadJson: {
          ...NIHSS_PAYLOAD,
          previousScore: 3,
          scoreChange: 2,
          worseningDetected: true,
          providerNotified: true,
          providerNotificationTime: "2026-05-28T14:05:00.000Z",
        },
      },
      "u1"
    );
    expect(saved.payloadSummaryEn.some((l) => l.key === "NIHSS total")).toBe(true);
    expect(saved.witnessStatus).toBe("NOT_REQUIRED");
  });

  it("POST GCS persists with summaries (EDOC.11)", async () => {
    const { svc } = buildService();
    const saved = await svc.createEntry(
      "f1",
      "e1",
      {
        category: "STROKE_DOCUMENTATION",
        cardId: GLASGOW_COMA_SCALE_CARD_ID,
        payloadJson: {
          assessmentTime: "2026-05-28T14:00:00.000Z",
          eye: 4,
          verbal: 5,
          motor: 6,
          totalScore: 15,
          severityBand: "MILD",
          providerNotified: true,
        },
      },
      "u1"
    );
    expect(saved.payloadSummaryEn.some((l) => l.key === "Total score" && l.value === "15")).toBe(true);
  });

  it("POST neuro checks persists (EDOC.11)", async () => {
    const { svc, create } = buildService();
    await svc.createEntry(
      "f1",
      "e1",
      {
        category: "STROKE_DOCUMENTATION",
        cardId: NEURO_CHECKS_CARD_ID,
        payloadJson: {
          assessmentTime: "2026-05-28T14:00:00.000Z",
          levelOfConsciousness: "ALERT",
          orientation: "X4",
          speech: "NORMAL",
          sensation: "INTACT",
          facialDroop: "NONE",
          seizureActivityObserved: false,
          providerNotified: false,
        },
      },
      "u1"
    );
    expect(create).toHaveBeenCalled();
  });

  it("POST neuro escalation event persists (EDOC.11)", async () => {
    const { svc } = buildService();
    const saved = await svc.createEntry(
      "f1",
      "e1",
      {
        category: "STROKE_DOCUMENTATION",
        cardId: NEURO_ESCALATION_EVENT_CARD_ID,
        payloadJson: {
          eventTime: "2026-05-28T14:30:00.000Z",
          reason: "NIHSS_WORSENING",
          providerNotified: true,
          providerNotificationTime: "2026-05-28T14:31:00.000Z",
          responseReceived: true,
          rapidResponseActivated: false,
          strokeAlertActivated: true,
        },
      },
      "u1"
    );
    expect(saved.payloadSummaryEn.some((l) => l.key === "Reason")).toBe(true);
  });

  it("POST post-thrombolytic monitoring persists (EDOC.11)", async () => {
    const { svc } = buildService();
    const saved = await svc.createEntry(
      "f1",
      "e1",
      {
        category: "STROKE_DOCUMENTATION",
        cardId: POST_THROMBOLYTIC_MONITORING_CARD_ID,
        payloadJson: {
          assessmentTime: "2026-05-28T15:00:00.000Z",
          therapy: "TNK",
          bloodPressure: "130/82",
          heartRate: 84,
          neuroStatusStable: true,
          bleedingObserved: false,
          headachePresent: false,
          providerNotified: false,
        },
      },
      "u1"
    );
    expect(saved.payloadSummaryEn.some((l) => l.key === "Therapy")).toBe(true);
  });

  it("stroke neuro audit metadata excludes clinical findings (EDOC.11)", async () => {
    const { svc, audit } = buildService();
    await svc.createEntry(
      "f1",
      "e1",
      {
        category: "STROKE_DOCUMENTATION",
        cardId: NEURO_CHECKS_CARD_ID,
        payloadJson: {
          assessmentTime: "2026-05-28T14:00:00.000Z",
          levelOfConsciousness: "LETHARGIC",
          orientation: "X2",
          speech: "SLURRED",
          sensation: "DECREASED",
          facialDroop: "LEFT",
          seizureActivityObserved: false,
          providerNotified: true,
          notes: "New left facial droop noted.",
        },
      },
      "u1"
    );
    const meta = audit.log.mock.calls[0]?.[2]?.metadata as Record<string, unknown>;
    expect(meta).not.toHaveProperty("notes");
    expect(meta).not.toHaveProperty("levelOfConsciousness");
    expect(meta.payloadKeyCount).toBeGreaterThan(0);
  });

  it("POST respiratory assessment persists (EDOC.12)", async () => {
    const { svc } = buildService();
    const saved = await svc.createEntry(
      "f1",
      "e1",
      {
        category: "RESPIRATORY_DOCUMENTATION",
        cardId: RESP_ASSESSMENT_CARD_ID,
        payloadJson: {
          assessmentTime: "2026-05-28T14:00:00.000Z",
          respiratoryRate: 20,
          spo2: 95,
          oxygenDevice: "NASAL_CANNULA",
          oxygenFlowRate: 2,
          workOfBreathing: "NORMAL",
          breathSounds: "CLEAR",
          breathSoundsLocation: "BILATERAL",
          cough: "NONE",
          sputumPresent: false,
          accessoryMuscleUse: false,
          retractions: false,
          cyanosis: false,
          patientPosition: "SEMI_FOWLER",
          providerNotified: false,
        },
      },
      "u1"
    );
    expect(saved.payloadSummaryEn.some((l) => l.key === "Respiratory rate")).toBe(true);
  });

  it("POST oxygen initiation persists (EDOC.12)", async () => {
    const { svc } = buildService();
    const saved = await svc.createEntry(
      "f1",
      "e1",
      {
        category: "RESPIRATORY_DOCUMENTATION",
        cardId: OXYGEN_THERAPY_INITIATION_CARD_ID,
        payloadJson: {
          startedAt: "2026-05-28T14:00:00.000Z",
          oxygenDevice: "NASAL_CANNULA",
          flowRate: 2,
          flowUnit: "LPM",
          spo2Before: 88,
          spo2After: 94,
          reason: "HYPOXIA",
          providerOrderVerified: true,
          patientTolerated: true,
        },
      },
      "u1"
    );
    expect(saved.payloadSummaryEn.some((l) => l.key === "SpO₂ before")).toBe(true);
  });

  it("POST oxygen titration persists (EDOC.12)", async () => {
    const { svc, create } = buildService();
    await svc.createEntry(
      "f1",
      "e1",
      {
        category: "RESPIRATORY_DOCUMENTATION",
        cardId: OXYGEN_TITRATION_CARD_ID,
        payloadJson: {
          titrationTime: "2026-05-28T14:00:00.000Z",
          previousDevice: "NASAL_CANNULA",
          newDevice: "SIMPLE_MASK",
          newFlowRate: 6,
          flowUnit: "LPM",
          spo2Before: 90,
          spo2After: 96,
          reason: "SPO2_LOW",
          providerNotified: false,
          patientTolerated: true,
        },
      },
      "u1"
    );
    expect(create).toHaveBeenCalled();
  });

  it("POST nebulizer reassessment persists (EDOC.12)", async () => {
    const { svc } = buildService();
    const saved = await svc.createEntry(
      "f1",
      "e1",
      {
        category: "RESPIRATORY_DOCUMENTATION",
        cardId: NEBULIZER_REASSESSMENT_CARD_ID,
        payloadJson: {
          reassessmentTime: "2026-05-28T14:00:00.000Z",
          treatmentMedicationReferenced: "ALBUTEROL",
          treatmentDocumentedInMar: true,
          respiratoryRate: 20,
          spo2: 95,
          breathSoundsAfter: "CLEAR",
          workOfBreathingAfter: "NORMAL",
          patientReportsImprovement: true,
          adverseEffectObserved: false,
          providerNotified: false,
        },
      },
      "u1"
    );
    expect(saved.payloadSummaryEn.some((l) => l.key === "MAR documented")).toBe(true);
  });

  it("POST CPAP/BiPAP monitoring persists (EDOC.12)", async () => {
    const { svc } = buildService();
    const saved = await svc.createEntry(
      "f1",
      "e1",
      {
        category: "RESPIRATORY_DOCUMENTATION",
        cardId: CPAP_BIPAP_MONITORING_CARD_ID,
        payloadJson: {
          monitoringTime: "2026-05-28T14:00:00.000Z",
          mode: "CPAP",
          deviceSettingSummary: "CPAP 8",
          respiratoryRate: 18,
          spo2: 96,
          maskFit: "GOOD",
          skinIntegrity: "INTACT",
          patientTolerance: "TOLERATING",
          providerNotified: false,
        },
      },
      "u1"
    );
    expect(saved.payloadSummaryEn.some((l) => l.key === "Tolerance")).toBe(true);
  });

  it("POST respiratory distress reassessment persists (EDOC.12)", async () => {
    const { svc } = buildService();
    const saved = await svc.createEntry(
      "f1",
      "e1",
      {
        category: "RESPIRATORY_DOCUMENTATION",
        cardId: RESPIRATORY_DISTRESS_REASSESSMENT_CARD_ID,
        payloadJson: {
          reassessmentTime: "2026-05-28T14:00:00.000Z",
          respiratoryRate: 32,
          spo2: 86,
          workOfBreathing: "SEVERE_DISTRESS",
          oxygenDevice: "NON_REBREATHER",
          oxygenFlowRate: 15,
          accessoryMuscleUse: true,
          retractions: true,
          mentalStatus: "ANXIOUS",
          interventionPerformed: "OXYGEN_INCREASED",
          providerNotified: true,
          rapidResponseActivated: false,
        },
      },
      "u1"
    );
    expect(saved.payloadSummaryEn.some((l) => l.key === "Provider notified")).toBe(true);
  });

  it("POST ventilator observation persists (EDOC.12)", async () => {
    const { svc } = buildService();
    const saved = await svc.createEntry(
      "f1",
      "e1",
      {
        category: "RESPIRATORY_DOCUMENTATION",
        cardId: VENTILATOR_OBSERVATION_CARD_ID,
        payloadJson: {
          observationTime: "2026-05-28T14:00:00.000Z",
          ventilatorMode: "AC",
          fio2Percent: 40,
          peep: 5,
          respiratoryRateObserved: 14,
          spo2: 98,
          airwaySecured: true,
          alarmObserved: false,
          rtNotified: false,
          providerNotified: false,
        },
      },
      "u1"
    );
    expect(saved.payloadSummaryEn.some((l) => l.key === "Mode")).toBe(true);
  });

  it("POST peak flow persists (EDOC.12)", async () => {
    const { svc } = buildService();
    const saved = await svc.createEntry(
      "f1",
      "e1",
      {
        category: "RESPIRATORY_DOCUMENTATION",
        cardId: PEAK_FLOW_DOCUMENTATION_CARD_ID,
        payloadJson: {
          measuredAt: "2026-05-28T14:00:00.000Z",
          preTreatmentPeakFlow: 220,
          postTreatmentPeakFlow: 310,
          personalBestKnown: false,
          effortQuality: "GOOD",
          providerNotified: false,
        },
      },
      "u1"
    );
    expect(saved.payloadSummaryEn.some((l) => l.key === "Pre-treatment")).toBe(true);
  });

  it("respiratory audit metadata excludes vitals/settings/notes (EDOC.12)", async () => {
    const { svc, audit } = buildService();
    await svc.createEntry(
      "f1",
      "e1",
      {
        category: "RESPIRATORY_DOCUMENTATION",
        cardId: VENTILATOR_OBSERVATION_CARD_ID,
        payloadJson: {
          observationTime: "2026-05-28T14:00:00.000Z",
          ventilatorMode: "AC",
          fio2Percent: 60,
          peep: 8,
          respiratoryRateObserved: 16,
          spo2: 97,
          airwaySecured: true,
          alarmObserved: true,
          alarmDescription: "High peak pressure",
          rtNotified: true,
          providerNotified: true,
          notes: "RT at bedside within 5 min.",
        },
      },
      "u1"
    );
    const meta = audit.log.mock.calls[0]?.[2]?.metadata as Record<string, unknown>;
    expect(meta).not.toHaveProperty("notes");
    expect(meta).not.toHaveProperty("fio2Percent");
    expect(meta).not.toHaveProperty("peep");
    expect(meta).not.toHaveProperty("spo2");
    expect(meta.payloadKeyCount).toBeGreaterThan(0);
  });

  it("POST initial pain assessment persists (EDOC.13)", async () => {
    const { svc } = buildService();
    const saved = await svc.createEntry(
      "f1",
      "e1",
      {
        category: "PAIN_DOCUMENTATION",
        cardId: PAIN_INITIAL_ASSESSMENT_CARD_ID,
        payloadJson: {
          assessmentTime: "2026-05-28T14:00:00.000Z",
          painScale: "NUMERIC",
          painScore: 6,
          painLocation: "ABDOMEN",
          painQuality: "CRAMPING",
          painDuration: "NEW",
          painRadiation: "NONE",
          functionalImpact: "MODERATE",
          providerNotified: false,
        },
      },
      "u1"
    );
    expect(saved.payloadSummaryEn.some((l) => l.key === "Pain score" && l.value === "6")).toBe(true);
  });

  it("POST pain reassessment persists (EDOC.13)", async () => {
    const { svc, create } = buildService();
    await svc.createEntry(
      "f1",
      "e1",
      {
        category: "PAIN_DOCUMENTATION",
        cardId: PAIN_REASSESSMENT_CARD_ID,
        payloadJson: {
          assessmentTime: "2026-05-28T14:00:00.000Z",
          painScale: "NUMERIC",
          painScore: 3,
          previousPainScore: 6,
          painImproved: true,
          functionalImpact: "MILD",
          providerNotified: false,
        },
      },
      "u1"
    );
    expect(create).toHaveBeenCalled();
  });

  it("POST post-intervention pain persists (EDOC.13)", async () => {
    const { svc } = buildService();
    const saved = await svc.createEntry(
      "f1",
      "e1",
      {
        category: "PAIN_DOCUMENTATION",
        cardId: PAIN_POST_INTERVENTION_REASSESSMENT_CARD_ID,
        payloadJson: {
          assessmentTime: "2026-05-28T14:00:00.000Z",
          interventionType: "MEDICATION",
          painScoreBefore: 8,
          painScoreAfter: 4,
          response: "IMPROVED",
          providerNotified: false,
        },
      },
      "u1"
    );
    expect(saved.payloadSummaryEn.some((l) => l.key === "Before" && l.value === "8")).toBe(true);
  });

  it("POST chronic pain persists (EDOC.13)", async () => {
    const { svc } = buildService();
    const saved = await svc.createEntry(
      "f1",
      "e1",
      {
        category: "PAIN_DOCUMENTATION",
        cardId: CHRONIC_PAIN_ASSESSMENT_CARD_ID,
        payloadJson: {
          assessmentTime: "2026-05-28T14:00:00.000Z",
          baselinePainScore: 5,
          currentPainScore: 6,
          painManagementPlanPresent: true,
          opioidTherapyReported: true,
          painInterferesWithSleep: true,
          painInterferesWithMobility: true,
          painInterferesWithADLs: false,
          providerManagingPainKnown: true,
        },
      },
      "u1"
    );
    expect(saved.payloadSummaryEn.some((l) => l.key === "Baseline")).toBe(true);
  });

  it("POST adult non-verbal pain persists (EDOC.13)", async () => {
    const { svc } = buildService();
    const saved = await svc.createEntry(
      "f1",
      "e1",
      {
        category: "PAIN_DOCUMENTATION",
        cardId: ADULT_NONVERBAL_PAIN_ASSESSMENT_CARD_ID,
        payloadJson: {
          assessmentTime: "2026-05-28T14:00:00.000Z",
          facialExpression: 1,
          activity: 1,
          guarding: 0,
          physiology: 0,
          respiratory: 0,
          totalScore: 2,
          providerNotified: false,
        },
      },
      "u1"
    );
    expect(saved.payloadSummaryEn.some((l) => l.key === "Total score" && l.value === "2")).toBe(true);
  });

  it("POST pediatric FLACC persists (EDOC.13)", async () => {
    const { svc } = buildService();
    const saved = await svc.createEntry(
      "f1",
      "e1",
      {
        category: "PAIN_DOCUMENTATION",
        cardId: PEDIATRIC_PAIN_ASSESSMENT_CARD_ID,
        payloadJson: {
          assessmentTime: "2026-05-28T14:00:00.000Z",
          face: 1,
          legs: 1,
          activity: 1,
          cry: 0,
          consolability: 1,
          totalScore: 4,
          providerNotified: false,
        },
      },
      "u1"
    );
    expect(saved.payloadSummaryEn.some((l) => l.key === "FLACC total" && l.value === "4")).toBe(true);
  });

  it("POST pain escalation persists (EDOC.13)", async () => {
    const { svc } = buildService();
    const saved = await svc.createEntry(
      "f1",
      "e1",
      {
        category: "PAIN_DOCUMENTATION",
        cardId: PAIN_ESCALATION_EVENT_CARD_ID,
        payloadJson: {
          eventTime: "2026-05-28T14:00:00.000Z",
          reason: "UNCONTROLLED_PAIN",
          providerNotified: true,
          providerNotificationTime: "2026-05-28T14:05:00.000Z",
          responseReceived: true,
          additionalInterventionOrdered: true,
        },
      },
      "u1"
    );
    expect(saved.payloadSummaryEn.some((l) => l.key === "Provider notified")).toBe(true);
  });

  it("pain audit metadata excludes findings (EDOC.13)", async () => {
    const { svc, audit } = buildService();
    await svc.createEntry(
      "f1",
      "e1",
      {
        category: "PAIN_DOCUMENTATION",
        cardId: PAIN_INITIAL_ASSESSMENT_CARD_ID,
        payloadJson: {
          assessmentTime: "2026-05-28T14:00:00.000Z",
          painScale: "NUMERIC",
          painScore: 9,
          painLocation: "CHEST",
          painQuality: "PRESSURE",
          painDuration: "NEW",
          painRadiation: "PRESENT",
          painRadiationDescription: "Left arm",
          functionalImpact: "SEVERE",
          providerNotified: true,
          notes: "Patient clutching chest.",
        },
      },
      "u1"
    );
    const meta = audit.log.mock.calls[0]?.[2]?.metadata as Record<string, unknown>;
    expect(meta).not.toHaveProperty("notes");
    expect(meta).not.toHaveProperty("painScore");
    expect(meta).not.toHaveProperty("painLocation");
    expect(meta.payloadKeyCount).toBeGreaterThan(0);
  });

  it("POST Morse fall risk assessment persists (EDOC.14 fall risk)", async () => {
    const { svc } = buildService();
    const saved = await svc.createEntry(
      "f1",
      "e1",
      {
        category: "FALL_RISK_AND_SAFETY",
        cardId: MORSE_FALL_RISK_ASSESSMENT_CARD_ID,
        payloadJson: {
          assessmentTime: "2026-05-28T14:00:00.000Z",
          historyOfFalling: "NO",
          secondaryDiagnosis: "NO",
          ambulatoryAid: "NONE",
          ivTherapy: "NO",
          gait: "WEAK",
          mentalStatus: "ORIENTED",
          calculatedScore: 10,
          riskLevel: "LOW",
          providerNotified: false,
        },
      },
      "u1"
    );
    expect(saved.payloadSummaryEn.some((l) => l.key === "Morse score" && l.value === "10")).toBe(true);
  });

  it("POST fall risk reassessment persists (EDOC.14 fall risk)", async () => {
    const { svc, create } = buildService();
    await svc.createEntry(
      "f1",
      "e1",
      {
        category: "FALL_RISK_AND_SAFETY",
        cardId: FALL_RISK_REASSESSMENT_CARD_ID,
        payloadJson: {
          assessmentTime: "2026-05-28T14:00:00.000Z",
          previousRiskLevel: "MODERATE",
          currentRiskLevel: "MODERATE",
          changeDetected: false,
          providerNotified: false,
        },
      },
      "u1"
    );
    expect(create).toHaveBeenCalled();
  });

  it("POST safety precautions persists (EDOC.14 fall risk)", async () => {
    const { svc } = buildService();
    const saved = await svc.createEntry(
      "f1",
      "e1",
      {
        category: "FALL_RISK_AND_SAFETY",
        cardId: SAFETY_PRECAUTIONS_DOCUMENTATION_CARD_ID,
        payloadJson: {
          documentationTime: "2026-05-28T14:00:00.000Z",
          bedAlarmActive: true,
          chairAlarmActive: false,
          nonSlipFootwearApplied: true,
          callLightWithinReach: true,
          bedInLowestPosition: true,
          sideRailsAppropriate: true,
          assistiveDeviceAvailable: true,
          fallRiskBandApplied: true,
          familyEducated: true,
          patientEducated: true,
        },
      },
      "u1"
    );
    expect(saved.payloadSummaryEn.some((l) => l.key === "Bed alarm")).toBe(true);
  });

  it("POST mobility assessment persists (EDOC.14 fall risk)", async () => {
    const { svc } = buildService();
    const saved = await svc.createEntry(
      "f1",
      "e1",
      {
        category: "FALL_RISK_AND_SAFETY",
        cardId: MOBILITY_AMBULATION_ASSESSMENT_CARD_ID,
        payloadJson: {
          assessmentTime: "2026-05-28T14:00:00.000Z",
          mobilityLevel: "STANDBY_ASSIST",
          ambulationDistance: 40,
          distanceUnit: "FEET",
          assistiveDevice: "WALKER",
          gaitStability: "STABLE",
          toleratedActivity: true,
          providerNotified: false,
        },
      },
      "u1"
    );
    expect(saved.payloadSummaryEn.some((l) => l.key === "Mobility level")).toBe(true);
  });

  it("POST near-fall event persists (EDOC.14 fall risk)", async () => {
    const { svc } = buildService();
    await svc.createEntry(
      "f1",
      "e1",
      {
        category: "FALL_RISK_AND_SAFETY",
        cardId: NEAR_FALL_EVENT_CARD_ID,
        payloadJson: {
          eventTime: "2026-05-28T14:00:00.000Z",
          location: "Bathroom",
          assistedToSafety: true,
          injuryObserved: false,
          providerNotified: true,
          familyNotified: false,
        },
      },
      "u1"
    );
  });

  it("POST fall event persists (EDOC.14 fall risk)", async () => {
    const { svc } = buildService();
    const saved = await svc.createEntry(
      "f1",
      "e1",
      {
        category: "FALL_RISK_AND_SAFETY",
        cardId: FALL_EVENT_DOCUMENTATION_CARD_ID,
        payloadJson: {
          eventTime: "2026-05-28T14:00:00.000Z",
          witnessed: "NO",
          location: "Hallway",
          headStrikeSuspected: false,
          lossOfConsciousness: false,
          injuryObserved: true,
          providerNotified: true,
          providerNotificationTime: "2026-05-28T14:05:00.000Z",
          familyNotified: false,
          rapidResponseActivated: false,
        },
      },
      "u1"
    );
    expect(saved.payloadSummaryEn.some((l) => l.key === "Witnessed")).toBe(true);
  });

  it("POST post-fall assessment persists (EDOC.14 fall risk)", async () => {
    const { svc } = buildService();
    const saved = await svc.createEntry(
      "f1",
      "e1",
      {
        category: "FALL_RISK_AND_SAFETY",
        cardId: POST_FALL_ASSESSMENT_CARD_ID,
        payloadJson: {
          assessmentTime: "2026-05-28T14:30:00.000Z",
          painPresent: true,
          injuryIdentified: false,
          neurologicStatus: "BASELINE",
          mobilityStatus: "BASELINE",
          vitalSignsObtained: true,
          providerEvaluated: true,
          imagingOrdered: false,
        },
      },
      "u1"
    );
    expect(saved.payloadSummaryEn.some((l) => l.key === "Provider evaluated")).toBe(true);
  });

  it("POST fall escalation persists (EDOC.14 fall risk)", async () => {
    const { svc } = buildService();
    const saved = await svc.createEntry(
      "f1",
      "e1",
      {
        category: "FALL_RISK_AND_SAFETY",
        cardId: FALL_ESCALATION_EVENT_CARD_ID,
        payloadJson: {
          eventTime: "2026-05-28T15:00:00.000Z",
          reason: "RECURRENT_FALLS",
          providerNotified: true,
          providerNotificationTime: "2026-05-28T15:00:00.000Z",
          responseReceived: true,
          additionalInterventionsOrdered: true,
        },
      },
      "u1"
    );
    expect(saved.payloadSummaryEn.some((l) => l.key === "Provider notified")).toBe(true);
  });

  it("fall risk audit metadata excludes findings (EDOC.14 fall risk)", async () => {
    const { svc, audit } = buildService();
    await svc.createEntry(
      "f1",
      "e1",
      {
        category: "FALL_RISK_AND_SAFETY",
        cardId: FALL_EVENT_DOCUMENTATION_CARD_ID,
        payloadJson: {
          eventTime: "2026-05-28T14:00:00.000Z",
          witnessed: "YES",
          location: "Patient room",
          headStrikeSuspected: true,
          lossOfConsciousness: false,
          injuryObserved: true,
          providerNotified: true,
          providerNotificationTime: "2026-05-28T14:05:00.000Z",
          familyNotified: true,
          rapidResponseActivated: false,
          notes: "Patient found on floor near bed.",
        },
      },
      "u1"
    );
    const meta = audit.log.mock.calls[0]?.[2]?.metadata as Record<string, unknown>;
    expect(meta).not.toHaveProperty("notes");
    expect(meta).not.toHaveProperty("location");
    expect(meta).not.toHaveProperty("injuryObserved");
    expect(meta.payloadKeyCount).toBeGreaterThan(0);
  });

  it("POST initial neurological assessment persists (EDOC.14)", async () => {
    const { svc } = buildService();
    const saved = await svc.createEntry(
      "f1",
      "e1",
      {
        category: "NEUROLOGICAL_DOCUMENTATION",
        cardId: NEUROLOGICAL_INITIAL_ASSESSMENT_CARD_ID,
        payloadJson: {
          assessmentTime: "2026-05-28T14:00:00.000Z",
          orientationPerson: true,
          orientationPlace: true,
          orientationTime: true,
          orientationSituation: true,
          speechStatus: "CLEAR",
          facialSymmetry: "SYMMETRIC",
          leftArmStrength: "5/5",
          rightArmStrength: "5/5",
          leftLegStrength: "5/5",
          rightLegStrength: "5/5",
          sensationStatus: "INTACT",
          leftPupilSizeMm: 3,
          rightPupilSizeMm: 3,
          leftPupilReaction: "BRISK",
          rightPupilReaction: "BRISK",
        },
      },
      "u1"
    );
    expect(saved.payloadSummaryEn.some((l) => l.key === "Speech")).toBe(false);
    expect(saved.payloadSummaryEn.some((l) => l.key === "Orientation")).toBe(true);
  });

  it("POST neurological reassessment persists (EDOC.14)", async () => {
    const { svc, create } = buildService();
    await svc.createEntry(
      "f1",
      "e1",
      {
        category: "NEUROLOGICAL_DOCUMENTATION",
        cardId: NEUROLOGICAL_REASSESSMENT_CARD_ID,
        payloadJson: {
          assessmentTime: "2026-05-28T14:00:00.000Z",
          mentalStatus: "ALERT",
          orientationChanged: false,
          motorChanged: false,
          sensoryChanged: false,
          speechChanged: false,
        priorSpeechStatus: "CLEAR",
        speechStatus: "CLEAR",
        pupilChanged: false,
        leftPupilSizeMm: 3,
        rightPupilSizeMm: 3,
        leftPupilReaction: "BRISK",
        rightPupilReaction: "BRISK",
        newDeficit: false,
        newUnilateralWeakness: false,
        providerNotified: false,
        },
      },
      "u1"
    );
    expect(create).toHaveBeenCalled();
  });

  it("POST GCS assessment persists (EDOC.14)", async () => {
    const { svc } = buildService();
    const saved = await svc.createEntry(
      "f1",
      "e1",
      {
        category: "NEUROLOGICAL_DOCUMENTATION",
        cardId: GLASGOW_COMA_SCALE_ASSESSMENT_CARD_ID,
        payloadJson: {
          assessmentTime: "2026-05-28T14:00:00.000Z",
          eyeOpening: 4,
          verbalResponse: 5,
          motorResponse: 6,
          calculatedTotal: 15,
          severity: "MILD",
          providerNotified: false,
        },
      },
      "u1"
    );
    expect(saved.payloadSummaryEn.some((l) => l.key === "GCS total" && l.value === "15")).toBe(true);
  });

  it("POST stroke alert event persists (EDOC.14)", async () => {
    const { svc } = buildService();
    const saved = await svc.createEntry(
      "f1",
      "e1",
      {
        category: "NEUROLOGICAL_DOCUMENTATION",
        cardId: STROKE_ALERT_EVENT_CARD_ID,
        payloadJson: {
          lastKnownWell: "2026-05-28T12:00:00.000Z",
          symptomOnsetTime: "2026-05-28T13:00:00.000Z",
          strokeAlertActivated: true,
          activationTime: "2026-05-28T13:30:00.000Z",
          provider: "Dr Dupont",
          neurologyNotified: true,
          ctOrdered: true,
          thrombolyticCandidate: true,
        },
      },
      "u1"
    );
    expect(saved.payloadSummaryEn.some((l) => l.key === "Stroke alert activated")).toBe(true);
  });

  it("POST NIHSS assessment persists (EDOC.14)", async () => {
    const { svc } = buildService();
    const saved = await svc.createEntry(
      "f1",
      "e1",
      {
        category: "NEUROLOGICAL_DOCUMENTATION",
        cardId: NIHSS_ASSESSMENT_CARD_ID,
        payloadJson: {
          assessmentTime: "2026-05-28T14:00:00.000Z",
          levelOfConsciousness: 0,
          locQuestions: 0,
          locCommands: 0,
          bestGaze: 0,
          visualFields: 0,
          facialPalsy: 0,
          motorArmLeft: 0,
          motorArmRight: 0,
          motorLegLeft: 0,
          motorLegRight: 0,
          limbAtaxia: 0,
          sensory: 0,
          bestLanguage: 0,
          dysarthria: 0,
          extinctionInattention: 0,
          calculatedTotal: 0,
          severity: "NO_STROKE",
          providerNotified: false,
        },
      },
      "u1"
    );
    expect(saved.payloadSummaryEn.some((l) => l.key === "NIHSS total" && l.value === "0")).toBe(true);
  });

  it("POST seizure event persists (EDOC.14)", async () => {
    const { svc } = buildService();
    const saved = await svc.createEntry(
      "f1",
      "e1",
      {
        category: "NEUROLOGICAL_DOCUMENTATION",
        cardId: SEIZURE_EVENT_DOCUMENTATION_CARD_ID,
        payloadJson: {
          witnessed: true,
          startTime: "2026-05-28T14:00:00.000Z",
          endTime: "2026-05-28T14:03:00.000Z",
          durationMinutes: 3,
          seizureType: "FOCAL",
          auraPresent: false,
          incontinence: false,
          injury: false,
          postictalState: "MILD",
          benzodiazepineAdministered: false,
          rescueMedicationGiven: false,
          providerNotified: true,
          providerNotificationTime: "2026-05-28T14:05:00.000Z",
        },
      },
      "u1"
    );
    expect(saved.payloadSummaryEn.some((l) => l.key === "Seizure duration" && l.value === "3 min")).toBe(true);
  });

  it("POST post-thrombolytic monitoring persists (EDOC.14)", async () => {
    const { svc } = buildService();
    const saved = await svc.createEntry(
      "f1",
      "e1",
      {
        category: "NEUROLOGICAL_DOCUMENTATION",
        cardId: NEUROLOGICAL_POST_THROMBOLYTIC_MONITORING_CARD_ID,
        payloadJson: {
          administrationTime: "2026-05-28T14:00:00.000Z",
          monitoringInterval: "15_MIN",
          neuroStatus: "STABLE",
          systolicBp: 130,
          diastolicBp: 85,
          bleedingSigns: false,
          neurologicalWorsening: false,
          providerNotified: false,
        },
      },
      "u1"
    );
    expect(saved.payloadSummaryEn.some((l) => l.key === "Provider notification")).toBe(true);
  });

  it("POST neurological escalation persists (EDOC.14)", async () => {
    const { svc } = buildService();
    const saved = await svc.createEntry(
      "f1",
      "e1",
      {
        category: "NEUROLOGICAL_DOCUMENTATION",
        cardId: NEUROLOGICAL_ESCALATION_EVENT_CARD_ID,
        payloadJson: {
          eventTime: "2026-05-28T14:00:00.000Z",
          newDeficit: true,
          mentalStatusDecline: false,
          gcsDrop: false,
          pupilChange: false,
          strokeSymptoms: true,
          providerNotified: true,
          providerNotificationTime: "2026-05-28T14:05:00.000Z",
        },
      },
      "u1"
    );
    expect(saved.payloadSummaryEn.some((l) => l.key === "Provider notification")).toBe(true);
  });

  it("neurological audit metadata excludes pupil and motor detail (EDOC.14 addendum)", async () => {
    const { svc, audit } = buildService();
    await svc.createEntry(
      "f1",
      "e1",
      {
        category: "NEUROLOGICAL_DOCUMENTATION",
        cardId: NEUROLOGICAL_INITIAL_ASSESSMENT_CARD_ID,
        payloadJson: {
          assessmentTime: "2026-05-28T14:00:00.000Z",
          orientationPerson: true,
          orientationPlace: true,
          orientationTime: true,
          orientationSituation: true,
          speechStatus: "SLURRED",
          facialSymmetry: "DROOP_LEFT",
          leftArmStrength: "2/5",
          rightArmStrength: "5/5",
          leftLegStrength: "3/5",
          rightLegStrength: "5/5",
          sensationStatus: "DECREASED",
          leftPupilSizeMm: 4,
          rightPupilSizeMm: 2,
          leftPupilReaction: "SLUGGISH",
          rightPupilReaction: "BRISK",
          notes: "Left-sided weakness.",
        },
      },
      "u1"
    );
    const meta = audit.log.mock.calls[0]?.[2]?.metadata as Record<string, unknown>;
    expect(meta).not.toHaveProperty("notes");
    expect(meta).not.toHaveProperty("leftPupilSizeMm");
    expect(meta).not.toHaveProperty("leftPupilReaction");
    expect(meta).not.toHaveProperty("leftArmStrength");
    expect(meta).not.toHaveProperty("speechStatus");
    expect(meta.payloadKeyCount).toBeGreaterThan(0);
  });

  it("neurological audit metadata excludes NIHSS domain values (EDOC.14)", async () => {
    const { svc, audit } = buildService();
    await svc.createEntry(
      "f1",
      "e1",
      {
        category: "NEUROLOGICAL_DOCUMENTATION",
        cardId: NIHSS_ASSESSMENT_CARD_ID,
        payloadJson: {
          assessmentTime: "2026-05-28T14:00:00.000Z",
          levelOfConsciousness: 2,
          locQuestions: 1,
          locCommands: 1,
          bestGaze: 1,
          visualFields: 1,
          facialPalsy: 2,
          motorArmLeft: 3,
          motorArmRight: 2,
          motorLegLeft: 2,
          motorLegRight: 1,
          limbAtaxia: 1,
          sensory: 1,
          bestLanguage: 2,
          dysarthria: 1,
          extinctionInattention: 1,
          calculatedTotal: 22,
          severity: "SEVERE",
          providerNotified: true,
          providerNotificationTime: "2026-05-28T14:05:00.000Z",
          notes: "Left-sided weakness worsening.",
        },
      },
      "u1"
    );
    const meta = audit.log.mock.calls[0]?.[2]?.metadata as Record<string, unknown>;
    expect(meta).not.toHaveProperty("notes");
    expect(meta).not.toHaveProperty("levelOfConsciousness");
    expect(meta).not.toHaveProperty("motorArmLeft");
    expect(meta).not.toHaveProperty("calculatedTotal");
    expect(meta).not.toHaveProperty("severity");
    expect(meta.payloadKeyCount).toBeGreaterThan(0);
  });
});
