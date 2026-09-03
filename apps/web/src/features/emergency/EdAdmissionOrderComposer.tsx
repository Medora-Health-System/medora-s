"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ED_HOSP_1E_CATEGORY_IDS,
  ED_HOSP_1E_COMPOSER_SUGGESTIONS,
  ED_HOSP_1E_INPATIENT_LEVELS_OF_CARE,
  admissionDiagnosisDuplicate,
  canActivateAdmissionComposerOrders,
  existingOrderDisplayLabel,
  hydrateComposerItemState,
  hydrateLabImagingMedicationOrders,
  inpatientFacilityMedicationOrderMode,
  parseEncounterOrdersForComposer,
  planComposerCareOrderCreates,
  summarizeComposerCreateResults,
  suggestionIsActivatableCare,
  type EdHosp1eComposerCategoryId,
  type EdHosp1eComposerSuggestion,
  type EdHosp1ePendingDiagnosis,
  type EdHosp1dExistingOrderLite,
  type EdHosp1dOrderModalTab,
} from "@medora/shared";
import { CreateOrderModal } from "@/components/orders";
import { Icd10DiagnosisSearchAutocomplete } from "@/components/diagnosis/Icd10DiagnosisSearchAutocomplete";
import { isDuplicateDischargeDiagnosis } from "@/components/diagnosis/icd10DiagnosisSearchHelpers";
import { createDiagnosis, type Icd10SearchHit } from "@/lib/chartApi";
import { apiFetch } from "@/lib/apiClient";
import { mapOrderCreateApiError } from "@/components/orders/createOrderModal/mapOrderCreateApiError";
import { invalidateGetRequestDedupeForPath } from "@/lib/getRequestDedupe";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { useI18n } from "@/lib/i18n";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useEncounterDiagnosisRows } from "./useEncounterDiagnosisRows";
import { parseProductUiLanguage, resolveProductUiLanguageOrDefault, type SupportedLanguage } from "@/i18n/config";

import {
  ED_DISPOSITION_BOARD_COLORS,
  edBadgeCompleteStyle,
  edBadgePendingStyle,
  edBoardSectionStyle,
  edNeutralBtnStyle,
  edPrimaryBtnStyle,
  edSectionHeadingStyle,
} from "./edDispositionBoardStyles";

const CATEGORY_I18N: Record<EdHosp1eComposerCategoryId, string> = {
  admission_loc: "edHosp1eAdmissionOrders.categoryAdmissionLoc",
  diagnosis: "edHosp1eAdmissionOrders.categoryDiagnosis",
  code_status: "edHosp1eAdmissionOrders.categoryCodeStatus",
  monitoring: "edHosp1eAdmissionOrders.categoryMonitoring",
  vitals_checks: "edHosp1eAdmissionOrders.categoryVitals",
  activity: "edHosp1eAdmissionOrders.categoryActivity",
  diet: "edHosp1eAdmissionOrders.categoryDiet",
  respiratory: "edHosp1eAdmissionOrders.categoryRespiratory",
  iv_fluids: "edHosp1eAdmissionOrders.categoryIv",
  medications: "edHosp1eAdmissionOrders.categoryMedications",
  laboratory: "edHosp1eAdmissionOrders.categoryLaboratory",
  imaging: "edHosp1eAdmissionOrders.categoryImaging",
  consults: "edHosp1eAdmissionOrders.categoryConsults",
  precautions: "edHosp1eAdmissionOrders.categoryPrecautions",
  nursing: "edHosp1eAdmissionOrders.categoryNursing",
  review: "edHosp1eAdmissionOrders.categoryReview",
};

const GRID_CATEGORIES = ED_HOSP_1E_CATEGORY_IDS.filter((id) => id !== "review");

const DEFAULT_OPEN = new Set<EdHosp1eComposerCategoryId>([
  "admission_loc",
  "diagnosis",
  "code_status",
  "monitoring",
]);

