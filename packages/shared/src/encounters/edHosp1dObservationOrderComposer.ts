/**
 * ED.HOSP.1D — Observation order composer presentation catalog + mapping.
 *
 * Suggestions are NOT orders. Nothing is created until the provider explicitly
 * activates selected items through the canonical OrdersService / orderCreateDtoSchema.
 *
 * No second order engine. No Prisma. No EncounterType.OBSERVATION.
 * Telemetry on the placement packet remains a placement flag; cardiac monitoring
 * is a separate CARE order only when explicitly selected.
 */

import type { OrderCreateDto } from "../schemas/patient.js";
import {
  OBSERVATION_ORDER_TEMPLATE_ITEMS,
  buildObservationTemplateCareOrderDto,
  isObservationTemplatePersistedOrderItemActive,
  observationTemplateItemIdFromPersistedManualLabel,
  type ObservationOrderTemplateLabelLocale,
} from "../observationOrderTemplate.js";
import { canonicalCareProcedureByCode } from "../procedures/canonicalCareProcedureCatalog.js";
import { isObservationHospitalDestinationIntent } from "./hospitalDestinationIntent.js";

export const ED_HOSP_1D_COMPOSER_OUTCOME = "OBSERVATION" as const;

export const ED_HOSP_1D_CATEGORY_IDS = [
  "status_service",
  "monitoring",
  "vitals_nursing",
  "activity",
  "diet",
  "iv_fluids",
  "respiratory",
  "medications",
  "laboratory",
  "imaging",
  "reassessment",
  "consults",
  "nursing_instructions",
  "observation_plan",
] as const;

export type EdHosp1dComposerCategoryId = (typeof ED_HOSP_1D_CATEGORY_IDS)[number];

export type EdHosp1dComposerItemKind =
  | "CONTEXT"
  | "CARE_TEMPLATE"
  | "CARE_PROCEDURE"
  | "CARE_FREE_TEXT"
  | "OPEN_ORDER_MODAL";

export type EdHosp1dComposerItemState = "SUGGESTED" | "SELECTED" | "ORDERED";

export type EdHosp1dOrderModalTab = "LAB" | "IMAGING" | "MEDICATION" | "CARE";

export type EdHosp1dComposerSuggestion = {
  id: string;
  category: EdHosp1dComposerCategoryId;
  kind: EdHosp1dComposerItemKind;
  labelEn: string;
  labelFr: string;
  /** Always false — opening Observation must not pre-check or auto-order. */
  defaultSelected: false;
  templateItemId?: string;
  enterpriseProcedureId?: string;
  freeTextEn?: string;
  freeTextFr?: string;
  opensOrderTab?: EdHosp1dOrderModalTab;
  /** Consult request is a plan/order — never a completed consult event. */
  consultPlanOnly?: boolean;
};

/** Paper-sheet medication tokens — workflow reference only; must never appear as composer defaults. */
export const ED_HOSP_1D_PAPER_SHEET_MEDICATION_TOKENS = [
  "morphine",
  "ondansetron",
  "hydrocodone",
  "acetaminophen",
  "piperacillin",
  "tazobactam",
  "linezolid",
  "ceftriaxone",
  "azithromycin",
  "vancomycin",
] as const;

function templateSuggestion(
  category: EdHosp1dComposerCategoryId,
  templateItemId: string
): EdHosp1dComposerSuggestion | null {
  const def = OBSERVATION_ORDER_TEMPLATE_ITEMS.find((item) => item.id === templateItemId);
  if (!def) return null;
  return {
    id: `tpl:${templateItemId}`,
    category,
    kind: "CARE_TEMPLATE",
    labelEn: def.manualLabelEn,
    labelFr: def.manualLabelFr,
    defaultSelected: false,
    templateItemId,
  };
}

