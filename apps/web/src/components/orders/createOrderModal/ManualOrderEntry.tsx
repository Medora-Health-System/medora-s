"use client";

import React, { useState } from "react";
import { useI18n } from "@/lib/i18n";
import type { CreateOrderLineItem, OrderModalTab } from "./types";
import { newOrderLineId } from "./types";

const btnOutline: React.CSSProperties = {
  padding: "8px 12px",
  fontSize: 13,
  fontWeight: 600,
  border: "1px solid #1565c0",
  color: "#1565c0",
  background: "#fff",
  borderRadius: 6,
  cursor: "pointer",
  width: "100%",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  marginBottom: 4,
  color: "#333",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid #ccc",
  borderRadius: 4,
  fontSize: 14,
  boxSizing: "border-box",
};

/**
 * Manual entry when the catalog item is missing (offline / Haiti catalog gaps).
 */
export function ManualOrderEntry({
  tab,
  onAdd,
  medicationOrderMode = "DEFAULT",
}: {
  tab: OrderModalTab;
  onAdd: (line: CreateOrderLineItem) => void;
  medicationOrderMode?: "DEFAULT" | "ER_ADMINISTER_ONLY" | "OUTPATIENT_RX_ONLY";
}) {
  const { t } = useI18n();
  const outpatientRxOnly = medicationOrderMode === "OUTPATIENT_RX_ONLY";
  const [open, setOpen] = useState(false);
  const [labLabel, setLabLabel] = useState("");
  const [labNotes, setLabNotes] = useState("");
  const [imgLabel, setImgLabel] = useState("");
  const [imgRegion, setImgRegion] = useState("");
  const [imgNotes, setImgNotes] = useState("");
  const [medName, setMedName] = useState("");
  const [medDosage, setMedDosage] = useState("");
  const [medPoso, setMedPoso] = useState("");
  const [medQty, setMedQty] = useState(30);
  const [medIntent, setMedIntent] = useState<"ADMINISTER_CHART" | "PHARMACY_DISPENSE">(
    outpatientRxOnly ? "PHARMACY_DISPENSE" : "PHARMACY_DISPENSE"
  );

  const addLab = () => {
    const label = labLabel.trim();
    if (!label) return;
    onAdd({
      _lineId: newOrderLineId(),
      isManual: true,
      catalogItemType: "LAB_TEST",
      manualLabel: label,
      notes: labNotes.trim() || undefined,
      _label: label,
    });
    setLabLabel("");
    setLabNotes("");
    setOpen(false);
  };

  const addImg = () => {
    const label = imgLabel.trim();
    if (!label) return;
    const reg = imgRegion.trim();
    const ind = imgNotes.trim();
    onAdd({
      _lineId: newOrderLineId(),
      isManual: true,
      catalogItemType: "IMAGING_STUDY",
      manualLabel: label,
      manualSecondaryText: reg || undefined,
      notes: ind || undefined,
      _label: label,
      _modality: undefined,
      _bodyRegion: reg || undefined,
    });
    setImgLabel("");
    setImgRegion("");
    setImgNotes("");
    setOpen(false);
  };

  const addMed = () => {
    const name = medName.trim();
    if (!name) return;
    if (!medQty || medQty < 1) return;
    onAdd({
      _lineId: newOrderLineId(),
      isManual: true,
      catalogItemType: "MEDICATION",
      manualLabel: name,
      strength: medDosage.trim() || undefined,
      notes: medPoso.trim() || undefined,
      quantity: medQty,
      refillCount: 0,
      medicationFulfillmentIntent: outpatientRxOnly ? "PHARMACY_DISPENSE" : medIntent,
      _label: name,
    });
    setMedName("");
    setMedDosage("");
    setMedPoso("");
    setMedQty(30);
    setMedIntent("PHARMACY_DISPENSE");
    setOpen(false);
  };

  return (
    <div style={{ marginTop: 10 }}>
      <button type="button" onClick={() => setOpen((o) => !o)} style={btnOutline}>
        {open ? t("createOrderModal.manualToggleHide") : t("createOrderModal.manualToggleShow")}
      </button>
      {open && (
        <div
          style={{
            marginTop: 10,
            padding: 12,
            border: "1px dashed #90caf9",
            borderRadius: 8,
            background: "#f5f9ff",
          }}
        >
          {tab === "LAB" && (
            <>
              <p style={{ margin: "0 0 10px", fontSize: 13, color: "#455a64" }}>{t("createOrderModal.manualLabHelp")}</p>
              <label style={labelStyle}>
                {t("createOrderModal.manualLabLabel")} <span style={{ color: "#c62828" }}>*</span>
              </label>
              <input
                type="text"
                value={labLabel}
                onChange={(e) => setLabLabel(e.target.value)}
                placeholder={t("createOrderModal.manualLabPlaceholder")}
                style={{ ...inputStyle, marginBottom: 10 }}
              />
              <label style={labelStyle}>{t("createOrderModal.manualLabNotesLabel")}</label>
              <textarea
                value={labNotes}
                onChange={(e) => setLabNotes(e.target.value)}
                rows={2}
                placeholder={t("createOrderModal.manualLabNotesPlaceholder")}
                style={{ ...inputStyle, marginBottom: 10, resize: "vertical" }}
              />
              <button
                type="button"
                onClick={addLab}
                disabled={!labLabel.trim()}
                style={{
                  padding: "8px 16px",
                  background: labLabel.trim() ? "#1565c0" : "#bdbdbd",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  cursor: labLabel.trim() ? "pointer" : "not-allowed",
                  fontSize: 14,
                }}
              >
                {t("createOrderModal.manualLabAdd")}
              </button>
            </>
          )}
          {tab === "IMAGING" && (
            <>
              <p style={{ margin: "0 0 10px", fontSize: 13, color: "#455a64" }}>{t("createOrderModal.manualImgHelp")}</p>
              <label style={labelStyle}>
                {t("createOrderModal.manualImgLabel")} <span style={{ color: "#c62828" }}>*</span>
              </label>
              <input
                type="text"
                value={imgLabel}
                onChange={(e) => setImgLabel(e.target.value)}
                placeholder={t("createOrderModal.manualImgPlaceholder")}
                style={{ ...inputStyle, marginBottom: 10 }}
              />
              <label style={labelStyle}>{t("createOrderModal.manualImgRegionLabel")}</label>
              <input
                type="text"
                value={imgRegion}
                onChange={(e) => setImgRegion(e.target.value)}
                placeholder={t("createOrderModal.manualImgRegionPlaceholder")}
                style={{ ...inputStyle, marginBottom: 10 }}
              />
              <label style={labelStyle}>{t("createOrderModal.manualImgNotesLabel")}</label>
              <textarea
                value={imgNotes}
                onChange={(e) => setImgNotes(e.target.value)}
                rows={2}
                placeholder={t("createOrderModal.manualImgNotesPlaceholder")}
                style={{ ...inputStyle, marginBottom: 10, resize: "vertical" }}
              />
              <button
                type="button"
                onClick={addImg}
                disabled={!imgLabel.trim()}
                style={{
                  padding: "8px 16px",
                  background: imgLabel.trim() ? "#1565c0" : "#bdbdbd",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  cursor: imgLabel.trim() ? "pointer" : "not-allowed",
                  fontSize: 14,
                }}
              >
                {t("createOrderModal.manualImgAdd")}
              </button>
            </>
          )}
          {tab === "MEDICATION" && (
            <>
              <p style={{ margin: "0 0 10px", fontSize: 13, color: "#455a64" }}>{t("createOrderModal.manualMedHelp")}</p>
              <label style={labelStyle}>
                {t("createOrderModal.manualMedLabel")} <span style={{ color: "#c62828" }}>*</span>
              </label>
              <input
                type="text"
                value={medName}
                onChange={(e) => setMedName(e.target.value)}
                placeholder={t("createOrderModal.manualMedPlaceholder")}
                style={{ ...inputStyle, marginBottom: 10 }}
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={labelStyle}>{t("createOrderModal.manualDosageLabel")}</label>
                  <input
                    type="text"
                    value={medDosage}
                    onChange={(e) => setMedDosage(e.target.value)}
                    placeholder={t("createOrderModal.selectedMedStrengthPlaceholder")}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>{t("createOrderModal.manualQtyLabel")}</label>
                  <input
                    type="number"
                    min={1}
                    value={medQty}
                    onChange={(e) => setMedQty(parseInt(e.target.value, 10) || 1)}
                    style={inputStyle}
                  />
                </div>
              </div>
              <label style={labelStyle}>{t("createOrderModal.manualSigLabel")}</label>
              <input
                type="text"
                value={medPoso}
                onChange={(e) => setMedPoso(e.target.value)}
                placeholder={t("createOrderModal.manualSigPlaceholder")}
                style={{ ...inputStyle, marginBottom: 10 }}
              />
              <div style={{ marginBottom: 12, fontSize: 13 }}>
                <span style={{ fontWeight: 600, marginRight: 12 }}>{t("createOrderModal.manualDestinationLabel")}</span>
                {outpatientRxOnly ? (
                  <span data-testid="manual-rx-external-destination">
                    {t("clinicCareD4c7g.rx.externalPharmacyDestination")}
                  </span>
                ) : (
                  <>
                    <label style={{ marginRight: 12, cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="manual-intent"
                        checked={medIntent === "ADMINISTER_CHART"}
                        onChange={() => setMedIntent("ADMINISTER_CHART")}
                      />{" "}
                      {t("createOrderModal.manualIntentAdminister")}
                    </label>
                    <label style={{ cursor: "pointer" }}>
                      <input
                        type="radio"
                        name="manual-intent"
                        checked={medIntent === "PHARMACY_DISPENSE"}
                        onChange={() => setMedIntent("PHARMACY_DISPENSE")}
                      />{" "}
                      {t("createOrderModal.manualIntentPharmacy")}
                    </label>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={addMed}
                disabled={!medName.trim() || medQty < 1}
                style={{
                  padding: "8px 16px",
                  background: medName.trim() && medQty >= 1 ? "#1565c0" : "#bdbdbd",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  cursor: medName.trim() && medQty >= 1 ? "pointer" : "not-allowed",
                  fontSize: 14,
                }}
              >
                {t("createOrderModal.manualMedAdd")}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
