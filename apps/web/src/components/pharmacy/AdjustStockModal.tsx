"use client";

import React, { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Modal, Field, inputStyle } from "./Modal";
import { adjustStock, type InventoryItemRow } from "@/lib/pharmacyApi";
import { catalogMedicationNameForLocale } from "@/lib/orderItemDisplayFr";
import { PHARMACY_ADJUST_MOTIF_VALUES, pharmacyAdjustMotifLabel } from "./inventoryAdjustMotifLabels";

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
  const { t, language } = useI18n();
  const [quantity, setQuantity] = useState("-1");
  const [motif, setMotif] = useState<string>(PHARMACY_ADJUST_MOTIF_VALUES[0]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const medName =
    catalogMedicationNameForLocale(item.catalogMedication ?? null, language) ||
    item.catalogMedication?.code ||
    item.sku;

  const handleSubmit = async () => {
    setError(null);
    const qty = parseInt(quantity, 10);
    if (Number.isNaN(qty) || qty === 0) {
      setError(t("pharmacyAdjustStock.invalidQty"));
      return;
    }
    const newTotal = item.quantityOnHand + qty;
    if (newTotal < 0) {
      setError(t("pharmacyAdjustStock.negativeStock"));
      return;
    }
    if (!motif) {
      setError(t("pharmacyAdjustStock.reasonRequired"));
      return;
    }
    setSubmitting(true);
    try {
      const motifLabel = pharmacyAdjustMotifLabel(motif, t);
      const reasonHeading = `${t("pharmacyAdjustStock.reasonPrefix")}: ${motifLabel}`;
      const noteText = notes.trim() ? `${reasonHeading}\n${notes.trim()}` : reasonHeading;
      await adjustStock(facilityId, item.id, { quantity: qty, notes: noteText });
      onSuccess();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("pharmacyAdjustStock.saveFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title={t("pharmacyAdjustStock.title")} onClose={onClose}>
      <div style={{ padding: "12px 0", marginBottom: 16, border: "1px solid #eee", borderRadius: 4, backgroundColor: "#fafafa" }}>
        <div style={{ fontWeight: 600 }}>{t("common.medication")}</div>
        <div>{medName}</div>
        <div style={{ marginTop: 4, fontSize: 13 }}>
          {t("pharmacyAdjustStock.currentStock").replace("{qty}", String(item.quantityOnHand))}
        </div>
      </div>

      {error && <p style={{ color: "#b00020", marginBottom: 12, fontSize: 14 }}>{error}</p>}

      <Field label={t("pharmacyAdjustStock.qtyLabel")}>
        <input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder={t("pharmacyAdjustStock.qtyPlaceholder")}
          style={inputStyle}
        />
      </Field>
      <Field label={t("pharmacyAdjustStock.reasonLabel")}>
        <select value={motif} onChange={(e) => setMotif(e.target.value)} style={inputStyle}>
          {PHARMACY_ADJUST_MOTIF_VALUES.map((m) => (
            <option key={m} value={m}>
              {pharmacyAdjustMotifLabel(m, t)}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("pharmacyAdjustStock.notesLabel")}>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t("pharmacyAdjustStock.optionalPlaceholder")}
          style={{ ...inputStyle, minHeight: 60 }}
          rows={2}
        />
      </Field>

      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 20 }}>
        <button type="button" onClick={onClose} style={{ padding: "10px 18px", border: "1px solid #ccc", borderRadius: 4, background: "white", cursor: "pointer", fontSize: 14 }}>
          {t("common.cancel")}
        </button>
        <button type="button" disabled={submitting} onClick={handleSubmit} style={btnPrimary}>
          {submitting ? t("common.saving") : t("pharmacyAdjustStock.saveAdjustment")}
        </button>
      </div>
    </Modal>
  );
}
