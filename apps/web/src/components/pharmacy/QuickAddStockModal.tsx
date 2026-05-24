"use client";

import React, { useState, useRef, useEffect } from "react";
import { Modal, Field, inputStyle } from "./Modal";
import {
  createInventoryItem,
  medicationSearchLabel,
  type MedicationSearchItem,
} from "@/lib/pharmacyApi";
import { MedicationAutocomplete } from "./MedicationAutocomplete";
import { normalizeMedicationDisplayForLocale } from "@/lib/localizedMedicationDisplay";
import { useI18n } from "@/lib/i18n";

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
  const { t, language } = useI18n();
  const [query, setQuery] = useState(
    initialMedication ? medicationSearchLabel(initialMedication, language, t) : ""
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
      setQuery(medicationSearchLabel(initialMedication, language, t));
    }
  }, [initialMedication, language, t]);

  const handleSelect = (med: MedicationSearchItem) => {
    setSelected(med);
    setQuery(medicationSearchLabel(med, language, t));
    setTimeout(() => qtyInputRef.current?.focus(), 100);
  };

  const handleSubmit = async () => {
    setError(null);
    if (!selected) {
      setError(t("pharmacyQuickAdd.selectMedication"));
      return;
    }
    const qty = parseInt(quantityOnHand, 10);
    if (Number.isNaN(qty) || qty < 1) {
      setError(t("pharmacyQuickAdd.qtyInvalid"));
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
      setError(e instanceof Error ? e.message : t("pharmacyQuickAdd.saveFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title={t("pharmacyQuickAdd.title")} onClose={onClose}>
      {error && (
        <p style={{ color: "#b00020", marginBottom: 12, fontSize: 14 }}>{error}</p>
      )}

      <Field label={t("common.medication")}>
        <MedicationAutocomplete
          facilityId={facilityId}
          mode="inventory"
          placeholder={t("common.searchMedicationPlaceholder")}
          onSelect={handleSelect}
          favoritesFirst
          autoFocus={!initialMedication}
          value={selected ? medicationSearchLabel(selected, language, t) : query}
          onChange={(val) => {
            setQuery(val ?? "");
            if (!val?.trim()) setSelected(null);
          }}
        />
      </Field>

      {selected && (
        <>
          <Field label={t("pharmacyQuickAdd.fieldStrength")}>
            <input
              type="text"
              readOnly
              value={selected.metadata?.strength ?? t("common.dash")}
              style={{ ...inputStyle, backgroundColor: "#f5f5f5", cursor: "default" }}
            />
          </Field>
          <Field label={t("pharmacyQuickAdd.fieldDosageForm")}>
            <input
              type="text"
              readOnly
              value={
                normalizeMedicationDisplayForLocale(selected.metadata?.dosageForm, language) ||
                t("common.dash")
              }
              style={{ ...inputStyle, backgroundColor: "#f5f5f5", cursor: "default" }}
            />
          </Field>
          <Field label={t("pharmacyQuickAdd.fieldRoute")}>
            <input
              type="text"
              readOnly
              value={
                normalizeMedicationDisplayForLocale(selected.metadata?.route, language) ||
                t("common.dash")
              }
              style={{ ...inputStyle, backgroundColor: "#f5f5f5", cursor: "default" }}
            />
          </Field>
          <Field label={t("pharmacyQuickAdd.fieldInitialQty")}>
            <input
              ref={qtyInputRef}
              name="quick-add-qty"
              type="number"
              min={1}
              value={quantityOnHand}
              onChange={(e) => setQuantityOnHand(e.target.value)}
              placeholder={t("pharmacyQuickAdd.qtyPlaceholderExample")}
              style={inputStyle}
            />
          </Field>
          <Field label={t("pharmacyQuickAdd.fieldExpiration")}>
            <input
              type="date"
              value={expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
              style={inputStyle}
            />
          </Field>
          <Field label={t("pharmacyQuickAdd.fieldLot")}>
            <input
              type="text"
              value={lotNumber}
              onChange={(e) => setLotNumber(e.target.value)}
              placeholder={t("pharmacyAdjustStock.optionalPlaceholder")}
              style={inputStyle}
            />
          </Field>
          <Field label={t("pharmacyQuickAdd.fieldReorder")}>
            <input
              type="number"
              min={0}
              value={reorderLevel}
              onChange={(e) => setReorderLevel(e.target.value)}
              style={inputStyle}
            />
          </Field>
          <Field label={t("pharmacyQuickAdd.fieldUnit")}>
            <input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder={t("pharmacyQuickAdd.unitPlaceholderExample")}
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
          {t("common.cancel")}
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
          {submitting ? t("common.saving") : t("common.save")}
        </button>
      </div>
    </Modal>
  );
}
