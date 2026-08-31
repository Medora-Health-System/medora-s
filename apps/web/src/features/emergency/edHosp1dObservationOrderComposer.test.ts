import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { edHosp1dObservationOrdersEn } from "@/i18n/messages/edHosp1dObservationOrders.en";
import { edHosp1dObservationOrdersFr } from "@/i18n/messages/edHosp1dObservationOrders.fr";
import {
  ED_HOSP_1D_COMPOSER_SUGGESTIONS,
  observationComposerContainsPaperSheetMedications,
  shouldMountObservationOrderComposer,
} from "@medora/shared";

const webRoot = join(import.meta.dirname, "../../..");

function readSrc(relativePath: string): string {
  return readFileSync(join(webRoot, "src", relativePath), "utf8");
}

describe("ED.HOSP.1D Observation order composer — UI contract", () => {
  const panel = readSrc("features/emergency/EmergencyDispositionPanel.tsx");
  const composer = readSrc("features/emergency/EdObservationOrderComposer.tsx");
  const styles = readSrc("features/emergency/edDispositionBoardStyles.ts");
  const createModal = readSrc("components/orders/CreateOrderModal.tsx");
  const erOrders = readSrc("features/emergency/EmergencyErOrdersPanel.tsx");
  const dest = readFileSync(
    join(webRoot, "../../packages/shared/src/encounters/hospitalDestinationIntent.ts"),
    "utf8"
  );
  const schema = readFileSync(join(webRoot, "../../apps/api/prisma/schema.prisma"), "utf8");

  it("1-3. composer mounts only for OBSERVATION, not HOME or ADMISSION", () => {
    expect(panel).toContain("shouldMountObservationOrderComposer(outcomeUi)");
    expect(panel).toContain("EdObservationOrderComposer");
    expect(panel).toContain("ed-disposition-observation-workspace");
    expect(shouldMountObservationOrderComposer("OBSERVATION")).toBe(true);
    expect(shouldMountObservationOrderComposer("HOME")).toBe(false);
    expect(shouldMountObservationOrderComposer("ADMISSION")).toBe(false);
    expect(panel).not.toContain("EdAdmissionOrderComposer");
  });

  it("4-6. opening composer does not POST orders; suggestions require explicit select", () => {
    expect(composer).toContain("apiFetch(`/encounters/${encounterId}/orders`, { facilityId })");
    expect(composer).toContain("void loadOrders();");
    expect(composer).toContain('method: "POST"');
    expect(composer).toContain("ed-observation-activate-orders");
    expect(composer).toContain("toggleSelect");
    expect(ED_HOSP_1D_COMPOSER_SUGGESTIONS.every((item) => item.defaultSelected === false)).toBe(true);
  });

  it("7-11. CARE maps to canonical DTO; lab/imaging/med reuse CreateOrderModal, no second catalog", () => {
    expect(composer).toContain("planComposerCareOrderCreates");
    expect(composer).toContain("CreateOrderModal");
    expect(composer).toContain("initialOrderTab={modalTab}");
    expect(composer).toContain('medicationOrderMode="ER_ADMINISTER_ONLY"');
    expect(composer).not.toContain("searchCatalog(");
    expect(composer).not.toContain("SharedCatalogAutocomplete");
    expect(createModal).toContain("SharedCatalogAutocomplete");
    expect(composer).toContain("ed-observation-open-modal-${item.id}");
    expect(composer).toContain("modalTab");
  });

  it("12-16. hydration, duplicate skip, retry lock, partial failure", () => {
    expect(composer).toContain("hydrateComposerItemState");
    expect(composer).toContain("parseEncounterOrdersForComposer");
    expect(composer).toContain("inFlightRef");
    expect(composer).toContain("activatingLock");
    expect(composer).toContain("summarizeComposerCreateResults");
    expect(composer).toContain("edHosp1dObservationOrders.partialFailure");
    expect(composer).toContain("itemErrors");
  });

  it("17-18. Orders tab shares the same GET /encounters/:id/orders authority", () => {
    expect(erOrders).toContain("fetchOrdersForEncounter");
    const ordersApi = readSrc("lib/clinicalWorklistApi.ts");
    expect(ordersApi).toContain("/encounters/${encounterId}/orders");
    expect(composer).toContain("/encounters/${encounterId}/orders");
    expect(composer).toContain("ed-observation-existing-orders");
  });

  it("19-20. provider authorship and unauthorized gate reuse canPrescribe", () => {
    expect(composer).toContain("canActivateObservationComposerOrders");
    expect(composer).toContain("prescriberName");
    expect(composer).toContain("edHosp1dObservationOrders.unauthorized");
    expect(composer).toContain("disabled={locked || !canActivate || activating");
  });

  it("21-26. placement, dest intent, billing, EncounterType, conversion, discharge untouched", () => {
    expect(composer).not.toContain("createDirectAdmission");
    expect(composer).not.toContain("requestedEncounterType");
    expect(composer).not.toContain("projectBillingClassificationForHospitalDestination");
    expect(composer).not.toContain("EncounterType.OBSERVATION");
    expect(panel).not.toContain("InpatientDischargeBoard");
    expect(dest).not.toContain("edHosp1cJson");
    const enumBlock = schema.slice(
      schema.indexOf("enum EncounterType {"),
      schema.indexOf("enum EncounterVisitOrigin")
    );
    expect(enumBlock).not.toMatch(/^\s*OBSERVATION\s*$/m);
  });

  it("27-29. no Admission composer, no paper-sheet meds, no diagnosis auto-order", () => {
    expect(panel).not.toContain("EdAdmissionOrderComposer");
    expect(observationComposerContainsPaperSheetMedications()).toBe(false);
    expect(composer).not.toContain("buildSmartAdmissionProposals");
    expect(composer).not.toContain("encounterDiagnoses");
    expect(composer).not.toMatch(/morphine|ondansetron|vancomycin|ceftriaxone/i);
  });

  it("30. print / closed record keep canonical orders projection", () => {
    expect(composer).not.toContain("printDischarge");
    expect(composer).not.toContain("window.print");
    expect(composer).not.toContain("getErPrintPacketHtml");
    const livePreview = readSrc("components/encounters/EncounterChartLivePreview.ts");
    expect(livePreview).toContain("function renderOrders");
    const erPrint = readSrc("features/emergency/erClinicalRecordPrintPacket.ts");
    expect(erPrint).toContain("groupedOrders");
  });

  it("31. clinician UI does not render raw suggestion ids as visible labels", () => {
    expect(composer).toContain("{labelFor(item)}");
    expect(composer).not.toMatch(/>\{\s*item\.id\s*\}</);
  });

  it("32-34. responsive containment and GET reload persistence", () => {
    expect(styles).toContain(".ed-observation-order-grid");
    expect(styles).toContain("repeat(3, minmax(0, 1fr))");
    expect(styles).toContain("@media (max-width: 1199px)");
    expect(styles).toContain("@media (max-width: 799px)");
    expect(styles).toContain("max-width: 100%");
    expect(composer).toContain("void loadOrders()");
    expect(composer).toContain("invalidateGetRequestDedupeForPath");
  });

  it("uses existing CreateOrderModal for oxygen and IV fluids", () => {
    expect(ED_HOSP_1D_COMPOSER_SUGGESTIONS.some((item) => item.id === "modal:oxygen")).toBe(true);
    expect(ED_HOSP_1D_COMPOSER_SUGGESTIONS.some((item) => item.id === "modal:iv_fluids")).toBe(true);
    expect(composer).toContain("setModalTab(item.opensOrderTab)");
  });

  it("i18n keys are mirrored FR/EN", () => {
    expect(Object.keys(edHosp1dObservationOrdersEn).sort()).toEqual(
      Object.keys(edHosp1dObservationOrdersFr).sort()
    );
  });

  it("does not call observation-order-template apply (INPATIENT-only auto-create path)", () => {
    expect(composer).not.toContain("observation-order-template/apply");
    expect(panel).not.toContain("observation-order-template/apply");
  });

  it("unsaved Observation stays local; persisted dest remounts composer without rewriting 1C dest", () => {
    expect(composer).not.toContain("setSelectedIds([])");
    expect(panel).toContain("persistedObservationDecisionRemountsComposer");
    expect(panel).toContain('inferred = "OBSERVATION"');
    expect(composer).not.toContain("hospitalDestinationIntent");
    expect(composer).not.toContain("confirmInpatientTransfer");
  });

  it("medication goes through existing CreateOrderModal; composer does not POST a MEDICATION DTO", () => {
    expect(composer).toContain("CreateOrderModal");
    expect(composer).toContain("key={modalTab}");
    expect(composer).toContain('medicationOrderMode="ER_ADMINISTER_ONLY"');
    expect(composer).not.toMatch(/type:\s*"MEDICATION"/);
    expect(composer).not.toContain("safetyAcknowledgedMedicationAllergies");
    expect(createModal).toContain("safetyAcknowledgedMedicationAllergies");
    expect(createModal).toContain("medicationAllergySafetyAck");
  });

  it("existing orders show a loading state; failed GET keeps draft selections", () => {
    expect(composer).toContain("ordersLoading");
    expect(composer).toContain("ed-observation-existing-orders-loading");
    expect(composer).toContain("edHosp1dObservationOrders.existingLoading");
    expect(composer).toContain("ed-observation-existing-orders-error");
    expect(composer).toContain("ed-observation-existing-orders-retry");
    const loadOrdersFn = composer.slice(composer.indexOf("const loadOrders"), composer.indexOf("useEffect(() => {"));
    expect(loadOrdersFn).not.toContain("setSelectedIds");
    expect(loadOrdersFn).toContain("setLoadError");
    expect(edHosp1dObservationOrdersEn.existingLoading).toBeTruthy();
    expect(edHosp1dObservationOrdersFr.existingLoading).toBeTruthy();
  });

  it("LAB hydration uses canonical GET displayLabel / catalog name, not a second field", () => {
    const sharedComposer = readFileSync(
      join(webRoot, "../../packages/shared/src/encounters/edHosp1dObservationOrderComposer.ts"),
      "utf8"
    );
    expect(sharedComposer).toContain("displayLabelFr");
    expect(sharedComposer).toContain("displayLabelEn");
    expect(sharedComposer).toContain("catalogLabTest");
    expect(sharedComposer).not.toContain("observationComposerLabel");
  });

  it("print / closed record reads canonical encounter orders; composer has no private store", () => {
    const erPrint = readSrc("features/emergency/erClinicalRecordPrintPacket.ts");
    const layout = readSrc("features/emergency/enterpriseClinicalChartLayout.ts");
    expect(layout).toContain("groupOrdersByCategory(record.orders)");
    expect(erPrint).toContain("groupedOrders");
    expect(composer).not.toContain("localStorage");
    expect(composer).not.toContain("sessionStorage");
    expect(composer).not.toContain("indexedDB");
    expect(composer).not.toMatch(/Completed|Administered|Performed|Resulted/);
  });

  it("recordAdmissionDecision does not rewrite ED billingClassification (1C unchanged)", () => {
    const encSvc = readFileSync(
      join(webRoot, "../../apps/api/src/encounters/encounters.service.ts"),
      "utf8"
    );
    const writer = encSvc.slice(
      encSvc.indexOf("async recordAdmissionDecision("),
      encSvc.indexOf("async cancelAdmissionDecision(")
    );
    expect(writer).toContain("admissionSummaryJson: mergedSummary");
    expect(writer).not.toContain("billingClassification");
    expect(writer).not.toContain("EncounterType.OBSERVATION");
  });
});
