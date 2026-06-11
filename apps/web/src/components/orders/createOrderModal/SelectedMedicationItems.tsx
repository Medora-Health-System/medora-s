"use client";

import React, { useId } from "react";
import { useI18n } from "@/lib/i18n";
import { highRiskMedicationWarning } from "@/lib/highRiskMedication";
import {
  MedicationSoftSafetyPanel,
  medicationSoftSafetyWarningsForOrderLine,
} from "@/components/medication/MedicationSoftSafetyPanel";
import { normalizeMedicationDisplayForLocale } from "@/lib/localizedMedicationDisplay";
import { medicationDirectionQuickPicksForRoute } from "./createOrderMedicationDraft";
import type { CreateOrderLineItem } from "./types";

const labelSm: React.CSSProperties = {
  fontSize: 11,
  color: "#555",
  display: "block",
  marginBottom: 2,
  fontWeight: 500,
};

const inputSm: React.CSSProperties = {
  width: "100%",
  padding: "6px 8px",
  border: "1px solid #ccc",
  borderRadius: 4,
  fontSize: 13,
  boxSizing: "border-box",
};

const inlineWarningStyle: React.CSSProperties = {
  margin: "6px 0 0",
  fontSize: 12,
  color: "#b45309",
  lineHeight: 1.35,
};

const safetyBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  padding: "2px 7px",
  marginRight: 6,
  marginTop: 6,
  fontSize: 11,
  fontWeight: 700,
  backgroundColor: "#fff7ed",
  color: "#9a3412",
  border: "1px solid #fed7aa",
};

const confirmationStyle: React.CSSProperties = {
  display: "block",
  marginTop: 8,
  fontSize: 12,
  color: "#334155",
  lineHeight: 1.35,
};

