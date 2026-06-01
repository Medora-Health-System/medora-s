import type { PrismaClient } from "@prisma/client";
import {
  MEDICATION_SAFETY_CLASSIFIER_DOMAIN_COUNTS,
  MEDICATION_SAFETY_CLASSIFIER_MANIFEST,
  MEDICATION_SAFETY_CLASSIFIER_TOTAL_COUNT,
  validateMedicationSafetyClassifierCode,
} from "@medora/shared";
import { seedMedicationSafetyClassifiers } from "../../prisma/helpers/seed-medication-safety-classifiers";

describe("medication safety classifier foundation (M1.3B)", () => {
  it("manifest has expected totals by domain", () => {
    expect(MEDICATION_SAFETY_CLASSIFIER_TOTAL_COUNT).toBe(33);
    expect(MEDICATION_SAFETY_CLASSIFIER_DOMAIN_COUNTS).toEqual({
      CONTROLLED_SUBSTANCE: 6,
      HIGH_ALERT: 12,
      SAFETY_REQUIREMENT: 11,
      LASA: 4,
    });
    expect(MEDICATION_SAFETY_CLASSIFIER_MANIFEST).toHaveLength(33);
  });

  it("rejects invalid classifier codes at validation boundary", () => {
    expect(validateMedicationSafetyClassifierCode("LASA", "LASA_CRITICAL")).toMatchObject({
      ok: false,
    });
    expect(validateMedicationSafetyClassifierCode("CONTROLLED_SUBSTANCE", "CONTROLLED_SCHEDULE_II")).toMatchObject({
      ok: true,
      code: "CONTROLLED_SCHEDULE_II",
    });
  });

  it("seedMedicationSafetyClassifiers is idempotent and does not touch medication catalog tables", async () => {
    const termClassifierUpsert = jest.fn().mockResolvedValue({ id: "tc-1" });
    const termClassifierLabelUpsert = jest.fn().mockResolvedValue({});
    const termClassifierAliasUpsert = jest.fn().mockResolvedValue({});
    const groupBy = jest
      .fn()
      .mockResolvedValue(
        Object.entries(MEDICATION_SAFETY_CLASSIFIER_DOMAIN_COUNTS).map(([domain, _count]) => ({
          domain,
          _count: { _all: MEDICATION_SAFETY_CLASSIFIER_DOMAIN_COUNTS[domain as keyof typeof MEDICATION_SAFETY_CLASSIFIER_DOMAIN_COUNTS] },
        }))
      );

    const prisma = {
      termClassifier: { upsert: termClassifierUpsert, groupBy },
      termClassifierLabel: { upsert: termClassifierLabelUpsert },
      termClassifierAlias: { upsert: termClassifierAliasUpsert },
      catalogMedication: { upsert: jest.fn(), update: jest.fn(), create: jest.fn() },
      medicationSafetyProfile: { upsert: jest.fn(), update: jest.fn(), create: jest.fn() },
      medicationConcept: { upsert: jest.fn() },
      orderItem: { update: jest.fn() },
    } as unknown as PrismaClient;

    await seedMedicationSafetyClassifiers(prisma);
    await seedMedicationSafetyClassifiers(prisma);

    expect(termClassifierUpsert).toHaveBeenCalledTimes(MEDICATION_SAFETY_CLASSIFIER_TOTAL_COUNT * 2);
    expect(prisma.catalogMedication.upsert).not.toHaveBeenCalled();
    expect(prisma.medicationSafetyProfile.upsert).not.toHaveBeenCalled();
    expect(prisma.orderItem.update).not.toHaveBeenCalled();
  });
});
