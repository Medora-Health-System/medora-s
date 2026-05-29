import { BadRequestException } from "@nestjs/common";
import { AuditAction, EncounterStatus } from "@prisma/client";
import {
  HIGH_ALERT_INFUSION_COMPLETION_CARD_ID,
  HIGH_ALERT_INFUSION_INITIATION_CARD_ID,
  HIGH_ALERT_INFUSION_TITRATION_CARD_ID,
  HIGH_ALERT_INFUSION_VERIFICATION_CARD_ID,
} from "@medora/shared";
import { ClinicalDocumentationService } from "./clinical-documentation.service";

describe("ClinicalDocumentationService — high-alert infusion (EDOC.8)", () => {
  const entryRow = {
    id: "edoc-infusion-1",
    encounterId: "e1",
    category: "HIGH_ALERT_INFUSION_DOCUMENTATION",
    cardId: HIGH_ALERT_INFUSION_VERIFICATION_CARD_ID,
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

  function buildService(overrides?: { existingEntry?: Record<string, unknown> | null }) {
    const create = jest.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({
        ...entryRow,
        id: "edoc-infusion-new",
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
          clinicalDocumentationWitnessPolicyJson: null,
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
    return { svc: new ClinicalDocumentationService(prisma as never, audit as never), create, audit };
  }

  const VERIFICATION_PAYLOAD = {
    verificationTime: "2026-05-28T12:00:00.000Z",
    medicationType: "HEPARIN",
    medicationName: "Heparin drip",
    concentration: "25k/500mL",
    orderedRate: "18 u/kg/hr",
    orderedDose: "1300 u/hr",
    weightBasedCalculationVerified: true,
    pumpProgrammingVerified: true,
    lineTracingVerified: true,
    patientVerified: true,
    providerOrderVerified: true,
    independentDoubleCheckPerformed: true,
  };

  it("POST Verification persists with witness required (EDOC.8)", async () => {
    const { svc, create } = buildService();
    const saved = await svc.createEntry(
      "f1",
      "e1",
      {
        category: "HIGH_ALERT_INFUSION_DOCUMENTATION",
        cardId: HIGH_ALERT_INFUSION_VERIFICATION_CARD_ID,
        payloadJson: VERIFICATION_PAYLOAD,
      },
      "u1"
    );
    expect(saved.payloadSummaryEn.some((l) => l.key === "Medication")).toBe(true);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          requiresWitnessSignature: true,
          payloadJson: expect.objectContaining({ verificationStatus: "PENDING_WITNESS" }),
        }),
      })
    );
  });

  it("witnesses verification and audits (EDOC.8)", async () => {
    const pending = {
      ...entryRow,
      id: "edoc-infusion-pending",
      requiresWitnessSignature: true,
      witnessedAt: null,
    };
    const { svc, audit } = buildService({ existingEntry: pending });
    const witnessed = await svc.witnessEntry("f1", "e1", "edoc-infusion-pending", "u2");
    expect(witnessed.witnessStatus).toBe("WITNESSED");
    expect(audit.log).toHaveBeenCalledWith(
      AuditAction.ENCOUNTER_CLINICAL_DOCUMENTATION_WITNESSED,
      "ENCOUNTER_CLINICAL_DOCUMENTATION_ENTRY",
      expect.objectContaining({
        metadata: expect.objectContaining({ witnessUserId: "u2" }),
      })
    );
  });

  it("rejects self-witness (EDOC.8)", async () => {
    const pending = { ...entryRow, id: "edoc-p", authorUserId: "u1", witnessedAt: null };
    const { svc } = buildService({ existingEntry: pending });
    await expect(svc.witnessEntry("f1", "e1", "edoc-p", "u1")).rejects.toBeInstanceOf(
      BadRequestException
    );
  });

  it("POST Initiation persists (EDOC.8)", async () => {
    const { svc } = buildService();
    const saved = await svc.createEntry(
      "f1",
      "e1",
      {
        category: "HIGH_ALERT_INFUSION_DOCUMENTATION",
        cardId: HIGH_ALERT_INFUSION_INITIATION_CARD_ID,
        payloadJson: {
          startTime: NOW_ISO(),
          medicationType: "INSULIN",
          medicationName: "Insulin drip",
          orderedRate: "2 u/hr",
          programmedRate: "2 u/hr",
          route: "IV",
          baselineHeartRate: 80,
          baselineBloodPressure: "120/80",
          baselineRespRate: 16,
          baselineSpo2: 98,
          providerOrderVerified: true,
          administrationStarted: true,
        },
      },
      "u1"
    );
    expect(saved.payloadSummaryEn.some((l) => l.key === "Programmed rate")).toBe(true);
  });

  it("POST Titration with secondCheckerRequired requires witness (EDOC.8)", async () => {
    const { svc, create } = buildService();
    await svc.createEntry(
      "f1",
      "e1",
      {
        category: "HIGH_ALERT_INFUSION_DOCUMENTATION",
        cardId: HIGH_ALERT_INFUSION_TITRATION_CARD_ID,
        payloadJson: {
          titrationTime: NOW_ISO(),
          medicationType: "HEPARIN",
          previousRate: "10",
          newRate: "12",
          reasonForChange: "PROTOCOL",
          providerAware: true,
          secondCheckerRequired: true,
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

  it("POST Completion with billing readiness metadata (EDOC.8)", async () => {
    const { svc, create } = buildService();
    await svc.createEntry(
      "f1",
      "e1",
      {
        category: "HIGH_ALERT_INFUSION_DOCUMENTATION",
        cardId: HIGH_ALERT_INFUSION_COMPLETION_CARD_ID,
        payloadJson: {
          completionTime: NOW_ISO(),
          medicationType: "VASOPRESSOR",
          finalRate: "8 mcg/min",
          completedAsOrdered: true,
          adverseEventOccurred: false,
          providerNotified: false,
        },
      },
      "u1"
    );
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          payloadJson: expect.objectContaining({
            billingReadinessMetadata: expect.objectContaining({ capturePhase: "EDOC.8" }),
          }),
        }),
      })
    );
  });

  it("audit metadata safe on create (EDOC.8)", async () => {
    const { svc, audit } = buildService();
    await svc.createEntry(
      "f1",
      "e1",
      {
        category: "HIGH_ALERT_INFUSION_DOCUMENTATION",
        cardId: HIGH_ALERT_INFUSION_VERIFICATION_CARD_ID,
        payloadJson: VERIFICATION_PAYLOAD,
      },
      "u1"
    );
    const meta = audit.log.mock.calls[0]?.[2]?.metadata as Record<string, unknown>;
    expect(meta).not.toHaveProperty("verificationNotes");
    expect(meta).not.toHaveProperty("notes");
  });
});

function NOW_ISO(): string {
  return "2026-05-28T12:00:00.000Z";
}