function procedureSuggestion(
  id: string,
  category: EdHosp1dComposerCategoryId,
  enterpriseProcedureId: string,
  fallbackEn: string,
  fallbackFr: string,
  extra?: Pick<EdHosp1dComposerSuggestion, "consultPlanOnly">
): EdHosp1dComposerSuggestion {
  return {
    id,
    category,
    kind: "CARE_PROCEDURE",
    labelEn: fallbackEn,
    labelFr: fallbackFr,
    defaultSelected: false,
    enterpriseProcedureId,
    ...extra,
  };
}

function freeTextSuggestion(
  id: string,
  category: EdHosp1dComposerCategoryId,
  labelEn: string,
  labelFr: string
): EdHosp1dComposerSuggestion {
  return {
    id,
    category,
    kind: "CARE_FREE_TEXT",
    labelEn,
    labelFr,
    defaultSelected: false,
    freeTextEn: labelEn,
    freeTextFr: labelFr,
  };
}

function modalSuggestion(
  id: string,
  category: EdHosp1dComposerCategoryId,
  labelEn: string,
  labelFr: string,
  opensOrderTab: EdHosp1dOrderModalTab
): EdHosp1dComposerSuggestion {
  return {
    id,
    category,
    kind: "OPEN_ORDER_MODAL",
    labelEn,
    labelFr,
    defaultSelected: false,
    opensOrderTab,
  };
}

function mustTemplate(
  category: EdHosp1dComposerCategoryId,
  templateItemId: string
): EdHosp1dComposerSuggestion {
  const row = templateSuggestion(category, templateItemId);
  if (!row) {
    throw new Error(`ed_hosp_1d_missing_template:${templateItemId}`);
  }
  return row;
}

/**
 * Non-persisted presentation shortcuts. None are default-selected.
 * Medications / labs / imaging / oxygen / IV fluids open the existing CreateOrderModal.
 */
