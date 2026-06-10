import { describe, expect, it } from "vitest";
import { parseMedicationDoseKind } from "./medicationDoseKind.js";
import { medicationIvpbDoseSchedulingEnabled } from "./medicationIvpbDoseFeatureFlags.js";
import { evaluateMedicationDoseExpansionForClassification } from "./medicationDoseExpansion.js";
import {
  MEDICATION_SCHEDULE_CLASSIFICATIONS,
  isRecurringIvpbScheduleClassification,
} from "./medicationScheduleClassification.js";
import { evaluateRecurringIvpbEligibility } from "./recurringIvpbEligibility.js";
import { evaluateIvpbDoseSessionEligibility } from "./ivpbDoseSessionEligibility.js";
import {
  isForbiddenIvpbDoseStatusTransition,
  resolveIvpbDoseStatusTransition,
} from "./ivpbDoseStatusTransition.js";
import {
  recurringIvpbSkipsSingleDoseOrderLineCompletion,
  shouldCompleteRecurringIvpbOrderLine,
} from "./recurringIvpbCompletionPolicy.js";

const vancomycinCatalog = {
  catalogCode: "VANCOMYCIN",
  genericName: "Vancomycin",
  administrationType: "PUSH",
  route: "IVPB",
};

describe("RECURRING_IVPB schedule classification (M1.8B.7J.1)", () => {
  it("includes RECURRING_IVPB without altering existing values", () => {
    expect(MEDICATION_SCHEDULE_CLASSIFICATIONS).toContain("RECURRING_IVPB");
    expect(MEDICATION_SCHEDULE_CLASSIFICATIONS).toEqual([
      "DIRECT_MAR",
      "RECURRING",
      "RECURRING_IVPB",
      "ON_DEMAND",
      "INFUSION_LIFECYCLE",
    ]);
  });

  it("isRecurringIvpbScheduleClassification detects contract value", () => {
    expect(isRecurringIvpbScheduleClassification("RECURRING_IVPB")).toBe(true);
    expect(isRecurringIvpbScheduleClassification("RECURRING")).toBe(false);
  });
});

describe("evaluateRecurringIvpbEligibility (M1.8B.7J.1)", () => {
  it("Vancomycin q12h IVPB is eligible", () => {
    const result = evaluateRecurringIvpbEligibility({
      orderRoute: "IVPB",
      frequencyCode: "Q12H",
      catalog: vancomycinCatalog,
    });
    expect(result).toEqual({
      eligible: true,
      reason: "RECURRING_IVPB_ELIGIBLE",
      frequencyCode: "Q12H",
    });
  });

  it("Cefepime q8h IVPB is eligible", () => {
    const result = evaluateRecurringIvpbEligibility({
      orderRoute: "IVPB",
      frequencyCode: "Q8H",
      catalog: { ...vancomycinCatalog, catalogCode: "CEFEPIME", genericName: "Cefepime" },
    });
    expect(result.eligible).toBe(true);
    expect(result.frequencyCode).toBe("Q8H");
  });

  it("Rocephin q24h IVPB is eligible", () => {
    const result = evaluateRecurringIvpbEligibility({
      orderRoute: "IVPB",
      frequencyCode: "Q24H",
      catalog: { ...vancomycinCatalog, catalogCode: "CEFTRIAXONE", genericName: "Ceftriaxone" },
    });
    expect(result.eligible).toBe(true);
    expect(result.frequencyCode).toBe("Q24H");
  });

  it("Zosyn q6h IVPB is eligible", () => {
    const result = evaluateRecurringIvpbEligibility({
      orderRoute: "IVPB",
      frequencyCode: "Q6H",
      catalog: {
        catalogCode: "PIPERACILLIN_TAZOBACTAM",
        genericName: "Piperacillin-Tazobactam",
        administrationType: "INFUSION",
        route: "IVPB",
      },
    });
    expect(result.eligible).toBe(true);
    expect(result.frequencyCode).toBe("Q6H");
  });

  it("PRN IVPB is not eligible", () => {
    const result = evaluateRecurringIvpbEligibility({
      orderRoute: "IVPB",
      frequencyCode: "PRN",
      catalog: vancomycinCatalog,
    });
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe("PRN_FREQUENCY");
  });

  it("NOW IVPB is not eligible", () => {
    const result = evaluateRecurringIvpbEligibility({
      orderRoute: "IVPB",
      frequencyCode: "NOW",
      catalog: vancomycinCatalog,
    });
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe("DIRECT_MAR_FREQUENCY");
  });

  it("rejects blood products", () => {
    const result = evaluateRecurringIvpbEligibility({
      orderRoute: "IVPB",
      frequencyCode: "Q12H",
      catalog: {
        catalogCode: "PRBC_TRANSFUSION",
        therapeuticClass: "BLOOD_PRODUCT",
        administrationType: "INFUSION",
        route: "IVPB",
      },
    });
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe("BLOOD_PRODUCT");
  });

  it("rejects non-IVPB route", () => {
    const result = evaluateRecurringIvpbEligibility({
      orderRoute: "PO",
      frequencyCode: "Q12H",
      catalog: vancomycinCatalog,
    });
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe("NOT_IVPB_ROUTE");
  });
});

