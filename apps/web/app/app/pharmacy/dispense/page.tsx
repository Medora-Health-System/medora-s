"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/apiClient";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import {
  fetchInventoryList,
  dispenseMedication,
  fetchPharmacyPatientSummary,
  fetchPharmacyDispenseContext,
  type InventoryItemRow,
  type PharmacyPatientSummary,
  type PharmacyDispenseContext,
} from "@/lib/pharmacyApi";
import type { MedicationSearchItem } from "@/lib/pharmacyApi";
import { Field, inputStyle } from "@/components/pharmacy/Modal";
import { MedicationAutocomplete } from "@/components/pharmacy/MedicationAutocomplete";
import { PharmacyFavorites } from "@/components/pharmacy/PharmacyFavorites";
import { MedicationPrintButton } from "@/components/pharmacy/MedicationPrintButton";
import {
  formatEncounterChromeDate,
  formatEncounterChromeDateTime,
  tEncounterStatus,
  tEncounterType,
} from "@/lib/encounterChromeI18n";
import { useI18n } from "@/lib/i18n";
import { catalogMedicationNameForLocale } from "@/lib/orderItemDisplayFr";
import { formatOrderAuthority } from "@/lib/orderAuthority";
import { formatOrderAttributionLines } from "@/lib/orderAttribution";
import { highRiskMedicationWarning } from "@/lib/highRiskMedication";
import { CommonSuspenseFallback } from "@/components/i18n/CommonSuspenseFallback";

type Patient = {
  id: string;
  firstName: string;
  lastName: string;
  mrn: string | null;
};

type Encounter = {
  id: string;
  status: string;
  type: string;
  createdAt: string;
};

const btnPrimary: React.CSSProperties = {
  padding: "12px 24px",
  backgroundColor: "#1a1a1a",
  color: "white",
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
  fontSize: 15,
};

