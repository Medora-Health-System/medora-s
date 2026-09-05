import { describe, expect, it } from "vitest";
import { orderCreateDtoSchema } from "../schemas/patient.js";
import {
  ED_HOSP_1D_CATEGORY_IDS,
  ED_HOSP_1D_COMPOSER_SUGGESTIONS,
  ED_HOSP_1D_PAPER_SHEET_MEDICATION_TOKENS,
  buildComposerCareOrderDto,
  canActivateObservationComposerOrders,
  composerDoesNotConvertObservationToInpatient,
  composerDoesNotCreateEncounterTypeObservation,
  composerDoesNotInferOrdersFromDiagnosis,
  customCareSuggestion,
  hydrateComposerItemState,
  hydrateLabImagingMedicationOrders,
  matchComposerSuggestionToExistingOrder,
  composerDoesNotFabricateMedicationDtoFromShortcuts,
  composerHasNoPrivateOrderStore,
  existingOrderDisplayLabel,
  observationComposerContainsPaperSheetMedications,
  observationComposerHasNoDefaultSelection,
  observationComposerSuggestionsCreateZeroOrders,
  parseEncounterOrdersForComposer,
  persistedObservationDecisionRemountsComposer,
  placedOrderMustNotBeLabeledCompleted,
  planComposerCareOrderCreates,
  shouldMountObservationOrderComposer,
  suggestionIsActivatableCare,
  suggestionRequiresExplicitSelection,
  summarizeComposerCreateResults,
  telemetryPlacementFlagCreatesOrder,
  unsavedObservationSelectionHasPersistedDestination,
} from "./edHosp1dObservationOrderComposer.js";
import { billingClassificationForPlacementDestination } from "./admissionDestinationGuardV1.js";
import {
  projectBillingClassificationForHospitalDestination,
  resolveHospitalDestinationIntent,
} from "./hospitalDestinationIntent.js";