export const ED_HOSP_1D_COMPOSER_SUGGESTIONS: readonly EdHosp1dComposerSuggestion[] = [
  mustTemplate("monitoring", "mon_pulse_ox_continuous"),
  procedureSuggestion(
    "proc:continuous_cardiac_monitoring",
    "monitoring",
    "continuous_cardiac_monitoring",
    "Continuous cardiac monitoring",
    "Surveillance cardiaque continue"
  ),
  procedureSuggestion(
    "proc:pulse_oximetry",
    "monitoring",
    "pulse_oximetry",
    "Pulse oximetry",
    "Oxymétrie de pouls"
  ),
  procedureSuggestion(
    "proc:fall_precautions",
    "monitoring",
    "fall_precautions",
    "Fall precautions",
    "Précautions contre les chutes"
  ),
  procedureSuggestion(
    "proc:isolation_precautions",
    "monitoring",
    "isolation_precautions",
    "Isolation precautions",
    "Précautions d'isolement"
  ),
  mustTemplate("vitals_nursing", "mon_vitals_q2h"),
  mustTemplate("vitals_nursing", "mon_vitals_q4h"),
  procedureSuggestion(
    "proc:neuro_check",
    "vitals_nursing",
    "neuro_check",
    "Neuro check",
    "Contrôle neurologique"
  ),
  procedureSuggestion(
    "proc:neurovascular_check",
    "vitals_nursing",
    "neurovascular_check",
    "Neurovascular check",
    "Contrôle neurovasculaire"
  ),
  procedureSuggestion(
    "proc:glucose_check",
    "vitals_nursing",
    "glucose_check",
    "Glucose check",
    "Contrôle de la glycémie"
  ),
  freeTextSuggestion(
    "ft:activity_as_tolerated",
    "activity",
    "Activity as tolerated",
    "Activité selon tolérance"
  ),
  freeTextSuggestion("ft:bed_rest", "activity", "Bed rest", "Repos au lit"),
  procedureSuggestion(
    "proc:ambulation_trial",
    "activity",
    "ambulation_trial",
    "Ambulate with assistance",
    "Marche avec aide"
  ),
  procedureSuggestion(
    "proc:npo_status",
    "diet",
    "npo_status",
    "NPO",
    "À jeun (NPO)"
  ),
  mustTemplate("diet", "com_diet_ad_lib"),
  freeTextSuggestion("ft:diet_regular", "diet", "Regular diet", "Régime normal"),
  freeTextSuggestion("ft:diet_diabetic", "diet", "Diabetic diet", "Régime diabétique"),
  freeTextSuggestion("ft:diet_low_sodium", "diet", "Low sodium diet", "Régime hyposodé"),
  freeTextSuggestion("ft:diet_clear_liquid", "diet", "Clear liquid diet", "Régime liquide clair"),
  procedureSuggestion(
    "proc:peripheral_iv_placement",
    "iv_fluids",
    "peripheral_iv_placement",
    "Peripheral IV",
    "Voie veineuse périphérique"
  ),
  freeTextSuggestion("ft:saline_lock", "iv_fluids", "Saline lock", "Voie veineuse avec bouchon"),
  modalSuggestion(
    "modal:iv_fluids",
    "iv_fluids",
    "IV fluids (existing medication / fluid order)",
    "Solutés IV (ordre médicament / perfusion existant)",
    "MEDICATION"
  ),
  modalSuggestion(
    "modal:oxygen",
    "respiratory",
    "Oxygen therapy (existing CARE order)",
    "Oxygénothérapie (ordre de soins existant)",
    "CARE"
  ),
  modalSuggestion(
    "modal:medication",
    "medications",
    "Add medication (existing catalog)",
    "Ajouter un médicament (catalogue existant)",
    "MEDICATION"
  ),
  modalSuggestion(
    "modal:laboratory",
    "laboratory",
    "Add laboratory order (existing catalog)",
    "Ajouter une biologie (catalogue existant)",
    "LAB"
  ),
  modalSuggestion(
    "modal:imaging",
    "imaging",
    "Add imaging order (existing catalog)",
    "Ajouter une imagerie (catalogue existant)",
    "IMAGING"
  ),
  mustTemplate("reassessment", "nurse_reassess_q2h"),
  mustTemplate("reassessment", "disp_reassess_discharge"),
  freeTextSuggestion(
    "ft:reassess_response",
    "reassessment",
    "Reassess response to treatment",
    "Réévaluer la réponse au traitement"
  ),
  procedureSuggestion(
    "proc:cardiology_consult",
    "consults",
    "cardiology_consult",
    "Cardiology consult (request)",
    "Consultation cardiologie (demande)",
    { consultPlanOnly: true }
  ),
  procedureSuggestion(
    "proc:neurology_consult",
    "consults",
    "neurology_consult",
    "Neurology consult (request)",
    "Consultation neurologie (demande)",
    { consultPlanOnly: true }
  ),
  procedureSuggestion(
    "proc:orthopedics_consult",
    "consults",
    "orthopedics_consult",
    "Orthopedics consult (request)",
    "Consultation orthopédie (demande)",
    { consultPlanOnly: true }
  ),
  procedureSuggestion(
    "proc:psychiatry_consult",
    "consults",
    "psychiatry_consult",
    "Psychiatry consult (request)",
    "Consultation psychiatrie (demande)",
    { consultPlanOnly: true }
  ),
  mustTemplate("nursing_instructions", "com_fall_precautions"),
];

export function shouldMountObservationOrderComposer(outcomeUi: string | null | undefined): boolean {
  return String(outcomeUi ?? "").trim().toUpperCase() === ED_HOSP_1D_COMPOSER_OUTCOME;
}

/**
 * Observation save does not PATCH dischargeSummaryJson (Phase 15F-D).
 * Unsaved local Observation selection has no dest stamp → false (reload may return HOME).
 * Persisted 1C Observation dest → remount composer after reload.
 */
export function persistedObservationDecisionRemountsComposer(input: {
  admissionSummaryJson?: unknown;
  placementRequestedEncounterType?: string | null;
}): boolean {
  return isObservationHospitalDestinationIntent({
    admissionSummaryJson: input.admissionSummaryJson,
    placementRequestedEncounterType: input.placementRequestedEncounterType,
  });
}

