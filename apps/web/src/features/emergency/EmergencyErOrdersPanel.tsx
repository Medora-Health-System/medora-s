"use client";

import React, { useEffect, useMemo, useState } from "react";
import { fetchOrdersForEncounter } from "@/lib/clinicalWorklistApi";
import { getOrderItemDisplayLabelForLanguage } from "@/lib/orderItemDisplayFr";
import type { SupportedLanguage } from "@/i18n/config";
import { useI18n } from "@/lib/i18n";
import { CreateOrderModal } from "@/components/orders";
import type { OrderModalTab } from "@/components/orders/createOrderModal/types";
import { MedoraCard, MedoraCardInner } from "@/components/medora-card";
import { type ErOrderDomain } from "@/features/emergency/erOrderWorkspace";
import { TraumaProtocolAssistPanel } from "@/features/emergency/TraumaProtocolAssistPanel";

const btn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid #bfdbfe",
  backgroundColor: "#eff6ff",
  color: "#1d4ed8",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
  boxSizing: "border-box",
  minHeight: 40,
};

const DOMAIN_ORDER: ErOrderDomain[] = ["LAB", "IMAGING", "MEDICATION", "CARE"];

function domainHeadingKey(d: ErOrderDomain): string {
  switch (d) {
    case "LAB":
      return "erEmergencyOrders.domainLab";
    case "IMAGING":
      return "erEmergencyOrders.domainImaging";
    case "MEDICATION":
      return "erEmergencyOrders.domainMedication";
    case "CARE":
      return "erEmergencyOrders.domainCare";
    default:
      return d;
  }
}

function extractLineLabelsForDomain(
  orders: unknown[],
  domain: ErOrderDomain,
  language: SupportedLanguage,
  tr: (k: string) => string
): string[] {
  const out: string[] = [];
  const typeStr =
    domain === "LAB"
      ? "LAB"
      : domain === "IMAGING"
        ? "IMAGING"
        : domain === "MEDICATION"
          ? "MEDICATION"
          : "CARE";
  for (const raw of orders) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const o = raw as Record<string, unknown>;
    if (o.type !== typeStr) continue;
    const items = Array.isArray(o.items) ? o.items : [];
    for (const it of items) {
      const label = getOrderItemDisplayLabelForLanguage(
        it as Parameters<typeof getOrderItemDisplayLabelForLanguage>[0],
        language,
        tr
      );
      if (label.trim()) out.push(label.trim());
    }
  }
  return out;
}

type EncounterPatientForOrder = {
  patient?: { firstName?: string | null; lastName?: string | null; mrn?: string | null } | null;
};