describe("ED.HOSP.1D observation order composer", () => {
  it("1-3. mounts only for OBSERVATION, not HOME or ADMISSION", () => {
    expect(shouldMountObservationOrderComposer("OBSERVATION")).toBe(true);
    expect(shouldMountObservationOrderComposer("HOME")).toBe(false);
    expect(shouldMountObservationOrderComposer("ADMISSION")).toBe(false);
    expect(shouldMountObservationOrderComposer("TRANSFER")).toBe(false);
    expect(shouldMountObservationOrderComposer("")).toBe(false);
  });

  it("4-6. opening composer / suggestions create zero orders and require explicit selection", () => {
    expect(observationComposerSuggestionsCreateZeroOrders()).toBe(true);
    expect(observationComposerHasNoDefaultSelection()).toBe(true);
    const care = ED_HOSP_1D_COMPOSER_SUGGESTIONS.filter(suggestionIsActivatableCare);
    expect(care.length).toBeGreaterThan(0);
    expect(care.every(suggestionRequiresExplicitSelection)).toBe(true);
    expect(care.every((item) => item.defaultSelected === false)).toBe(true);
  });

  it("7. selected CARE item maps to canonical order DTO", () => {
    const vitals = ED_HOSP_1D_COMPOSER_SUGGESTIONS.find((item) => item.id === "tpl:mon_vitals_q2h");
    expect(vitals).toBeTruthy();
    const dto = buildComposerCareOrderDto({
      suggestion: vitals!,
      prescriberName: "Dr Test",
      locale: "fr",
    });
    expect(dto).toBeTruthy();
    const parsed = orderCreateDtoSchema.safeParse(dto);
    expect(parsed.success).toBe(true);
    expect(dto?.type).toBe("CARE");
    expect(dto?.orderSource).toBe("PROVIDER_ORDER");
    expect(dto?.items[0]?.catalogItemType).toBe("CARE");
    expect(dto?.items[0]?.manualLabel).toMatch(/signes vitaux/i);
  });

  it("8-10. lab / imaging / medication suggestions open existing order tabs, not a second catalog", () => {
    const lab = ED_HOSP_1D_COMPOSER_SUGGESTIONS.find((item) => item.id === "modal:laboratory");
    const imaging = ED_HOSP_1D_COMPOSER_SUGGESTIONS.find((item) => item.id === "modal:imaging");
    const med = ED_HOSP_1D_COMPOSER_SUGGESTIONS.find((item) => item.id === "modal:medication");
    expect(lab?.kind).toBe("OPEN_ORDER_MODAL");
    expect(lab?.opensOrderTab).toBe("LAB");
    expect(imaging?.opensOrderTab).toBe("IMAGING");
    expect(med?.opensOrderTab).toBe("MEDICATION");
    expect(buildComposerCareOrderDto({ suggestion: lab!, prescriberName: "Dr", locale: "fr" })).toBeNull();
    expect(buildComposerCareOrderDto({ suggestion: med!, prescriberName: "Dr", locale: "fr" })).toBeNull();
  });

  it("12. existing orders hydrate into Ordered rather than Suggested", () => {
    const cardiac = ED_HOSP_1D_COMPOSER_SUGGESTIONS.find(
      (item) => item.id === "proc:continuous_cardiac_monitoring"
    )!;
    const orders = [
      {
        id: "ord-1",
        type: "CARE",
        status: "PLACED",
        items: [{ enterpriseProcedureId: "continuous_cardiac_monitoring", manualLabel: "Surveillance cardiaque continue" }],
      },
    ];
    expect(hydrateComposerItemState(cardiac, orders, new Set())).toBe("ORDERED");
    expect(hydrateComposerItemState(cardiac, [], new Set(["proc:continuous_cardiac_monitoring"]))).toBe(
      "SELECTED"
    );
    expect(hydrateComposerItemState(cardiac, [], new Set())).toBe("SUGGESTED");
  });

  it("13-14. duplicate click / already-ordered plans skip a second DTO", () => {
    const suggestion = ED_HOSP_1D_COMPOSER_SUGGESTIONS.find((item) => item.id === "proc:npo_status")!;
    const existing = [
      {
        id: "ord-npo",
        type: "CARE",
        items: [{ enterpriseProcedureId: "npo_status", manualLabel: "NPO" }],
      },
    ];
    const planned = planComposerCareOrderCreates({
      selectedIds: [suggestion.id, suggestion.id],
      orders: existing,
      inFlightIds: new Set(),
      prescriberName: "Dr Test",
      locale: "fr",
    });
    expect(planned.every((row) => row.skippedBecauseOrdered && row.dto == null)).toBe(true);

    const inFlight = planComposerCareOrderCreates({
      selectedIds: [suggestion.id],
      orders: [],
      inFlightIds: new Set([suggestion.id]),
      prescriberName: "Dr Test",
      locale: "fr",
    });
    expect(inFlight[0]?.skippedBecauseInFlight).toBe(true);
    expect(inFlight[0]?.dto).toBeNull();
  });

  it("15-16. failed order remains retryable; partial failure is explicit", () => {
    const summary = summarizeComposerCreateResults([
      { suggestionId: "a", ok: true, orderId: "1" },
      { suggestionId: "b", ok: false, error: "network" },
      { suggestionId: "c", ok: true, skipped: true },
    ]);
    expect(summary.partialFailure).toBe(true);
    expect(summary.allSucceeded).toBe(false);
    expect(summary.retryableIds).toEqual(["b"]);
    expect(summary.succeeded).toBe(1);
    expect(summary.failed).toBe(1);
  });

  it("17-18. Orders-tab CARE/LAB/IMAGING/MEDICATION hydrate into composer buckets", () => {
    const buckets = hydrateLabImagingMedicationOrders([
      { id: "1", type: "LAB", items: [{ catalogItemType: "LAB_TEST", manualLabel: "CBC" }] },
      { id: "2", type: "IMAGING", items: [{ catalogItemType: "IMAGING_STUDY", manualLabel: "CXR" }] },
      { id: "3", type: "MEDICATION", items: [{ catalogItemType: "MEDICATION", manualLabel: "NS" }] },
      { id: "4", type: "CARE", items: [{ catalogItemType: "CARE", enterpriseProcedureId: "npo_status" }] },
      { id: "5", type: "CARE", status: "CANCELLED", items: [{ enterpriseProcedureId: "npo_status" }] },
    ]);
    expect(buckets.lab).toHaveLength(1);
    expect(buckets.imaging).toHaveLength(1);
    expect(buckets.medication).toHaveLength(1);
    expect(buckets.care).toHaveLength(1);
  });

  it("19-20. provider authorship preserved; unauthorized role cannot activate", () => {
    const dto = buildComposerCareOrderDto({
      suggestion: ED_HOSP_1D_COMPOSER_SUGGESTIONS.find((item) => item.id === "proc:npo_status")!,
      prescriberName: "Dr Authorship",
      locale: "en",
    });
    expect(dto?.prescriberName).toBe("Dr Authorship");
    expect(dto?.orderSource).toBe("PROVIDER_ORDER");
    expect(canActivateObservationComposerOrders({ canPrescribe: true })).toBe(true);
    expect(canActivateObservationComposerOrders({ canPrescribe: false })).toBe(false);
    expect(canActivateObservationComposerOrders({ canPrescribe: true, encounterOpen: false })).toBe(false);
  });

  it("21-26. placement / dest / billing / encounter type / conversion / discharge stay untouched", () => {
    expect(telemetryPlacementFlagCreatesOrder(true)).toBe(false);
    expect(composerDoesNotCreateEncounterTypeObservation()).toBe(true);
    expect(composerDoesNotConvertObservationToInpatient()).toBe(true);
    expect(composerDoesNotInferOrdersFromDiagnosis()).toBe(true);
    expect(ED_HOSP_1D_CATEGORY_IDS).not.toContain("admission_orders");
  });

  it("27. no Admission composer categories or mount for ADMISSION", () => {
    expect(shouldMountObservationOrderComposer("ADMISSION")).toBe(false);
    expect(ED_HOSP_1D_COMPOSER_SUGGESTIONS.every((item) => item.category !== "status_service" || item.kind === "CONTEXT")).toBe(
      true
    );
  });

  it("28. no hard-coded paper-sheet medication bundle", () => {
    expect(observationComposerContainsPaperSheetMedications()).toBe(false);
    expect(ED_HOSP_1D_PAPER_SHEET_MEDICATION_TOKENS.length).toBeGreaterThan(5);
  });

  it("29. no auto-order from diagnosis and no default medication/lab selection", () => {
    expect(composerDoesNotInferOrdersFromDiagnosis()).toBe(true);
    const autoLabs = ED_HOSP_1D_COMPOSER_SUGGESTIONS.filter(
      (item) => item.kind !== "OPEN_ORDER_MODAL" && (item.category === "laboratory" || item.category === "medications")
    );
    expect(autoLabs).toHaveLength(0);
  });

  it("maps procedure CARE to enterpriseProcedureId", () => {
    const dto = buildComposerCareOrderDto({
      suggestion: ED_HOSP_1D_COMPOSER_SUGGESTIONS.find((item) => item.id === "proc:npo_status")!,
      prescriberName: "Dr Test",
      locale: "fr",
    });
    expect(dto?.items[0]?.enterpriseProcedureId).toBe("npo_status");
    expect(orderCreateDtoSchema.safeParse(dto).success).toBe(true);
  });

  it("maps free-text CARE including custom nursing instruction", () => {
    const custom = customCareSuggestion({ category: "nursing_instructions", text: "Prévenir si douleur > 7/10" });
    expect(custom?.id).toBe("custom:nursing_instructions:prévenir si douleur > 7/10");
    const dto = buildComposerCareOrderDto({
      suggestion: custom!,
      prescriberName: "Dr Test",
      locale: "fr",
    });
    expect(dto?.items[0]?.manualLabel).toBe("Prévenir si douleur > 7/10");
    expect(dto?.items[0]?.enterpriseProcedureId).toBeUndefined();
  });

  it("consult suggestions are plan/request CARE, not completed events", () => {
    const consults = ED_HOSP_1D_COMPOSER_SUGGESTIONS.filter((item) => item.category === "consults");
    expect(consults.length).toBeGreaterThan(0);
    expect(consults.every((item) => item.consultPlanOnly === true)).toBe(true);
    expect(consults.every((item) => item.kind === "CARE_PROCEDURE")).toBe(true);
  });

  it("hydrate template CARE from persisted manualLabel", () => {
    const tpl = ED_HOSP_1D_COMPOSER_SUGGESTIONS.find((item) => item.id === "tpl:mon_vitals_q2h")!;
    const hit = matchComposerSuggestionToExistingOrder(tpl, [
      {
        type: "CARE",
        items: [{ manualLabel: "Vital signs every 2 hours (observation monitoring)" }],
      },
    ]);
    expect(hit).toBeTruthy();
  });

  it("parses GET /orders payloads for hydration", () => {
    const parsed = parseEncounterOrdersForComposer([
      {
        id: "o1",
        type: "CARE",
        status: "PLACED",
        authority: { protocolName: "medora_observation_order_set_v1", templateItemId: "mon_vitals_q2h" },
        items: [{ manualLabel: "VS q2h", catalogItemType: "CARE" }],
      },
    ]);
    expect(parsed[0]?.authority?.templateItemId).toBe("mon_vitals_q2h");
    expect(parsed[0]?.items?.[0]?.manualLabel).toBe("VS q2h");
  });

  it("oxygen and IV fluids open existing engines rather than auto-order", () => {
    const o2 = ED_HOSP_1D_COMPOSER_SUGGESTIONS.find((item) => item.id === "modal:oxygen")!;
    const iv = ED_HOSP_1D_COMPOSER_SUGGESTIONS.find((item) => item.id === "modal:iv_fluids")!;
    expect(o2.opensOrderTab).toBe("CARE");
    expect(iv.opensOrderTab).toBe("MEDICATION");
    expect(o2.defaultSelected).toBe(false);
    expect(iv.defaultSelected).toBe(false);
  });
});

