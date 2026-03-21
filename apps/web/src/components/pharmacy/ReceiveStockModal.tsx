"use client";

import React, { useState } from "react";
import { Modal, Field, inputStyle } from "./Modal";
import { receiveStock, type InventoryItemRow } from "@/lib/pharmacyApi";

const btnPrimary: React.CSSProperties = {
  padding: "10px 18px",
  backgroundColor: "#1a1a1a",
  color: "white",
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
  fontSize: 14,
};

export function ReceiveStockModal({
  facilityId,
  item,
  onClose,
  onSuccess,
}: {
  facilityId: string;
  item: InventoryItemRow;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [quantity, setQuantity] = useState("1");
  const [lotNumber, setLotNumber] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const medName = item.catalogMedication?.displayNameFr ?? item.catalogMedication?.name ?? item.catalogMedication?.code ?? item.sku;
  const strength = (item.catalogMedication as { strength?: string })?.strength;
  const dosageForm = (item.catalogMedication as { dosageForm?: string })?.dosageForm;
  const route = (item.catalogMedication as { route?: string })?.route;

  const handleSubmit = async () => {
    setError(null);
    const qty = parseInt(quantity, 10);
    if (Number.isNaN(qty) || qty < 1) {
      setError("La quantité reçue doit être supérieure à 0");
      return;
    }
    setSubmitting(true);
    try {
      const noteParts: string[] = [];
      if (notes.trim()) noteParts.push(notes.trim());
      if (lotNumber.trim()) noteParts.push(`Lot: ${lotNumber.trim()}`);
      if (expirationDate.trim()) noteParts.push(`Expiration: ${expirationDate.trim()}`);
      await receiveStock(facilityId, item.id, {
        quantity: qty,
        notes: noteParts.length > 0 ? noteParts.join(" · ") : undefined,
      });
      onSuccess();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Impossible d'enregistrer la réception");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Réception de stock" onClose={onClose}>
      <div style={{ padding: "12px 0", marginBottom: 16, border: "1px solid #eee", borderRadius: 4, backgroundColor: "#fafafa" }}>
        <div style={{ fontWeight: 600 }}>Médicament</div>
        <div>{medName} {strength && ` · ${strength}`}</div>
        {(dosageForm || route) && (
          <div style={{ fontSize: 13, color: "#666" }}>{[dosageForm, route].filter(Boolean).join(" · ")}</div>
        )}
        <div style={{ marginTop: 4, fontSize: 13 }}>Stock actuel : {item.quantityOnHand}</div>
      </div>

      {error && <p style={{ color: "#b00020", marginBottom: 12, fontSize: 14 }}>{error}</p>}

      <Field label="Quantité reçue *">
        <input
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          style={inputStyle}
        />
      </Field>
      <Field label="Numéro de lot">
        <input
          type="text"
          value={lotNumber}
          onChange={(e) => setLotNumber(e.target.value)}
          placeholder="Optionnel"
          style={inputStyle}
        />
      </Field>
      <Field label="Date d'expiration">
        <input
          type="date"
          value={expirationDate}
          onChange={(e) => setExpirationDate(e.target.value)}
          style={inputStyle}
        />
      </Field>
      <Field label="Notes">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optionnel"
          style={{ ...inputStyle, minHeight: 60 }}
          rows={2}
        />
      </Field>

      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 20 }}>
        <button type="button" onClick={onClose} style={{ padding: "10px 18px", border: "1px solid #ccc", borderRadius: 4, background: "white", cursor: "pointer", fontSize: 14 }}>
          Annuler
        </button>
        <button type="button" disabled={submitting} onClick={handleSubmit} style={btnPrimary}>
          {submitting ? "Enregistrement…" : "Enregistrer la réception"}
        </button>
      </div>
    </Modal>
  );
}
