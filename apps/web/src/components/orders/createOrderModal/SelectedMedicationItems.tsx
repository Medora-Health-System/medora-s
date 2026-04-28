"use client";

import React from "react";
import { useI18n } from "@/lib/i18n";
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

export function SelectedMedicationItems({
  items,
  onPatch,
  onRemove,
  medicationOrderMode = "DEFAULT",
}: {
  items: CreateOrderLineItem[];
  onPatch: (index: number, patch: Partial<CreateOrderLineItem>) => void;
  onRemove: (index: number) => void;
  medicationOrderMode?: "DEFAULT" | "ER_ADMINISTER_ONLY";
}) {
  const { t } = useI18n();
  const erAdministerOnly = medicationOrderMode === "ER_ADMINISTER_ONLY";

  if (items.length === 0) return null;

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#666", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {t("createOrderModal.selectedRxHeading")}
      </div>
      <ul style={{ listStyle: "none", margin: "8px 0 0", padding: 0 }}>
        {items.map((item, idx) => (
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
                <>
                  <div>
                    <span style={labelSm}>{t("createOrderModal.selectedMedDosageForm")}</span>
                    <input
                      type="text"
                      readOnly
                      value={item._dosageForm ?? ""}
                      placeholder="—"
                      style={{ ...inputSm, backgroundColor: "#f7f7f7", color: "#444" }}
                    />
                  </div>
                  <div>
                    <span style={labelSm}>{t("createOrderModal.selectedMedRoute")}</span>
                    <input
                      type="text"
                      readOnly
                      value={item._route ?? ""}
                      placeholder="—"
                      style={{ ...inputSm, backgroundColor: "#f7f7f7", color: "#444" }}
                    />
                  </div>
                </>
              )}
              <div>
                <span style={labelSm}>{t("createOrderModal.selectedMedSig")}</span>
                <input
                  type="text"
                  placeholder={t("createOrderModal.selectedMedSigPlaceholder")}
                  value={item.notes ?? ""}
                  onChange={(e) => onPatch(idx, { notes: e.target.value })}
                  style={inputSm}
                />
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
        ))}
      </ul>
    </div>
  );
}