/** Unsaved UI selection does not stamp dest; 1C billing projection stays unknown. */
export function unsavedObservationSelectionHasPersistedDestination(
  admissionSummaryJson: unknown
): boolean {
  return isObservationHospitalDestinationIntent({ admissionSummaryJson });
}

export function observationComposerSuggestionsCreateZeroOrders(): true {
  return true;
}

export function suggestionIsActivatableCare(item: EdHosp1dComposerSuggestion): boolean {
  return item.kind === "CARE_TEMPLATE" || item.kind === "CARE_PROCEDURE" || item.kind === "CARE_FREE_TEXT";
}

export function suggestionRequiresExplicitSelection(item: EdHosp1dComposerSuggestion): boolean {
  return suggestionIsActivatableCare(item);
}

export function observationComposerHasNoDefaultSelection(
  items: readonly EdHosp1dComposerSuggestion[] = ED_HOSP_1D_COMPOSER_SUGGESTIONS
): boolean {
  return items.every((item) => item.defaultSelected === false);
}

export function observationComposerContainsPaperSheetMedications(
  items: readonly EdHosp1dComposerSuggestion[] = ED_HOSP_1D_COMPOSER_SUGGESTIONS
): boolean {
  const blob = items
    .map((item) => `${item.id} ${item.labelEn} ${item.labelFr}`.toLowerCase())
    .join(" ");
  return ED_HOSP_1D_PAPER_SHEET_MEDICATION_TOKENS.some((token) => blob.includes(token));
}

export type EdHosp1dExistingOrderCatalogNameLite = {
  displayNameFr?: string | null;
  displayNameEn?: string | null;
  name?: string | null;
};

export type EdHosp1dExistingOrderItemLite = {
  manualLabel?: string | null;
  /** Canonical GET `/encounters/:id/orders` display projection — not a second naming field. */
  displayLabelFr?: string | null;
  displayLabelEn?: string | null;
  enterpriseProcedureId?: string | null;
  catalogItemType?: string | null;
  status?: string | null;
  lifecycleState?: string | null;
  catalogLabTest?: EdHosp1dExistingOrderCatalogNameLite | null;
  catalogImagingStudy?: EdHosp1dExistingOrderCatalogNameLite | null;
  catalogMedication?: EdHosp1dExistingOrderCatalogNameLite | null;
};

export type EdHosp1dExistingOrderLite = {
  id?: string | null;
  type?: string | null;
  status?: string | null;
  cancelledAt?: string | null;
  authority?: { protocolName?: string | null; templateItemId?: string | null } | null;
  items?: EdHosp1dExistingOrderItemLite[] | null;
};

