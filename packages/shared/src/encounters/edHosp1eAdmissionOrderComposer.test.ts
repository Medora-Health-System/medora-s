import { describe, expect, it } from "vitest";
import { orderCreateDtoSchema } from "../schemas/patient.js";
import {
  ED_HOSP_1E_CATEGORY_IDS,
  ED_HOSP_1E_CODE_STATUS_VALUES,
  ED_HOSP_1E_COMPOSER_SUGGESTIONS,
  ED_HOSP_1E_INPATIENT_LEVELS_OF_CARE,
  ED_HOSP_1E_STRUCTURED_GAPS,
  admissionComposerContainsPaperSheetMedications,
  admissionComposerDoesNotAutoOrderMedicationsOxygenOrFluids,
  admissionComposerDoesNotCreateEncounterTypeObservation,
  admissionComposerDoesNotIncludeObservationLevelOfCare,
  admissionComposerDoesNotInferOrdersFromDiagnosis,
  admissionComposerHasNoDefaultSelection,
  admissionComposerHasNoOtherEscapeHatch,
  admissionComposerHasNoPrivateOrderStore,
  admissionComposerHasNoSelectAll,
  admissionComposerSuggestionsCreateZeroOrders,
  admissionDiagnosisDuplicate,
  admissionLevelOfCareCreatesZeroOrders,
  canActivateAdmissionComposerOrders,
  filterActivatableAdmissionSuggestions,
  paperSheetMedicationTokensUnusedInAdmissionCatalog,
  persistedAdmissionDecisionRemountsComposer,
  shouldMountAdmissionOrderComposer,
} from "./edHosp1eAdmissionOrderComposer.js";
import {
  buildComposerCareOrderDto,
  hydrateComposerItemState,
  planComposerCareOrderCreates,
  suggestionIsActivatableCare,
} from "./edHosp1dObservationOrderComposer.js";
import { shouldMountObservationOrderComposer } from "./edHosp1dObservationOrderComposer.js";
import { resolveHospitalDestinationIntent } from "./hospitalDestinationIntent.js";