export function SelectedMedicationItems({
  items,
  onPatch,
  onRemove,
  medicationOrderMode = "DEFAULT",
  ivRouteConfirmations,
  erQuantityConfirmations,
  onIvRouteConfirmationChange,
  onErQuantityConfirmationChange,
}: {
  items: CreateOrderLineItem[];
  onPatch: (index: number, patch: Partial<CreateOrderLineItem>) => void;
  onRemove: (index: number) => void;
  medicationOrderMode?: "DEFAULT" | "ER_ADMINISTER_ONLY";
  ivRouteConfirmations?: Record<string, boolean>;
  erQuantityConfirmations?: Record<string, boolean>;
  onIvRouteConfirmationChange?: (lineId: string, confirmed: boolean) => void;
  onErQuantityConfirmationChange?: (lineId: string, confirmed: boolean) => void;
}) {
  const { t, language } = useI18n();
  const directionsListIdPrefix = useId();
  const erAdministerOnly = medicationOrderMode === "ER_ADMINISTER_ONLY";

  if (items.length === 0) return null;

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#666", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {t("createOrderModal.selectedRxHeading")}
      </div>
      <ul style={{ listStyle: "none", margin: "8px 0 0", padding: 0 }}>
        {items.map((item, idx) => {
          const missingDirections = !item.notes?.trim();
          const needsIvConfirmation = item.route === "IVP" || item.route === "IVPB";
          const needsErQuantityConfirmation = erAdministerOnly && (item.quantity ?? 0) > 1;
          const lineDirectionsListId = `${directionsListIdPrefix}-${item._lineId}`;
          const directionQuickPicks = medicationDirectionQuickPicksForRoute(item.route);
          const highRiskWarning = highRiskMedicationWarning(item, t);
          const scheduleLabel = item._controlledSchedule?.trim()
            ? `${t("createOrderModal.controlledScheduleBadge")} ${item._controlledSchedule.trim()}`
            : null;
          return (
            <li
              key={item._lineId}
              style={{
                padding: "10px 0 12px",
                borderBottom: "1px solid #eee",
              }}
            >
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>
              {item._label}
              {item.isManual && (
                <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, color: "#1565c0" }}>
                  {t("createOrderModal.selectedManualBadge")}
                </span>
              )}
              {highRiskWarning ? (
                <p style={{ ...inlineWarningStyle, marginBottom: 0 }}>{highRiskWarning}</p>
              ) : null}
              {item._isControlled ? (
                <div style={{ marginTop: 2 }}>
                  <span style={safetyBadgeStyle}>{t("createOrderModal.controlledMedicationBadge")}</span>
                  {scheduleLabel ? <span style={safetyBadgeStyle}>{scheduleLabel}</span> : null}
                  {item._requiresDoubleSign ? (
                    <span style={safetyBadgeStyle}>{t("createOrderModal.controlledDoubleSignBadge")}</span>
                  ) : null}
                  {item._requiresWitness ? (
                    <span style={safetyBadgeStyle}>{t("createOrderModal.controlledWitnessBadge")}</span>
                  ) : null}
                  <p style={{ ...inlineWarningStyle, marginBottom: 0 }}>
                    {t("createOrderModal.controlledMedicationWarning")}
                  </p>
                </div>
              ) : null}
              <MedicationSoftSafetyPanel
                warnings={medicationSoftSafetyWarningsForOrderLine(item, items)}
                therapeuticClass={item._safetyCatalog?.therapeuticClass}
              />
            </div>
            {erAdministerOnly ? (
              <div style={{ marginBottom: 10, fontSize: 13, color: "#475569" }}>
                <span style={{ marginRight: 12, fontWeight: 500 }}>{t("createOrderModal.selectedMedDestination")}</span>
                {t("createOrderModal.selectedMedIntentAdminister")}
              </div>
            ) : (
              <div style={{ marginBottom: 10, fontSize: 13 }}>
                <span style={{ marginRight: 12, fontWeight: 500 }}>{t("createOrderModal.selectedMedDestination")}</span>
                <label style={{ marginRight: 12, cursor: "pointer" }}>
                  <input
                    type="radio"
                    name={`intent-${idx}`}
                    checked={(item.medicationFulfillmentIntent ?? "PHARMACY_DISPENSE") === "ADMINISTER_CHART"}
                    onChange={() => onPatch(idx, { medicationFulfillmentIntent: "ADMINISTER_CHART" })}
                  />{" "}
                  {t("createOrderModal.selectedMedIntentAdminister")}
                </label>
                <label style={{ cursor: "pointer" }}>
                  <input
                    type="radio"
                    name={`intent-${idx}`}
                    checked={(item.medicationFulfillmentIntent ?? "PHARMACY_DISPENSE") === "PHARMACY_DISPENSE"}
                    onChange={() => onPatch(idx, { medicationFulfillmentIntent: "PHARMACY_DISPENSE" })}
                  />{" "}
                  {t("createOrderModal.selectedMedIntentPharmacy")}
                </label>
              </div>
            )}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "8px 12px",
                marginBottom: 8,
              }}
            >
              <div>
                <span style={labelSm}>{t("createOrderModal.selectedMedDosage")}</span>
                <input
                  type="text"
                  placeholder={t("createOrderModal.selectedMedStrengthPlaceholder")}
                  value={item.strength ?? ""}
                  onChange={(e) => onPatch(idx, { strength: e.target.value })}
                  style={inputSm}
                />
              </div>
              {!item.isManual && (
                <div>
                  <span style={labelSm}>{t("createOrderModal.selectedMedDosageForm")}</span>
                  <input
                    type="text"
                    readOnly
                    value={normalizeMedicationDisplayForLocale(item._dosageForm, language)}
                    placeholder="—"
                    style={{ ...inputSm, backgroundColor: "#f7f7f7", color: "#444" }}
                  />
                </div>
              )}
              {!item.isManual && item._safetyCatalog?.therapeuticClass?.trim() ? (
                <div>
                  <span style={labelSm}>{t("createOrderModal.selectedMedTherapeuticClass")}</span>
                  <input
                    type="text"
                    readOnly
                    value={normalizeMedicationDisplayForLocale(item._safetyCatalog.therapeuticClass, language)}
                    placeholder="—"
                    style={{ ...inputSm, backgroundColor: "#f7f7f7", color: "#444" }}
                  />
                </div>
              ) : null}
              <div>
                <span style={labelSm}>{t("createOrderModal.selectedMedRoute")}</span>
                <select
                  value={item.route ?? ""}
                  onChange={(e) =>
                    onPatch(idx, {
                      route: e.target.value ? (e.target.value as CreateOrderLineItem["route"]) : undefined,
                    })
                  }
                  style={inputSm}
                >
                  <option value="">{t("common.dash")}</option>
                  <option value="PO">PO</option>
                  <option value="IM">IM</option>
                  <option value="IVP">IVP</option>
                  <option value="IVPB">IVPB</option>
                  <option value="SQ">SQ</option>
                </select>
                {item._route?.trim() ? (
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                    {t("createOrderModal.selectedMedCatalogRoute")}:{" "}
                    {normalizeMedicationDisplayForLocale(item._route, language)}
                  </div>
                ) : null}
              </div>
              <div>
                <span style={labelSm}>{t("createOrderModal.selectedMedSig")}</span>
                <input
                  type="text"
                  list={lineDirectionsListId}
                  placeholder={t("createOrderModal.selectedMedSigPlaceholder")}
                  value={item.notes ?? ""}
                  onChange={(e) => onPatch(idx, { notes: e.target.value })}
                  style={inputSm}
                />
                <datalist id={lineDirectionsListId}>
                  {directionQuickPicks.map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
                {missingDirections ? (
                  <p style={{ ...inlineWarningStyle, color: "#dc2626", fontWeight: 600 }}>
                    {t("orders.medicationDirectionsRequired")}
                  </p>
                ) : null}
              </div>
              <div>
                <span style={labelSm}>{t("createOrderModal.selectedMedQty")}</span>
                <input
                  type="number"
                  min={1}
                  value={item.quantity ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    onPatch(idx, { quantity: v ? parseInt(v, 10) : undefined });
                  }}
                  style={inputSm}
                />
              </div>
              <div>
                <span style={labelSm}>{t("createOrderModal.selectedMedRefills")}</span>
                <input
                  type="number"
                  min={0}
                  max={99}
                  value={item.refillCount ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    onPatch(idx, {
                      refillCount: v === "" ? undefined : Math.max(0, parseInt(v, 10) || 0),
                    });
                  }}
                  style={inputSm}
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <span style={labelSm}>{t("createOrderModal.selectedMedPlannedAdmin")}</span>
                <input
                  type="datetime-local"
                  value={item.intendedAdministrationAt ?? ""}
                  onChange={(e) =>
                    onPatch(idx, {
                      intendedAdministrationAt: e.target.value ? e.target.value : undefined,
                    })
                  }
                  style={inputSm}
                />
              </div>
            </div>
            {needsIvConfirmation ? (
              <label style={confirmationStyle}>
                <input
                  type="checkbox"
                  checked={ivRouteConfirmations?.[item._lineId] === true}
                  onChange={(e) => onIvRouteConfirmationChange?.(item._lineId, e.target.checked)}
                />{" "}
                {t("createOrderModal.confirmIvAdministration")}
              </label>
            ) : null}
            {needsIvConfirmation && ivRouteConfirmations?.[item._lineId] !== true ? (
              <p style={inlineWarningStyle}>{t("createOrderModal.errIvConfirmationRequired")}</p>
            ) : null}
            {needsErQuantityConfirmation ? (
              <label style={confirmationStyle}>
                <input
                  type="checkbox"
                  checked={erQuantityConfirmations?.[item._lineId] === true}
                  onChange={(e) => onErQuantityConfirmationChange?.(item._lineId, e.target.checked)}
                />{" "}
                {t("createOrderModal.confirmErQuantityOverride")}
              </label>
            ) : null}
            {needsErQuantityConfirmation && erQuantityConfirmations?.[item._lineId] !== true ? (
              <p style={inlineWarningStyle}>{t("createOrderModal.errErQuantityConfirmationRequired")}</p>
            ) : null}
            <button
              type="button"
              onClick={() => onRemove(idx)}
              style={{
                fontSize: 12,
                color: "#b00020",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              {t("createOrderModal.selectedRowRemove")}
            </button>
          </li>
          );
        })}
      </ul>
    </div>
  );
}
