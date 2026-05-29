import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BadRequestException } from "@nestjs/common";
import { AuditAction, EncounterStatus } from "@prisma/client";
import {
  RESTRAINT_DISCONTINUATION_CARD_ID,
  RESTRAINT_FACE_TO_FACE_CARD_ID,
  RESTRAINT_INITIATION_CARD_ID,
  RESTRAINT_REASSESSMENT_CARD_ID,
  RESTRAINT_RENEWAL_CARD_ID,
} from "@medora/shared";
import { ClinicalDocumentationService } from "./clinical-documentation.service";

describe("ClinicalDocumentationService — restraint (EDOC.6)", () => {
  const entryRow = {
    id: "edoc-restraint-1",
    encounterId: "e1",
    category: "RESTRAINT_DOCUMENTATION",
    cardId: RESTRAINT_INITIATION_CARD_ID,
    authorUserId: "u1",
    authorDisplayNameSnapshot: "Jane Nurse",
    authorRoleSnapshot: "RN",
    createdAt: new Date("2026-05-28T12:00:00.000Z"),
    payloadJson: {},
    voidedAt: null,
    requiresWitnessSignature: true,
    witnessedAt: null,
    witnessedByUserId: null,
    witnessDisplayNameSnapshot: null,
    witnessRoleSnapshot: null,
  };

  function buildService(overrides?: {
    existingEntry?: Record<string, unknown> | null;
    facilityPolicy?: Record<string, unknown> | null;
  }) {
    const create = jest.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({
        ...entryRow,
        id: "edoc-restraint-new",
        cardId: String(data.cardId ?? entryRow.cardId),
        category: String(data.category ?? entryRow.category),
        payloadJson: data.payloadJson ?? entryRow.payloadJson,
        requiresWitnessSignature: Boolean(data.requiresWitnessSignature),
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
        findFirst: jest.fn().mockResolvedValue({
          id: "e1",
          patientId: "p1",
          facilityId: "f1",
          status: EncounterStatus.OPEN,
        }),
      },
      facility: {
        findFirst: jest.fn().mockResolvedValue({
          clinicalDocumentationWitnessPolicyJson: overrides?.facilityPolicy ?? null,
        }),
      },
      encounterClinicalDocumentationEntry: {
        findMany: jest.fn().mockResolvedValue([entryRow]),
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
        findMany: jest.fn().mockResolvedValue([{ role: { code: "RN", name: "Infirmier(ère)" } }]),
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
      create,
      update,
      audit,
    };
  }

  const INITIATION_PAYLOAD = {
    assessmentTime: "2026-05-28T12:00:00.000Z",
    restraintType: "BEHAVIORAL",
    reasonForRestraint: "VIOLENT_BEHAVIOR",
    alternativesAttempted: ["VERBAL_DEESCALATION"],
    continuedNeed: true,
    injuryPresent: false,
    circulationAssessment: "NORMAL",
    mentalStatusAssessment: "Agitated.",
    physicianOrderVerified: true,
    orderingProviderId: "provider-1",
  };

  it("POST Restraint Initiation persists with billing readiness metadata (EDOC.6)", async () => {
    const { svc, create } = buildService();
    const saved = await svc.createEntry(
      "f1",
      "e1",
      {
        category: "RESTRAINT_DOCUMENTATION",
        cardId: RESTRAINT_INITIATION_CARD_ID,
        payloadJson: INITIATION_PAYLOAD,
      },
      "u1"
    );
    expect(saved.cardId).toBe(RESTRAINT_INITIATION_CARD_ID);
    expect(saved.payloadSummaryEn.some((l) => l.key === "Type")).toBe(true);
    expect(saved.payloadSummaryFr.some((l) => l.key === "Type")).toBe(true);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          payloadJson: expect.objectContaining({
            billingReadinessMetadata: {
              capturePhase: "EDOC.6",
              claimsGenerationDeferred: true,
              restraintEventCapturable: true,
            },
          }),
        }),
      })
    );
  });

  it("default witness policy marks Restraint Initiation pending (EDOC.6)", async () => {
    const { svc, create } = buildService();
    await svc.createEntry(
      "f1",
      "e1",
      {
        category: "RESTRAINT_DOCUMENTATION",
        cardId: RESTRAINT_INITIATION_CARD_ID,
        payloadJson: INITIATION_PAYLOAD,
      },
      "u1"
    );
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ requiresWitnessSignature: true }),
      })
    );
  });

  it("witnesses Restraint Initiation and audits (EDOC.6)", async () => {
    const pendingEntry = {
      ...entryRow,
      id: "edoc-restraint-pending",
      requiresWitnessSignature: true,
      witnessedAt: null,
    };
    const { svc, audit, update } = buildService({ existingEntry: pendingEntry });
    const witnessed = await svc.witnessEntry("f1", "e1", "edoc-restraint-pending", "u2");
    expect(witnessed.witnessStatus).toBe("WITNESSED");
    expect(update).toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(
      AuditAction.ENCOUNTER_CLINICAL_DOCUMENTATION_WITNESSED,
      "ENCOUNTER_CLINICAL_DOCUMENTATION_ENTRY",
      expect.objectContaining({
        metadata: expect.objectContaining({
          entryId: "edoc-restraint-pending",
          witnessUserId: "u2",
        }),
      })
    );
  });

  it("POST Face-to-Face Evaluation persists (EDOC.6)", async () => {
    const { svc } = buildService();
    const saved = await svc.createEntry(
      "f1",
      "e1",
      {
        category: "RESTRAINT_DOCUMENTATION",
        cardId: RESTRAINT_FACE_TO_FACE_CARD_ID,
        payloadJson: {
          evaluationTime: "2026-05-28T13:00:00.000Z",
          behaviorAssessment: "Aggressive toward staff.",
          dangerToSelf: true,
          dangerToOthers: true,
          continuedNeedForRestraint: true,
          medicalConditionAssessment: "Stable vitals.",
          behavioralConditionAssessment: "Ongoing aggression.",
          providerEvaluatorId: "provider-2",
        },
      },
      "u1"
    );
    expect(saved.cardId).toBe(RESTRAINT_FACE_TO_FACE_CARD_ID);
    expect(saved.payloadSummaryFr.some((l) => l.key === "Évaluateur")).toBe(true);
    expect(saved.payloadSummaryEn.some((l) => l.key === "Evaluator")).toBe(true);
  });

  it("POST Reassessment persists (EDOC.6)", async () => {
    const { svc } = buildService();
    const saved = await svc.createEntry(
      "f1",
      "e1",
      {
        category: "RESTRAINT_DOCUMENTATION",
        cardId: RESTRAINT_REASSESSMENT_CARD_ID,
        payloadJson: {
          assessmentTime: "2026-05-28T14:00:00.000Z",
          airway: "NORMAL",
          circulation: "NORMAL",
          skinIntegrity: "NORMAL",
          nutritionNeedsMet: true,
          hydrationNeedsMet: true,
          eliminationNeedsMet: true,
          rangeOfMotionPerformed: true,
          continuedNeed: true,
          patientResponse: "Calmer.",
        },
      },
      "u1"
    );
    expect(saved.cardId).toBe(RESTRAINT_REASSESSMENT_CARD_ID);
  });

  it("POST Renewal persists (EDOC.6)", async () => {
    const { svc } = buildService();
    const saved = await svc.createEntry(
      "f1",
      "e1",
      {
        category: "RESTRAINT_DOCUMENTATION",
        cardId: RESTRAINT_RENEWAL_CARD_ID,
        payloadJson: {
          renewalTime: "2026-05-28T15:00:00.000Z",
          orderingProviderId: "provider-1",
          continuedNeed: true,
          renewalReason: "Continued danger to staff.",
        },
      },
      "u1"
    );
    expect(saved.cardId).toBe(RESTRAINT_RENEWAL_CARD_ID);
    expect(saved.payloadSummaryFr.some((l) => l.key === "Renouvellement")).toBe(true);
    expect(saved.payloadSummaryEn.some((l) => l.key === "Renewal")).toBe(true);
  });

  it("POST Discontinuation persists (EDOC.6)", async () => {
    const { svc } = buildService();
    const saved = await svc.createEntry(
      "f1",
      "e1",
      {
        category: "RESTRAINT_DOCUMENTATION",
        cardId: RESTRAINT_DISCONTINUATION_CARD_ID,
        payloadJson: {
          discontinuedTime: "2026-05-28T16:00:00.000Z",
          criteriaMet: ["CALM", "FOLLOWS_COMMANDS"],
          conditionAtDiscontinuation: "Calm and cooperative.",
        },
      },
      "u1"
    );
    expect(saved.cardId).toBe(RESTRAINT_DISCONTINUATION_CARD_ID);
    expect(saved.payloadSummaryFr.some((l) => l.key === "Critères")).toBe(true);
    expect(saved.payloadSummaryEn.some((l) => l.key === "Criteria met")).toBe(true);
  });

  it("rejects invalid Restraint Initiation payload (EDOC.6)", async () => {
    const { svc, create } = buildService();
    await expect(
      svc.createEntry(
        "f1",
        "e1",
        {
          category: "RESTRAINT_DOCUMENTATION",
          cardId: RESTRAINT_INITIATION_CARD_ID,
          payloadJson: { ...INITIATION_PAYLOAD, alternativesAttempted: [] },
        },
        "u1"
      )
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(create).not.toHaveBeenCalled();
  });

  it("append-only — no updateEntry on service; controller has create + witness only (EDOC.6)", () => {
    const serviceSource = readFileSync(
      join(__dirname, "clinical-documentation.service.ts"),
      "utf8"
    );
    expect(serviceSource).not.toMatch(/\bupdateEntry\s*\(/);
    expect(serviceSource).toMatch(/async createEntry\(/);
    expect(serviceSource).toMatch(/async witnessEntry\(/);

    const controllerSource = readFileSync(join(__dirname, "encounters.controller.ts"), "utf8");
    expect(controllerSource).toMatch(/createClinicalDocumentationEntry/);
    expect(controllerSource).toMatch(/witnessClinicalDocumentationEntry/);
    expect(controllerSource).not.toMatch(/@Patch\([^)]*clinical-documentation/);
    expect(controllerSource).not.toMatch(/@Put\([^)]*clinical-documentation/);
  });
});