describe("ED.HOSP.1D unsaved vs persisted Observation (1C billing contract)", () => {
  it("unsaved local Observation selection creates zero canonical orders and stamps no dest", () => {
    expect(observationComposerSuggestionsCreateZeroOrders()).toBe(true);
    expect(unsavedObservationSelectionHasPersistedDestination(null)).toBe(false);
    expect(unsavedObservationSelectionHasPersistedDestination({})).toBe(false);
    expect(persistedObservationDecisionRemountsComposer({ admissionSummaryJson: null })).toBe(false);
    expect(shouldMountObservationOrderComposer("HOME")).toBe(false);
    expect(resolveHospitalDestinationIntent({ admissionSummaryJson: null })).toBeNull();
    expect(
      projectBillingClassificationForHospitalDestination({
        admissionSummaryJson: null,
        billingClassification: "EMERGENCY_DEPARTMENT",
      })
    ).toBeNull();
  });

  it("persisted Observation remounts composer and follows 1C dest + projected billing", () => {
    const persisted = { requestedEncounterType: "OBSERVATION" };
    expect(persistedObservationDecisionRemountsComposer({ admissionSummaryJson: persisted })).toBe(true);
    expect(shouldMountObservationOrderComposer("OBSERVATION")).toBe(true);
    expect(resolveHospitalDestinationIntent({ admissionSummaryJson: persisted })).toBe("OBSERVATION");
    expect(
      projectBillingClassificationForHospitalDestination({
        admissionSummaryJson: persisted,
        billingClassification: "EMERGENCY_DEPARTMENT",
      })
    ).toBe("OBSERVATION");
    expect(billingClassificationForPlacementDestination("OBSERVATION")).toBe("OBSERVATION");
  });

  it("1C projected OBSERVATION billing does not require rewriting the open ED encounter row", () => {
    const edRow = {
      type: "EMERGENCY",
      billingClassification: "EMERGENCY_DEPARTMENT",
      admissionSummaryJson: { requestedEncounterType: "OBSERVATION" },
    };
    expect(edRow.type).toBe("EMERGENCY");
    expect(edRow.billingClassification).toBe("EMERGENCY_DEPARTMENT");
    expect(resolveHospitalDestinationIntent({ admissionSummaryJson: edRow.admissionSummaryJson })).toBe(
      "OBSERVATION"
    );
    expect(
      projectBillingClassificationForHospitalDestination({
        admissionSummaryJson: edRow.admissionSummaryJson,
        billingClassification: edRow.billingClassification,
      })
    ).toBe("OBSERVATION");
  });
});

