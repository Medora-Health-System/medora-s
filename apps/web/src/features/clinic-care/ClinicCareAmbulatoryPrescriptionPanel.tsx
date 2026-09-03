/**
 * MEDUI.D4C.5B.3 / D4C.7E / D4C.7G — Ambulatory Rx tile: take-home / external prescriptions ONLY.
 * Filters OrderItem.medicationFulfillmentIntent === PHARMACY_DISPENSE + MEDICATION.
 * Strict OUTPATIENT_RX_ONLY CreateOrderModal mode — no Protocols/Lab/Imaging/Soins / administer.
 * External pharmacy selection is destination-only (not internal Pharmacy worklist).
 */

"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CreateOrderModal } from "@/components/orders";
import { buildRxPrintFacilityIdentity, printRx } from "@/components/pharmacy/RxPrintLayout";
import { apiFetch } from "@/lib/apiClient";
import { useI18n } from "@/lib/i18n";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import { resolveProductUiLanguageOrDefault } from "@/i18n/config";
import { getOrderItemDisplayLabelFromLocale } from "@/lib/orderItemDisplayFr";

import {
  D4C5B3_RX_LIST_FILTERS,
  ambulatoryOrderStatusDisplayKey,
  ambulatoryMedicationRouteDisplayKey,
  ambulatoryRxListFilterDisplayKey,
  canPrintAmbulatoryExternalPrescriptions,
  externalPharmacySendStatusDisplayKey,
  filterAmbulatoryExternalPrescriptionOrders,
  localizeAmbulatoryMedicationSigForFrenchDisplay,
  matchesAmbulatoryRxListFilter,
  projectPersistedOutpatientPrescriptionPrintLines,
  resolveExternalPharmacySendStatus,
  validateOutpatientPrescriptionPrintProjection,
  type D4c5b3RxListFilter,
  type D4c7ePersistedOrderItemLike,
} from "@medora/shared";

type MedOrderRow = {
  id: string;
  status?: string | null;
  createdAt?: string | null;
  prescriberName?: string | null;
  prescriberLicense?: string | null;
  items?: Array<{
    id?: string;
    displayLabel?: string | null;
    displayLabelFr?: string | null;
    displayLabelEn?: string | null;
    freeText?: string | null;
    notes?: string | null;
    route?: string | null;
    strength?: string | null;
    quantity?: number | null;
    refillCount?: number | null;
    medicationFulfillmentIntent?: string | null;
    catalogItemType?: string | null;
    catalogItem?: { category?: string; type?: string; name?: string } | null;
    catalogMedication?: {
      code?: string | null;
      displayNameFr?: string | null;
      name?: string;
      strength?: string | null;
      dosageForm?: string | null;
      route?: string | null;
    } | null;
  }>;
};

function itemLabel(
  it: NonNullable<MedOrderRow["items"]>[number],
  language: string
): string {
  return getOrderItemDisplayLabelFromLocale(it, resolveProductUiLanguageOrDefault(language));
}