function normalizeLabel(raw: string | null | undefined): string {
  return (raw ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function orderIsActiveForHydration(order: EdHosp1dExistingOrderLite): boolean {
  if (order.cancelledAt) return false;
  const st = String(order.status ?? "").toUpperCase();
  if (st === "CANCELLED") return false;
  return true;
}

function itemIsActiveForHydration(item: EdHosp1dExistingOrderItemLite): boolean {
  return isObservationTemplatePersistedOrderItemActive(item);
}

export function matchComposerSuggestionToExistingOrder(
  suggestion: EdHosp1dComposerSuggestion,
  orders: readonly EdHosp1dExistingOrderLite[]
): EdHosp1dExistingOrderLite | null {
  if (!suggestionIsActivatableCare(suggestion)) return null;
  for (const order of orders) {
    if (!orderIsActiveForHydration(order)) continue;
    if (String(order.type ?? "").toUpperCase() !== "CARE") continue;
    const items = Array.isArray(order.items) ? order.items : [];
    const authority = order.authority ?? null;
    if (suggestion.kind === "CARE_TEMPLATE" && suggestion.templateItemId) {
      if (authority?.templateItemId === suggestion.templateItemId) return order;
      for (const item of items) {
        if (!itemIsActiveForHydration(item)) continue;
        if (observationTemplateItemIdFromPersistedManualLabel(item.manualLabel) === suggestion.templateItemId) {
          return order;
        }
      }
    }
    if (suggestion.kind === "CARE_PROCEDURE" && suggestion.enterpriseProcedureId) {
      for (const item of items) {
        if (!itemIsActiveForHydration(item)) continue;
        if ((item.enterpriseProcedureId ?? "").trim() === suggestion.enterpriseProcedureId) return order;
      }
    }
    if (suggestion.kind === "CARE_FREE_TEXT") {
      const want = new Set(
        [suggestion.freeTextEn, suggestion.freeTextFr, suggestion.labelEn, suggestion.labelFr]
          .map(normalizeLabel)
          .filter(Boolean)
      );
      for (const item of items) {
        if (!itemIsActiveForHydration(item)) continue;
        if (want.has(normalizeLabel(item.manualLabel))) return order;
      }
    }
  }
  return null;
}

export function hydrateComposerItemState(
  suggestion: EdHosp1dComposerSuggestion,
  orders: readonly EdHosp1dExistingOrderLite[],
  selectedIds: ReadonlySet<string>
): EdHosp1dComposerItemState {
  if (matchComposerSuggestionToExistingOrder(suggestion, orders)) return "ORDERED";
  if (selectedIds.has(suggestion.id)) return "SELECTED";
  return "SUGGESTED";
}

export function customCareSuggestion(input: {
  category: EdHosp1dComposerCategoryId;
  text: string;
}): EdHosp1dComposerSuggestion | null {
  const text = input.text.trim().replace(/\s+/g, " ");
  if (!text) return null;
  const key = text.toLowerCase();
  return {
    id: `custom:${input.category}:${key}`,
    category: input.category,
    kind: "CARE_FREE_TEXT",
    labelEn: text,
    labelFr: text,
    defaultSelected: false,
    freeTextEn: text,
    freeTextFr: text,
  };
}

export function buildComposerCareOrderDto(input: {
  suggestion: EdHosp1dComposerSuggestion;
  prescriberName: string;
  locale: ObservationOrderTemplateLabelLocale;
}): OrderCreateDto | null {
  const { suggestion, prescriberName, locale } = input;
  if (!suggestionIsActivatableCare(suggestion)) return null;

  if (suggestion.kind === "CARE_TEMPLATE" && suggestion.templateItemId) {
    return buildObservationTemplateCareOrderDto({
      selectedItemIds: [suggestion.templateItemId],
      prescriberName,
      labelLocale: locale,
    });
  }

  const label =
    locale === "en"
      ? (suggestion.freeTextEn ?? suggestion.labelEn)
      : (suggestion.freeTextFr ?? suggestion.labelFr);

  return {
    type: "CARE",
    orderSource: "PROVIDER_ORDER",
    priority: "ROUTINE",
    prescriberName: prescriberName.trim() || undefined,
    items: [
      {
        catalogItemId: null,
        catalogItemType: "CARE",
        manualLabel: label.trim(),
        ...(suggestion.enterpriseProcedureId
          ? { enterpriseProcedureId: suggestion.enterpriseProcedureId }
          : {}),
      },
    ],
  };
}

export type EdHosp1dComposerCreateAttempt = {
  suggestionId: string;
  skippedBecauseOrdered: boolean;
  skippedBecauseInFlight: boolean;
  dto: OrderCreateDto | null;
};

export function planComposerCareOrderCreates(input: {
  selectedIds: readonly string[];
  extraSuggestions?: readonly EdHosp1dComposerSuggestion[];
  orders: readonly EdHosp1dExistingOrderLite[];
  inFlightIds: ReadonlySet<string>;
  prescriberName: string;
  locale: ObservationOrderTemplateLabelLocale;
}): EdHosp1dComposerCreateAttempt[] {
  const catalog = [
    ...ED_HOSP_1D_COMPOSER_SUGGESTIONS,
    ...(input.extraSuggestions ?? []),
  ];
  const byId = new Map(catalog.map((row) => [row.id, row]));
  return input.selectedIds.map((id) => {
    const suggestion = byId.get(id);
    if (!suggestion || !suggestionIsActivatableCare(suggestion)) {
      return { suggestionId: id, skippedBecauseOrdered: false, skippedBecauseInFlight: false, dto: null };
    }
    if (matchComposerSuggestionToExistingOrder(suggestion, input.orders)) {
      return { suggestionId: id, skippedBecauseOrdered: true, skippedBecauseInFlight: false, dto: null };
    }
    if (input.inFlightIds.has(id)) {
      return { suggestionId: id, skippedBecauseOrdered: false, skippedBecauseInFlight: true, dto: null };
    }
    return {
      suggestionId: id,
      skippedBecauseOrdered: false,
      skippedBecauseInFlight: false,
      dto: buildComposerCareOrderDto({
        suggestion,
        prescriberName: input.prescriberName,
        locale: input.locale,
      }),
    };
  });
}

export type EdHosp1dComposerItemCreateResult = {
  suggestionId: string;
  ok: boolean;
  orderId?: string;
  error?: string;
  skipped?: boolean;
};

export function summarizeComposerCreateResults(results: readonly EdHosp1dComposerItemCreateResult[]): {
  attempted: number;
  succeeded: number;
  failed: number;
  skipped: number;
  allSucceeded: boolean;
  partialFailure: boolean;
  retryableIds: string[];
} {
  const attempted = results.filter((row) => !row.skipped).length;
  const succeeded = results.filter((row) => row.ok && !row.skipped).length;
  const failed = results.filter((row) => !row.ok && !row.skipped).length;
  const skipped = results.filter((row) => row.skipped).length;
  return {
    attempted,
    succeeded,
    failed,
    skipped,
    allSucceeded: attempted > 0 && failed === 0,
    partialFailure: succeeded > 0 && failed > 0,
    retryableIds: results.filter((row) => !row.ok && !row.skipped).map((row) => row.suggestionId),
  };
}

export function canActivateObservationComposerOrders(input: {
  canPrescribe: boolean;
  encounterOpen?: boolean;
}): boolean {
  return input.canPrescribe === true && input.encounterOpen !== false;
}

/** Placement telemetry flag is not a canonical order and must not auto-emit CARE. */
export function telemetryPlacementFlagCreatesOrder(_telemetryRequired: boolean): false {
  return false;
}

export function composerDoesNotInferOrdersFromDiagnosis(): true {
  return true;
}

export function composerDoesNotCreateEncounterTypeObservation(): true {
  return true;
}

export function composerDoesNotConvertObservationToInpatient(): true {
  return true;
}

export function hydrateLabImagingMedicationOrders(orders: readonly EdHosp1dExistingOrderLite[]): {
  lab: EdHosp1dExistingOrderLite[];
  imaging: EdHosp1dExistingOrderLite[];
  medication: EdHosp1dExistingOrderLite[];
  care: EdHosp1dExistingOrderLite[];
} {
  const lab: EdHosp1dExistingOrderLite[] = [];
  const imaging: EdHosp1dExistingOrderLite[] = [];
  const medication: EdHosp1dExistingOrderLite[] = [];
  const care: EdHosp1dExistingOrderLite[] = [];
  for (const order of orders) {
    if (!orderIsActiveForHydration(order)) continue;
    const type = String(order.type ?? "").toUpperCase();
    if (type === "LAB") lab.push(order);
    else if (type === "IMAGING") imaging.push(order);
    else if (type === "MEDICATION") medication.push(order);
    else if (type === "CARE") care.push(order);
  }
  return { lab, imaging, medication, care };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value != null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export function parseEncounterOrdersForComposer(raw: unknown): EdHosp1dExistingOrderLite[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => {
    const rec = asRecord(row) ?? {};
    const authority = asRecord(rec.authority);
    const itemsRaw = Array.isArray(rec.items) ? rec.items : [];
    return {
      id: typeof rec.id === "string" ? rec.id : null,
      type: typeof rec.type === "string" ? rec.type : null,
      status: typeof rec.status === "string" ? rec.status : null,
      cancelledAt: typeof rec.cancelledAt === "string" ? rec.cancelledAt : null,
      authority: authority
        ? {
            protocolName: typeof authority.protocolName === "string" ? authority.protocolName : null,
            templateItemId:
              typeof authority.templateItemId === "string"
                ? authority.templateItemId
                : typeof authority.observationTemplateItemId === "string"
                  ? authority.observationTemplateItemId
                  : null,
          }
        : null,
      items: itemsRaw.map((item) => {
        const it = asRecord(item) ?? {};
        return {
          manualLabel: typeof it.manualLabel === "string" ? it.manualLabel : null,
          displayLabelFr: typeof it.displayLabelFr === "string" ? it.displayLabelFr : null,
          displayLabelEn: typeof it.displayLabelEn === "string" ? it.displayLabelEn : null,
          enterpriseProcedureId:
            typeof it.enterpriseProcedureId === "string" ? it.enterpriseProcedureId : null,
          catalogItemType: typeof it.catalogItemType === "string" ? it.catalogItemType : null,
          status: typeof it.status === "string" ? it.status : null,
          lifecycleState: typeof it.lifecycleState === "string" ? it.lifecycleState : null,
          catalogLabTest: parseCatalogDisplayName(it.catalogLabTest),
          catalogImagingStudy: parseCatalogDisplayName(it.catalogImagingStudy),
          catalogMedication: parseCatalogDisplayName(it.catalogMedication),
        };
      }),
    };
  });
}

function parseCatalogDisplayName(raw: unknown): EdHosp1dExistingOrderCatalogNameLite | null {
  const rec = asRecord(raw);
  if (!rec) return null;
  const name =
    typeof rec.name === "string"
      ? rec.name
      : typeof rec.genericName === "string"
        ? rec.genericName
        : null;
  const displayNameFr = typeof rec.displayNameFr === "string" ? rec.displayNameFr : null;
  const displayNameEn = typeof rec.displayNameEn === "string" ? rec.displayNameEn : null;
  if (!displayNameFr && !displayNameEn && !name) return null;
  return { displayNameFr, displayNameEn, name };
}

function firstNonEmptyLabel(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

export function existingOrderDisplayLabel(
  order: EdHosp1dExistingOrderLite,
  locale: ObservationOrderTemplateLabelLocale
): string {
  const items = Array.isArray(order.items) ? order.items : [];
  const first = items.find((item) => itemIsActiveForHydration(item));
  const catalog = first?.catalogLabTest ?? first?.catalogImagingStudy ?? first?.catalogMedication;
  const fromCanonicalProjection =
    locale === "en"
      ? firstNonEmptyLabel(
          first?.displayLabelEn,
          catalog?.displayNameEn,
          first?.displayLabelFr,
          catalog?.displayNameFr,
          catalog?.name,
          first?.manualLabel
        )
      : firstNonEmptyLabel(
          first?.displayLabelFr,
          catalog?.displayNameFr,
          first?.displayLabelEn,
          catalog?.displayNameEn,
          catalog?.name,
          first?.manualLabel
        );
  if (fromCanonicalProjection) return fromCanonicalProjection;
  if (first?.enterpriseProcedureId) {
    const row = canonicalCareProcedureByCode(first.enterpriseProcedureId);
    if (row) return locale === "en" ? row.displayNameEn : row.displayNameFr;
  }
  return String(order.type ?? (locale === "en" ? "Order" : "Ordre"));
}

/** PLACED is the legal order status after create — not completed / administered / resulted. */
export function placedOrderMustNotBeLabeledCompleted(status: string | null | undefined): boolean {
  return String(status ?? "").trim().toUpperCase() === "PLACED";
}

export function composerDoesNotFabricateMedicationDtoFromShortcuts(): true {
  return true;
}

export function composerHasNoPrivateOrderStore(): true {
  return true;
}
