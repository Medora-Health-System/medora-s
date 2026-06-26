"use client";

import React, { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { useI18n } from "@/lib/i18n";
import {
  buildErEdSummaryMarEventRows,
  buildErEdSummaryMedicationOrderRows,
  buildErEdSummaryMedicationResponseRows,
  buildErEdSummaryContinuousInfusionRows,
} from "@/features/emergency/erEdSummaryMedicationMar";
import { MedicationResponseSummaryCard } from "@/components/mar/MedicationResponseSummaryCard";
import { RespiratoryMedicationResponseSummaryCard } from "@/components/mar/RespiratoryMedicationResponseSummaryCard";
import type {
  ParsedMarMedicationResponse,
  ParsedRespiratoryMedicationResponse,
} from "@medora/shared";
import { formatEncounterChromeDateTime } from "@/lib/encounterChromeI18n";

export function ErMedicationMarSummaryCard({
  encounterId,
  facilityId,
  refreshToken,
  enabled,
}: {
  encounterId: string;
  facilityId: string;
  refreshToken: number;
  enabled: boolean;
}) {
  const { t, language } = useI18n();
  const [state, setState] = useState<{
    loading: boolean;
    error: boolean;
    orders: unknown[];
    admins: unknown[];
    orderEvents: unknown[];
  }>({ loading: false, error: false, orders: [], admins: [], orderEvents: [] });

  useEffect(() => {
    if (!enabled || !encounterId || !facilityId) {
      setState({ loading: false, error: false, orders: [], admins: [], orderEvents: [] });
      return;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: false }));
    void (async () => {
      try {
        const [ordersRaw, adminsRaw, orderEventsRaw] = await Promise.all([
          apiFetch(`/encounters/${encounterId}/orders`, { facilityId }),
          apiFetch(`/encounters/${encounterId}/medication-administrations`, { facilityId }),
          apiFetch(`/encounters/${encounterId}/order-events`, { facilityId }).catch(() => []),
        ]);
        if (cancelled) return;
        setState({
          loading: false,
          error: false,
          orders: Array.isArray(ordersRaw) ? ordersRaw : [],
          admins: Array.isArray(adminsRaw) ? adminsRaw : [],
          orderEvents: Array.isArray(orderEventsRaw) ? orderEventsRaw : [],
        });
      } catch {
        if (!cancelled) {
          setState({ loading: false, error: true, orders: [], admins: [], orderEvents: [] });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [encounterId, facilityId, refreshToken, enabled]);

  const medicationOrders = useMemo(
    () => buildErEdSummaryMedicationOrderRows({ orders: state.orders, language, t }),
    [state.orders, language, t]
  );
  const marEvents = useMemo(
    () => buildErEdSummaryMarEventRows({ admins: state.admins, language, t }),
    [state.admins, language, t]
  );
  const medicationResponses = useMemo(
    () => buildErEdSummaryMedicationResponseRows({ admins: state.admins, language }),
    [state.admins, language]
  );
  const continuousInfusions = useMemo(
    () =>
      buildErEdSummaryContinuousInfusionRows({
        orders: state.orders,
        orderEvents: state.orderEvents,
        language,
        t,
      }),
    [state.orders, state.orderEvents, language, t]
  );
  const formatInstant = useMemo(
    () => (iso: string | null | undefined) => {
      if (!iso?.trim()) return null;
      try {
        return formatEncounterChromeDateTime(iso, language);
      } catch {
        return iso;
      }
    },
    [language]
  );

  if (!enabled) return null;

  const shell: React.CSSProperties = {
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    background: "#fff",
    padding: "14px 16px",
  };
  const titleStyle: React.CSSProperties = {
    margin: 0,
    fontSize: 14,
    fontWeight: 700,
    color: "#0f172a",
  };
  const subStyle: React.CSSProperties = {
    margin: "4px 0 0 0",
    fontSize: 12,
    color: "#64748b",
    lineHeight: 1.45,
  };
  const rowStyle: React.CSSProperties = {
    marginTop: 10,
    paddingTop: 10,
    borderTop: "1px solid #f1f5f9",
    fontSize: 12,
    color: "#334155",
    lineHeight: 1.5,
  };

  if (state.loading) {
    return (
      <div style={shell}>
        <p style={titleStyle}>{t("emergencyVisitSummaryPanel.medicationMarTitle")}</p>
        <p style={subStyle}>{t("common.loading")}</p>
      </div>
    );
  }

  if (state.error) {
    return (
      <div style={shell}>
        <p style={titleStyle}>{t("emergencyVisitSummaryPanel.medicationMarTitle")}</p>
        <p style={{ ...subStyle, color: "#92400e" }}>{t("emergencyVisitSummaryPanel.medicationMarLoadError")}</p>
      </div>
    );
  }

  if (medicationOrders.length === 0 && marEvents.length === 0 && medicationResponses.length === 0 && continuousInfusions.length === 0) {
    return (
      <div style={shell}>
        <p style={titleStyle}>{t("emergencyVisitSummaryPanel.medicationMarTitle")}</p>
        <p style={subStyle}>{t("emergencyVisitSummaryPanel.medicationMarEmpty")}</p>
      </div>
    );
  }

  return (
    <div style={shell}>
      <p style={titleStyle}>{t("emergencyVisitSummaryPanel.medicationMarTitle")}</p>
      <p style={subStyle}>{t("emergencyVisitSummaryPanel.medicationMarSubline")}</p>

      {medicationOrders.length > 0 ? (
        <div style={{ marginTop: 12 }}>
          <p style={{ ...titleStyle, fontSize: 13 }}>{t("emergencyVisitSummaryPanel.medicationOrdersTitle")}</p>
          {medicationOrders.map((row) => (
            <div key={row.id} style={rowStyle}>
              <strong>{row.medicationName}</strong>
              <div>
                {t("emergencyVisitSummaryPanel.medOrderDose")}: {row.dose} · {t("emergencyVisitSummaryPanel.medOrderRoute")}: {row.route}
              </div>
              <div>
                {t("emergencyVisitSummaryPanel.medOrderInstructions")}: {row.instructions}
              </div>
              <div>
                {t("emergencyVisitSummaryPanel.medOrderOrderedBy")}: {row.orderedBy} · {row.orderedAt}
              </div>
              <div>
                {t("emergencyVisitSummaryPanel.medOrderStatus")}: {row.status}
              </div>
              {row.lifecycleSummaryLine ? (
                <div data-testid="medication-order-lifecycle-summary-line" style={{ color: "#92400e" }}>
                  {row.lifecycleSummaryLine}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {marEvents.length > 0 ? (
        <div style={{ marginTop: 12 }}>
          <p style={{ ...titleStyle, fontSize: 13 }}>{t("emergencyVisitSummaryPanel.marEventsTitle")}</p>
          {marEvents.map((row) => (
            <div key={row.id} style={rowStyle}>
              <strong>{row.medicationName}</strong>
              <div>
                {t("emergencyVisitSummaryPanel.marAction")}: {row.action} · {t("emergencyVisitSummaryPanel.marDose")}: {row.dose} · {t("emergencyVisitSummaryPanel.marRoute")}: {row.route}
              </div>
              {row.injectionSite !== "—" ? (
                <div>
                  {t("emergencyVisitSummaryPanel.marInjectionSite")}: {row.injectionSite}
                </div>
              ) : null}
              <div>
                {t("emergencyVisitSummaryPanel.marAdministeredBy")}: {row.administeredBy} · {row.administeredAt}
              </div>
              {row.notes !== "—" ? (
                <div>
                  {t("emergencyVisitSummaryPanel.marNotes")}: {row.notes}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {continuousInfusions.length > 0 ? (
        <div style={{ marginTop: 12 }} data-testid="encounter-summary-continuous-infusions">
          <p style={{ ...titleStyle, fontSize: 13 }}>
            {t("emergencyVisitSummaryPanel.continuousInfusionsTitle")}
          </p>
          {continuousInfusions.map((row) => (
            <div key={row.id} style={rowStyle} data-testid="encounter-summary-continuous-infusion-row">
              <strong>{row.medicationName}</strong> — {row.statusLabel}
              <div>
                {t("emergencyVisitSummaryPanel.infusionStartedAt")}: {row.startedAt}
                {row.stoppedAt !== "—" ? ` · ${t("emergencyVisitSummaryPanel.infusionStoppedAt")}: ${row.stoppedAt}` : ""}
              </div>
              <div>
                {t("emergencyVisitSummaryPanel.infusionDuration")}: {row.duration}
                {row.finalRate !== "—" ? ` · ${t("emergencyVisitSummaryPanel.infusionFinalRate")}: ${row.finalRate}` : ""}
                {row.highestRate !== "—" ? ` · ${t("emergencyVisitSummaryPanel.infusionHighestRate")}: ${row.highestRate}` : ""}
              </div>
              <div>
                {t("emergencyVisitSummaryPanel.infusionBagChanges")}: {row.bagChanges}
                {" · "}
                {t("emergencyVisitSummaryPanel.infusionPumpChanges")}: {row.pumpChanges}
                {" · "}
                {t("emergencyVisitSummaryPanel.infusionLineChanges")}: {row.lineChanges}
                {" · "}
                {t("emergencyVisitSummaryPanel.infusionPauseRestart")}: {row.pauseRestart}
              </div>
              {row.stopReason !== "—" ? (
                <div>
                  {t("emergencyVisitSummaryPanel.infusionStopReason")}: {row.stopReason}
                </div>
              ) : null}
              {row.documentedBy !== "—" ? (
                <div>
                  {t("emergencyVisitSummaryPanel.infusionDocumentedBy")}: {row.documentedBy}
                </div>
              ) : null}
              {row.timeline.length > 0 ? (
                <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                  {row.timeline.map((event, index) => (
                    <li key={`${row.id}:timeline:${index}`}>
                      <strong>{event.label}</strong>
                      {event.detail !== "—" ? ` · ${event.detail}` : ""}
                      <div style={{ color: "#64748b" }}>
                        {event.at}
                        {event.by !== "—" ? ` · ${event.by}` : ""}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {medicationResponses.length > 0 ? (
        <div style={{ marginTop: 12 }} data-testid="encounter-summary-medication-responses">
          <p style={{ ...titleStyle, fontSize: 13 }}>
            {t("emergencyVisitSummaryPanel.medicationResponsesTitle")}
          </p>
          {medicationResponses.map((row) => (
            <div key={row.id} style={rowStyle} data-testid="encounter-summary-medication-response-row">
              <strong>
                {[row.medicationName, row.dose !== "—" ? row.dose : null, row.route !== "—" ? row.route : null]
                  .filter(Boolean)
                  .join(" ")}
              </strong>
              <div>
                {t("emergencyVisitSummaryPanel.medResponseAdministered")}: {row.administeredAt}
              </div>
              {row.responseKind === "respiratory" ? (
                <RespiratoryMedicationResponseSummaryCard
                  response={row.response as ParsedRespiratoryMedicationResponse}
                  formatInstant={formatInstant}
                  t={t}
                  compact
                />
              ) : (
                <MedicationResponseSummaryCard
                  response={row.response as ParsedMarMedicationResponse}
                  formatInstant={formatInstant}
                  t={t}
                  compact
                />
              )}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