export function ClinicCareAmbulatoryPrescriptionPanel({
  encounterId,
  facilityId,
  facilityDisplayName = null,
  facilityCareProfileJson = null,
  canPrescribe,
  encounter,
  isLocked,
  onUpdate,
}: {
  encounterId: string;
  facilityId: string;
  facilityDisplayName?: string | null;
  facilityCareProfileJson?: unknown;
  canPrescribe: boolean;
  encounter: {
    status?: string | null;
    patient?: {
      firstName?: string | null;
      lastName?: string | null;
      mrn?: string | null;
    } | null;
  };
  isLocked: boolean;
  onUpdate: () => void | Promise<void>;
}) {
  const { t, language } = useI18n();
  const [orders, setOrders] = useState<MedOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState<D4c5b3RxListFilter>("ALL_MEDICATIONS");
  const [printError, setPrintError] = useState<string | null>(null);
  const [pharmacyQuery, setPharmacyQuery] = useState("");
  const [selectedPharmacy, setSelectedPharmacy] = useState("");
  const [showPharmacyBoard, setShowPharmacyBoard] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await apiFetch(`/encounters/${encounterId}/orders`, { facilityId });
      const list = Array.isArray(raw)
        ? raw
        : raw && typeof raw === "object" && Array.isArray((raw as { orders?: unknown }).orders)
          ? (raw as { orders: unknown[] }).orders
          : [];
      setOrders(list as MedOrderRow[]);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [encounterId, facilityId]);

  useEffect(() => {
    void load();
  }, [load]);

  const rxOrders = useMemo(() => filterAmbulatoryExternalPrescriptionOrders(orders), [orders]);
  const filtered = useMemo(
    () => rxOrders.filter((o) => matchesAmbulatoryRxListFilter(o, filter)),
    [rxOrders, filter]
  );

  const sendStatus = resolveExternalPharmacySendStatus({
    pharmacySelected: selectedPharmacy.trim().length > 0,
    ePrescribingConnectorAvailable: false,
  });

  const canOpen = canPrescribe && !isLocked && (encounter.status ?? "") === "OPEN";

  const handlePrint = () => {
    setPrintError(null);
    const gate = canPrintAmbulatoryExternalPrescriptions(rxOrders);
    if (!gate.ok) {
      setPrintError(t("clinicCareD4c7e.rx.printBlockedEmpty"));
      return;
    }
    const first = rxOrders[0];
    if (!first) {
      setPrintError(t("clinicCareD4c7e.rx.printBlockedEmpty"));
      return;
    }
    const persistedItems = rxOrders.flatMap((row) =>
      (row.items ?? []).map((it) => ({
        ...it,
        displayLabel: itemLabel(it, language) || it.displayLabel,
      }))
    ) as D4c7ePersistedOrderItemLike[];
    const lang = resolveProductUiLanguageOrDefault(language);
    const projection = validateOutpatientPrescriptionPrintProjection(persistedItems, lang);
    if (!projection.ok) {
      setPrintError(t(projection.reasonKey));
      return;
    }
    const printItems = projectPersistedOutpatientPrescriptionPrintLines(persistedItems, lang).map(
      (it) => ({
        ...it,
        notes:
          language === "fr"
            ? localizeAmbulatoryMedicationSigForFrenchDisplay(it.notes) || it.notes || null
            : it.notes ?? null,
      })
    );
    if (printItems.length === 0) {
      setPrintError(t("clinicCareD4c7h.rx.printNoLines"));
      return;
    }
    const facilityIdentity = buildRxPrintFacilityIdentity({
      facilityName: facilityDisplayName,
      careProfileJson: facilityCareProfileJson,
    });
    const result = printRx({
      order: {
        createdAt: first.createdAt ?? new Date().toISOString(),
        status: first.status ?? null,
        prescriberName: first.prescriberName ?? null,
        prescriberLicense: first.prescriberLicense ?? null,
        items: printItems,
      },
      patient: {
        firstName: encounter.patient?.firstName,
        lastName: encounter.patient?.lastName,
        mrn: encounter.patient?.mrn,
      },
      facilityIdentity,
      language: resolveProductUiLanguageOrDefault(language),
      requireFacilityIdentity: true,
    });
    if (!result.ok) {
      setPrintError(t(result.messageKey));
    }
  };

  return (
    <div style={{ ...MEDORA_CARD_SHELL, padding: "14px 16px" }} data-testid="clinic-care-ambulatory-prescriptions">
      <h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
        {t("clinicCareD4c5b3.rx.title")}
      </h3>
      <p style={{ margin: "0 0 12px", fontSize: 12, color: "#64748b" }}>{t("clinicCareD4c5b3.rx.hint")}</p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        {D4C5B3_RX_LIST_FILTERS.map((f) => {
          const active = filter === f;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              style={{
                height: 28,
                padding: "0 10px",
                borderRadius: 999,
                border: active ? "1px solid #c026d3" : "1px solid #e2e8f0",
                background: active ? "rgba(192,38,211,0.12)" : "#fff",
                color: active ? "#a21caf" : "#334155",
                fontSize: 12,
                fontWeight: active ? 700 : 600,
                cursor: "pointer",
              }}
            >
              {t(ambulatoryRxListFilterDisplayKey(f))}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        {canOpen ? (
          <button
            type="button"
            data-testid="clinic-care-ambulatory-rx-new"
            onClick={() => setShowModal(true)}
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              border: "none",
              background: "#c026d3",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              minHeight: 40,
            }}
          >
            {t("clinicCareD4c5b3.rx.newPrescription")}
          </button>
        ) : null}
        <button
          type="button"
          data-testid="clinic-care-ambulatory-rx-print"
          onClick={handlePrint}
          style={{
            padding: "10px 16px",
            borderRadius: 10,
            border: "1px solid #e2e8f0",
            background: "#fff",
            color: "#0f172a",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            minHeight: 40,
          }}
        >
          {t("clinicCareD4c5b3.rx.print")}
        </button>
        <button
          type="button"
          data-testid="clinic-care-ambulatory-rx-pharmacy-board"
          onClick={() => setShowPharmacyBoard((v) => !v)}
          style={{
            padding: "10px 16px",
            borderRadius: 10,
            border: "1px solid #e2e8f0",
            background: showPharmacyBoard ? "rgba(15,23,42,0.06)" : "#fff",
            color: "#0f172a",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            minHeight: 40,
          }}
        >
          {t("clinicCareD4c7e.externalPharmacy.title")}
        </button>
      </div>

      {showPharmacyBoard ? (
        <div
          data-testid="clinic-care-ambulatory-external-pharmacy-board"
          style={{
            marginBottom: 12,
            padding: "12px 14px",
            borderRadius: 10,
            border: "1px solid #e2e8f0",
            background: "#f8fafc",
          }}
        >
          <p style={{ margin: "0 0 8px", fontSize: 12, color: "#64748b" }}>
            {t("clinicCareD4c7e.externalPharmacy.hint")}
          </p>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
            {t("clinicCareD4c7e.externalPharmacy.preferredLabel")}
          </label>
          <input
            type="search"
            value={pharmacyQuery}
            onChange={(e) => setPharmacyQuery(e.target.value)}
            placeholder={t("clinicCareD4c7e.externalPharmacy.searchPlaceholder")}
            style={{
              width: "100%",
              maxWidth: 420,
              height: 36,
              padding: "0 10px",
              borderRadius: 10,
              border: "1px solid #cbd5e1",
              fontSize: 13,
              marginBottom: 8,
            }}
          />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
            <button
              type="button"
              onClick={() => {
                const next = pharmacyQuery.trim();
                if (next) setSelectedPharmacy(next);
              }}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "none",
                background: "#0f172a",
                color: "#fff",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {t("clinicCareD4c7e.externalPharmacy.confirm")}
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedPharmacy("");
                setPharmacyQuery("");
              }}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                background: "#fff",
                color: "#334155",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {t("clinicCareD4c7e.externalPharmacy.clear")}
            </button>
          </div>
          {selectedPharmacy ? (
            <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
              {selectedPharmacy}
            </p>
          ) : null}
          <p role="status" style={{ margin: 0, fontSize: 12, color: "#b45309" }}>
            {t(externalPharmacySendStatusDisplayKey(sendStatus))}
          </p>
        </div>
      ) : null}

      {printError ? (
        <p role="alert" style={{ margin: "0 0 10px", fontSize: 13, color: "#b91c1c" }}>
          {printError}
        </p>
      ) : null}

      {loading ? (
        <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{t("common.loading")}</p>
      ) : filtered.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{t("clinicCareD4c5b3.rx.empty")}</p>
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((row) => {
            const labels = (row.items ?? [])
              .map((it) => {
                const name = itemLabel(it, language);
                const routeKey = ambulatoryMedicationRouteDisplayKey(it.route ?? it.catalogMedication?.route);
                const routeLabel = t(routeKey);
                const sig =
                  language === "fr"
                    ? localizeAmbulatoryMedicationSigForFrenchDisplay(it.notes)
                    : (it.notes ?? "").trim();
                return [name, routeLabel !== t("clinicCareD4c5b3.route.other") ? routeLabel : null, sig]
                  .filter(Boolean)
                  .join(" · ");
              })
              .filter(Boolean);
            return (
              <li
                key={row.id}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  padding: "10px 12px",
                  background: "#fff",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
                  {labels.join(" · ") || t("clinicCareD4c5b3.rx.untitled")}
                </div>
                <div style={{ marginTop: 4, fontSize: 12, color: "#64748b" }}>
                  {t(ambulatoryOrderStatusDisplayKey(row.status))} · {t("clinicCareD4c5b3.destination.externalRx")}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {showModal ? (
        <CreateOrderModal
          encounterId={encounterId}
          facilityId={facilityId}
          canPrescribe={canPrescribe}
          encounter={
            encounter.patient
              ? {
                  patient: {
                    firstName: encounter.patient.firstName ?? undefined,
                    lastName: encounter.patient.lastName ?? undefined,
                    mrn: encounter.patient.mrn ?? undefined,
                  },
                }
              : undefined
          }
          initialOrderTab="MEDICATION"
          medicationOrderMode="OUTPATIENT_RX_ONLY"
          onClose={() => setShowModal(false)}
          onSuccess={async () => {
            setShowModal(false);
            await load();
            await onUpdate();
          }}
        />
      ) : null}
    </div>
  );
}
