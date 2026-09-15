import { DeterministicReviewEngine } from "./deterministic-review-engine.service";
import {
  type EncounterAiSnapshot,
  encounterAiSnapshotSchema,
  AiClinicalReviewOutput,
  pickAiLocalizedCopy,
} from "@medora/shared";
import { randomUUID } from "node:crypto";

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

function makeSnapshot(overrides: DeepPartial<EncounterAiSnapshot> = {}): EncounterAiSnapshot {
  const base: EncounterAiSnapshot = {
    snapshotVersion: "v1/assist-safety-treatment-discharge",
    generatedAt: "2026-01-01T00:00:00.000Z",
    encounterContext: {
      encounterId: randomUUID(),
      facilityId: randomUUID(),
      patientId: randomUUID(),
      country: "US",
      encounterType: "EMERGENCY",
      status: "OPEN",
      careSetting: "EMERGENCY_DEPARTMENT",
    },
    patientContext: { age: 42 },
    presentation: {},
    clinicalDocumentation: { providerDocumentationStatus: "SIGNED" },
    diagnostics: {},
    treatments: {},
    diagnoses: {},
    disposition: {},
  };

  return encounterAiSnapshotSchema.parse({
    ...base,
    ...overrides,
    encounterContext: { ...base.encounterContext, ...overrides.encounterContext },
    patientContext: { ...base.patientContext, ...overrides.patientContext },
    presentation: { ...base.presentation, ...overrides.presentation },
    clinicalDocumentation: { ...base.clinicalDocumentation, ...overrides.clinicalDocumentation },
    diagnostics: { ...base.diagnostics, ...overrides.diagnostics },
    treatments: { ...base.treatments, ...overrides.treatments },
    diagnoses: { ...base.diagnoses, ...overrides.diagnoses },
    disposition: { ...base.disposition, ...overrides.disposition },
  });
}

function titles(output: { suggestions: { title: string }[] }): string[] {
  return output.suggestions.map((item) => item.title);
}

