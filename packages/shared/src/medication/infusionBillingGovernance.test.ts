import { describe, expect, it } from "vitest";
import {
  buildInfusionBillingGovernanceSnapshot,
  classifyInfusionBillingEvent,
  computeInfusionDurationFromMarRows,
  suggestInfusionAdministrationCptCompanions,
} from "./infusionBillingGovernance.js";

describe("classifyInfusionBillingEvent", () => {
  it("classifies IV push from route", () => {
    expect(
      classifyInfusionBillingEvent({
        marAction: "administered",
        route: "IV push",
        medicationLabel: "Morphine",
      })
    ).toBe("IV_PUSH");
  });

  it("classifies infusion START and STOP", () => {
    expect(
      classifyInfusionBillingEvent({
        marAction: "administered",
        infusionPhase: "INFUSION_START",
        medicationLabel: "Ceftriaxone",
        route: "IV",
      })
    ).toBe("IV_INFUSION_START");

    expect(
      classifyInfusionBillingEvent({
        marAction: "administered",
        infusionPhase: "INFUSION_STOP",
        medicationLabel: "Ceftriaxone",
        route: "IV",
      })
    ).toBe("IV_INFUSION_STOP");
  });

  it("classifies hydration START when catalog billing class is HYDRATION", () => {
    expect(
      classifyInfusionBillingEvent({
        marAction: "administered",
        infusionPhase: "INFUSION_START",
        catalogMedicationBillingClass: "HYDRATION",
        medicationLabel: "Normal Saline 0.9%",
        route: "IV",
      })
    ).toBe("HYDRATION_START");
  });

  it("classifies non-infusion oral administration", () => {
    expect(
      classifyInfusionBillingEvent({
        marAction: "administered",
        route: "orale",
        medicationLabel: "Paracetamol",
      })
    ).toBe("NON_INFUSION_ADMINISTRATION");
  });

  it("does not bill refused actions", () => {
    expect(
      classifyInfusionBillingEvent({
        marAction: "refused",
        route: "IV",
        medicationLabel: "Morphine",
      })
    ).toBe("MANUAL_REVIEW_REQUIRED");
  });
});

describe("computeInfusionDurationFromMarRows", () => {
  const base = {
    encounterId: "enc-1",
    orderItemId: "oi-1",
    infusionSessionKey: "sess-1",
    catalogMedicationId: "cat-1",
  };

  it("computes valid START/STOP pair duration", () => {
    const rows = [
      {
        id: "start-1",
        ...base,
        infusionPhase: "INFUSION_START",
        administeredAtIso: "2026-06-02T10:00:00.000Z",
      },
      {
        id: "stop-1",
        ...base,
        infusionPhase: "INFUSION_STOP",
        administeredAtIso: "2026-06-02T11:30:00.000Z",
      },
    ];
    const result = computeInfusionDurationFromMarRows(rows, "stop-1");
    expect(result.durationMinutes).toBe(90);
    expect(result.durationHoursInitial).toBe(1);
    expect(result.manualReviewReasons).toEqual([]);
  });

  it("flags missing STOP when evaluating START row", () => {
    const rows = [
      {
        id: "start-1",
        ...base,
        infusionPhase: "INFUSION_START",
        administeredAtIso: "2026-06-02T10:00:00.000Z",
      },
    ];
    const result = computeInfusionDurationFromMarRows(rows, "start-1");
    expect(result.manualReviewReasons).toContain("MISSING_INFUSION_STOP");
  });

  it("flags missing START on STOP row", () => {
    const rows = [
      {
        id: "stop-1",
        ...base,
        infusionPhase: "INFUSION_STOP",
        administeredAtIso: "2026-06-02T11:00:00.000Z",
      },
    ];
    const result = computeInfusionDurationFromMarRows(rows, "stop-1");
    expect(result.manualReviewReasons).toContain("MISSING_INFUSION_START");
  });

  it("flags negative duration", () => {
    const rows = [
      {
        id: "start-1",
        ...base,
        infusionPhase: "INFUSION_START",
        administeredAtIso: "2026-06-02T12:00:00.000Z",
      },
      {
        id: "stop-1",
        ...base,
        infusionPhase: "INFUSION_STOP",
        administeredAtIso: "2026-06-02T10:00:00.000Z",
      },
    ];
    const result = computeInfusionDurationFromMarRows(rows, "stop-1");
    expect(result.manualReviewReasons).toContain("NEGATIVE_INFUSION_DURATION");
  });

  it("flags ambiguous multiple START rows", () => {
    const rows = [
      {
        id: "start-1",
        ...base,
        infusionPhase: "INFUSION_START",
        administeredAtIso: "2026-06-02T09:00:00.000Z",
      },
      {
        id: "start-2",
        ...base,
        infusionPhase: "INFUSION_START",
        administeredAtIso: "2026-06-02T09:30:00.000Z",
      },
      {
        id: "stop-1",
        ...base,
        infusionPhase: "INFUSION_STOP",
        administeredAtIso: "2026-06-02T10:00:00.000Z",
      },
    ];
    const result = computeInfusionDurationFromMarRows(rows, "stop-1");
    expect(result.manualReviewReasons).toContain("AMBIGUOUS_INFUSION_PAIR");
  });
});

