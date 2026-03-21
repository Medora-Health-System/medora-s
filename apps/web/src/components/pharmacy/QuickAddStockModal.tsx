"use client";

import React, { useState, useRef, useEffect } from "react";
import { Modal, Field, inputStyle } from "./Modal";
import {
  createInventoryItem,
  medicationSearchLabel,
  type MedicationSearchItem,
} from "@/lib/pharmacyApi";
import { MedicationAutocomplete } from "./MedicationAutocomplete";

export function QuickAddStockModal({
  facilityId,
  onClose,
  onSuccess,
  initialMedication,
}: {
  facilityId: string;
  onClose: () => void;
  onSuccess: () => void;
  initialMedication?: MedicationSearchItem | null;
}) {
  const [query, setQuery] = useState(
    initialMedication ? medicationSearchLabel(initialMedication) : ""
  );
  const [selected, setSelected] = useState<MedicationSearchItem | null>(initialMedication ?? null);
  const [quantityOnHand, setQuantityOnHand] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [lotNumber, setLotNumber] = useState("");
  const [reorderLevel, setReorderLevel] = useState("0");
  const [unit, setUnit] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialMedication) {
      setSelected(initialMedication);
      setQuery(medicationSearchLabel(initialMedication));
    }
  }, [initialMedication]);

  const handleSelect = (med: MedicationSearchItem) => {
    setSelected(med);
    setQuery(medicationSearchLabel(med));
    setTimeout(() => qtyInputRef.current?.focus(), 100);
  };

  const handleSubmit = async () => {
    setError(null);
    if (!selected) {
      setError("Sélectionnez un médicament");
      return;
    }
    const qty = parseInt(quantityOnHand, 10);
    if (Number.isNaN(qty) || qty < 1) {
      setError("La quantité doit être supérieure à 0");
      return;
    }
    setSubmitting(true);
    try {
      const sku = lotNumber.trim()
  ? `${selected.code}-${lotNumber.trim()}`
  : `${selected.code}-${Date.now()}`;
      await createInventoryItem(facilityId, {
        catalogMedicationId: selected.id,
        sku,
        lotNumber: lotNumber.trim() || undefined,
        expirationDate: expirationDate.trim() || undefined,
        quantityOnHand: qty,
        reorderLevel: parseInt(reorderLevel, 10) || 0,
        unit: unit.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Impossible d'enregistrer");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Ajout rapide au stock" onClose={onClose}>
      {error && (
        <p style={{ color: "#b00020", marginBottom: 12, fontSize: 14 }}>{error}</p>
      )}

      <Field label="Médicament">
        <MedicationAutocomplete
          facilityId={facilityId}
          mode="inventory"
          placeholder="Rechercher un médicament"
          onSelect={handleSelect}
          favoritesFirst
          autoFocus={!initialMedication}
          value={selected ? medicationSearchLabel(selected) : query}
          onChange={(val) => {
            setQuery(val ?? "");
            if (!val?.trim()) setSelected(null);
          }}
        />
      </Field>

      {selected && (
        <>
          <Field label="Dosage">
            <input
              type="text"
              readOnly
              value={selected.metadata?.strength ?? "—"}
              style={{ ...inputStyle, backgroundColor: "#f5f5f5", cursor: "default" }}
            />
          </Field>
          <Field label="Forme">
            <input
              type="text"
              readOnly
              value={selected.metadata?.dosageForm ?? "—"}
              style={{ ...inputStyle, backgroundColor: "#f5f5f5", cursor: "default" }}
            />
          </Field>
          <Field label="Voie">
            <input
              type="text"
              readOnly
              value={selected.metadata?.route ?? "—"}
              style={{ ...inputStyle, backgroundColor: "#f5f5f5", cursor: "default" }}
            />
          </Field>
          <Field label="Quantité initiale *">
            <input
              ref={qtyInputRef}
              name="quick-add-qty"
              type="number"
              min={1}
              value={quantityOnHand}
              onChange={(e) => setQuantityOnHand(e.target.value)}
              placeholder="Ex. 100"
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
          <Field label="Numéro de lot">
            <input
              type="text"
              value={lotNumber}
              onChange={(e) => setLotNumber(e.target.value)}
              placeholder="Optionnel"
              style={inputStyle}
            />
          </Field>
          <Field label="Seuil d'alerte">
            <input
              type="number"
              min={0}
              value={reorderLevel}
              onChange={(e) => setReorderLevel(e.target.value)}
              style={inputStyle}
            />
          </Field>
          <Field label="Unité">
            <input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="Ex. comprimé, flacon"
              style={inputStyle}
            />
          </Field>
        </>
      )}

      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 20 }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            padding: "10px 18px",
            border: "1px solid #ccc",
            borderRadius: 4,
            backgroundColor: "white",
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          Annuler
        </button>
        <button
          type="button"
          disabled={submitting || !selected || !quantityOnHand || parseInt(quantityOnHand, 10) < 1}
          onClick={handleSubmit}
          style={{
            padding: "10px 18px",
            backgroundColor: "#1a1a1a",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: submitting ? "not-allowed" : "pointer",
            fontSize: 14,
            opacity: !selected || !quantityOnHand || parseInt(quantityOnHand, 10) < 1 ? 0.6 : 1,
          }}
        >
          {submitting ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </Modal>
  );
}
