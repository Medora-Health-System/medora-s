"use client";

import React, { useState } from "react";
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
 * Saisie manuelle lorsque l’article n’est pas dans le catalogue (Haïti / hors liste).
 */
export function ManualOrderEntry({
  tab,
  onAdd,
}: {
  tab: OrderModalTab;
  onAdd: (line: CreateOrderLineItem) => void;
}) {
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
  const [medIntent, setMedIntent] = useState<"ADMINISTER_CHART" | "PHARMACY_DISPENSE">("PHARMACY_DISPENSE");

  const addLab = () => {
    const t = labLabel.trim();
    if (!t) return;
    onAdd({
      _lineId: newOrderLineId(),
      isManual: true,
      catalogItemType: "LAB_TEST",
      manualLabel: t,
      notes: labNotes.trim() || undefined,
      _label: t,
    });
    setLabLabel("");
    setLabNotes("");
    setOpen(false);
  };

  const addImg = () => {
    const t = imgLabel.trim();
    if (!t) return;
    const reg = imgRegion.trim();
    const ind = imgNotes.trim();
    onAdd({
      _lineId: newOrderLineId(),
      isManual: true,
      catalogItemType: "IMAGING_STUDY",
      manualLabel: t,
      manualSecondaryText: reg || undefined,
      notes: ind || undefined,
      _label: t,
      _modality: undefined,
      _bodyRegion: reg || undefined,
    });
    setImgLabel("");
    setImgRegion("");
    setImgNotes("");
    setOpen(false);
  };

  const addMed = () => {
    const t = medName.trim();
    if (!t) return;
    if (!medQty || medQty < 1) return;
    onAdd({
      _lineId: newOrderLineId(),
      isManual: true,
      catalogItemType: "MEDICATION",
      manualLabel: t,
      strength: medDosage.trim() || undefined,
      notes: medPoso.trim() || undefined,
      quantity: medQty,
      refillCount: 0,
      medicationFulfillmentIntent: medIntent,
      _label: t,
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
        {open ? "▼ Masquer la saisie manuelle" : "＋ Saisir manuellement"}
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
              <p style={{ margin: "0 0 10px", fontSize: 13, color: "#455a64" }}>
                Utilisez ce bloc si l’analyse n’apparaît pas dans la recherche.
              </p>
              <label style={labelStyle}>
                Libellé de l’analyse <span style={{ color: "#c62828" }}>*</span>
              </label>
              <input
                type="text"
                value={labLabel}
                onChange={(e) => setLabLabel(e.target.value)}
                placeholder="ex. NFS, bilan hépatique…"
                style={{ ...inputStyle, marginBottom: 10 }}
              />
              <label style={labelStyle}>Notes / indication</label>
              <textarea
                value={labNotes}
                onChange={(e) => setLabNotes(e.target.value)}
                rows={2}
                placeholder="Contexte clinique, urgence…"
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
                Ajouter l’analyse
              </button>
            </>
          )}
          {tab === "IMAGING" && (
            <>
              <p style={{ margin: "0 0 10px", fontSize: 13, color: "#455a64" }}>
                Utilisez ce bloc si l’examen d’imagerie n’est pas listé.
              </p>
              <label style={labelStyle}>
                Libellé de l’examen <span style={{ color: "#c62828" }}>*</span>
              </label>
              <input
                type="text"
                value={imgLabel}
                onChange={(e) => setImgLabel(e.target.value)}
                placeholder="ex. Radio thorax 2 incidences…"
                style={{ ...inputStyle, marginBottom: 10 }}
              />
              <label style={labelStyle}>Région / précision</label>
              <input
                type="text"
                value={imgRegion}
                onChange={(e) => setImgRegion(e.target.value)}
                placeholder="ex. Cheville droite, obstétrique…"
                style={{ ...inputStyle, marginBottom: 10 }}
              />
              <label style={labelStyle}>Notes / indication</label>
              <textarea
                value={imgNotes}
                onChange={(e) => setImgNotes(e.target.value)}
                rows={2}
                placeholder="Indication clinique…"
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
                Ajouter l’examen
              </button>
            </>
          )}
          {tab === "MEDICATION" && (
            <>
              <p style={{ margin: "0 0 10px", fontSize: 13, color: "#455a64" }}>
                Médicament absent du catalogue (nom générique ou spécialité locale).
              </p>
              <label style={labelStyle}>
                Médicament <span style={{ color: "#c62828" }}>*</span>
              </label>
              <input
                type="text"
                value={medName}
                onChange={(e) => setMedName(e.target.value)}
                placeholder="Nom du médicament"
                style={{ ...inputStyle, marginBottom: 10 }}
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={labelStyle}>Dosage</label>
                  <input
                    type="text"
                    value={medDosage}
                    onChange={(e) => setMedDosage(e.target.value)}
                    placeholder="ex. 500 mg"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Quantité</label>
                  <input
                    type="number"
                    min={1}
                    value={medQty}
                    onChange={(e) => setMedQty(parseInt(e.target.value, 10) || 1)}
                    style={inputStyle}
                  />
                </div>
              </div>
              <label style={labelStyle}>Posologie</label>
              <input
                type="text"
                value={medPoso}
                onChange={(e) => setMedPoso(e.target.value)}
                placeholder="ex. 1 cp × 3/j pendant 7 jours"
                style={{ ...inputStyle, marginBottom: 10 }}
              />
              <div style={{ marginBottom: 12, fontSize: 13 }}>
                <span style={{ fontWeight: 600, marginRight: 12 }}>Destination :</span>
                <label style={{ marginRight: 12, cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="manual-intent"
                    checked={medIntent === "ADMINISTER_CHART"}
                    onChange={() => setMedIntent("ADMINISTER_CHART")}
                  />{" "}
                  À administrer au patient
                </label>
                <label style={{ cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="manual-intent"
                    checked={medIntent === "PHARMACY_DISPENSE"}
                    onChange={() => setMedIntent("PHARMACY_DISPENSE")}
                  />{" "}
                  À envoyer à la pharmacie
                </label>
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
                Ajouter le médicament
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