describe("suggestInfusionAdministrationCptCompanions", () => {
  it("suggests 96374 for IV push", () => {
    const codes = suggestInfusionAdministrationCptCompanions({
      category: "IV_PUSH",
      route: "IV push",
    });
    expect(codes[0]?.suggestedAdministrationCode).toBe("96374");
    expect(codes[0]?.manualReviewRequired).toBe(true);
  });

  it("suggests initial and additional therapeutic infusion codes", () => {
    const codes = suggestInfusionAdministrationCptCompanions({
      category: "IV_INFUSION_STOP",
      billingClass: "THERAPEUTIC",
      durationMinutes: 120,
      durationHoursInitial: 1,
      durationHoursAdditional: 1,
    });
    expect(codes.map((c) => c.suggestedAdministrationCode)).toEqual(["96365", "96366"]);
  });

  it("suggests hydration codes for hydration class", () => {
    const codes = suggestInfusionAdministrationCptCompanions({
      category: "HYDRATION_STOP",
      billingClass: "HYDRATION",
      durationMinutes: 120,
      durationHoursAdditional: 1,
    });
    expect(codes[0]?.suggestedAdministrationCode).toBe("96360");
    expect(codes.some((c) => c.suggestedAdministrationCode === "96361")).toBe(true);
  });
});

describe("buildInfusionBillingGovernanceSnapshot", () => {
  it("marks high-alert infusion STOP as billing-ready with duration", () => {
    const snapshot = buildInfusionBillingGovernanceSnapshot({
      classification: {
        marAction: "administered",
        infusionPhase: "INFUSION_STOP",
        medicationLabel: "Norepinephrine",
        route: "IV infusion",
        catalogMedicationBillingClass: "THERAPEUTIC",
      },
      duration: {
        startTimeIso: "2026-06-02T10:00:00.000Z",
        stopTimeIso: "2026-06-02T11:00:00.000Z",
        durationMinutes: 60,
        durationHoursInitial: 1,
        durationHoursAdditional: 0,
        manualReviewReasons: [],
        pairStartRowId: "s1",
        pairStopRowId: "s2",
      },
    });
    expect(snapshot.infusionBillingCategory).toBe("IV_INFUSION_STOP");
    expect(snapshot.infusionDurationMinutes).toBe(60);
    expect(snapshot.suggestedAdministrationCodes.some((c) => c.suggestedAdministrationCode === "96365")).toBe(true);
    expect(snapshot.infusionManualReviewReasons).toContain("PAYER_VERIFICATION_REQUIRED");
  });
});

describe("high-alert infusion billing compatibility", () => {
  const highAlertInfusions = [
    { label: "Heparin", class: "THERAPEUTIC" },
    { label: "Norepinephrine", class: "THERAPEUTIC" },
    { label: "Amiodarone", class: "THERAPEUTIC" },
  ];

  for (const med of highAlertInfusions) {
    it(`${med.label} infusion STOP remains classifiable`, () => {
      const category = classifyInfusionBillingEvent({
        marAction: "administered",
        infusionPhase: "INFUSION_STOP",
        medicationLabel: med.label,
        route: "IV infusion",
        catalogMedicationBillingClass: med.class,
      });
      expect(category).toBe("IV_INFUSION_STOP");
    });
  }
});
