/**
 * MEDUI.D4C.6 — Ambulatory results inbox (Clinic Care projection).
 * Groups over enterprise Result; ack via POST /orders/:id/result/acknowledge only.
 * Critical / abnormal use text + badges (not color-only).
 */

"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CLINIC_CARE_AMBULATORY_RESULT_INBOX_GROUPS,
  clinicCareAmbulatoryResultMatchesGroup,
  clinicCareAmbulatoryResultsChartPath,
  classifyClinicCareAmbulatoryResult,
  resolveClinicCareAmbulatoryResultsInboxAccess,
  resolveClinicWorkspaceAccess,
  type ClinicCareAmbulatoryResultInboxGroup,
} from "@medora/shared";
import { apiFetch } from "@/lib/apiClient";
import { invalidateGetRequestDedupeForPath } from "@/lib/getRequestDedupe";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import { ClinicCareShell } from "./ClinicCareShell";
import { CLINIC_CARE_SHELL } from "./clinicCareTokens";

type ResultInboxRow = {
  orderItemId: string;
  orderId: string;
  encounterId: string;
  patientId: string;
  patientName: string;
  mrn: string | null;
  catalogItemType: string;
  status: string;
  label: string;
  critical: boolean;
  abnormal: boolean;
  preliminary: boolean;
  finalLike: boolean;
  acknowledged: boolean;
  primaryGroup: string;
  groups: string[];
  acknowledgedByProviderAt: string | null;
  acknowledgedByUserId: string | null;
  verifiedAt: string | null;
  resultPreview: string | null;
};

type ResultsInboxPayload = {
  rows: ResultInboxRow[];
  groupCounts?: Record<string, number>;
  truncated?: boolean;
  access?: { canViewInbox: boolean; canAcknowledgeResults: boolean; techSafeOnly: boolean };
  authority?: { acknowledgeCommentDeferred?: boolean };
  facilityTimeZone?: string;
};

const filterChip = (active: boolean): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  height: 28,
  padding: "0 10px",
  borderRadius: 999,
  border: active ? `1px solid ${CLINIC_CARE_SHELL.accent}` : `1px solid ${CLINIC_CARE_SHELL.border}`,
  background: active ? "rgba(13,148,136,0.12)" : "#fff",
  color: active ? "#0f766e" : "#334155",
  fontSize: 12,
  fontWeight: active ? 700 : 600,
  cursor: "pointer",
});

function groupLabelKey(g: ClinicCareAmbulatoryResultInboxGroup): string {
  const map: Record<ClinicCareAmbulatoryResultInboxGroup, string> = {
    CRITICAL: "clinicCareD4c6.groups.critical",
    ABNORMAL: "clinicCareD4c6.groups.abnormal",
    NEW_FINAL: "clinicCareD4c6.groups.newFinal",
    PRELIMINARY: "clinicCareD4c6.groups.preliminary",
    ACKNOWLEDGED: "clinicCareD4c6.groups.acknowledged",
    ALL: "clinicCareD4c6.groups.all",
  };
  return map[g];
}