describe("ED.HOSP.1D medication / LAB label / status / store", () => {
  it("medication suggestions open CreateOrderModal and do not fabricate a MEDICATION DTO", () => {
    const med = ED_HOSP_1D_COMPOSER_SUGGESTIONS.find((item) => item.id === "modal:medication")!;
    expect(med.kind).toBe("OPEN_ORDER_MODAL");
    expect(med.opensOrderTab).toBe("MEDICATION");
    expect(buildComposerCareOrderDto({ suggestion: med, prescriberName: "Dr", locale: "fr" })).toBeNull();
    expect(composerDoesNotFabricateMedicationDtoFromShortcuts()).toBe(true);
  });

  it("medication hydrates after canonical create and refresh does not plan a duplicate CARE DTO", () => {
    const existing = [
      {
        id: "med-1",
        type: "MEDICATION",
        status: "PLACED",
        items: [
          {
            catalogItemType: "MEDICATION",
            displayLabelFr: "Paracétamol 500 mg",
            displayLabelEn: "Acetaminophen 500 mg",
          },
        ],
      },
    ];
    const buckets = hydrateLabImagingMedicationOrders(existing);
    expect(buckets.medication).toHaveLength(1);
    expect(existingOrderDisplayLabel(buckets.medication[0]!, "fr")).toBe("Paracétamol 500 mg");
    expect(placedOrderMustNotBeLabeledCompleted("PLACED")).toBe(true);
    const planned = planComposerCareOrderCreates({
      selectedIds: ["modal:medication"],
      orders: existing,
      inFlightIds: new Set(),
      prescriberName: "Dr Test",
      locale: "fr",
    });
    expect(planned[0]?.dto).toBeNull();
  });

  it("existing LAB uses canonical human-readable description when GET provides it", () => {
    const parsed = parseEncounterOrdersForComposer([
      {
        id: "lab-1",
        type: "LAB",
        status: "PLACED",
        items: [
          {
            catalogItemType: "LAB_TEST",
            displayLabelFr: "Numération formule sanguine",
            displayLabelEn: "Complete Blood Count",
            catalogLabTest: { displayNameFr: "NFS", displayNameEn: "CBC" },
          },
        ],
      },
    ]);
    expect(existingOrderDisplayLabel(parsed[0]!, "fr")).toBe("Numération formule sanguine");
    expect(existingOrderDisplayLabel(parsed[0]!, "en")).toBe("Complete Blood Count");
  });

  it("LAB without a canonical description still falls back to type (no invented name)", () => {
    const parsed = parseEncounterOrdersForComposer([
      { id: "lab-2", type: "LAB", status: "PLACED", items: [{ catalogItemType: "LAB_TEST" }] },
    ]);
    expect(existingOrderDisplayLabel(parsed[0]!, "en")).toBe("LAB");
    expect(existingOrderDisplayLabel(parsed[0]!, "fr")).toBe("LAB");
  });

  it("persist/reload does not use the other locale as FR or EN chrome", () => {
    const parsed = parseEncounterOrdersForComposer([
      {
        id: "lab-en-only",
        type: "LAB",
        status: "PLACED",
        items: [
          {
            catalogItemType: "LAB_TEST",
            displayLabelEn: "Complete Blood Count",
            catalogLabTest: { code: "CBC", displayNameEn: "CBC", displayNameFr: "" },
          },
        ],
      },
    ]);
    expect(existingOrderDisplayLabel(parsed[0]!, "fr")).toBe("CBC");
    expect(existingOrderDisplayLabel(parsed[0]!, "fr")).not.toBe("Complete Blood Count");
    expect(existingOrderDisplayLabel(parsed[0]!, "es")).toBe("Hemograma completo");
    expect(existingOrderDisplayLabel(parsed[0]!, "es")).not.toBe("Complete Blood Count");
  });

  it("does not auto-order, use inpatient template apply, EncounterType.OBSERVATION, or a private store", () => {
    expect(observationComposerSuggestionsCreateZeroOrders()).toBe(true);
    expect(composerDoesNotCreateEncounterTypeObservation()).toBe(true);
    expect(composerHasNoPrivateOrderStore()).toBe(true);
    expect(ED_HOSP_1D_COMPOSER_SUGGESTIONS.every((item) => item.defaultSelected === false)).toBe(true);
  });
});
