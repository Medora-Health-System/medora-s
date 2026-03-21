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
import { getEncounterStatusLabelFr, getEncounterTypeLabelFr } from "@/lib/uiLabels";

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

  const submit = async () => {
    if (!facilityId) return;
    setStatus(null);
    const qty = parseInt(quantityDispensed, 10);
    if (Number.isNaN(qty) || qty < 1) {
      setStatus({
        type: "err",
        text: "Entrez une quantité valide (supérieure à 0).",
      });
      return;
    }
    if (!patientId || !encounterId || !inventoryItemId) {
      setStatus({
        type: "err",
        text: "Sélectionnez un patient, une consultation et un médicament en stock.",
      });
      return;
    }
    const item = inventoryItems.find((i) => i.id === inventoryItemId);
    if (item && qty > item.quantityOnHand) {
      setStatus({
        type: "err",
        text: "Stock insuffisant. Quantité en stock : " + item.quantityOnHand,
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
          ? "Dispensation enregistrée localement. En attente de synchronisation."
          : "Médicament délivré avec succès.",
      });
      setNotes("");
      setDosageInstructions("");
      loadInventory();
    } catch (e: unknown) {
      setStatus({
        type: "err",
        text:
          (e instanceof Error ? e.message : "") ||
          "Dispensation impossible. Vérifiez la consultation, le patient et le stock.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!ready) return <p>Chargement…</p>;
  if (!canManagePharmacy) {
    return (
      <div>
        <h1>Dispensation</h1>
        <p>Seuls les rôles Pharmacie et Administration peuvent dispenser.</p>
        <Link href="/app/pharmacy/inventory">Voir le stock</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <h1 style={{ marginTop: 0 }}>Dispensation</h1>
      <p style={{ color: "#555", fontSize: 14 }}>
        <Link href="/app/pharmacy/inventory">← Inventaire</Link>
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
        <h3 style={{ marginTop: 0 }}>1. Rechercher un patient</h3>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input
            style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
            placeholder="Rechercher un patient"
            value={patientQuery}
            onChange={(e) => setPatientQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchPatients()}
          />
          <button type="button" onClick={searchPatients} style={btnPrimary}>
            {loadingPatients ? "…" : "Rechercher"}
          </button>
        </div>
        {patients.length > 0 && (
          <select
            style={{ ...inputStyle, marginBottom: 0 }}
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
          >
            <option value="">Choisir un patient</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.lastName}, {p.firstName}
                {p.mrn ? ` — NIR ${p.mrn}` : ""}
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
        <h3 style={{ marginTop: 0 }}>2. Consultation</h3>
        {!patientId ? (
          <p style={{ color: "#888" }}>Sélectionnez d&apos;abord un patient.</p>
        ) : loadingEnc ? (
          <p>Chargement des consultations…</p>
        ) : encounters.length === 0 ? (
          <p style={{ color: "#b00020" }}>
            Aucune consultation pour ce patient. Créez une consultation avant de
            dispenser.
          </p>
        ) : (
          <select
            style={{ ...inputStyle, marginBottom: 0 }}
            value={encounterId}
            onChange={(e) => setEncounterId(e.target.value)}
          >
            {encounters.map((enc) => (
              <option key={enc.id} value={enc.id}>
                {getEncounterTypeLabelFr(enc.type)} — {getEncounterStatusLabelFr(enc.status)} —{" "}
                {new Date(enc.createdAt).toLocaleString()}
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
          <h3 style={{ marginTop: 0, fontSize: 16 }}>Résumé pharmacie</h3>
          <div style={{ fontSize: 14 }}>
            <p style={{ margin: "0 0 8px 0" }}>
              <strong>Patient</strong> — {pharmacySummary.patient.lastName} {pharmacySummary.patient.firstName}
              {pharmacySummary.patient.mrn ? ` · NIR ${pharmacySummary.patient.mrn}` : ""}
              {pharmacySummary.patient.dob ? ` · Né(e) ${pharmacySummary.patient.dob}` : ""}
            </p>
            {dispenseContext && (
              <>
                <p style={{ margin: "0 0 8px 0" }}>
                  <strong>Consultation</strong> — {getEncounterTypeLabelFr(dispenseContext.encounter.type)} · {getEncounterStatusLabelFr(dispenseContext.encounter.status)} ·{" "}
                  {new Date(dispenseContext.encounter.createdAt).toLocaleString("fr-FR")}
                </p>
                {dispenseContext.medicationOrders.length > 0 && (
                  <p style={{ margin: "0 0 4px 0" }}>
                    <strong>Détails de l&apos;ordonnance</strong> — {dispenseContext.medicationOrders.length} ordonnance(s) médicamenteuse(s)
                  </p>
                )}
                {(dispenseContext.medicationOrders.some((o) => o.prescriberName || o.prescriberLicense) || dispenseContext.medicationOrders.some((o) => o.prescriberContact)) && (
                  <p style={{ margin: "0 0 8px 0" }}>
                    <strong>Prescripteur</strong> —{" "}
                    {dispenseContext.medicationOrders.map((o) => o.prescriberName || o.prescriberLicense || o.prescriberContact).filter(Boolean)[0] ?? "—"}
                  </p>
                )}
              </>
            )}
            {pharmacySummary.recentDispenses.length > 0 && (
              <p style={{ margin: 0 }}>
                <strong>Historique de dispensation</strong> — {pharmacySummary.recentDispenses.length} délivrance(s) récente(s)
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
        <h3 style={{ marginTop: 0 }}>3. Rechercher dans le stock</h3>
        {inventoryItems.length === 0 ? (
          <p>
            Aucun article en stock. Ajoutez ou réceptionnez du stock
            d&apos;abord.
          </p>
        ) : (
          <>
            <div style={{ marginBottom: 12 }}>
              <MedicationAutocomplete
                facilityId={facilityId}
                mode="dispense"
                placeholder="Rechercher dans le stock"
                onSelect={onMedicationSelect}
                favoritesFirst
              />
            </div>
            <div style={{ marginTop: 8 }}>
              <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>
                Article sélectionné
              </label>
              <select
                style={{ ...inputStyle, marginBottom: 0 }}
                value={inventoryItemId}
                onChange={(e) => setInventoryItemId(e.target.value)}
              >
                <option value="">— Choisir un article —</option>
                {inventoryItems.map((i) => (
                  <option key={i.id} value={i.id}>
                    {(i.catalogMedication as { displayNameFr?: string })?.displayNameFr ??
                      i.catalogMedication?.name}{" "}
                    — SKU {i.sku} — en stock {i.quantityOnHand}
                  </option>
                ))}
              </select>
            </div>
            {isLowStock && selectedInventoryItem && (
              <p
                style={{
                  marginTop: 8,
                  color: "#b45309",
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                Stock faible (seuil : {selectedInventoryItem.reorderLevel})
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
        <h3 style={{ marginTop: 0 }}>4. Détails</h3>
        <Field label="Quantité à délivrer">
          <input
            type="number"
            min={1}
            style={inputStyle}
            value={quantityDispensed}
            onChange={(e) => setQuantityDispensed(e.target.value)}
          />
        </Field>
        <Field label="Posologie">
          <textarea
            style={{ ...inputStyle, minHeight: 64 }}
            value={dosageInstructions}
            onChange={(e) => setDosageInstructions(e.target.value)}
            placeholder="Ex. 1 comprimé par jour"
          />
        </Field>
        <Field label="Notes (optionnel)">
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
            {submitting ? "Envoi…" : "Délivrer"}
          </button>
          <MedicationPrintButton label="Imprimer" />
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
    <Suspense fallback={<div style={{ padding: 24 }}>Chargement…</div>}>
      <PharmacyDispensePageContent />
    </Suspense>
  );
}
