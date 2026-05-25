"use client";

import React, { useState } from "react";
import { Modal, Field, inputStyle } from "./Modal";
import { receiveStock, type InventoryItemRow } from "@/lib/pharmacyApi";
import { useI18n } from "@/lib/i18n";
import { catalogMedicationNameForLocale } from "@/lib/orderItemDisplayFr";
import { normalizeMedicationDisplayForLocale } from "@/lib/localizedMedicationDisplay";

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
  const { t, language } = useI18n();
  const [quantity, setQuantity] = useState("1");
  const [lotNumber, setLotNumber] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const medName = catalogMedicationNameForLocale(item.catalogMedication ?? null, language);
  const strength = (item.catalogMedication as { strength?: string })?.strength;
  const dosageForm = (item.catalogMedication as { dosageForm?: string })?.dosageForm;
  const route = (item.catalogMedication as { route?: string })?.route;

  const handleSubmit = async () => {
    setError(null);
    const qty = parseInt(quantity, 10);
    if (Number.isNaN(qty) || qty < 1) {
      setError(t("pharmacyReceiveStock.qtyMustBePositive"));
      return;
    }
    setSubmitting(true);
    try {
      const noteParts: string[] = [];
      if (notes.trim()) noteParts.push(notes.trim());
      if (lotNumber.trim()) {
        noteParts.push(`${t("pharmacyReceiveStock.noteLotPrefix")}: ${lotNumber.trim()}`);
      }
      if (expirationDate.trim()) {
        noteParts.push(`${t("pharmacyReceiveStock.noteExpirationPrefix")}: ${expirationDate.trim()}`);
      }
      await receiveStock(facilityId, item.id, {
        quantity: qty,
        notes: noteParts.length > 0 ? noteParts.join(" · ") : undefined,
      });
      onSuccess();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t("pharmacyReceiveStock.saveFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title={t("pharmacyReceiveStock.title")} onClose={onClose}>
      <div
        style={{
          padding: "12px 0",
          marginBottom: 16,
          border: "1px solid #eee",
          borderRadius: 4,
          backgroundColor: "#fafafa",
        }}
      >
        <div style={{ fontWeight: 600 }}>{t("pharmacyReceiveStock.medicationHeading")}</div>
        <div>
          {medName || item.catalogMedication?.code || item.sku} {strength && ` · ${strength}`}
        </div>
        {(dosageForm || route) && (
          <div style={{ fontSize: 13, color: "#666" }}>
            {[normalizeMedicationDisplayForLocale(dosageForm, language), normalizeMedicationDisplayForLocale(route, language)]
              .filter(Boolean)
              .join(" · ")}
          </div>
        )}
        <div style={{ marginTop: 4, fontSize: 13 }}>
          {t("pharmacyReceiveStock.currentStock").replace("{qty}", String(item.quantityOnHand))}
        </div>
      </div>

      {error ? <p style={{ color: "#b00020", marginBottom: 12, fontSize: 14 }}>{error}</p> : null}

      <Field label={t("pharmacyReceiveStock.quantityLabel")}>
        <input
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          style={inputStyle}
        />
      </Field>
      <Field label={t("pharmacyReceiveStock.lotLabel")}>
        <input
          type="text"
          value={lotNumber}
          onChange={(e) => setLotNumber(e.target.value)}
          placeholder={t("pharmacyReceiveStock.optionalPlaceholder")}
          style={inputStyle}
        />
      </Field>
      <Field label={t("pharmacyReceiveStock.expirationLabel")}>
        <input type="date" value={expirationDate} onChange={(e) => setExpirationDate(e.target.value)} style={inputStyle} />
      </Field>
      <Field label={t("pharmacyReceiveStock.notesLabel")}>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t("pharmacyReceiveStock.optionalPlaceholder")}
          style={{ ...inputStyle, minHeight: 60 }}
          rows={2}
        />
      </Field>

      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 20 }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            padding: "10px 18px",
            border: "1px solid #ccc",
            borderRadius: 4,
            background: "white",
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          {t("common.cancel")}
        </button>
        <button type="button" disabled={submitting} onClick={handleSubmit} style={btnPrimary}>
          {submitting ? t("pharmacyReceiveStock.saving") : t("pharmacyReceiveStock.save")}
        </button>
      </div>
    </Modal>
  );
}
