"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ED_HOSP_1D_CATEGORY_IDS,
  ED_HOSP_1D_COMPOSER_SUGGESTIONS,
  canActivateObservationComposerOrders,
  customCareSuggestion,
  existingOrderDisplayLabel,
  hydrateComposerItemState,
  hydrateLabImagingMedicationOrders,
  parseEncounterOrdersForComposer,
  planComposerCareOrderCreates,
  summarizeComposerCreateResults,
  suggestionIsActivatableCare,
  type EdHosp1dComposerCategoryId,
  type EdHosp1dComposerSuggestion,
  type EdHosp1dExistingOrderLite,
  type EdHosp1dOrderModalTab,
} from "@medora/shared";
import { CreateOrderModal } from "@/components/orders";
import { apiFetch } from "@/lib/apiClient";
import { mapOrderCreateApiError } from "@/components/orders/createOrderModal/mapOrderCreateApiError";
import { invalidateGetRequestDedupeForPath } from "@/lib/getRequestDedupe";
import { useI18n } from "@/lib/i18n";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import {
  ED_DISPOSITION_BOARD_COLORS,
  edBadgeCompleteStyle,
  edBadgePendingStyle,
  edBoardSectionStyle,
  edNeutralBtnStyle,
  edPrimaryBtnStyle,
  edSectionHeadingStyle,
} from "./edDispositionBoardStyles";

const CATEGORY_I18N: Record<EdHosp1dComposerCategoryId, string> = {
  status_service: "edHosp1dObservationOrders.categoryStatus",
  monitoring: "edHosp1dObservationOrders.categoryMonitoring",
  vitals_nursing: "edHosp1dObservationOrders.categoryVitals",
  activity: "edHosp1dObservationOrders.categoryActivity",
  diet: "edHosp1dObservationOrders.categoryDiet",
  iv_fluids: "edHosp1dObservationOrders.categoryIv",
  respiratory: "edHosp1dObservationOrders.categoryRespiratory",
  medications: "edHosp1dObservationOrders.categoryMedications",
  laboratory: "edHosp1dObservationOrders.categoryLaboratory",
  imaging: "edHosp1dObservationOrders.categoryImaging",
  reassessment: "edHosp1dObservationOrders.categoryReassessment",
  consults: "edHosp1dObservationOrders.categoryConsults",
  nursing_instructions: "edHosp1dObservationOrders.categoryNursing",
  observation_plan: "edHosp1dObservationOrders.categoryPlan",
};

const CUSTOM_CATEGORY: Partial<Record<EdHosp1dComposerCategoryId, string>> = {
  nursing_instructions: "edHosp1dObservationOrders.customNursing",
  diet: "edHosp1dObservationOrders.customDiet",
  activity: "edHosp1dObservationOrders.customActivity",
  reassessment: "edHosp1dObservationOrders.customReassessment",
};

const DEFAULT_OPEN = new Set<EdHosp1dComposerCategoryId>([
  "monitoring",
  "vitals_nursing",
  "diet",
]);

export type EdObservationOrderComposerContext = {
  placementStatus?: string | null;
  requestedService?: string | null;
  reason?: string | null;
  diagnosis?: string | null;
  telemetryRequired?: boolean;
  isolationRequired?: boolean;
  clinicalPriority?: string | null;
  acceptingProvider?: string | null;
  initialPlan?: string | null;
};

