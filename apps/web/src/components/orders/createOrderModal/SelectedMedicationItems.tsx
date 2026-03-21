"use client";

import React from "react";
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
}: {
  items: CreateOrderLineItem[];
  onPatch: (index: number, patch: Partial<CreateOrderLineItem>) => void;
  onRemove: (index: number) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#666", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        Lignes de prescription
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
                <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, color: "#1565c0" }}>(saisie manuelle)</span>
              )}
            </div>
            <div style={{ marginBottom: 10, fontSize: 13 }}>
              <span style={{ marginRight: 12, fontWeight: 500 }}>Destination :</span>
              <label style={{ marginRight: 12, cursor: "pointer" }}>
                <input
                  type="radio"
                  name={`intent-${idx}`}
                  checked={(item.medicationFulfillmentIntent ?? "PHARMACY_DISPENSE") === "ADMINISTER_CHART"}
                  onChange={() => onPatch(idx, { medicationFulfillmentIntent: "ADMINISTER_CHART" })}
                />{" "}
                À administrer au patient
              </label>
              <label style={{ cursor: "pointer" }}>
                <input
                  type="radio"
                  name={`intent-${idx}`}
                  checked={(item.medicationFulfillmentIntent ?? "PHARMACY_DISPENSE") === "PHARMACY_DISPENSE"}
                  onChange={() => onPatch(idx, { medicationFulfillmentIntent: "PHARMACY_DISPENSE" })}
                />{" "}
                À envoyer à la pharmacie
              </label>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "8px 12px",
                marginBottom: 8,
              }}
            >
              <div>
                <span style={labelSm}>Dosage</span>
                <input
                  type="text"
                  placeholder="ex. 500 mg"
                  value={item.strength ?? ""}
                  onChange={(e) => onPatch(idx, { strength: e.target.value })}
                  style={inputSm}
                />
              </div>
              {!item.isManual && (
                <>
                  <div>
                    <span style={labelSm}>Forme</span>
                    <input
                      type="text"
                      readOnly
                      value={item._dosageForm ?? ""}
                      placeholder="—"
                      style={{ ...inputSm, backgroundColor: "#f7f7f7", color: "#444" }}
                    />
                  </div>
                  <div>
                    <span style={labelSm}>Voie</span>
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
                <span style={labelSm}>Posologie</span>
                <input
                  type="text"
                  placeholder="ex. 1 cp × 2/j"
                  value={item.notes ?? ""}
                  onChange={(e) => onPatch(idx, { notes: e.target.value })}
                  style={inputSm}
                />
              </div>
              <div>
                <span style={labelSm}>Quantité</span>
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
                <span style={labelSm}>Renouvellements</span>
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
              Retirer
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