function PharmacyDispensePageContent() {
  const { t, language } = useI18n();
  const searchParams = useSearchParams();
  const { facilityId, ready, canManagePharmacy } = useFacilityAndRoles();
  const [patientQuery, setPatientQuery] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState("");
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [encounterId, setEncounterId] = useState("");

  // Pre-fill from URL (e.g. from worklist "Contexte de dispensation" link)
  useEffect(() => {
    const qPatient = searchParams.get("patientId");
    const qEncounter = searchParams.get("encounterId");
    if (qPatient) setPatientId(qPatient);
    if (qEncounter) setEncounterId(qEncounter);
  }, [searchParams]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItemRow[]>([]);
  const [inventoryItemId, setInventoryItemId] = useState("");
  const [quantityDispensed, setQuantityDispensed] = useState("1");
  const [dosageInstructions, setDosageInstructions] = useState("");
  const [notes, setNotes] = useState("");
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [loadingEnc, setLoadingEnc] = useState(false);
  const [pharmacySummary, setPharmacySummary] = useState<PharmacyPatientSummary | null>(null);
  const [dispenseContext, setDispenseContext] = useState<PharmacyDispenseContext | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  const loadInventory = useCallback(async () => {
    if (!facilityId || !canManagePharmacy) return;
    try {
      const res = await fetchInventoryList(facilityId, {
        activeOnly: "true",
        limit: "200",
      });
      const inStock = (res.items ?? []).filter((i) => i.quantityOnHand > 0);
      setInventoryItems(inStock);
      setInventoryItemId((prev) =>
        prev && inStock.some((i) => i.id === prev) ? prev : inStock[0]?.id ?? ""
      );
    } catch {
      setInventoryItems([]);
    }
  }, [facilityId, canManagePharmacy]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const searchPatients = async () => {
    if (!facilityId || !patientQuery.trim()) return;
    setLoadingPatients(true);
    try {
      const data = await apiFetch(
        `/patients/search?q=${encodeURIComponent(patientQuery.trim())}`,
        { facilityId }
      );
      setPatients((data as Patient[]) || []);
    } catch {
      setPatients([]);
    } finally {
      setLoadingPatients(false);
    }
  };

  useEffect(() => {
    if (!facilityId || !patientId) {
      setEncounters([]);
      setEncounterId("");
      setPharmacySummary(null);
      setDispenseContext(null);
      return;
    }
    setLoadingEnc(true);
    setPharmacySummary(null);
    setDispenseContext(null);
    fetchPharmacyPatientSummary(facilityId, patientId)
      .then((summary) => {
        setPharmacySummary(summary);
        const list = summary.encounters;
        setEncounters(list);
        setEncounterId((prev) => {
          const match = list.find((e) => e.id === prev);
          if (match) return prev;
          const open = list.find((e) => e.status === "OPEN");
          return open?.id ?? list[0]?.id ?? "";
        });
      })
      .catch(() => {
        setEncounters([]);
        setEncounterId("");
      })
      .finally(() => setLoadingEnc(false));
  }, [facilityId, patientId]);

  useEffect(() => {
    if (!facilityId || !encounterId) {
      setDispenseContext(null);
      return;
    }
    fetchPharmacyDispenseContext(facilityId, encounterId)
      .then(setDispenseContext)
      .catch(() => setDispenseContext(null));
  }, [facilityId, encounterId]);

  const selectedInventoryItem = inventoryItems.find((i) => i.id === inventoryItemId);
  const selectedInventoryHighRiskWarning = selectedInventoryItem
    ? highRiskMedicationWarning(selectedInventoryItem.catalogMedication, t)
    : null;
  const isLowStock =
    selectedInventoryItem &&
    selectedInventoryItem.reorderLevel > 0 &&
    selectedInventoryItem.quantityOnHand <= selectedInventoryItem.reorderLevel;

  const onMedicationSelect = (med: MedicationSearchItem) => {
    const matching = inventoryItems.filter(
      (i) => i.catalogMedication?.id === med.id
    );
    if (matching.length > 0) setInventoryItemId(matching[0].id);
    else setInventoryItemId("");
  };

  const onFavoriteDispense = (med: MedicationSearchItem) => {
    const matching = inventoryItems.filter(
      (i) => i.catalogMedication?.id === med.id
    );
    if (matching.length > 0) setInventoryItemId(matching[0].id);
  };

  const orderRoutes = Array.from(
    new Set(
      (dispenseContext?.medicationOrders ?? [])
        .flatMap((order) => order.items ?? [])
        .map((item) => item.route?.trim() || item.catalogMedication?.route?.trim() || "")
        .filter(Boolean)
    )
  );
  const highRiskOrderWarning = (dispenseContext?.medicationOrders ?? [])
    .flatMap((order) => order.items ?? [])
    .map((item) => highRiskMedicationWarning(item, t))
    .find((warning): warning is string => Boolean(warning)) ?? null;

  const submit = async () => {
    if (!facilityId) return;
    setStatus(null);
    const qty = parseInt(quantityDispensed, 10);
    if (Number.isNaN(qty) || qty < 1) {
      setStatus({
        type: "err",
        text: t("pharmacyDispense.errQty"),
      });
      return;
    }
    if (!patientId || !encounterId || !inventoryItemId) {
      setStatus({
        type: "err",
        text: t("pharmacyDispense.errSelection"),
      });
      return;
    }
    const item = inventoryItems.find((i) => i.id === inventoryItemId);
    if (item && qty > item.quantityOnHand) {
      setStatus({
        type: "err",
        text: `${t("pharmacyDispense.errInsufficient")} ${item.quantityOnHand}`,
      });
      return;
    }
    setSubmitting(true);
    try {
      const res = await dispenseMedication(facilityId, {
        inventoryItemId,
        patientId,
        encounterId,
        quantityDispensed: qty,
        dosageInstructions: dosageInstructions.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setStatus({
        type: "ok",
        text: (res as any)?.queued
          ? t("pharmacyDispense.okOfflineQueue")
          : t("pharmacyDispense.okOnline"),
      });
      setNotes("");
      setDosageInstructions("");
      loadInventory();
    } catch (e: unknown) {
      setStatus({
        type: "err",
        text:
          (e instanceof Error ? e.message : "") || t("pharmacyDispense.errGeneric"),
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!ready) return <p>{t("common.loading")}</p>;
  if (!canManagePharmacy) {
    return (
      <div>
        <h1>{t("pharmacyDispense.accessDeniedTitle")}</h1>
        <p>{t("pharmacyDispense.accessDeniedBody")}</p>
        <Link href="/app/pharmacy/inventory">{t("pharmacyDispense.backToInventory")}</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <h1 style={{ marginTop: 0 }}>{t("pharmacyDispense.accessDeniedTitle")}</h1>
      <p style={{ color: "#555", fontSize: 14 }}>
        <Link href="/app/pharmacy/inventory">{t("pharmacyDispense.backLink")}</Link>
      </p>

      <div
        style={{
          backgroundColor: "white",
          padding: 24,
          borderRadius: 8,
          marginBottom: 20,
          border: "1px solid #eee",
        }}
      >
        <h3 style={{ marginTop: 0 }}>
          {t("pharmacyDispense.step1Prefix")} {t("common.searchPatient")}
        </h3>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input
            style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
            placeholder={t("common.searchPatient")}
            value={patientQuery}
            onChange={(e) => setPatientQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchPatients()}
          />
          <button type="button" onClick={searchPatients} style={btnPrimary}>
            {loadingPatients ? "…" : t("common.search")}
          </button>
        </div>
        {patients.length > 0 && (
          <select
            style={{ ...inputStyle, marginBottom: 0 }}
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
          >
            <option value="">{t("pharmacyDispense.choosePatient")}</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.lastName}, {p.firstName}
                {p.mrn ? ` — ${t("common.nir")} ${p.mrn}` : ""}
              </option>
            ))}
          </select>
        )}
      </div>

      <div
        style={{
          backgroundColor: "white",
          padding: 24,
          borderRadius: 8,
          marginBottom: 20,
          border: "1px solid #eee",
        }}
      >
        <h3 style={{ marginTop: 0 }}>{t("pharmacyDispense.step2Title")}</h3>
        {!patientId ? (
          <p style={{ color: "#888" }}>{t("pharmacyDispense.selectPatientFirst")}</p>
        ) : loadingEnc ? (
          <p>{t("pharmacyDispense.loadingEncounters")}</p>
        ) : encounters.length === 0 ? (
          <p style={{ color: "#b00020" }}>{t("pharmacyDispense.noEncounters")}</p>
        ) : (
          <select
            style={{ ...inputStyle, marginBottom: 0 }}
            value={encounterId}
            onChange={(e) => setEncounterId(e.target.value)}
          >
            {encounters.map((enc) => (
              <option key={enc.id} value={enc.id}>
                {tEncounterType(t, enc.type)} — {tEncounterStatus(t, enc.status)} —{" "}
                {formatEncounterChromeDateTime(enc.createdAt, language)}
              </option>
            ))}
          </select>
        )}
      </div>

      {pharmacySummary && (
        <div
          style={{
            backgroundColor: "#f8f9fa",
            padding: 16,
            borderRadius: 8,
            marginBottom: 20,
            border: "1px solid #eee",
          }}
        >
          <h3 style={{ marginTop: 0, fontSize: 16 }}>{t("pharmacyDispense.summaryTitle")}</h3>
          <div style={{ fontSize: 14 }}>
            <p style={{ margin: "0 0 8px 0" }}>
              <strong>{t("pharmacyDispense.labelPatient")}</strong> — {pharmacySummary.patient.lastName}{" "}
              {pharmacySummary.patient.firstName}
              {pharmacySummary.patient.mrn ? ` · ${t("common.nir")} ${pharmacySummary.patient.mrn}` : ""}
              {pharmacySummary.patient.dob
                ? ` · ${t("pharmacyDispense.bornOn")} ${formatEncounterChromeDate(pharmacySummary.patient.dob, language)}`
                : ""}
            </p>
            {dispenseContext && (
              <>
                <p style={{ margin: "0 0 8px 0" }}>
                  <strong>{t("pharmacyDispense.labelEncounter")}</strong> — {tEncounterType(t, dispenseContext.encounter.type)} ·{" "}
                  {tEncounterStatus(t, dispenseContext.encounter.status)} ·{" "}
                  {formatEncounterChromeDateTime(dispenseContext.encounter.createdAt, language)}
                </p>
                {dispenseContext.medicationOrders.length > 0 && (
                  <p style={{ margin: "0 0 4px 0" }}>
                    <strong>{t("pharmacyDispense.orderDetails")}</strong> — {dispenseContext.medicationOrders.length}{" "}
                    {t("pharmacyDispense.activeMedicationOrderCount")}
                  </p>
                )}
                {orderRoutes.length > 0 ? (
                  <p style={{ margin: "0 0 8px 0" }}>
                    <strong>{t("pharmacyDispense.orderRoutes")}</strong> — {orderRoutes.join(", ")}
                  </p>
                ) : null}
                {highRiskOrderWarning ? (
                  <p style={{ margin: "0 0 8px 0", color: "#b45309", fontWeight: 600 }}>
                    {highRiskOrderWarning}
                  </p>
                ) : null}
                {(dispenseContext.medicationOrders.some((o) => o.prescriberName || o.prescriberLicense) || dispenseContext.medicationOrders.some((o) => o.prescriberContact)) && (
                  <p style={{ margin: "0 0 8px 0" }}>
                    <strong>{t("pharmacyDispense.prescriber")}</strong> —{" "}
                    {dispenseContext.medicationOrders
                      .map((o) => o.prescriberName || o.prescriberLicense || o.prescriberContact)
                      .filter(Boolean)[0] ?? t("common.dash")}
                  </p>
                )}
                {dispenseContext.medicationOrders.length > 0 ? (
                  <p style={{ margin: "0 0 8px 0", color: "#64748b", overflowWrap: "anywhere" }}>
                    {formatOrderAuthority(dispenseContext.medicationOrders[0], t)}
                  </p>
                ) : null}
                {dispenseContext.medicationOrders[0]
                  ? formatOrderAttributionLines(dispenseContext.medicationOrders[0], t, language).map((line) => (
                      <p key={line} style={{ margin: "0 0 4px 0", color: "#64748b", overflowWrap: "anywhere" }}>
                        {line}
                      </p>
                    ))
                  : null}
              </>
            )}
            {pharmacySummary.recentDispenses.length > 0 && (
              <p style={{ margin: 0 }}>
                <strong>{t("pharmacyDispense.historyTitle")}</strong> — {pharmacySummary.recentDispenses.length}{" "}
                {t("pharmacyDispense.recentDispenseCount")}
              </p>
            )}
          </div>
        </div>
      )}

      {facilityId && (
        <div style={{ marginBottom: 20 }}>
          <PharmacyFavorites
            facilityId={facilityId}
            onDispense={onFavoriteDispense}
            compact
          />
        </div>
      )}

      <div
        style={{
          backgroundColor: "white",
          padding: 24,
          borderRadius: 8,
          marginBottom: 20,
          border: "1px solid #eee",
        }}
      >
        <h3 style={{ marginTop: 0 }}>{t("pharmacyDispense.step3Title")}</h3>
        {inventoryItems.length === 0 ? (
          <p>{t("pharmacyDispense.noStock")}</p>
        ) : (
          <>
            <div style={{ marginBottom: 12 }}>
              <MedicationAutocomplete
                facilityId={facilityId}
                mode="dispense"
                placeholder={t("pharmacyDispense.searchStockPlaceholder")}
                onSelect={onMedicationSelect}
                favoritesFirst
              />
            </div>
            <div style={{ marginTop: 8 }}>
              <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>
                {t("pharmacyDispense.fieldSelectedItem")}
              </label>
              <select
                style={{ ...inputStyle, marginBottom: 0 }}
                value={inventoryItemId}
                onChange={(e) => setInventoryItemId(e.target.value)}
              >
                <option value="">{t("pharmacyDispense.chooseItemOption")}</option>
                {inventoryItems.map((i) => (
                  <option key={i.id} value={i.id}>
                    {catalogMedicationNameForLocale(i.catalogMedication, language) ||
                      i.catalogMedication?.code ||
                      "—"}{" "}
                    — SKU {i.sku} — {t("pharmacyDispense.onHand")} {i.quantityOnHand}
                  </option>
                ))}
              </select>
            </div>
            {selectedInventoryHighRiskWarning ? (
              <p style={{ marginTop: 8, color: "#b45309", fontSize: 13, fontWeight: 600 }}>
                {selectedInventoryHighRiskWarning}
              </p>
            ) : null}
            {isLowStock && selectedInventoryItem && (
              <p
                style={{
                  marginTop: 8,
                  color: "#b45309",
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                {t("pharmacyDispense.lowStockPrefix")}
                {selectedInventoryItem.reorderLevel}
                {t("pharmacyDispense.lowStockSuffix")}
              </p>
            )}
          </>
        )}
      </div>

      <div
        style={{
          backgroundColor: "white",
          padding: 24,
          borderRadius: 8,
          marginBottom: 20,
          border: "1px solid #eee",
        }}
      >
        <h3 style={{ marginTop: 0 }}>{t("pharmacyDispense.step4Title")}</h3>
        <Field label={t("pharmacyDispense.fieldQty")}>
          <input
            type="number"
            min={1}
            style={inputStyle}
            value={quantityDispensed}
            onChange={(e) => setQuantityDispensed(e.target.value)}
          />
        </Field>
        <Field label={t("pharmacyDispense.fieldDosage")}>
          <textarea
            style={{ ...inputStyle, minHeight: 64 }}
            value={dosageInstructions}
            onChange={(e) => setDosageInstructions(e.target.value)}
            placeholder={t("pharmacyDispense.dosagePlaceholder")}
          />
        </Field>
        <Field label={t("pharmacyDispense.fieldNotes")}>
          <textarea
            style={{ ...inputStyle, minHeight: 64 }}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            disabled={
              submitting ||
              !patientId ||
              !encounterId ||
              !inventoryItemId ||
              inventoryItems.length === 0
            }
            onClick={submit}
            style={btnPrimary}
          >
            {submitting ? t("pharmacyDispense.submitSending") : t("pharmacyDispense.submit")}
          </button>
          <MedicationPrintButton label={t("pharmacyDispense.print")} />
        </div>
      </div>

      {status && (
        <div
          style={{
            padding: 16,
            borderRadius: 4,
            backgroundColor: status.type === "ok" ? "#e8f5e9" : "#ffebee",
            color: status.type === "ok" ? "#1b5e20" : "#b71c1c",
            fontSize: 15,
          }}
        >
          {status.text}
        </div>
      )}
    </div>
  );
}

export default function PharmacyDispensePage() {
  return (
    <Suspense fallback={<CommonSuspenseFallback padded />}>
      <PharmacyDispensePageContent />
    </Suspense>
  );
}