export function EdObservationOrderComposer({
  encounterId,
  facilityId,
  canPrescribe,
  disabled,
  encounterOpen = true,
  prescriberName,
  encounter,
  context,
  onOrdersChanged,
}: {
  encounterId: string;
  facilityId: string;
  canPrescribe: boolean;
  disabled?: boolean;
  encounterOpen?: boolean;
  prescriberName: string;
  encounter?: {
    status?: string | null;
    patient?: { firstName?: string | null; lastName?: string | null; mrn?: string | null } | null;
  };
  context?: EdObservationOrderComposerContext;
  onOrdersChanged?: () => void | Promise<void>;
}) {
  const { t, language } = useI18n();
  const { roles } = useFacilityAndRoles();
  const locale = language === "en" ? "en" : "fr";
  const canActivate = canActivateObservationComposerOrders({ canPrescribe, encounterOpen });
  const locked = Boolean(disabled) || !encounterOpen;

  const [orders, setOrders] = useState<EdHosp1dExistingOrderLite[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [extraSuggestions, setExtraSuggestions] = useState<EdHosp1dComposerSuggestion[]>([]);
  const [openCategories, setOpenCategories] = useState<Set<EdHosp1dComposerCategoryId>>(DEFAULT_OPEN);
  const [customDrafts, setCustomDrafts] = useState<Partial<Record<EdHosp1dComposerCategoryId, string>>>({});
  const [activating, setActivating] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err" | "warn"; text: string } | null>(null);
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({});
  const [modalTab, setModalTab] = useState<EdHosp1dOrderModalTab | null>(null);
  const inFlightRef = useRef<Set<string>>(new Set());
  const activatingLock = useRef(false);

  const catalog = useMemo(
    () => [...ED_HOSP_1D_COMPOSER_SUGGESTIONS, ...extraSuggestions],
    [extraSuggestions]
  );

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      invalidateGetRequestDedupeForPath(`/encounters/${encounterId}/orders`, facilityId);
      const raw = await apiFetch(`/encounters/${encounterId}/orders`, { facilityId });
      setOrders(parseEncounterOrdersForComposer(raw));
      setLoadError(null);
    } catch {
      setLoadError(t("edHosp1dObservationOrders.loadError"));
    } finally {
      setOrdersLoading(false);
    }
  }, [encounterId, facilityId, t]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const buckets = useMemo(() => hydrateLabImagingMedicationOrders(orders), [orders]);

  const labelFor = (item: EdHosp1dComposerSuggestion) =>
    locale === "en" ? item.labelEn : item.labelFr;

  const ctxValue = (value: string | null | undefined) =>
    value?.trim() ? value.trim() : t("edHosp1dObservationOrders.contextMissing");

  function toggleCategory(id: EdHosp1dComposerCategoryId) {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelect(item: EdHosp1dComposerSuggestion) {
    if (locked || !suggestionIsActivatableCare(item)) return;
    if (hydrateComposerItemState(item, orders, selectedSet) === "ORDERED") return;
    setSelectedIds((prev) =>
      prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id]
    );
    setItemErrors((prev) => {
      if (!prev[item.id]) return prev;
      const next = { ...prev };
      delete next[item.id];
      return next;
    });
  }

  function addCustom(category: EdHosp1dComposerCategoryId) {
    const created = customCareSuggestion({
      category,
      text: customDrafts[category] ?? "",
    });
    if (!created) return;
    setExtraSuggestions((prev) => (prev.some((row) => row.id === created.id) ? prev : [...prev, created]));
    setSelectedIds((prev) => (prev.includes(created.id) ? prev : [...prev, created.id]));
    setCustomDrafts((prev) => ({ ...prev, [category]: "" }));
  }

  const selectedCare = catalog.filter(
    (item) => selectedSet.has(item.id) && suggestionIsActivatableCare(item)
  );

  async function activateSelected() {
    if (activatingLock.current || !canActivate || locked) return;
    const planned = planComposerCareOrderCreates({
      selectedIds,
      extraSuggestions,
      orders,
      inFlightIds: inFlightRef.current,
      prescriberName,
      locale,
    });
    const toCreate = planned.filter((row) => row.dto);
    if (toCreate.length === 0) {
      setFeedback({ type: "warn", text: t("edHosp1dObservationOrders.noneToCreate") });
      return;
    }
    activatingLock.current = true;
    setActivating(true);
    setFeedback(null);
    const results: Array<{ suggestionId: string; ok: boolean; orderId?: string; error?: string; skipped?: boolean }> =
      [];
    for (const row of planned) {
      if (row.skippedBecauseOrdered || row.skippedBecauseInFlight) {
        results.push({ suggestionId: row.suggestionId, ok: true, skipped: true });
        continue;
      }
      if (!row.dto) {
        results.push({ suggestionId: row.suggestionId, ok: false, error: t("edHosp1dObservationOrders.createError") });
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
    if (summary.partialFailure) {
      setFeedback({ type: "err", text: t("edHosp1dObservationOrders.partialFailure") });
    } else if (summary.allSucceeded) {
      setFeedback({ type: "ok", text: t("edHosp1dObservationOrders.allCreated") });
    } else if (summary.failed > 0) {
      setFeedback({ type: "err", text: t("edHosp1dObservationOrders.createError") });
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

  return (
    <section
      data-testid="ed-observation-order-composer"
      data-ed-hosp-1d="observation-orders"
      style={{ ...edBoardSectionStyle, marginTop: 12 }}
    >
      <p style={edSectionHeadingStyle}>{t("edHosp1dObservationOrders.title")}</p>
      <p style={{ margin: "4px 0 0", fontSize: 12, color: ED_DISPOSITION_BOARD_COLORS.muted, lineHeight: 1.4 }}>
        {t("edHosp1dObservationOrders.subtitle")}
      </p>

      <div
        data-testid="ed-observation-order-context"
        className="ed-observation-order-context"
        style={{
          marginTop: 10,
          display: "grid",
          gap: 6,
          fontSize: 12,
        }}
      >
        <ContextRow label={t("edHosp1dObservationOrders.contextStatus")} value={ctxValue(context?.placementStatus)} />
        <ContextRow label={t("edHosp1dObservationOrders.contextService")} value={ctxValue(context?.requestedService)} />
        <ContextRow label={t("edHosp1dObservationOrders.contextReason")} value={ctxValue(context?.reason)} />
        <ContextRow label={t("edHosp1dObservationOrders.contextDiagnosis")} value={ctxValue(context?.diagnosis)} />
        <ContextRow
          label={t("edHosp1dObservationOrders.contextTelemetry")}
          value={
            context?.telemetryRequired
              ? t("edHosp1dObservationOrders.contextTelemetryYes")
              : t("edHosp1dObservationOrders.contextTelemetryNo")
          }
        />
        <ContextRow
          label={t("edHosp1dObservationOrders.contextIsolation")}
          value={context?.isolationRequired ? t("edHosp1dObservationOrders.yes") : t("edHosp1dObservationOrders.no")}
        />
        <ContextRow label={t("edHosp1dObservationOrders.contextPriority")} value={ctxValue(context?.clinicalPriority)} />
        <ContextRow label={t("edHosp1dObservationOrders.contextAccepting")} value={ctxValue(context?.acceptingProvider)} />
      </div>
      <p style={{ margin: "6px 0 0", fontSize: 11, color: ED_DISPOSITION_BOARD_COLORS.muted }}>
        {t("edHosp1dObservationOrders.contextTelemetryHint")}
      </p>
      <p style={{ margin: "8px 0 0", fontSize: 12, color: ED_DISPOSITION_BOARD_COLORS.label }}>
        <strong>{t("edHosp1dObservationOrders.contextPlan")}: </strong>
        {ctxValue(context?.initialPlan)}
      </p>
      <p style={{ margin: "4px 0 0", fontSize: 11, color: ED_DISPOSITION_BOARD_COLORS.muted }}>
        {t("edHosp1dObservationOrders.planReuseHint")}
      </p>

      {loadError ? (
        <p role="status" data-testid="ed-observation-orders-load-error" style={{ margin: "8px 0 0", fontSize: 12, color: "#9a3412" }}>
          {loadError}
        </p>
      ) : null}

      <div className="ed-observation-order-grid" data-testid="ed-observation-order-categories" style={{ marginTop: 12 }}>
        {ED_HOSP_1D_CATEGORY_IDS.filter((id) => id !== "status_service" && id !== "observation_plan").map((categoryId) => {
          const items = catalog.filter((item) => item.category === categoryId);
          const open = openCategories.has(categoryId);
          const selectedCount = items.filter((item) => selectedSet.has(item.id)).length;
          const orderedCount = items.filter(
            (item) => hydrateComposerItemState(item, orders, selectedSet) === "ORDERED"
          ).length;
          return (
            <article
              key={categoryId}
              data-testid={`ed-observation-order-category-${categoryId}`}
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
                  {orderedCount}/{items.filter(suggestionIsActivatableCare).length || items.length}{" "}
                  {open ? t("edHosp1dObservationOrders.collapse") : t("edHosp1dObservationOrders.expand")}
                </span>
              </button>
              {open ? (
                <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                  {items.map((item) => {
                    if (item.kind === "OPEN_ORDER_MODAL") {
                      return (
                        <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                          <span style={{ fontSize: 12, minWidth: 0 }}>{labelFor(item)}</span>
                          <button
                            type="button"
                            data-testid={`ed-observation-open-modal-${item.id}`}
                            disabled={locked || !canActivate}
                            onClick={() => item.opensOrderTab && setModalTab(item.opensOrderTab)}
                            style={edNeutralBtnStyle}
                          >
                            {item.opensOrderTab === "MEDICATION" && item.category === "medications"
                              ? t("edHosp1dObservationOrders.addMedication")
                              : item.opensOrderTab === "LAB"
                                ? t("edHosp1dObservationOrders.addLab")
                                : item.opensOrderTab === "IMAGING"
                                  ? t("edHosp1dObservationOrders.addImaging")
                                  : item.opensOrderTab === "CARE"
                                    ? t("edHosp1dObservationOrders.addOxygen")
                                    : t("edHosp1dObservationOrders.addIvFluids")}
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
                            data-testid={`ed-observation-suggest-${item.id}`}
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
                          <span data-testid={`ed-observation-state-${item.id}`} style={chipStyle(state)}>
                            {state === "ORDERED"
                              ? t("edHosp1dObservationOrders.stateOrdered")
                              : state === "SELECTED"
                                ? t("edHosp1dObservationOrders.stateSelected")
                                : t("edHosp1dObservationOrders.stateSuggested")}
                          </span>
                        </div>
                        {item.consultPlanOnly ? (
                          <p style={{ margin: 0, fontSize: 11, color: ED_DISPOSITION_BOARD_COLORS.muted }}>
                            {t("edHosp1dObservationOrders.consultPlanHint")}
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
                  {CUSTOM_CATEGORY[categoryId] ? (
                    <div style={{ display: "grid", gap: 6 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: ED_DISPOSITION_BOARD_COLORS.label }}>
                        {t(CUSTOM_CATEGORY[categoryId]!)}
                      </label>
                      <textarea
                        value={customDrafts[categoryId] ?? ""}
                        disabled={locked}
                        data-testid={`ed-observation-custom-${categoryId}`}
                        onChange={(e) =>
                          setCustomDrafts((prev) => ({ ...prev, [categoryId]: e.target.value }))
                        }
                        placeholder={t("edHosp1dObservationOrders.customPlaceholder")}
                        rows={2}
                        style={{
                          width: "100%",
                          minWidth: 0,
                          borderRadius: 10,
                          border: `1px solid ${ED_DISPOSITION_BOARD_COLORS.border}`,
                          padding: 8,
                          fontSize: 13,
                          resize: "vertical",
                        }}
                      />
                      <button
                        type="button"
                        disabled={locked || !(customDrafts[categoryId] ?? "").trim()}
                        onClick={() => addCustom(categoryId)}
                        style={edNeutralBtnStyle}
                      >
                        {t("edHosp1dObservationOrders.customAdd")}
                      </button>
                    </div>
                  ) : null}
                  {selectedCount > 0 ? (
                    <p style={{ margin: 0, fontSize: 11, color: ED_DISPOSITION_BOARD_COLORS.muted }}>
                      {selectedCount} {t("edHosp1dObservationOrders.stateSelected")}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      <div data-testid="ed-observation-order-review" style={{ marginTop: 12 }}>
        <p style={edSectionHeadingStyle}>{t("edHosp1dObservationOrders.reviewTitle")}</p>
        {selectedCare.length === 0 ? (
          <p style={{ margin: "6px 0 0", fontSize: 12, color: ED_DISPOSITION_BOARD_COLORS.muted }}>
            {t("edHosp1dObservationOrders.reviewEmpty")}
          </p>
        ) : (
          <ul style={{ margin: "8px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
            {selectedCare.map((item) => (
              <li
                key={item.id}
                data-testid={`ed-observation-review-${item.id}`}
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
                  {t("edHosp1dObservationOrders.removeAction")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div data-testid="ed-observation-existing-orders" style={{ marginTop: 12 }}>
        <p style={edSectionHeadingStyle}>{t("edHosp1dObservationOrders.existingTitle")}</p>
        {ordersLoading && orders.length === 0 ? (
          <p
            role="status"
            data-testid="ed-observation-existing-orders-loading"
            style={{ margin: "6px 0 0", fontSize: 12, color: ED_DISPOSITION_BOARD_COLORS.muted }}
          >
            {t("edHosp1dObservationOrders.existingLoading")}
          </p>
        ) : null}
        {loadError ? (
          <div
            role="alert"
            data-testid="ed-observation-existing-orders-error"
            style={{ margin: "6px 0 0", fontSize: 12, color: "#9a3412" }}
          >
            <p style={{ margin: 0 }}>{loadError}</p>
            <button
              type="button"
              data-testid="ed-observation-existing-orders-retry"
              onClick={() => void loadOrders()}
              style={{ ...edNeutralBtnStyle, marginTop: 6 }}
            >
              {t("edHosp1dObservationOrders.existingRetry")}
            </button>
          </div>
        ) : null}
        {!ordersLoading && !loadError && orders.length === 0 ? (
          <p style={{ margin: "6px 0 0", fontSize: 12, color: ED_DISPOSITION_BOARD_COLORS.muted }}>
            {t("edHosp1dObservationOrders.existingEmpty")}
          </p>
        ) : null}
        {orders.length > 0 ? (
          <div style={{ marginTop: 8, display: "grid", gap: 6, fontSize: 12 }}>
            <ExistingGroup
              title={t("edHosp1dObservationOrders.existingCare")}
              orders={buckets.care}
              locale={locale}
            />
            <ExistingGroup
              title={t("edHosp1dObservationOrders.existingLab")}
              orders={buckets.lab}
              locale={locale}
            />
            <ExistingGroup
              title={t("edHosp1dObservationOrders.existingImaging")}
              orders={buckets.imaging}
              locale={locale}
            />
            <ExistingGroup
              title={t("edHosp1dObservationOrders.existingMedication")}
              orders={buckets.medication}
              locale={locale}
            />
          </div>
        ) : null}
      </div>

      {feedback ? (
        <p
          role="status"
          data-testid="ed-observation-order-feedback"
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
          {t("edHosp1dObservationOrders.unauthorized")}
        </p>
      ) : null}

      <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button
          type="button"
          data-testid="ed-observation-activate-orders"
          disabled={locked || !canActivate || activating || selectedCare.length === 0}
          onClick={() => void activateSelected()}
          style={edPrimaryBtnStyle}
        >
          {activating ? t("edHosp1dObservationOrders.activating") : t("edHosp1dObservationOrders.activate")}
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
          medicationOrderMode="ER_ADMINISTER_ONLY"
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
  locale: "en" | "fr";
}) {
  if (orders.length === 0) return null;
  return (
    <div>
      <strong>{title}</strong>
      <ul style={{ margin: "4px 0 0", paddingLeft: 16 }}>
        {orders.map((order, idx) => (
          <li key={order.id ?? `${title}-${idx}`}>{existingOrderDisplayLabel(order, locale)}</li>
        ))}
      </ul>
    </div>
  );
}
