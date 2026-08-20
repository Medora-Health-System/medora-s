import { describe, expect, it } from "vitest";
import {
  evaluateMedicationOrderScheduleCreateGate,
  resolveScheduleClassification,
} from "./medicationScheduleClassification.js";
import {
  assertScheduleClassificationDualPersistence,
  buildMedicationCatalogSnapshotJson,
  buildMedicationFrequencySnapshotJson,
  ScheduleClassificationDualPersistenceError,
} from "./medicationOrderScheduleSnapshot.js";
import { MEDICATION_FREQUENCY_CATALOG_VERSION } from "./medicationFrequencyCatalog.js";

describe("resolveScheduleClassification", () => {
  it("returns DIRECT_MAR for legacy null", () => {
    expect(resolveScheduleClassification({ frequencyCode: null })).toBe("DIRECT_MAR");
  });

  it("returns DIRECT_MAR for NOW / STAT / ONCE", () => {
    expect(resolveScheduleClassification({ frequencyCode: "NOW" })).toBe("DIRECT_MAR");
    expect(resolveScheduleClassification({ frequencyCode: "STAT" })).toBe("DIRECT_MAR");
    expect(resolveScheduleClassification({ frequencyCode: "ONCE" })).toBe("DIRECT_MAR");
  });

  it("returns RECURRING for standing frequencies", () => {
    expect(resolveScheduleClassification({ frequencyCode: "BID" })).toBe("RECURRING");
    expect(resolveScheduleClassification({ frequencyCode: "Q6H" })).toBe("RECURRING");
    expect(resolveScheduleClassification({ frequencyCode: "ACHS" })).toBe("RECURRING");
  });

  it("returns ON_DEMAND for PRN", () => {
    expect(resolveScheduleClassification({ frequencyCode: "PRN" })).toBe("ON_DEMAND");
  });

  it("returns INFUSION_LIFECYCLE for CONTINUOUS", () => {
    expect(resolveScheduleClassification({ frequencyCode: "CONTINUOUS" })).toBe(
      "INFUSION_LIFECYCLE"
    );
  });

  it("blood product overrides frequency to INFUSION_LIFECYCLE", () => {
    expect(
      resolveScheduleClassification({
        frequencyCode: "ONCE",
        catalog: {
          catalogCode: "PRBC_TRANSFUSION",
          therapeuticClass: "BLOOD_PRODUCT",
        },
      })
    ).toBe("INFUSION_LIFECYCLE");
  });

  it("vancomycin infusion catalog overrides Q12H to INFUSION_LIFECYCLE", () => {
    expect(
      resolveScheduleClassification({
        frequencyCode: "Q12H",
        catalog: {
          catalogCode: "VANCOMYCIN",
          genericName: "Vancomycin",
          administrationType: "INFUSION",
          route: "IV",
        },
      })
    ).toBe("INFUSION_LIFECYCLE");
  });

  it("regular insulin SQ + ACHS stays RECURRING", () => {
    expect(
      resolveScheduleClassification({
        frequencyCode: "ACHS",
        catalog: {
          catalogCode: "REGULAR_INSULIN",
          genericName: "Regular Insulin",
          administrationType: "SQ",
          route: "SQ",
        },
      })
    ).toBe("RECURRING");
  });

  it("structured IVPB route => INFUSION_LIFECYCLE regardless of PUSH catalog", () => {
    expect(
      resolveScheduleClassification({
        frequencyCode: "NOW",
        orderRoute: "IVPB",
        catalog: {
          catalogCode: "HEPARIN",
          administrationType: "PUSH",
          route: "IVP",
        },
      })
    ).toBe("INFUSION_LIFECYCLE");
  });
});