export type EdAdmissionOrderComposerContext = {
  diagnosis?: string | null;
  acceptingProvider?: string | null;
  requestedService?: string | null;
};

export function EdAdmissionOrderComposer({
  encounterId,
  facilityId,
  patientId,
  canPrescribe,
  disabled,
  encounterOpen = true,
  prescriberName,
  encounter,
  careLevel,
  onCareLevelChange,
  context,
  onOrdersChanged,
}: {
  encounterId: string;
  facilityId: string;
  patientId?: string | null;
  canPrescribe: boolean;
  disabled?: boolean;
  encounterOpen?: boolean;
  prescriberName: string;
  encounter?: {
    status?: string | null;
    patient?: { firstName?: string | null; lastName?: string | null; mrn?: string | null } | null;
  };
  careLevel?: string | null;
  onCareLevelChange?: (code: string) => void;
  context?: EdAdmissionOrderComposerContext;
  onOrdersChanged?: () => void | Promise<void>;
}) {
  const { t, language } = useI18n();
  const { roles } = useFacilityAndRoles();
  const locale = resolveProductUiLanguageOrDefault(language);
  const canActivate = canActivateAdmissionComposerOrders({ canPrescribe, encounterOpen });
  const locked = Boolean(disabled) || !encounterOpen;
  const catalog = ED_HOSP_1E_COMPOSER_SUGGESTIONS;

  const [orders, setOrders] = useState<EdHosp1dExistingOrderLite[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingDiagnoses, setPendingDiagnoses] = useState<EdHosp1ePendingDiagnosis[]>([]);
  const [dxRefresh, setDxRefresh] = useState(0);
  const [openCategories, setOpenCategories] = useState<Set<EdHosp1eComposerCategoryId>>(DEFAULT_OPEN);
  const [modalTab, setModalTab] = useState<EdHosp1dOrderModalTab | null>(null);
  const [activating, setActivating] = useState(false);
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{ type: "ok" | "err" | "warn"; text: string } | null>(null);
  const activatingLock = useRef(false);
  const inFlightRef = useRef(new Set<string>());

  const chartDiagnoses = useEncounterDiagnosisRows({
    encounterId,
    patientId,
    facilityId,
    refreshKey: dxRefresh,
  });

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      invalidateGetRequestDedupeForPath(`/encounters/${encounterId}/orders`);
      const raw = await apiFetch(`/encounters/${encounterId}/orders`, { facilityId });
      setOrders(parseEncounterOrdersForComposer(raw));
      setLoadError(null);
    } catch {
      setLoadError(t("edHosp1eAdmissionOrders.loadError"));
    } finally {
      setOrdersLoading(false);
    }
  }, [encounterId, facilityId, t]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const buckets = useMemo(() => hydrateLabImagingMedicationOrders(orders), [orders]);
  const selectedCare = catalog.filter((item) => selectedSet.has(item.id) && suggestionIsActivatableCare(item));
  const selectedCount = selectedCare.length + pendingDiagnoses.length;

  function labelFor(item: EdHosp1eComposerSuggestion): string {
    const parsed = parseProductUiLanguage(language);
    if (parsed === "en") return item.labelEn;
    if (parsed === "fr") return item.labelFr;
    return item.id;
  }

  function toggleCategory(id: EdHosp1eComposerCategoryId) {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelect(item: EdHosp1eComposerSuggestion) {
    if (!suggestionIsActivatableCare(item)) return;
    if (hydrateComposerItemState(item, orders, selectedSet) === "ORDERED") return;
    setSelectedIds((prev) => {
      if (item.category === "code_status") {
        const withoutStatus = prev.filter((id) => catalog.find((row) => row.id === id)?.category !== "code_status");
        if (prev.includes(item.id)) return withoutStatus;
        return [...withoutStatus, item.id];
      }
      if (prev.includes(item.id)) return prev.filter((id) => id !== item.id);
      return [...prev, item.id];
    });
  }

  function addDiagnosis(hit: Icd10SearchHit, description: string) {
    const chartDup = isDuplicateDischargeDiagnosis(
      { code: hit.code, description },
      chartDiagnoses.map((row) => ({ code: row.code, description: row.description }))
    );
    if (chartDup || admissionDiagnosisDuplicate(pendingDiagnoses, hit)) return;
    setPendingDiagnoses((prev) => [
      ...prev,
      { icd10CatalogId: hit.id, code: hit.code, description: description.trim() || hit.shortDescription },
    ]);
  }

  async function activateSelected() {
    if (activatingLock.current || !canActivate || locked) return;
    const planned = planComposerCareOrderCreates({
      selectedIds,
      catalog,
      orders,
      inFlightIds: inFlightRef.current,
      prescriberName,
      locale,
    });
    const toCreate = planned.filter((row) => row.dto);
    if (toCreate.length === 0 && pendingDiagnoses.length === 0) {
      setFeedback({ type: "warn", text: t("edHosp1eAdmissionOrders.noneToCreate") });
      return;
    }
    activatingLock.current = true;
    setActivating(true);
    setFeedback(null);
    const results: Array<{ suggestionId: string; ok: boolean; orderId?: string; error?: string; skipped?: boolean }> =
      [];
    const remainingDx: EdHosp1ePendingDiagnosis[] = [];
    for (const dx of pendingDiagnoses) {
      try {
        await createDiagnosis(facilityId, encounterId, {
          icd10CatalogId: dx.icd10CatalogId,
          code: dx.code,
          description: dx.description,
        });
      } catch (err) {
        remainingDx.push(dx);
        const raw = err instanceof Error ? err.message : (err as { message?: string })?.message;
        results.push({
          suggestionId: `dx:${dx.icd10CatalogId}`,
          ok: false,
          error: normalizeUserFacingError(raw, language) || t("edHosp1eAdmissionOrders.diagnosisCreateError"),
        });
      }
    }
    setPendingDiagnoses(remainingDx);
    setDxRefresh((n) => n + 1);

    for (const row of planned) {
      if (row.skippedBecauseOrdered || row.skippedBecauseInFlight) {
        results.push({ suggestionId: row.suggestionId, ok: true, skipped: true });
        continue;
      }
      if (!row.dto) {
        results.push({ suggestionId: row.suggestionId, ok: false, error: t("edHosp1eAdmissionOrders.createError") });
        continue;
      }
      inFlightRef.current.add(row.suggestionId);
      try {
        const created = (await apiFetch(`/encounters/${encounterId}/orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(row.dto),
          facilityId,
        })) as { id?: string };
        results.push({ suggestionId: row.suggestionId, ok: true, orderId: created?.id });
      } catch (err) {
        results.push({
          suggestionId: row.suggestionId,
          ok: false,
          error: mapOrderCreateApiError(err, t, language),
        });
      } finally {
        inFlightRef.current.delete(row.suggestionId);
      }
    }
    const summary = summarizeComposerCreateResults(results);
    const nextErrors: Record<string, string> = {};
    for (const row of results) {
      if (!row.ok && !row.skipped && row.error) nextErrors[row.suggestionId] = row.error;
    }
    setItemErrors(nextErrors);
    const succeededIds = new Set(results.filter((row) => row.ok && !row.skipped).map((row) => row.suggestionId));
    setSelectedIds((prev) => prev.filter((id) => !succeededIds.has(id) || nextErrors[id]));
    await loadOrders();
    await onOrdersChanged?.();
    if (summary.partialFailure || remainingDx.length > 0) {
      setFeedback({ type: "err", text: t("edHosp1eAdmissionOrders.partialFailure") });
    } else if (summary.allSucceeded || (toCreate.length === 0 && remainingDx.length === 0 && pendingDiagnoses.length > 0)) {
      setFeedback({ type: "ok", text: t("edHosp1eAdmissionOrders.allCreated") });
    } else if (summary.failed > 0) {
      setFeedback({ type: "err", text: t("edHosp1eAdmissionOrders.createError") });
    } else if (toCreate.length === 0 && remainingDx.length === 0) {
      setFeedback({ type: "ok", text: t("edHosp1eAdmissionOrders.allCreated") });
    }
    setActivating(false);
    activatingLock.current = false;
  }

  const chipStyle = (state: "SUGGESTED" | "SELECTED" | "ORDERED") => {
    if (state === "ORDERED") return edBadgeCompleteStyle;
    if (state === "SELECTED") {
      return {
        ...edBadgeCompleteStyle,
        color: ED_DISPOSITION_BOARD_COLORS.blue,
        background: ED_DISPOSITION_BOARD_COLORS.blueSoftBg,
        border: `1px solid ${ED_DISPOSITION_BOARD_COLORS.blueSoftBorder}`,
      };
    }
    return edBadgePendingStyle;
  };

  const locValue = (careLevel ?? "").trim().toUpperCase();
  const locSelected = ED_HOSP_1E_INPATIENT_LEVELS_OF_CARE.includes(
    locValue as (typeof ED_HOSP_1E_INPATIENT_LEVELS_OF_CARE)[number]
  )
    ? locValue
    : "";

  const canActivateNow = selectedCare.length > 0 || pendingDiagnoses.length > 0;

  return (
    <section
      data-testid="ed-admission-order-composer"
      data-ed-hosp-1e="admission-orders"
      style={{ ...edBoardSectionStyle, marginTop: 12 }}
    >
      <p style={edSectionHeadingStyle}>{t("edHosp1eAdmissionOrders.title")}</p>
      <p style={{ margin: "4px 0 0", fontSize: 12, color: ED_DISPOSITION_BOARD_COLORS.muted, lineHeight: 1.4 }}>
        {t("edHosp1eAdmissionOrders.subtitle")}
      </p>
      <p
        data-testid="ed-admission-order-progress"
        style={{ margin: "8px 0 0", fontSize: 13, fontWeight: 700, color: ED_DISPOSITION_BOARD_COLORS.text }}
      >
        {t("edHosp1eAdmissionOrders.progress")} {selectedCount} {t("edHosp1eAdmissionOrders.selectedCount")}
      </p>

      <div
        data-testid="ed-admission-order-context"
        className="ed-admission-order-context"
        style={{ marginTop: 10, display: "grid", gap: 6, fontSize: 12 }}
      >
        <ContextRow
          label={t("edHosp1eAdmissionOrders.contextDestination")}
          value={t("edHosp1eAdmissionOrders.contextDestinationInpatient")}
        />
        <ContextRow
          label={t("edHosp1eAdmissionOrders.contextLoc")}
          value={
            locSelected
              ? t(`hospitalAdmissionD4a0.level.${locSelected}` as Parameters<typeof t>[0])
              : t("edHosp1eAdmissionOrders.contextMissing")
          }
        />
        <ContextRow
          label={t("edHosp1eAdmissionOrders.contextDiagnosis")}
          value={ctxValue(context?.diagnosis, t)}
        />
        <ContextRow
          label={t("edHosp1eAdmissionOrders.contextAccepting")}
          value={ctxValue(context?.acceptingProvider, t)}
        />
      </div>
      <p style={{ margin: "6px 0 0", fontSize: 11, color: ED_DISPOSITION_BOARD_COLORS.muted }}>
        {t("edHosp1eAdmissionOrders.contextLocHint")}
      </p>

      {loadError ? (
        <p role="status" data-testid="ed-admission-orders-load-error" style={{ margin: "8px 0 0", fontSize: 12, color: "#9a3412" }}>
          {loadError}
        </p>
      ) : null}

      <div className="ed-admission-order-grid" data-testid="ed-admission-order-categories" style={{ marginTop: 12 }}>
        {GRID_CATEGORIES.map((categoryId) => {
          const items = catalog.filter((item) => item.category === categoryId);
          const open = openCategories.has(categoryId);
          const selectedInCat = items.filter((item) => selectedSet.has(item.id)).length;
          const extraCount =
            categoryId === "diagnosis"
              ? pendingDiagnoses.length
              : categoryId === "admission_loc" && locSelected
                ? 1
                : 0;
          const orderedCount = items.filter(
            (item) => hydrateComposerItemState(item, orders, selectedSet) === "ORDERED"
          ).length;
          return (
            <article
              key={categoryId}
              data-testid={`ed-admission-order-category-${categoryId}`}
              style={{
                border: `1px solid ${ED_DISPOSITION_BOARD_COLORS.border}`,
                borderRadius: 12,
                padding: 10,
                minWidth: 0,
                background: "#fff",
              }}
            >
              <button
                type="button"
                onClick={() => toggleCategory(categoryId)}
                aria-expanded={open}
                style={{
                  ...edNeutralBtnStyle,
                  width: "100%",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  textAlign: "left",
                  padding: "6px 8px",
                }}
              >
                <span>{t(CATEGORY_I18N[categoryId])}</span>
                <span style={{ fontSize: 11, color: ED_DISPOSITION_BOARD_COLORS.muted }}>
                  {orderedCount + selectedInCat + extraCount}/{Math.max(items.filter(suggestionIsActivatableCare).length, 1)}{" "}
                  {open ? t("edHosp1eAdmissionOrders.collapse") : t("edHosp1eAdmissionOrders.expand")}
                </span>
              </button>
              {open ? (
                <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                  {categoryId === "admission_loc" ? (
                    <div data-testid="ed-admission-loc-chips" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {ED_HOSP_1E_INPATIENT_LEVELS_OF_CARE.map((code) => {
                        const active = locSelected === code;
                        return (
                          <button
                            key={code}
                            type="button"
                            data-testid={`ed-admission-loc-${code}`}
                            disabled={locked}
                            onClick={() => onCareLevelChange?.(code)}
                            style={{
                              ...edNeutralBtnStyle,
                              ...(active
                                ? {
                                    color: ED_DISPOSITION_BOARD_COLORS.blue,
                                    background: ED_DISPOSITION_BOARD_COLORS.blueSoftBg,
                                    border: `1px solid ${ED_DISPOSITION_BOARD_COLORS.blueSoftBorder}`,
                                  }
                                : {}),
                            }}
                          >
                            {t(`hospitalAdmissionD4a0.level.${code}` as Parameters<typeof t>[0])}
                          </button>
                        );
                      })}
                      <p style={{ margin: 0, fontSize: 11, color: ED_DISPOSITION_BOARD_COLORS.muted, width: "100%" }}>
                        {t("edHosp1eAdmissionOrders.locHint")}
                      </p>
                    </div>
                  ) : null}
                  {categoryId === "diagnosis" ? (
                    <div data-testid="ed-admission-diagnosis-search" style={{ display: "grid", gap: 6 }}>
                      <p style={{ margin: 0, fontSize: 11, color: ED_DISPOSITION_BOARD_COLORS.muted }}>
                        {t("edHosp1eAdmissionOrders.diagnosisSearchHint")}
                      </p>
                      <Icd10DiagnosisSearchAutocomplete
                        language={language}
                        disabled={locked}
                        label={t("diagnosisEntry.icdSearchLabel")}
                        placeholder={t("diagnosisEntry.icdSearchPlaceholder")}
                        searchingLabel={t("diagnosisEntry.icdSearching")}
                        noResultsLabel={t("diagnosisEntry.icdNoResults")}
                        searchFailedLabel={t("diagnosisEntry.icdSearchFailed")}
                        alreadyAddedLabel={t("diagnosisEntry.alreadyAdded")}
                        selectedDiagnoses={[
                          ...chartDiagnoses.map((row) => ({ code: row.code, description: row.description })),
                          ...pendingDiagnoses.map((row) => ({ code: row.code, description: row.description })),
                        ]}
                        onSelect={(hit, description) => addDiagnosis(hit, description)}
                        testId="ed-admission-icd10-search"
                      />
                      {chartDiagnoses.length > 0 ? (
                        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 4 }}>
                          {chartDiagnoses.map((row) => (
                            <li key={row.id} style={{ fontSize: 12 }}>
                              {row.description} ({row.code}) — {t("edHosp1eAdmissionOrders.diagnosisOnChart")}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {pendingDiagnoses.length > 0 ? (
                        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 4 }}>
                          {pendingDiagnoses.map((row) => (
                            <li
                              key={row.icd10CatalogId}
                              data-testid={`ed-admission-pending-dx-${row.code}`}
                              style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12 }}
                            >
                              <span>
                                {row.description} ({row.code}) — {t("edHosp1eAdmissionOrders.diagnosisPending")}
                              </span>
                              <button
                                type="button"
                                disabled={locked}
                                onClick={() =>
                                  setPendingDiagnoses((prev) => prev.filter((d) => d.icd10CatalogId !== row.icd10CatalogId))
                                }
                                style={edNeutralBtnStyle}
                              >
                                {t("edHosp1eAdmissionOrders.diagnosisRemove")}
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {chartDiagnoses.length === 0 && pendingDiagnoses.length === 0 ? (
                        <p style={{ margin: 0, fontSize: 11, color: ED_DISPOSITION_BOARD_COLORS.muted }}>
                          {t("edHosp1eAdmissionOrders.diagnosisEmpty")}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  {items.map((item) => {
                    if (item.kind === "OPEN_ORDER_MODAL") {
                      return (
                        <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                          <span style={{ fontSize: 12, minWidth: 0 }}>{labelFor(item)}</span>
                          <button
                            type="button"
                            data-testid={`ed-admission-open-modal-${item.id}`}
                            disabled={locked || !canActivate}
                            onClick={() => item.opensOrderTab && setModalTab(item.opensOrderTab)}
                            style={edNeutralBtnStyle}
                          >
                            {item.opensOrderTab === "MEDICATION" && item.category === "medications"
                              ? t("edHosp1eAdmissionOrders.addMedication")
                              : item.opensOrderTab === "LAB"
                                ? t("edHosp1eAdmissionOrders.addLab")
                                : item.opensOrderTab === "IMAGING"
                                  ? t("edHosp1eAdmissionOrders.addImaging")
                                  : item.opensOrderTab === "CARE"
                                    ? t("edHosp1eAdmissionOrders.addOxygen")
                                    : t("edHosp1eAdmissionOrders.addIvFluids")}
                          </button>
                        </div>
                      );
                    }
                    const state = hydrateComposerItemState(item, orders, selectedSet);
                    return (
                      <div key={item.id} style={{ display: "grid", gap: 4 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", justifyContent: "space-between" }}>
                          <button
                            type="button"
                            data-testid={`ed-admission-suggest-${item.id}`}
                            data-state={state}
                            disabled={locked || state === "ORDERED" || !suggestionIsActivatableCare(item)}
                            onClick={() => toggleSelect(item)}
                            style={{
                              ...edNeutralBtnStyle,
                              flex: 1,
                              textAlign: "left",
                              opacity: state === "ORDERED" ? 0.85 : 1,
                            }}
                          >
                            {labelFor(item)}
                          </button>
                          <span data-testid={`ed-admission-state-${item.id}`} style={chipStyle(state)}>
                            {state === "ORDERED"
                              ? t("edHosp1eAdmissionOrders.stateOrdered")
                              : state === "SELECTED"
                                ? t("edHosp1eAdmissionOrders.stateSelected")
                                : t("edHosp1eAdmissionOrders.stateSuggested")}
                          </span>
                        </div>
                        {item.consultPlanOnly ? (
                          <p style={{ margin: 0, fontSize: 11, color: ED_DISPOSITION_BOARD_COLORS.muted }}>
                            {t("edHosp1eAdmissionOrders.consultPlanHint")}
                          </p>
                        ) : null}
                        {itemErrors[item.id] ? (
                          <p role="status" style={{ margin: 0, fontSize: 11, color: "#9a3412" }}>
                            {itemErrors[item.id]}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      <div data-testid="ed-admission-order-review" style={{ marginTop: 12 }}>
        <p style={edSectionHeadingStyle}>{t("edHosp1eAdmissionOrders.reviewTitle")}</p>
        {selectedCare.length === 0 && pendingDiagnoses.length === 0 && !locSelected ? (
          <p style={{ margin: "6px 0 0", fontSize: 12, color: ED_DISPOSITION_BOARD_COLORS.muted }}>
            {t("edHosp1eAdmissionOrders.reviewEmpty")}
          </p>
        ) : (
          <ul style={{ margin: "8px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
            {locSelected ? (
              <li style={{ fontSize: 12 }}>
                {t("edHosp1eAdmissionOrders.categoryAdmissionLoc")} —{" "}
                {t(`hospitalAdmissionD4a0.level.${locSelected}` as Parameters<typeof t>[0])}
              </li>
            ) : null}
            {pendingDiagnoses.map((row) => (
              <li key={row.icd10CatalogId} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12 }}>
                <span>
                  {t("edHosp1eAdmissionOrders.reviewDiagnosis")} — {row.description} ({row.code})
                </span>
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => setPendingDiagnoses((prev) => prev.filter((d) => d.icd10CatalogId !== row.icd10CatalogId))}
                  style={edNeutralBtnStyle}
                >
                  {t("edHosp1eAdmissionOrders.removeAction")}
                </button>
              </li>
            ))}
            {GRID_CATEGORIES.filter((id) => id !== "admission_loc" && id !== "diagnosis").map((categoryId) =>
              selectedCare
                .filter((item) => item.category === categoryId)
                .map((item) => (
                  <li
                    key={item.id}
                    data-testid={`ed-admission-review-${item.id}`}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 8,
                      alignItems: "center",
                      fontSize: 12,
                    }}
                  >
                    <span>
                      {t(CATEGORY_I18N[item.category])} — {labelFor(item)}
                    </span>
                    <button type="button" disabled={locked} onClick={() => toggleSelect(item)} style={edNeutralBtnStyle}>
                      {t("edHosp1eAdmissionOrders.removeAction")}
                    </button>
                  </li>
                ))
            )}
          </ul>
        )}
      </div>

      <div data-testid="ed-admission-existing-orders" style={{ marginTop: 12 }}>
        <p style={edSectionHeadingStyle}>{t("edHosp1eAdmissionOrders.existingTitle")}</p>
        {ordersLoading && orders.length === 0 ? (
          <p
            role="status"
            data-testid="ed-admission-existing-orders-loading"
            style={{ margin: "6px 0 0", fontSize: 12, color: ED_DISPOSITION_BOARD_COLORS.muted }}
          >
            {t("edHosp1eAdmissionOrders.existingLoading")}
          </p>
        ) : null}
        {loadError ? (
          <div role="alert" data-testid="ed-admission-existing-orders-error" style={{ margin: "6px 0 0", fontSize: 12, color: "#9a3412" }}>
            <p style={{ margin: 0 }}>{loadError}</p>
            <button type="button" data-testid="ed-admission-existing-orders-retry" onClick={() => void loadOrders()} style={{ ...edNeutralBtnStyle, marginTop: 6 }}>
              {t("edHosp1eAdmissionOrders.existingRetry")}
            </button>
          </div>
        ) : null}
        {!ordersLoading && !loadError && orders.length === 0 ? (
          <p style={{ margin: "6px 0 0", fontSize: 12, color: ED_DISPOSITION_BOARD_COLORS.muted }}>
            {t("edHosp1eAdmissionOrders.existingEmpty")}
          </p>
        ) : null}
        {orders.length > 0 ? (
          <div style={{ marginTop: 8, display: "grid", gap: 6, fontSize: 12 }}>
            <ExistingGroup title={t("edHosp1eAdmissionOrders.existingCare")} orders={buckets.care} locale={locale} />
            <ExistingGroup title={t("edHosp1eAdmissionOrders.existingLab")} orders={buckets.lab} locale={locale} />
            <ExistingGroup title={t("edHosp1eAdmissionOrders.existingImaging")} orders={buckets.imaging} locale={locale} />
            <ExistingGroup title={t("edHosp1eAdmissionOrders.existingMedication")} orders={buckets.medication} locale={locale} />
          </div>
        ) : null}
      </div>

      {feedback ? (
        <p
          role="status"
          data-testid="ed-admission-order-feedback"
          data-feedback={feedback.type}
          style={{
            margin: "10px 0 0",
            fontSize: 12,
            color: feedback.type === "ok" ? ED_DISPOSITION_BOARD_COLORS.green : "#9a3412",
          }}
        >
          {feedback.text}
        </p>
      ) : null}

      {!canActivate ? (
        <p style={{ margin: "8px 0 0", fontSize: 12, color: ED_DISPOSITION_BOARD_COLORS.muted }}>
          {t("edHosp1eAdmissionOrders.unauthorized")}
        </p>
      ) : null}

      <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button
          type="button"
          data-testid="ed-admission-activate-orders"
          disabled={locked || !canActivate || activating || !canActivateNow}
          onClick={() => void activateSelected()}
          style={edPrimaryBtnStyle}
        >
          {activating ? t("edHosp1eAdmissionOrders.activating") : t("edHosp1eAdmissionOrders.activate")}
        </button>
      </div>

      {modalTab ? (
        <CreateOrderModal
          key={modalTab}
          encounterId={encounterId}
          facilityId={facilityId}
          canPrescribe={canPrescribe}
          canUseRnOrderAuthority={roles.includes("RN") && !canPrescribe}
          isRn={roles.includes("RN")}
          encounter={
            encounter?.patient
              ? {
                  status: encounter.status ?? undefined,
                  patient: {
                    firstName: encounter.patient.firstName ?? undefined,
                    lastName: encounter.patient.lastName ?? undefined,
                    mrn: encounter.patient.mrn ?? undefined,
                  },
                }
              : undefined
          }
          initialOrderTab={modalTab}
          medicationOrderMode={inpatientFacilityMedicationOrderMode()}
          onClose={() => setModalTab(null)}
          onSuccess={async () => {
            setModalTab(null);
            await loadOrders();
            await onOrdersChanged?.();
          }}
        />
      ) : null}
    </section>
  );
}

function ctxValue(value: string | null | undefined, t: (key: string) => string): string {
  const trimmed = (value ?? "").trim();
  return trimmed || t("edHosp1eAdmissionOrders.contextMissing");
}

function ContextRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, minWidth: 0 }}>
      <span style={{ color: ED_DISPOSITION_BOARD_COLORS.muted }}>{label}</span>
      <span style={{ fontWeight: 600, textAlign: "right", overflowWrap: "anywhere", minWidth: 0 }}>{value}</span>
    </div>
  );
}

function ExistingGroup({
  title,
  orders,
  locale,
}: {
  title: string;
  orders: EdHosp1dExistingOrderLite[];
  locale: SupportedLanguage
}) {
  if (orders.length === 0) return null;
  return (
    <div>
      <p style={{ margin: 0, fontWeight: 700 }}>{title}</p>
      <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
        {orders.map((order, idx) => (
          <li key={order.id ?? `${title}-${idx}`}>{existingOrderDisplayLabel(order, locale)}</li>
        ))}
      </ul>
    </div>
  );
}