describe("IVPB_SESSION dose kind (M1.8B.7J.1)", () => {
  it("parses IVPB_SESSION correctly", () => {
    expect(parseMedicationDoseKind("IVPB_SESSION")).toBe("IVPB_SESSION");
    expect(parseMedicationDoseKind("ivpb_session")).toBe("IVPB_SESSION");
    expect(parseMedicationDoseKind("FIXED_ADMINISTRATION")).toBe("FIXED_ADMINISTRATION");
  });
});

describe("resolveIvpbDoseStatusTransition (M1.8B.7J.1)", () => {
  it("START from DUE → IN_PROGRESS", () => {
    expect(
      resolveIvpbDoseStatusTransition({ currentStatus: "DUE", action: "START" })
    ).toEqual({ ok: true, nextStatus: "IN_PROGRESS", reason: "TRANSITION_ALLOWED" });
  });

  it("START from OVERDUE → IN_PROGRESS", () => {
    expect(
      resolveIvpbDoseStatusTransition({ currentStatus: "OVERDUE", action: "START" })
    ).toEqual({ ok: true, nextStatus: "IN_PROGRESS", reason: "TRANSITION_ALLOWED" });
  });

  it("STOP from IN_PROGRESS → COMPLETED", () => {
    expect(
      resolveIvpbDoseStatusTransition({ currentStatus: "IN_PROGRESS", action: "STOP" })
    ).toEqual({ ok: true, nextStatus: "COMPLETED", reason: "TRANSITION_ALLOWED" });
  });

  it("MISS from DUE → MISSED", () => {
    expect(
      resolveIvpbDoseStatusTransition({ currentStatus: "DUE", action: "MISS" })
    ).toEqual({ ok: true, nextStatus: "MISSED", reason: "TRANSITION_ALLOWED" });
  });

  it("HOLD from OVERDUE → HELD", () => {
    expect(
      resolveIvpbDoseStatusTransition({ currentStatus: "OVERDUE", action: "HOLD" })
    ).toEqual({ ok: true, nextStatus: "HELD", reason: "TRANSITION_ALLOWED" });
  });

  it("rejects COMPLETED → IN_PROGRESS", () => {
    expect(
      resolveIvpbDoseStatusTransition({ currentStatus: "COMPLETED", action: "START" }).ok
    ).toBe(false);
    expect(isForbiddenIvpbDoseStatusTransition("COMPLETED", "IN_PROGRESS")).toBe(true);
  });

  it("rejects MISSED → IN_PROGRESS", () => {
    expect(
      resolveIvpbDoseStatusTransition({ currentStatus: "MISSED", action: "START" }).ok
    ).toBe(false);
    expect(isForbiddenIvpbDoseStatusTransition("MISSED", "IN_PROGRESS")).toBe(true);
  });

  it("rejects HELD → COMPLETED", () => {
    expect(isForbiddenIvpbDoseStatusTransition("HELD", "COMPLETED")).toBe(true);
  });
});

