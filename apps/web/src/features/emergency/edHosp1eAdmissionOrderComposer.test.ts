import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { edHosp1eAdmissionOrdersEn } from "@/i18n/messages/edHosp1eAdmissionOrders.en";
import { edHosp1eAdmissionOrdersFr } from "@/i18n/messages/edHosp1eAdmissionOrders.fr";
import {
  ED_HOSP_1E_COMPOSER_SUGGESTIONS,
  admissionComposerContainsPaperSheetMedications,
  admissionComposerHasNoOtherEscapeHatch,
  shouldMountAdmissionOrderComposer,
  shouldMountObservationOrderComposer,
} from "@medora/shared";

const webRoot = join(import.meta.dirname, "../../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webRoot, "src", relativePath), "utf8");
}

describe("ED.HOSP.1E Admission order composer — UI contract", () => {
  const panel = readSrc("features/emergency/EmergencyDispositionPanel.tsx");
  const composer = readSrc("features/emergency/EdAdmissionOrderComposer.tsx");
  const styles = readSrc("features/emergency/edDispositionBoardStyles.ts");
  const createModal = readSrc("components/orders/CreateOrderModal.tsx");
  const erOrders = readSrc("features/emergency/EmergencyErOrdersPanel.tsx");
  const dest = readFileSync(
    join(webRoot, "../../packages/shared/src/encounters/hospitalDestinationIntent.ts"),
    "utf8"
  );
  const schema = readFileSync(join(webRoot, "../../apps/api/prisma/schema.prisma"), "utf8");
  const concurrency = readSrc("lib/admissionDecisionConcurrency.ts");

  it("1-4. composer mounts only for Admission, not Observation or Home", () => {
    expect(panel).toContain("shouldMountAdmissionOrderComposer(outcomeUi)");
    expect(panel).toContain("EdAdmissionOrderComposer");
    expect(shouldMountAdmissionOrderComposer("ADMISSION")).toBe(true);
    expect(shouldMountAdmissionOrderComposer("OBSERVATION")).toBe(false);
    expect(shouldMountAdmissionOrderComposer("HOME")).toBe(false);
    expect(shouldMountObservationOrderComposer("ADMISSION")).toBe(false);
  });

  it("persisted INPATIENT dest remounts Admission composer without rewriting 1C dest", () => {
    expect(panel).toContain("persistedAdmissionDecisionRemountsComposer");
    expect(panel).toContain('inferred = "ADMISSION"');
    expect(composer).not.toContain("hospitalDestinationIntent");
    expect(composer).not.toContain("confirmInpatientTransfer");
  });

  it("4-6. opening creates zero orders; no general free-text or Other field", () => {
    expect(composer).toContain("apiFetch(`/encounters/${encounterId}/orders`, { facilityId })");
    expect(composer).toContain("void loadOrders();");
    expect(composer).toContain('method: "POST"');
    expect(composer).toContain("ed-admission-activate-orders");
    expect(composer).not.toContain("<textarea");
    expect(composer).not.toContain("customCareSuggestion");
    expect(composer).not.toContain("customDrafts");
    expect(composer).not.toMatch(/Other orders|Autres ordres|Other:/i);
    expect(admissionComposerHasNoOtherEscapeHatch()).toBe(true);
    expect(ED_HOSP_1E_COMPOSER_SUGGESTIONS.every((item) => item.defaultSelected === false)).toBe(true);
  });

  it("7-16. structured LOC / diagnosis / code status / CARE categories; catalog engines reused", () => {
    expect(composer).toContain("ed-admission-loc-chips");
    expect(composer).not.toContain("ed-admission-loc-OBSERVATION");
    expect(composer).toContain("Icd10DiagnosisSearchAutocomplete");
    expect(composer).not.toContain("onSubmitManual");
    expect(composer).toContain("planComposerCareOrderCreates");
    expect(composer).toContain("catalog");
    expect(composer).toContain("CreateOrderModal");
    expect(composer).toContain("inpatientFacilityMedicationOrderMode()");
    expect(composer).not.toContain("searchCatalog(");
    expect(createModal).toContain("SharedCatalogAutocomplete");
  });

  it("17-23. meds/labs/imaging/IV/oxygen/consults reuse canonical paths", () => {
    expect(composer).toContain("ed-admission-open-modal-${item.id}");
    expect(composer).toContain("initialOrderTab={modalTab}");
    expect(composer).toContain("edHosp1eAdmissionOrders.consultPlanHint");
    expect(composer).not.toContain("buildSmartAdmissionProposals");
    expect(admissionComposerContainsPaperSheetMedications()).toBe(false);
    expect(composer).not.toMatch(/morphine|ondansetron|vancomycin|ceftriaxone|heparin|enoxaparin/i);
  });

  it("24-34. no auto-order, review is presentation-only, activation required, partial failure retryable", () => {
    expect(composer).not.toContain("Select All");
    expect(composer).not.toContain("selectAll");
    expect(composer).toContain("ed-admission-order-review");
    expect(composer).toContain("ed-admission-activate-orders");
    expect(composer).toContain("summarizeComposerCreateResults");
    expect(composer).toContain("edHosp1eAdmissionOrders.partialFailure");
    expect(composer).toContain("inFlightRef");
    expect(composer).toContain("activatingLock");
    expect(composer).toContain("itemErrors");
  });

  it("36-37. Orders tab shares GET /encounters/:id/orders; MAR via CreateOrderModal", () => {
    expect(erOrders).toContain("fetchOrdersForEncounter");
    expect(composer).toContain("/encounters/${encounterId}/orders");
    expect(composer).toContain("ed-admission-existing-orders");
    expect(composer).toContain("hydrateLabImagingMedicationOrders");
  });

  it("38-42. authorship, facility capability, billing, dest, no OBSERVATION enum", () => {
    expect(composer).toContain("canActivateAdmissionComposerOrders");
    expect(composer).toContain("prescriberName");
    expect(composer).not.toContain("createDirectAdmission");
    expect(composer).not.toContain("requestedEncounterType");
    expect(composer).not.toContain("projectBillingClassificationForHospitalDestination");
    expect(composer).not.toContain("EncounterType.OBSERVATION");
    expect(dest).not.toContain("edHosp1eJson");
    const enumBlock = schema.slice(
      schema.indexOf("enum EncounterType {"),
      schema.indexOf("enum EncounterVisitOrigin")
    );
    expect(enumBlock).not.toMatch(/^\s*OBSERVATION\s*$/m);
  });

  it("43-48. #189 concurrency untouched; no second token; no auto sign retry; no new store", () => {
    expect(composer).not.toContain("expectedVersion");
    expect(composer).not.toContain("admissionDecisionExpectedVersion");
    expect(composer).not.toContain("ADMISSION_DECISION_STALE");
    expect(composer).not.toContain("handleSave(");
    expect(concurrency).toContain("mergeAdmissionDecisionExpectedVersion");
    expect(panel).toContain("mergeAdmissionDecisionExpectedVersion");
    expect(composer).not.toContain("admissionOrderComposerJson");
    expect(composer).not.toContain("edHosp1eOrders");
  });

  it("no Prisma migration / second order engine", () => {
    expect(composer).not.toContain("prisma");
    expect(panel).not.toContain("admissionOrderDraftJson");
  });

  it("print / closed record keep canonical orders projection", () => {
    expect(composer).not.toContain("window.print");
    expect(composer).not.toContain("getErPrintPacketHtml");
    const livePreview = readSrc("components/encounters/EncounterChartLivePreview.ts");
    expect(livePreview).toContain("function renderOrders");
    const erPrint = readSrc("features/emergency/erClinicalRecordPrintPacket.ts");
    expect(erPrint).toContain("groupedOrders");
  });

  it("clinician UI does not render raw suggestion ids or enums as labels", () => {
    expect(composer).toContain("{labelFor(item)}");
    expect(composer).not.toMatch(/>\{\s*item\.id\s*\}</);
    expect(composer).toContain("hospitalAdmissionD4a0.level.");
  });

  it("responsive containment", () => {
    expect(styles).toContain(".ed-admission-order-grid");
    expect(styles).toContain("repeat(3, minmax(0, 1fr))");
    expect(styles).toContain("@media (max-width: 1199px)");
    expect(styles).toContain("@media (max-width: 799px)");
    expect(styles).toContain("max-width: 100%");
  });

  it("i18n keys are mirrored FR/EN", () => {
    expect(Object.keys(edHosp1eAdmissionOrdersEn).sort()).toEqual(Object.keys(edHosp1eAdmissionOrdersFr).sort());
  });

  it("does not apply observation-order-template apply or hard-coded admission bundles", () => {
    expect(composer).not.toContain("observation-order-template/apply");
    expect(composer).not.toContain("General Medical Admission");
    expect(composer).not.toContain("Telemetry Admission");
  });

  it("existing orders show loading; failed GET keeps draft selections", () => {
    const loadOrdersFn = composer.slice(composer.indexOf("const loadOrders"), composer.indexOf("useEffect(() => {"));
    expect(loadOrdersFn).not.toContain("setSelectedIds");
    expect(loadOrdersFn).toContain("setLoadError");
    expect(composer).toContain("ed-admission-existing-orders-loading");
  });
});