describe("ED.HOSP.1E admission order composer", () => {
  it("1-3. mounts only for Admission, not Observation or Home", () => {
    expect(shouldMountAdmissionOrderComposer("ADMISSION")).toBe(true);
    expect(shouldMountAdmissionOrderComposer("OBSERVATION")).toBe(false);
    expect(shouldMountAdmissionOrderComposer("HOME")).toBe(false);
    expect(shouldMountAdmissionOrderComposer("TRANSFER")).toBe(false);
    expect(shouldMountAdmissionOrderComposer("")).toBe(false);
    expect(shouldMountObservationOrderComposer("ADMISSION")).toBe(false);
  });

  it("4-6. opening / selecting creates zero orders; no handwriting escape hatch", () => {
    expect(admissionComposerSuggestionsCreateZeroOrders()).toBe(true);
    expect(admissionComposerHasNoDefaultSelection()).toBe(true);
    expect(admissionComposerHasNoOtherEscapeHatch()).toBe(true);
    expect(ED_HOSP_1E_COMPOSER_SUGGESTIONS.every((item) => item.defaultSelected === false)).toBe(true);
    expect(ED_HOSP_1E_COMPOSER_SUGGESTIONS.every((item) => !item.id.startsWith("custom:"))).toBe(true);
  });

  it("7. level of care is inpatient structured selection, not Observation", () => {
    expect(admissionComposerDoesNotIncludeObservationLevelOfCare()).toBe(true);
    expect(ED_HOSP_1E_INPATIENT_LEVELS_OF_CARE).toContain("MEDICAL_SURGICAL");
    expect(ED_HOSP_1E_INPATIENT_LEVELS_OF_CARE).toContain("TELEMETRY");
    expect(ED_HOSP_1E_INPATIENT_LEVELS_OF_CARE).toContain("INTENSIVE_CARE");
    expect(ED_HOSP_1E_INPATIENT_LEVELS_OF_CARE).not.toContain("OBSERVATION");
    expect(ED_HOSP_1E_INPATIENT_LEVELS_OF_CARE).not.toContain("OTHER");
    expect(admissionLevelOfCareCreatesZeroOrders("TELEMETRY")).toBe(true);
  });

  it("8-9. diagnosis duplicate protection; code status is explicit structured selection", () => {
    expect(admissionComposerDoesNotInferOrdersFromDiagnosis()).toBe(true);
    expect(
      admissionDiagnosisDuplicate(
        [{ icd10CatalogId: "a", code: "R10.9", description: "Abdominal pain" }],
        { id: "a", code: "R10.9" }
      )
    ).toBe(true);
    expect(
      admissionDiagnosisDuplicate(
        [{ icd10CatalogId: "a", code: "R10.9", description: "Abdominal pain" }],
        { id: "b", code: "J18.9" }
      )
    ).toBe(false);
    expect(ED_HOSP_1E_CODE_STATUS_VALUES).toContain("FULL_CODE");
    expect(ED_HOSP_1E_CODE_STATUS_VALUES).toContain("DNR");
    expect(ED_HOSP_1E_CODE_STATUS_VALUES).not.toContain("UNKNOWN");
    const codeStatus = ED_HOSP_1E_COMPOSER_SUGGESTIONS.filter((item) => item.category === "code_status");
    expect(codeStatus.length).toBe(ED_HOSP_1E_CODE_STATUS_VALUES.length);
    expect(codeStatus.every((item) => item.defaultSelected === false)).toBe(true);
  });

  it("10-16. monitoring, vitals, activity, diet, respiratory, IV are structured", () => {
    const byCat = (id: string) => ED_HOSP_1E_COMPOSER_SUGGESTIONS.filter((item) => item.category === id);
    expect(byCat("monitoring").some((item) => item.enterpriseProcedureId === "continuous_cardiac_monitoring")).toBe(true);
    expect(byCat("vitals_checks").some((item) => item.id === "ft:vitals_q4h")).toBe(true);
    expect(byCat("activity").some((item) => item.id === "ft:activity_as_tolerated")).toBe(true);
    expect(byCat("diet").some((item) => item.enterpriseProcedureId === "npo_status")).toBe(true);
    expect(byCat("respiratory").some((item) => item.opensOrderTab === "CARE")).toBe(true);
    expect(byCat("iv_fluids").some((item) => item.opensOrderTab === "MEDICATION")).toBe(true);
    expect(byCat("iv_fluids").some((item) => item.enterpriseProcedureId === "peripheral_iv_placement")).toBe(true);
  });

  it("17-20. medications / labs / imaging use existing engines; ECG reuses procedure", () => {
    const med = ED_HOSP_1E_COMPOSER_SUGGESTIONS.find((item) => item.id === "modal:medication");
    const lab = ED_HOSP_1E_COMPOSER_SUGGESTIONS.find((item) => item.id === "modal:laboratory");
    const imaging = ED_HOSP_1E_COMPOSER_SUGGESTIONS.find((item) => item.id === "modal:imaging");
    const ecg = ED_HOSP_1E_COMPOSER_SUGGESTIONS.find((item) => item.id === "proc:ekg_ecg");
    expect(med?.kind).toBe("OPEN_ORDER_MODAL");
    expect(med?.opensOrderTab).toBe("MEDICATION");
    expect(lab?.opensOrderTab).toBe("LAB");
    expect(imaging?.opensOrderTab).toBe("IMAGING");
    expect(ecg?.enterpriseProcedureId).toBe("ekg_ecg");
    expect(buildComposerCareOrderDto({ suggestion: med!, prescriberName: "Dr", locale: "fr" })).toBeNull();
  });

  it("21-23. consults, precautions, nursing reuse CARE procedures; no paper med bundle", () => {
    const consults = ED_HOSP_1E_COMPOSER_SUGGESTIONS.filter((item) => item.category === "consults");
    expect(consults.every((item) => item.consultPlanOnly === true)).toBe(true);
    expect(ED_HOSP_1E_COMPOSER_SUGGESTIONS.some((item) => item.enterpriseProcedureId === "fall_precautions")).toBe(true);
    expect(ED_HOSP_1E_COMPOSER_SUGGESTIONS.some((item) => item.id === "ft:daily_weight")).toBe(true);
    expect(admissionComposerContainsPaperSheetMedications()).toBe(false);
    expect(paperSheetMedicationTokensUnusedInAdmissionCatalog()).toBe(true);
  });

  it("24-31. no auto-orders, no Select All, activation required, canonical DTO", () => {
    expect(admissionComposerDoesNotAutoOrderMedicationsOxygenOrFluids()).toBe(true);
    expect(admissionComposerHasNoSelectAll()).toBe(true);
    expect(admissionComposerHasNoPrivateOrderStore()).toBe(true);
    const npo = ED_HOSP_1E_COMPOSER_SUGGESTIONS.find((item) => item.id === "proc:npo_status")!;
    const dto = buildComposerCareOrderDto({ suggestion: npo, prescriberName: "Dr Test", locale: "fr" });
    expect(orderCreateDtoSchema.safeParse(dto).success).toBe(true);
    expect(dto?.type).toBe("CARE");
    const planned = planComposerCareOrderCreates({
      selectedIds: [npo.id],
      catalog: ED_HOSP_1E_COMPOSER_SUGGESTIONS,
      orders: [],
      inFlightIds: new Set(),
      prescriberName: "Dr Test",
      locale: "fr",
    });
    expect(planned[0]?.dto).toBeTruthy();
    const skipped = planComposerCareOrderCreates({
      selectedIds: [npo.id],
      catalog: ED_HOSP_1E_COMPOSER_SUGGESTIONS,
      orders: [{ type: "CARE", items: [{ enterpriseProcedureId: "npo_status", manualLabel: "NPO" }] }],
      inFlightIds: new Set(),
      prescriberName: "Dr Test",
      locale: "fr",
    });
    expect(skipped[0]?.skippedBecauseOrdered).toBe(true);
  });

  it("hydrates ordered CARE and keeps review as presentation-only", () => {
    const cardiac = ED_HOSP_1E_COMPOSER_SUGGESTIONS.find(
      (item) => item.id === "proc:continuous_cardiac_monitoring"
    )!;
    expect(
      hydrateComposerItemState(
        cardiac,
        [{ type: "CARE", items: [{ enterpriseProcedureId: "continuous_cardiac_monitoring" }] }],
        new Set()
      )
    ).toBe("ORDERED");
    expect(hydrateComposerItemState(cardiac, [], new Set([cardiac.id]))).toBe("SELECTED");
  });

  it("35-42. dest, EncounterType, and capability contracts", () => {
    expect(admissionComposerDoesNotCreateEncounterTypeObservation()).toBe(true);
    expect(persistedAdmissionDecisionRemountsComposer({ admissionSummaryJson: null })).toBe(false);
    expect(
      resolveHospitalDestinationIntent({
        requestedEncounterType: "INPATIENT",
      })
    ).toBe("INPATIENT");
    expect(
      resolveHospitalDestinationIntent({
        requestedEncounterType: "OBSERVATION",
      })
    ).toBe("OBSERVATION");
    expect(canActivateAdmissionComposerOrders({ canPrescribe: false })).toBe(false);
    expect(canActivateAdmissionComposerOrders({ canPrescribe: true, encounterOpen: true })).toBe(true);
  });

  it("categories cover the admission workspace without a review-as-order bucket in the catalog", () => {
    expect(ED_HOSP_1E_CATEGORY_IDS).toContain("review");
    expect(filterActivatableAdmissionSuggestions(ED_HOSP_1E_COMPOSER_SUGGESTIONS).every(suggestionIsActivatableCare)).toBe(
      true
    );
    expect(ED_HOSP_1E_STRUCTURED_GAPS).toContain("VTE_PROPHYLAXIS_ENGINE_ABSENT");
    expect(ED_HOSP_1E_STRUCTURED_GAPS).toContain("ACCEPTING_PROVIDER_DIRECTORY_CONVERGENCE");
  });
});
