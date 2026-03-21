"use client";

import React, { useState } from "react";
import { Modal, Field, inputStyle } from "./Modal";
import { adjustStock, type InventoryItemRow } from "@/lib/pharmacyApi";

const MOTIFS = [
  { value: "CORRECTION", label: "Correction d'inventaire" },
  { value: "DAMAGED", label: "Produit endommagé" },
  { value: "LOSS", label: "Perte" },
  { value: "ERROR", label: "Erreur de saisie" },
  { value: "OTHER", label: "Autre" },
] as const;

const btnPrimary: React.CSSProperties = {
  padding: "10px 18px",
  backgroundColor: "#1a1a1a",
  color: "white",
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
  fontSize: 14,
};

export function AdjustStockModal({
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
  const [quantity, setQuantity] = useState("-1");
  const [motif, setMotif] = useState<string>(MOTIFS[0].value);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const medName = item.catalogMedication?.displayNameFr ?? item.catalogMedication?.name ?? item.catalogMedication?.code ?? item.sku;

  const handleSubmit = async () => {
    setError(null);
    const qty = parseInt(quantity, 10);
    if (Number.isNaN(qty) || qty === 0) {
      setError("Entrez un ajustement valide");
      return;
    }
    const newTotal = item.quantityOnHand + qty;
    if (newTotal < 0) {
      setError("Le stock ne peut pas devenir négatif");
      return;
    }
    if (!motif) {
      setError("Sélectionnez un motif");
      return;
    }
    setSubmitting(true);
    try {
      const motifLabel = MOTIFS.find((m) => m.value === motif)?.label ?? motif;
      const noteText = notes.trim() ? `Motif: ${motifLabel}\n${notes.trim()}` : `Motif: ${motifLabel}`;
      await adjustStock(facilityId, item.id, { quantity: qty, notes: noteText });
      onSuccess();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Impossible d'enregistrer l'ajustement");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Ajustement de stock" onClose={onClose}>
      <div style={{ padding: "12px 0", marginBottom: 16, border: "1px solid #eee", borderRadius: 4, backgroundColor: "#fafafa" }}>
        <div style={{ fontWeight: 600 }}>Médicament</div>
        <div>{medName}</div>
        <div style={{ marginTop: 4, fontSize: 13 }}>Stock actuel : {item.quantityOnHand}</div>
      </div>

      {error && <p style={{ color: "#b00020", marginBottom: 12, fontSize: 14 }}>{error}</p>}

      <Field label="Ajustement de quantité *">
        <input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="Positif = ajouter, négatif = retirer"
          style={inputStyle}
        />
      </Field>
      <Field label="Motif *">
        <select
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
          style={inputStyle}
        >
          {MOTIFS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
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
          {submitting ? "Enregistrement…" : "Enregistrer l'ajustement"}
        </button>
      </div>
    </Modal>
  );
}