describe("evaluateMedicationOrderScheduleCreateGate", () => {
  const flagsOn = { MEDICATION_SCHEDULING_V1: true, MEDICATION_DOSE_INSTANCES: true };
  const flagsOff = { MEDICATION_SCHEDULING_V1: false, MEDICATION_DOSE_INSTANCES: false };
  const ivpbFlagsOn = {
    ...flagsOn,
    MEDICATION_IVPB_DOSE_SCHEDULING: true,
  };

  const vancomycinCatalog = {
    catalogCode: "VANCOMYCIN",
    genericName: "Vancomycin",
    administrationType: "INFUSION",
    route: "IV",
  };

  it("flags OFF + BID → no schedule", () => {
    const gate = evaluateMedicationOrderScheduleCreateGate({
      frequencyCode: "BID",
      featureFlags: flagsOff,
    });
    expect(gate.shouldCreate).toBe(false);
    expect(gate.reason).toBe("SCHEDULING_FEATURE_FLAGS_OFF");
  });

  it("flags ON + BID → create", () => {
    const gate = evaluateMedicationOrderScheduleCreateGate({
      frequencyCode: "BID",
      featureFlags: flagsOn,
    });
    expect(gate.shouldCreate).toBe(true);
    expect(gate.classification).toBe("RECURRING");
  });

  it("ADMINISTER_CHART + BID → create", () => {
    const gate = evaluateMedicationOrderScheduleCreateGate({
      frequencyCode: "BID",
      featureFlags: flagsOn,
      medicationFulfillmentIntent: "ADMINISTER_CHART",
    });
    expect(gate.shouldCreate).toBe(true);
    expect(gate.classification).toBe("RECURRING");
  });

  it("ADMINISTER_CHART + DAILY → create", () => {
    const gate = evaluateMedicationOrderScheduleCreateGate({
      frequencyCode: "DAILY",
      featureFlags: flagsOn,
      medicationFulfillmentIntent: "ADMINISTER_CHART",
    });
    expect(gate.shouldCreate).toBe(true);
    expect(gate.classification).toBe("RECURRING");
  });

  it("PHARMACY_DISPENSE + BID → never create facility MAR schedule", () => {
    const gate = evaluateMedicationOrderScheduleCreateGate({
      frequencyCode: "BID",
      featureFlags: flagsOn,
      medicationFulfillmentIntent: "PHARMACY_DISPENSE",
    });
    expect(gate.shouldCreate).toBe(false);
    expect(gate.reason).toBe("NOT_FACILITY_ADMIN_INTENT");
  });

  it("NOW/STAT/ONCE stay DIRECT_MAR even for ADMINISTER_CHART", () => {
    for (const frequencyCode of ["NOW", "STAT", "ONCE"] as const) {
      const gate = evaluateMedicationOrderScheduleCreateGate({
        frequencyCode,
        featureFlags: flagsOn,
        medicationFulfillmentIntent: "ADMINISTER_CHART",
      });
      expect(gate.shouldCreate).toBe(false);
      expect(gate.reason).toBe("DIRECT_MAR_FREQUENCY_NEVER_SCHEDULES");
    }
  });

  it("PRN + flags ON → ON_DEMAND create", () => {
    const gate = evaluateMedicationOrderScheduleCreateGate({
      frequencyCode: "PRN",
      featureFlags: flagsOn,
    });
    expect(gate.shouldCreate).toBe(true);
    expect(gate.classification).toBe("ON_DEMAND");
  });

  it("TAPER → no schedule", () => {
    const gate = evaluateMedicationOrderScheduleCreateGate({
      frequencyCode: "TAPER",
      featureFlags: flagsOn,
    });
    expect(gate.shouldCreate).toBe(false);
    expect(gate.reason).toBe("TAPER_EXCLUDED_UNTIL_TAPER_PLAN");
  });

  it("vancomycin infusion + Q12H → no schedule (infusion gate before flags)", () => {
    const gate = evaluateMedicationOrderScheduleCreateGate({
      frequencyCode: "Q12H",
      featureFlags: flagsOn,
      catalog: {
        catalogCode: "VANCOMYCIN",
        genericName: "Vancomycin",
        administrationType: "INFUSION",
        route: "IV",
      },
    });
    expect(gate.shouldCreate).toBe(false);
    expect(gate.reason).toBe("INFUSION_CANDIDATE_NEVER_SCHEDULES");
  });

  it("Vancomycin q12h IVPB + ivpb flags ON → RECURRING_IVPB schedule", () => {
    const gate = evaluateMedicationOrderScheduleCreateGate({
      frequencyCode: "Q12H",
      featureFlags: ivpbFlagsOn,
      orderRoute: "IVPB",
      catalog: vancomycinCatalog,
    });
    expect(gate.shouldCreate).toBe(true);
    expect(gate.classification).toBe("RECURRING_IVPB");
    expect(gate.reason).toBe("RECURRING_IVPB_SCHEDULE_ALLOWED");
  });

  it("Cefepime q8h IVPB + ivpb flags ON → RECURRING_IVPB schedule", () => {
    const gate = evaluateMedicationOrderScheduleCreateGate({
      frequencyCode: "Q8H",
      featureFlags: ivpbFlagsOn,
      orderRoute: "IVPB",
      catalog: { ...vancomycinCatalog, catalogCode: "CEFEPIME", genericName: "Cefepime" },
    });
    expect(gate.shouldCreate).toBe(true);
    expect(gate.classification).toBe("RECURRING_IVPB");
  });

  it("Rocephin q24h IVPB + ivpb flags ON → RECURRING_IVPB schedule", () => {
    const gate = evaluateMedicationOrderScheduleCreateGate({
      frequencyCode: "Q24H",
      featureFlags: ivpbFlagsOn,
      orderRoute: "IVPB",
      catalog: { ...vancomycinCatalog, catalogCode: "CEFTRIAXONE", genericName: "Ceftriaxone" },
    });
    expect(gate.shouldCreate).toBe(true);
    expect(gate.classification).toBe("RECURRING_IVPB");
  });

  it("NOW IVPB + ivpb flags ON → no schedule (INFUSION_LIFECYCLE)", () => {
    const gate = evaluateMedicationOrderScheduleCreateGate({
      frequencyCode: "NOW",
      featureFlags: ivpbFlagsOn,
      orderRoute: "IVPB",
      catalog: vancomycinCatalog,
    });
    expect(gate.shouldCreate).toBe(false);
    expect(gate.reason).toBe("IVPB_ROUTE_NEVER_SCHEDULES");
    expect(gate.classification).toBe("INFUSION_LIFECYCLE");
  });

  it("IVPB q12h without MEDICATION_IVPB_DOSE_SCHEDULING → no schedule", () => {
    const gate = evaluateMedicationOrderScheduleCreateGate({
      frequencyCode: "Q12H",
      featureFlags: flagsOn,
      orderRoute: "IVPB",
      catalog: vancomycinCatalog,
    });
    expect(gate.shouldCreate).toBe(false);
    expect(gate.reason).toBe("IVPB_ROUTE_NEVER_SCHEDULES");
  });
});