describe("evaluateIvpbDoseSessionEligibility (M1.8B.7J.1)", () => {
  const base = {
    doseKind: "IVPB_SESSION",
    scheduleClassification: "RECURRING_IVPB",
  } as const;

  it("DUE dose can START but not STOP without session", () => {
    const meta = evaluateIvpbDoseSessionEligibility({
      ...base,
      doseStatus: "DUE",
    }) as ReturnType<typeof evaluateIvpbDoseSessionEligibility> & {
      start: { eligible: boolean };
      stop: { eligible: boolean };
    };
    expect(meta.start.eligible).toBe(true);
    expect(meta.stop.eligible).toBe(false);
  });

  it("IN_PROGRESS dose with session can STOP", () => {
    const meta = evaluateIvpbDoseSessionEligibility({
      ...base,
      doseStatus: "IN_PROGRESS",
      infusionSessionId: "session-1",
    }) as ReturnType<typeof evaluateIvpbDoseSessionEligibility> & {
      stop: { eligible: boolean };
    };
    expect(meta.stop.eligible).toBe(true);
  });

  it("rejects FIXED_ADMINISTRATION dose kind", () => {
    const result = evaluateIvpbDoseSessionEligibility({
      ...base,
      doseKind: "FIXED_ADMINISTRATION",
      doseStatus: "DUE",
      action: "START",
    });
    expect(result).toEqual({
      eligible: false,
      reason: "NOT_IVPB_SESSION_DOSE_KIND",
    });
  });
});

describe("shouldCompleteRecurringIvpbOrderLine (M1.8B.7J.1)", () => {
  const flagsOn = {
    MEDICATION_SCHEDULING_V1: true,
    MEDICATION_DOSE_INSTANCES: true,
    MEDICATION_IVPB_DOSE_SCHEDULING: true,
  };

  it("single completed dose does NOT complete order line", () => {
    expect(
      shouldCompleteRecurringIvpbOrderLine({
        featureFlags: flagsOn,
        scheduleClassification: "RECURRING_IVPB",
        singleDoseCompleted: true,
      })
    ).toBe(false);
    expect(recurringIvpbSkipsSingleDoseOrderLineCompletion("RECURRING_IVPB")).toBe(true);
  });
});

describe("medicationIvpbDoseSchedulingEnabled (M1.8B.7J.1)", () => {
  it("defaults OFF", () => {
    expect(medicationIvpbDoseSchedulingEnabled(null)).toBe(false);
    expect(medicationIvpbDoseSchedulingEnabled({})).toBe(false);
  });

  it("requires base scheduling flags and IVPB flag", () => {
    expect(
      medicationIvpbDoseSchedulingEnabled({
        MEDICATION_SCHEDULING_V1: true,
        MEDICATION_DOSE_INSTANCES: true,
        MEDICATION_IVPB_DOSE_SCHEDULING: true,
      })
    ).toBe(true);
    expect(
      medicationIvpbDoseSchedulingEnabled({
        MEDICATION_SCHEDULING_V1: true,
        MEDICATION_DOSE_INSTANCES: false,
        MEDICATION_IVPB_DOSE_SCHEDULING: true,
      })
    ).toBe(false);
  });
});

describe("RECURRING_IVPB expansion contract (M1.8B.7J.1)", () => {
  it("does not expand until wired in 7J.2", () => {
    expect(evaluateMedicationDoseExpansionForClassification("RECURRING_IVPB")).toEqual({
      shouldExpand: false,
      reason: "RECURRING_IVPB_EXPANSION_NOT_WIRED",
      classification: "RECURRING_IVPB",
    });
  });
});
