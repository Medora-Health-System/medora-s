/**
 * MEDUI.D4C.5B.2 — Ambulatory Rx / prescription tile.
 * Reuses CreateOrderModal (DEFAULT medication mode) + shared order list — no ClinicPrescription.
 */

"use client";

import React, { useCallback, useEffect, useState } from "react";
import { CreateOrderModal } from "@/components/orders";
import { apiFetch } from "@/lib/apiClient";
import { useI18n } from "@/lib/i18n";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import { ambulatoryOrderStatusDisplayKey } from "@medora/shared";

type MedOrderRow = {
  id: string;
  status?: string | null;
  items?: Array<{
    id?: string;
    displayLabel?: string | null;
    displayLabelFr?: string | null;
    displayLabelEn?: string | null;
    freeText?: string | null;
    catalogItem?: { category?: string; type?: string; name?: string } | null;
  }>;
};

function itemLabel(
  it: NonNullable<MedOrderRow["items"]>[number],
  language: string
): string {
  if (language === "fr") {
    return (
      (it.displayLabelFr ?? "").trim() ||
      (it.displayLabel ?? "").trim() ||
      (it.freeText ?? "").trim() ||
      (it.catalogItem?.name ?? "").trim() ||
      ""
    );
  }
  return (
    (it.displayLabelEn ?? "").trim() ||
    (it.displayLabel ?? "").trim() ||
    (it.freeText ?? "").trim() ||
    (it.catalogItem?.name ?? "").trim() ||
    ""
  );
}

export function ClinicCareAmbulatoryPrescriptionPanel({
  encounterId,
  facilityId,
  canPrescribe,
  encounter,
  isLocked,
  onUpdate,
}: {
  encounterId: string;
  facilityId: string;
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

  const canOpen = canPrescribe && !isLocked && (encounter.status ?? "") === "OPEN";

  return (
    <div style={{ ...MEDORA_CARD_SHELL, padding: "14px 16px" }} data-testid="clinic-care-ambulatory-prescriptions">
      <h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
        {t("clinicCareD4c5b2.rx.title")}
      </h3>
      <p style={{ margin: "0 0 12px", fontSize: 12, color: "#64748b" }}>{t("clinicCareD4c5b2.rx.hint")}</p>

      {canOpen ? (
        <button
          type="button"
          data-testid="clinic-care-ambulatory-rx-new"
          onClick={() => setShowModal(true)}
          style={{
            marginBottom: 12,
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
          {t("clinicCareD4c5b2.rx.newPrescription")}
        </button>
      ) : null}

      {loading ? (
        <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{t("common.loading")}</p>
      ) : orders.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{t("clinicCareD4c5b2.rx.empty")}</p>
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
          {orders.map((row) => {
            const labels = (row.items ?? [])
              .slice(0, 4)
              .map((it) => itemLabel(it, language))
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
                  {labels.join(" · ") || t("clinicCareD4c5b2.rx.untitled")}
                </div>
                <div style={{ marginTop: 4, fontSize: 12, color: "#64748b" }}>
                  {t(ambulatoryOrderStatusDisplayKey(row.status))}
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
          medicationOrderMode="DEFAULT"
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