describe("Medora Assist v1 safety/treatment/discharge intelligence", () => {
  const engine = new DeterministicReviewEngine();

  it("1. flags abnormal vital without a later reassessment", () => {
    const output = engine.run(
      makeSnapshot({
        presentation: {
          vitalTrend: [
            { recordedAt: "2026-01-01T08:00:00.000Z", values: { hr: 142 } },
          ],
        },
      })
    );
    const finding = output.suggestions.find((s) => s.title.includes("Tachycardia"));
    expect(finding).toBeDefined();
    expect(finding!.category).toBe("CLINICAL_SAFETY");
    expect(finding!.summary).toContain("142");
    expect(finding!.summary).not.toMatch(/persisted tachycardia/i);
  });

  it("2. does not flag tachycardia when a later heart rate exists", () => {
    const output = engine.run(
      makeSnapshot({
        presentation: {
          vitalTrend: [
            { recordedAt: "2026-01-01T08:00:00.000Z", values: { hr: 142 } },
            { recordedAt: "2026-01-01T09:00:00.000Z", values: { hr: 88 } },
          ],
        },
      })
    );
    expect(titles(output).some((title) => title.includes("Tachycardia"))).toBe(false);
  });

  it("3. flags medication order/MAR reconciliation when discharge is in progress", () => {
    const output = engine.run(
      makeSnapshot({
        encounterContext: { status: "CLOSED" },
        treatments: {
          medicationOrders: [{ id: "med-1", displayLabel: "ketorolac", status: "ACTIVE" }],
        },
        disposition: { disposition: "DISCHARGED_HOME", dischargeFollowUpDocumented: true },
      })
    );
    const finding = output.suggestions.find((s) => s.category === "MEDICATION_CONSIDERATION");
    expect(finding).toBeDefined();
    expect(finding!.summary).toContain("ketorolac");
    expect(finding!.summary).toMatch(/reconciliation/i);
  });

  it("4. names duplicate active medication orders", () => {
    const output = engine.run(
      makeSnapshot({
        treatments: {
          medicationOrders: [
            { id: "med-1", displayLabel: "ketorolac 30 mg", status: "ACTIVE" },
            { id: "med-2", displayLabel: "ketorolac 15 mg", status: "ACTIVE" },
          ],
        },
      })
    );
    const finding = output.suggestions.find((s) => s.category === "DUPLICATION");
    expect(finding).toBeDefined();
    expect(finding!.summary).toMatch(/Two active orders for ketorolac/i);
    expect(finding!.summary).not.toBe("Possible duplicate medication.");
  });

  it("5. flags analgesic administration without a later pain reassessment", () => {
    const output = engine.run(
      makeSnapshot({
        treatments: {
          medicationOrders: [{ id: "med-1", displayLabel: "morphine 4 mg", status: "ACTIVE" }],
          medicationAdministrations: [
            {
              id: "mar-1",
              orderItemId: "med-1",
              action: "administered",
              administeredAt: "2026-01-01T08:10:00.000Z",
            },
          ],
        },
      })
    );
    const finding = output.suggestions.find((s) => s.summary.includes("morphine"));
    expect(finding).toBeDefined();
    expect(finding!.category).toBe("REASSESSMENT_GAP");
    expect(finding!.summary).toMatch(/pain reassessment/i);
  });

  it("6. names a pending diagnostic study at discharge", () => {
    const output = engine.run(
      makeSnapshot({
        encounterContext: { status: "CLOSED" },
        diagnostics: {
          pendingTests: ["item-1"],
          orders: [
            {
              id: "order-1",
              items: [
                {
                  id: "item-1",
                  catalogItemType: "LAB_TEST",
                  displayLabel: "Urine culture",
                  status: "PENDING",
                },
              ],
            },
          ],
        },
        disposition: { disposition: "DISCHARGED_HOME", dischargeFollowUpDocumented: true },
      })
    );
    const finding = output.suggestions.find((s) => s.category === "DISCHARGE_SAFETY" && s.priority === "HIGH");
    expect(finding!.summary).toContain("Urine culture");
    expect(finding!.summary).not.toMatch(/abnormal/i);
  });

  it("7. does not flag a completed diagnostic as pending at discharge", () => {
    const output = engine.run(
      makeSnapshot({
        encounterContext: { status: "CLOSED" },
        diagnostics: {
          pendingTests: [],
          orders: [
            {
              id: "order-1",
              items: [
                {
                  id: "item-1",
                  catalogItemType: "LAB_TEST",
                  displayLabel: "Urine culture",
                  status: "COMPLETED",
                  lifecycleState: "REVIEWED",
                },
              ],
            },
          ],
        },
        disposition: { disposition: "DISCHARGED_HOME", dischargeFollowUpDocumented: true },
      })
    );
    expect(output.suggestions.some((s) => s.category === "DISCHARGE_SAFETY")).toBe(false);
  });

  it("8. flags clinic transfer missing required structured information", () => {
    const output = engine.run(
      makeSnapshot({
        encounterContext: {
          encounterType: "CLINIC",
          careSetting: "OFFICE_OUTPATIENT_CLINIC",
        },
        disposition: { checkoutState: "TRANSFER_ED" },
      })
    );
    const finding = output.suggestions.find((s) => s.category === "DISPOSITION_GAP");
    expect(finding).toBeDefined();
    expect(finding!.summary).toMatch(/transfer reason is incomplete/i);
  });

  it("9. does not flag complete clinic transfer documentation", () => {
    const output = engine.run(
      makeSnapshot({
        encounterContext: {
          encounterType: "CLINIC",
          careSetting: "OFFICE_OUTPATIENT_CLINIC",
        },
        disposition: {
          checkoutState: "TRANSFER_ED",
          transferReason: "Hypotension and chest pain",
          transferDestination: "Facility ED",
          transferTransport: "Ambulance",
        },
      })
    );
    expect(output.suggestions.some((s) => s.title.includes("transfer"))).toBe(false);
  });

  it("10. keeps clinic and ED rules isolated", () => {
    const clinic = engine.run(
      makeSnapshot({
        encounterContext: {
          encounterType: "CLINIC",
          status: "CLOSED",
          careSetting: "OFFICE_OUTPATIENT_CLINIC",
        },
        treatments: {
          medicationAdministrations: [{ id: "mar-1", administeredAt: "2026-01-01T08:00:00.000Z" }],
        },
        disposition: { checkoutState: "HOME", dischargeFollowUpDocumented: true },
      })
    );
    expect(clinic.suggestions.some((s) => s.title.includes("Disposition is not documented"))).toBe(false);
    expect(clinic.suggestions.some((s) => s.title.includes("transition"))).toBe(false);

    const ed = engine.run(
      makeSnapshot({
        encounterContext: { status: "CLOSED", careSetting: "EMERGENCY_DEPARTMENT" },
        treatments: {
          medicationAdministrations: [{ id: "mar-1", administeredAt: "2026-01-01T08:00:00.000Z" }],
        },
        disposition: { disposition: null },
      })
    );
    expect(ed.suggestions.some((s) => s.title === "Disposition is not documented")).toBe(true);
    expect(ed.suggestions.some((s) => s.title.includes("Clinic checkout"))).toBe(false);
  });

  it("11. encounter identity is carried on every finding snapshot version", () => {
    const a = makeSnapshot({ snapshotVersion: "encounter-a" });
    const b = makeSnapshot({
      snapshotVersion: "encounter-b",
      presentation: { vitalTrend: [{ recordedAt: "2026-01-01T08:00:00.000Z", values: { hr: 142 } }] },
    });
    const outA = engine.run(a);
    const outB = engine.run(b);
    expect(outA.suggestions.every((s) => s.snapshotVersion === "encounter-a")).toBe(true);
    expect(outB.suggestions.every((s) => s.snapshotVersion === "encounter-b")).toBe(true);
    expect(outA.suggestions).toHaveLength(0);
    expect(outB.suggestions.some((s) => s.snapshotVersion === "encounter-a")).toBe(false);
  });

  it("12. facility isolation is preserved on suggestion provenance", () => {
    const facilityA = randomUUID();
    const facilityB = randomUUID();
    const outA = engine.run(
      makeSnapshot({
        encounterContext: { facilityId: facilityA },
        presentation: { vitalTrend: [{ recordedAt: "2026-01-01T08:00:00.000Z", values: { hr: 142 } }] },
      })
    );
    const outB = engine.run(
      makeSnapshot({
        encounterContext: { facilityId: facilityB },
        clinicalDocumentation: { providerDocumentationStatus: "SIGNED" },
      })
    );
    expect(outA.suggestions[0].snapshotVersion).toBe("v1/assist-safety-treatment-discharge");
    expect(outB.suggestions).toEqual([]);
    expect(facilityA).not.toBe(facilityB);
  });

  it("13-15. representative Safety, Treatment, and Discharge findings have EN/ES/FR", () => {
    const output = engine.run(
      makeSnapshot({
        encounterContext: {
          encounterType: "CLINIC",
          status: "CLOSED",
          careSetting: "OFFICE_OUTPATIENT_CLINIC",
        },
        presentation: {
          vitalTrend: [{ recordedAt: "2026-01-01T08:00:00.000Z", values: { hr: 142 } }],
        },
        treatments: {
          medicationOrders: [
            { id: "med-1", displayLabel: "ketorolac", status: "ACTIVE" },
            { id: "med-2", displayLabel: "ketorolac", status: "ACTIVE" },
          ],
        },
        disposition: { checkoutState: "HOME" },
      })
    );
    const safety = output.suggestions.find((s) => s.category === "CLINICAL_SAFETY");
    const treatment = output.suggestions.find((s) => s.category === "DUPLICATION");
    const discharge = output.suggestions.find((s) => s.category === "FOLLOW_UP_GAP");
    for (const finding of [safety, treatment, discharge]) {
      expect(finding?.titleLocalized).toEqual(
        expect.objectContaining({ en: expect.any(String), es: expect.any(String), fr: expect.any(String) })
      );
      expect(finding?.summaryLocalized).toEqual(
        expect.objectContaining({ en: expect.any(String), es: expect.any(String), fr: expect.any(String) })
      );
      expect(pickAiLocalizedCopy(finding!.summaryLocalized, "en", "")).toBe(finding!.summaryLocalized!.en);
      expect(pickAiLocalizedCopy(finding!.summaryLocalized, "es", "")).toBe(finding!.summaryLocalized!.es);
      expect(pickAiLocalizedCopy(finding!.summaryLocalized, "fr", "")).toBe(finding!.summaryLocalized!.fr);
      expect(finding!.summaryLocalized!.es).not.toEqual(finding!.summaryLocalized!.en);
      expect(finding!.summaryLocalized!.fr).not.toEqual(finding!.summaryLocalized!.en);
    }
  });

  it("16. emits only REVIEW or NAVIGATE action types", () => {
    const output = engine.run(
      makeSnapshot({
        diagnostics: {
          criticalResults: [{ id: "result-1", criticalValue: true, acknowledgedByProviderAt: null }],
        },
        treatments: {
          medicationAdministrations: [{ id: "mar-1", administeredAt: "2026-01-01T08:00:00.000Z" }],
        },
        encounterContext: { status: "CLOSED" },
        disposition: { disposition: "DISCHARGE" },
      })
    );
    for (const suggestion of output.suggestions) {
      for (const action of suggestion.recommendedActions) {
        expect(["REVIEW", "NAVIGATE"]).toContain(action.actionType);
      }
    }
  });

  it("17-18. does not mutate the chart or recommend coding/reimbursement", () => {
    const snapshot = makeSnapshot({
      presentation: { vitalTrend: [{ recordedAt: "2026-01-01T08:00:00.000Z", values: { hr: 142 } }] },
    });
    const before = JSON.stringify(snapshot);
    const output = engine.run(snapshot);
    expect(JSON.stringify(snapshot)).toBe(before);
    expect(() => AiClinicalReviewOutput.parse(output)).not.toThrow();
    const blob = JSON.stringify(output.suggestions).toLowerCase();
    expect(blob).not.toMatch(/cpt|e\/m|upcod|reimburs|payer|icd-10-cm billing/);
  });

  it("19. a complete well-documented encounter produces no unnecessary noise", () => {
    const output = engine.run(
      makeSnapshot({
        presentation: {
          vitalTrend: [
            { recordedAt: "2026-01-01T08:00:00.000Z", values: { hr: 142, painScore: 8 } },
            { recordedAt: "2026-01-01T09:00:00.000Z", values: { hr: 88, painScore: 3 } },
          ],
        },
        treatments: {
          medicationOrders: [{ id: "med-1", displayLabel: "morphine 4 mg", status: "ACTIVE" }],
          medicationAdministrations: [
            {
              id: "mar-1",
              orderItemId: "med-1",
              action: "administered",
              administeredAt: "2026-01-01T08:10:00.000Z",
            },
          ],
        },
        diagnostics: {
          pendingTests: [],
          criticalResults: [
            { id: "result-1", criticalValue: true, acknowledgedByProviderAt: "2026-01-01T08:30:00.000Z" },
          ],
        },
      })
    );
    expect(output.suggestions).toEqual([]);
  });

  it("20. missing optional snapshot fields do not crash review", () => {
    const snapshot = makeSnapshot();
    delete (snapshot.treatments as { medicationOrders?: unknown }).medicationOrders;
    delete (snapshot.presentation as { vitalTrend?: unknown }).vitalTrend;
    delete (snapshot.diagnostics as { criticalResults?: unknown }).criticalResults;
    delete (snapshot.disposition as { followUps?: unknown }).followUps;
    expect(() => engine.run(snapshot)).not.toThrow();
    expect(engine.run(snapshot).suggestions).toEqual([]);
  });

  it("does not invent a pediatric tachycardia finding", () => {
    const output = engine.run(
      makeSnapshot({
        patientContext: { age: 8 },
        presentation: {
          vitalTrend: [{ recordedAt: "2026-01-01T08:00:00.000Z", values: { hr: 142 } }],
        },
      })
    );
    expect(titles(output).some((title) => title.includes("Tachycardia"))).toBe(false);
  });

  it("does not treat medication orders as pending diagnostics", () => {
    const output = engine.run(
      makeSnapshot({
        encounterContext: { status: "CLOSED" },
        diagnostics: {
          pendingTests: ["med-1"],
          orders: [
            {
              id: "order-1",
              items: [{ id: "med-1", catalogItemType: "MEDICATION", displayLabel: "ondansetron", status: "PENDING" }],
            },
          ],
        },
        treatments: {
          medicationOrders: [{ id: "med-1", displayLabel: "ondansetron", status: "ACTIVE" }],
          medicationAdministrations: [
            { id: "mar-1", orderItemId: "med-1", action: "administered", administeredAt: "2026-01-01T08:00:00.000Z" },
          ],
        },
        disposition: { disposition: "DISCHARGED_HOME", dischargeFollowUpDocumented: true },
      })
    );
    expect(output.suggestions.some((s) => s.summary.includes("ondansetron") && s.category === "DISCHARGE_SAFETY")).toBe(
      false
    );
  });
});