export function ClinicCareAmbulatoryResultsInboxView() {
  const { t, language } = useI18n();
  const locale = language === "en" ? "en-US" : "fr-FR";
  const {
    facilityId,
    roles,
    ready,
    facilityType,
    facilityServiceLines,
    careProfileJson,
    facilityCountry,
    facilityTimeZone,
  } = useFacilityAndRoles();

  const resolved = ready
    ? resolveClinicWorkspaceAccess({
        roleCodes: roles,
        facilityType,
        facilityServiceLines,
        careProfileJson,
        facilityCountry,
      })
    : null;

  const inboxAccess = resolved
    ? resolveClinicCareAmbulatoryResultsInboxAccess({
        professionGroup: resolved.professionGroup,
        access: resolved.access,
        roleCodes: roles,
      })
    : null;

  const [data, setData] = useState<ResultsInboxPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [group, setGroup] = useState<ClinicCareAmbulatoryResultInboxGroup>("ALL");
  const [ackBusyId, setAckBusyId] = useState<string | null>(null);
  const [ackError, setAckError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!facilityId) return;
    setLoading(true);
    setError(null);
    try {
      const payload = (await apiFetch("/clinic-care/results-inbox", {
        facilityId,
      })) as ResultsInboxPayload;
      setData(payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (/403|denied|Forbidden/i.test(message)) {
        setError(t("clinicCareD4c6.errors.resultsAccessDenied"));
      } else if (/CLINIC_CARE_SCHEMA_MISS|503/i.test(message)) {
        setError(t("clinicCareD4c2.errors.schemaMiss"));
      } else {
        setError(t("clinicCareD4c6.errors.resultsLoadFailed"));
      }
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [facilityId, t]);

  useEffect(() => {
    if (!ready || !facilityId) return;
    if (inboxAccess && !inboxAccess.canViewInbox) {
      setLoading(false);
      setError(t("clinicCareD4c6.errors.resultsAccessDenied"));
      return;
    }
    void load();
  }, [ready, facilityId, inboxAccess?.canViewInbox, load, t]);

  const rows = useMemo(() => {
    return (data?.rows ?? []).filter((row) => {
      const classification = classifyClinicCareAmbulatoryResult({
        catalogItemType: row.catalogItemType,
        status: row.status,
        resultText: row.resultPreview,
        criticalValue: row.critical,
        acknowledgedByProviderAt: row.acknowledgedByProviderAt,
        verifiedAt: row.verifiedAt,
      });
      // Prefer server groups when present; fall back to local classification.
      if (row.groups?.length) {
        return row.groups.includes(group);
      }
      return clinicCareAmbulatoryResultMatchesGroup(classification, group);
    });
  }, [data?.rows, group]);

  const onAcknowledge = async (orderItemId: string) => {
    if (!facilityId || !inboxAccess?.canAcknowledgeResults) return;
    if (ackBusyId === orderItemId) return;
    const existing = data?.rows.find((r) => r.orderItemId === orderItemId);
    if (existing?.acknowledged || existing?.acknowledgedByProviderAt) return;

    setAckBusyId(orderItemId);
    setAckError(null);
    try {
      const result = await apiFetch(`/orders/${orderItemId}/result/acknowledge`, {
        method: "POST",
        facilityId,
      });
      const ackAtRaw = result?.acknowledgedByProviderAt;
      const ackAt =
        typeof ackAtRaw === "string"
          ? ackAtRaw
          : ackAtRaw
            ? new Date(ackAtRaw).toISOString()
            : new Date().toISOString();
      const ackUserId =
        typeof result?.acknowledgedByUserId === "string" ? result.acknowledgedByUserId : null;

      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          rows: prev.rows.map((row) =>
            row.orderItemId !== orderItemId
              ? row
              : {
                  ...row,
                  acknowledged: true,
                  acknowledgedByProviderAt: ackAt,
                  acknowledgedByUserId: ackUserId ?? row.acknowledgedByUserId,
                }
          ),
        };
      });

      invalidateGetRequestDedupeForPath("/clinic-care/results-inbox", facilityId);
      if (existing?.encounterId) {
        invalidateGetRequestDedupeForPath(`/encounters/${existing.encounterId}/orders`, facilityId);
      }
      await load();
    } catch (e) {
      setAckError(
        e instanceof Error && e.message
          ? e.message
          : t("clinicCareD4c6.errors.ackFailed")
      );
    } finally {
      setAckBusyId(null);
    }
  };

  const tz = data?.facilityTimeZone || facilityTimeZone || "UTC";
  const counts = data?.groupCounts ?? {};

  return (
    <ClinicCareShell
      title={t("clinicCareD4c6.resultsTitle")}
      subtitle={t("clinicCareD4c6.resultsSubtitle")}
    >
      <div data-testid="clinic-care-results-inbox">
        {inboxAccess?.techSafeOnly ? (
          <p
            style={{ margin: "0 0 10px", fontSize: 12, color: "#92400e" }}
            data-testid="clinic-care-results-tech-safe"
          >
            {t("clinicCareD4c6.techSafeResultsNote")}
          </p>
        ) : null}

        {data?.authority?.acknowledgeCommentDeferred ? (
          <p style={{ margin: "0 0 8px", fontSize: 11, color: "#64748b" }}>
            {t("clinicCareD4c6.ackCommentDeferred")}
          </p>
        ) : null}

        <div
          style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}
          role="group"
          aria-label={t("clinicCareD4c6.groupFilters")}
        >
          {CLINIC_CARE_AMBULATORY_RESULT_INBOX_GROUPS.map((g) => {
            const count = counts[g];
            return (
              <button
                key={g}
                type="button"
                style={filterChip(group === g)}
                onClick={() => setGroup(g)}
                data-testid={`clinic-results-group-${g}`}
              >
                {t(groupLabelKey(g))}
                {typeof count === "number" ? ` (${count})` : ""}
              </button>
            );
          })}
        </div>

        {ackError ? (
          <p role="alert" style={{ margin: "0 0 8px", fontSize: 12, color: "#b91c1c" }}>
            {ackError}
          </p>
        ) : null}

        {loading ? (
          <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{t("clinicCareD4c2.loading")}</p>
        ) : error ? (
          <div role="alert">
            <p style={{ margin: 0, fontSize: 13, color: "#b91c1c" }}>{error}</p>
            <button
              type="button"
              onClick={() => void load()}
              style={{ ...filterChip(false), marginTop: 8 }}
            >
              {t("clinicCareD4c2.retry")}
            </button>
          </div>
        ) : rows.length === 0 ? (
          <p
            style={{ margin: 0, fontSize: 13, color: "#64748b" }}
            data-testid="clinic-results-empty"
          >
            {t("clinicCareD4c6.resultsEmpty")}
          </p>
        ) : (
          <ul
            style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}
            data-testid="clinic-results-list"
          >
            {rows.map((row) => (
              <li
                key={row.orderItemId}
                data-testid={`clinic-result-row-${row.orderItemId}`}
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "flex-start",
                  gap: "6px 12px",
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: row.critical
                    ? "1px solid #b91c1c"
                    : row.abnormal
                      ? "1px solid #c2410c"
                      : `1px solid ${CLINIC_CARE_SHELL.border}`,
                  background: row.critical ? "#fef2f2" : row.abnormal ? "#fff7ed" : "#fff",
                }}
              >
                <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>
                      {row.patientName}
                    </span>
                    {row.critical ? (
                      <span
                        aria-label={t("clinicCareD4c6.badges.critical")}
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          letterSpacing: 0.02,
                          color: "#fff",
                          background: "#b91c1c",
                          padding: "2px 7px",
                          borderRadius: 999,
                        }}
                      >
                        {t("clinicCareD4c6.badges.critical")}
                      </span>
                    ) : null}
                    {row.abnormal && !row.critical ? (
                      <span
                        aria-label={t("clinicCareD4c6.badges.abnormal")}
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          color: "#9a3412",
                          background: "#ffedd5",
                          border: "1px solid #c2410c",
                          padding: "2px 7px",
                          borderRadius: 999,
                        }}
                      >
                        {t("clinicCareD4c6.badges.abnormal")}
                      </span>
                    ) : null}
                    {row.preliminary ? (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: "#1e40af",
                          background: "#dbeafe",
                          padding: "2px 7px",
                          borderRadius: 999,
                        }}
                      >
                        {t("clinicCareD4c6.badges.preliminary")}
                      </span>
                    ) : null}
                    {row.acknowledged ? (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: "#166534",
                          background: "#dcfce7",
                          padding: "2px 7px",
                          borderRadius: 999,
                        }}
                      >
                        {t("clinicCareD4c6.badges.acknowledged")}
                      </span>
                    ) : null}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#334155", marginTop: 2 }}>
                    {row.label}
                  </div>
                  {row.resultPreview ? (
                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                      {row.resultPreview}
                    </div>
                  ) : null}
                  {row.acknowledgedByProviderAt ? (
                    <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>
                      {t("clinicCareD4c6.ackMeta")
                        .replace(
                          "{time}",
                          new Date(row.acknowledgedByProviderAt).toLocaleString(locale, {
                            timeZone: tz,
                          })
                        )
                        .replace(
                          "{user}",
                          row.acknowledgedByUserId ? row.acknowledgedByUserId.slice(0, 8) : "—"
                        )}
                    </div>
                  ) : null}
                </div>
                <div style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
                  <Link
                    href={clinicCareAmbulatoryResultsChartPath(row.encounterId)}
                    style={{ ...filterChip(false), textDecoration: "none" }}
                  >
                    {t("clinicCareD4c6.openResult")}
                  </Link>
                  {inboxAccess?.canAcknowledgeResults && !row.acknowledged ? (
                    <button
                      type="button"
                      disabled={ackBusyId === row.orderItemId}
                      onClick={() => void onAcknowledge(row.orderItemId)}
                      data-testid={`clinic-result-ack-${row.orderItemId}`}
                      style={filterChip(true)}
                    >
                      {ackBusyId === row.orderItemId
                        ? t("clinicCareD4c2.loading")
                        : t("clinicCareD4c6.acknowledge")}
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}

        {data?.truncated ? (
          <p style={{ margin: "8px 0 0", fontSize: 11, color: "#92400e" }}>
            {t("clinicCareD4c6.truncatedHint")}
          </p>
        ) : null}
      </div>
    </ClinicCareShell>
  );
}