export function EmergencyErOrdersPanel({
  encounterId,
  facilityId,
  canPrescribe,
  encounterForOrderModal,
  onRefetchEncounter,
  onOrdersCreated,
  encounterType,
  vitalsJsonForTraumaProtocol,
  roles,
  cdsIntent,
  onConsumeIntent,
}: {
  encounterId: string;
  facilityId: string;
  canPrescribe: boolean;
  encounterForOrderModal: EncounterPatientForOrder | null | undefined;
  onRefetchEncounter: () => Promise<void>;
  onOrdersCreated?: () => void | Promise<void>;
  /** Pour assistant protocole trauma (urgences + triage activé). Absent tant que le triage n&apos;est pas chargé. */
  encounterType?: string | null;
  vitalsJsonForTraumaProtocol?: unknown | null;
  roles?: string[];
  /** CDS v2 — one-shot preselect intent (workspace only). */
  cdsIntent?: string | null;
  onConsumeIntent?: () => void;
}) {
  const { t, language } = useI18n();
  const [ordersRaw, setOrdersRaw] = useState<unknown[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [ordersRefresh, setOrdersRefresh] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createModalInitialTab, setCreateModalInitialTab] = useState<OrderModalTab>("LAB");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const orders = await fetchOrdersForEncounter(facilityId, encounterId);
        if (!cancelled) setOrdersRaw(Array.isArray(orders) ? orders : []);
      } catch {
        if (!cancelled) setOrdersRaw(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [encounterId, facilityId, ordersRefresh]);

  const labelsByDomain = useMemo(() => {
    if (!ordersRaw) return null;
    const rec: Record<ErOrderDomain, string[]> = {
      LAB: extractLineLabelsForDomain(ordersRaw, "LAB", language, t),
      IMAGING: extractLineLabelsForDomain(ordersRaw, "IMAGING", language, t),
      MEDICATION: extractLineLabelsForDomain(ordersRaw, "MEDICATION", language, t),
      CARE: extractLineLabelsForDomain(ordersRaw, "CARE", language, t),
    };
    return rec;
  }, [ordersRaw, language, t]);

  const openModal = (tab: OrderModalTab) => {
    setCreateModalInitialTab(tab);
    setShowCreateModal(true);
  };

  return (
    <MedoraCard leftAccentColor="#7c3aed" variant="default">
      <MedoraCardInner>
        {roles !== undefined ? (
          <TraumaProtocolAssistPanel
            encounterId={encounterId}
            facilityId={facilityId}
            encounterType={encounterType}
            vitalsJson={vitalsJsonForTraumaProtocol ?? null}
            roles={roles}
            canPrescribe={canPrescribe}
            onRefetchEncounter={onRefetchEncounter}
            onOrdersApplied={async () => {
              setOrdersRefresh((x) => x + 1);
              await onOrdersCreated?.();
            }}
            cdsIntent={cdsIntent}
            onConsumeIntent={onConsumeIntent}
          />
        ) : null}
        {loading ? (
          <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{t("common.loading")}</p>
        ) : labelsByDomain == null ? (
          <p style={{ margin: 0, fontSize: 13, color: "#b91c1c" }}>{t("erEmergencyOrders.loadOrdersError")}</p>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 12,
              width: "100%",
              alignItems: "stretch",
            }}
          >
            <div
              style={{
                flex: "1 1 200px",
                minWidth: 0,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                alignContent: "start",
              }}
            >
              <button type="button" onClick={() => openModal("LAB")} style={btn}>
                {t("erEmergencyOrders.quickLab")}
              </button>
              <button type="button" onClick={() => openModal("IMAGING")} style={btn}>
                {t("erEmergencyOrders.quickImaging")}
              </button>
              <button type="button" onClick={() => openModal("MEDICATION")} style={btn}>
                {t("erEmergencyOrders.quickMedication")}
              </button>
              <button type="button" onClick={() => openModal("CARE")} style={btn}>
                {t("erEmergencyOrders.quickCare")}
              </button>
            </div>

            <div
              style={{
                flex: "1 1 200px",
                minWidth: 0,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                alignContent: "start",
              }}
            >
              {DOMAIN_ORDER.map((d) => {
                const lines = labelsByDomain[d];
                const empty = lines.length === 0;
                return (
                  <div
                    key={d}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 10,
                      border: empty ? "1px dashed #cbd5e1" : "1px solid #e2e8f0",
                      backgroundColor: empty ? "#fafafa" : "#fff",
                      fontSize: 11,
                      color: "#334155",
                      lineHeight: 1.35,
                      minHeight: 72,
                    }}
                  >
                    <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>{t(domainHeadingKey(d))}</div>
                    {empty ? (
                      <div style={{ color: "#64748b" }}>{t("erEmergencyOrders.emptyDomain")}</div>
                    ) : (
                      <ul style={{ margin: 0, paddingLeft: 14, maxHeight: 120, overflow: "auto" }}>
                        {lines.slice(0, 12).map((line, i) => (
                          <li key={`${d}-${i}`} style={{ marginBottom: 2 }}>
                            {line}
                          </li>
                        ))}
                        {lines.length > 12 ? (
                          <li style={{ color: "#64748b", listStyle: "none", marginLeft: -14 }}>
                            {t("erEmergencyOrders.moreItems").replace(
                              "{count}",
                              String(lines.length - 12)
                            )}
                          </li>
                        ) : null}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </MedoraCardInner>

      {showCreateModal ? (
        <CreateOrderModal
          key={`${encounterId}-${createModalInitialTab}-${ordersRefresh}`}
          encounterId={encounterId}
          facilityId={facilityId}
          canPrescribe={canPrescribe}
          encounter={
            encounterForOrderModal?.patient
              ? {
                  patient: {
                    firstName: encounterForOrderModal.patient.firstName ?? undefined,
                    lastName: encounterForOrderModal.patient.lastName ?? undefined,
                    mrn: encounterForOrderModal.patient.mrn ?? undefined,
                  },
                }
              : undefined
          }
          initialOrderTab={createModalInitialTab}
          onClose={() => setShowCreateModal(false)}
          onRefetchEncounter={onRefetchEncounter}
          onSuccess={async () => {
            setShowCreateModal(false);
            setOrdersRefresh((x) => x + 1);
            await onOrdersCreated?.();
          }}
        />
      ) : null}
    </MedoraCard>
  );
}