describe("medicationOrderScheduleSnapshot", () => {
  it("builds frequency snapshot with dual-persistence equality", () => {
    const snapshot = buildMedicationFrequencySnapshotJson({
      frequencyCode: "Q6H",
      scheduleClassification: "RECURRING",
      snapshottedAt: new Date("2026-06-01T12:00:00.000Z"),
    });
    expect(snapshot.frequencyCode).toBe("Q6H");
    expect(snapshot.scheduleClassification).toBe("RECURRING");
    expect(snapshot.intervalMinutes).toBe(360);
    expect(snapshot.catalogVersion).toBe(MEDICATION_FREQUENCY_CATALOG_VERSION);
    expect(snapshot.snapshottedAt).toBe("2026-06-01T12:00:00.000Z");
  });

  it("rejects mismatched dual-persistence values", () => {
    expect(() =>
      assertScheduleClassificationDualPersistence("RECURRING", {
        scheduleClassification: "ON_DEMAND",
      })
    ).toThrow(ScheduleClassificationDualPersistenceError);
  });

  it("builds medication catalog snapshot", () => {
    const snapshot = buildMedicationCatalogSnapshotJson({
      catalogItemId: "cat-1",
      catalogCode: "PRBC_TRANSFUSION",
      therapeuticClass: "BLOOD_PRODUCT",
      administrationType: "INFUSION",
    });
    expect(snapshot.catalogItemCode).toBe("PRBC_TRANSFUSION");
    expect(snapshot.therapeuticClass).toBe("BLOOD_PRODUCT");
  });
});
