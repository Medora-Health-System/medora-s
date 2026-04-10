"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import {
  fetchMsppReviews,
  msppCentralApprove,
  msppCentralReject,
  msppDepartmentApprove,
  msppDepartmentReject,
  type MsppReviewRow,
} from "@/lib/msppApi";
import { DiseaseCaseReviewStatus } from "@/features/mspp/msppWorkflow";
import {
  MSPP_BTN_APPROVE,
  MSPP_BTN_REJECT,
  MSPP_BTN_ROW,
  MSPP_EMPTY_STATE,
  MSPP_ERROR_CALLOUT,
  MSPP_MUTED_INLINE,
  MSPP_PAGE_SHELL,
  MSPP_PAGE_SUBTITLE,
  MSPP_PAGE_TITLE,
  MSPP_SECTION_CARD,
  MSPP_SECTION_SUBTITLE,
  MSPP_SECTION_TITLE,
  MSPP_TABLE,
  MSPP_TABLE_CELL,
  MSPP_TABLE_HEAD_CELL,
} from "@/features/mspp/msppUiChrome";
import { NEUTRAL_BADGE } from "@/components/medora-card";

function reviewStatusLabel(t: (key: string) => string, status: string): string {
  const key = `msppValidation.reviewStatus.${status}`;
  const out = t(key);
  return out === key ? status : out;
}

function MsppGeoReadinessBadges({
  row,
  t,
}: {
  row: MsppReviewRow;
  t: (key: string) => string;
}) {
  const dq = row.dataQuality;
  if (!dq) {
    return <span style={MSPP_MUTED_INLINE}>{t("msppValidation.badgeDash")}</span>;
  }
  if (dq.geoIncomplete) {
    return (
      <span
        style={{
          display: "inline-block",
          padding: "2px 8px",
          borderRadius: 9999,
          background: "rgba(217,119,6,0.15)",
          color: "#92400e",
          fontWeight: 600,
          fontSize: 12,
        }}
      >
        {t("msppValidation.badgeGeoIncomplete")}
      </span>
    );
  }
  if (dq.geoCommuneLinked) {
    return (
      <span
        style={{
          display: "inline-block",
          padding: "2px 8px",
          borderRadius: 9999,
          background: "rgba(22,163,74,0.14)",
          color: "#166534",
          fontWeight: 600,
          fontSize: 12,
        }}
      >
        {t("msppValidation.badgeGeoLinked")}
      </span>
    );
  }
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 9999,
        background: "rgba(100,116,139,0.12)",
        color: "#475569",
        fontWeight: 600,
        fontSize: 12,
      }}
    >
      {t("msppValidation.badgeGeoFreeText")}
    </span>
  );
}

export default function MsppValidationPage() {
  const { t } = useI18n();
  const { ready, msppRoles } = useFacilityAndRoles();
  const canMspp = msppRoles.length > 0;
  const canDept = msppRoles.includes("MSPP_VALIDATOR_DEPT");
  const canCentral = msppRoles.includes("MSPP_VALIDATOR_CENTRAL");

  const [rows, setRows] = useState<MsppReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!canMspp) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMsppReviews();
      setRows(data.reviews ?? []);
    } catch {
      setError("Impossible de charger la file de validation.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [canMspp]);

  useEffect(() => {
    if (ready && canMspp) void load();
    else if (ready && !canMspp) setLoading(false);
  }, [ready, canMspp, load]);

  const pendingDept = rows.filter((r) => r.status === DiseaseCaseReviewStatus.PENDING_DEPARTMENT);
  const pendingCentral = rows.filter(
    (r) =>
      r.status === DiseaseCaseReviewStatus.DEPARTMENT_APPROVED ||
      r.status === DiseaseCaseReviewStatus.PENDING_CENTRAL
  );

  async function runAction(id: string, fn: (id: string) => Promise<unknown>) {
    setBusyId(id);
    setError(null);
    try {
      await fn(id);
      await load();
    } catch {
      setError("Action refusée ou erreur réseau. Vérifiez votre rôle MSPP.");
    } finally {
      setBusyId(null);
    }
  }

  const queueCountStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    minWidth: 28,
    justifyContent: "center",
    marginLeft: 10,
    padding: "4px 10px",
    fontSize: 13,
    fontWeight: 700,
    borderRadius: 9999,
    background: NEUTRAL_BADGE.bg,
    color: NEUTRAL_BADGE.text,
    border: `1px solid ${NEUTRAL_BADGE.border}`,
    fontVariantNumeric: "tabular-nums",
  };

  const mono: React.CSSProperties = { fontFamily: "ui-monospace, monospace", fontSize: 12, color: "#475569" };

  if (!ready) {
    return (
      <div style={MSPP_PAGE_SHELL}>
        <p style={{ color: "#64748b", marginTop: 0 }}>Chargement…</p>
      </div>
    );
  }
  if (!canMspp) {
    return (
      <div style={MSPP_PAGE_SHELL}>
        <h1 style={MSPP_PAGE_TITLE}>MSPP — Validation</h1>
        <p style={{ color: "#64748b", marginTop: 0 }}>Vous n&apos;avez pas accès au portail MSPP.</p>
      </div>
    );
  }

  return (
    <div style={MSPP_PAGE_SHELL}>
      <h1 style={MSPP_PAGE_TITLE}>MSPP — Validation</h1>
      <p style={MSPP_PAGE_SUBTITLE}>{t("msppValidation.subtitle")}</p>

      <div style={{ ...MSPP_SECTION_CARD, marginBottom: 18 }}>
        <h2 style={{ ...MSPP_SECTION_TITLE, fontSize: "1rem", marginTop: 0 }}>
          {t("msppValidation.pipelinePanelTitle")}
        </h2>
        <p style={{ ...MSPP_SECTION_SUBTITLE, marginBottom: 12 }}>{t("msppValidation.pipelinePanelIntro")}</p>
        <ol
          style={{
            margin: 0,
            paddingLeft: 20,
            color: "#334155",
            fontSize: 14,
            lineHeight: 1.55,
          }}
        >
          <li style={{ marginBottom: 8 }}>{t("msppValidation.pipelineStepDept")}</li>
          <li style={{ marginBottom: 8 }}>{t("msppValidation.pipelineStepCentral")}</li>
        </ol>
        <p
          style={{
            ...MSPP_SECTION_SUBTITLE,
            marginBottom: 0,
            marginTop: 12,
            fontWeight: 600,
            color: "#475569",
          }}
        >
          {t("msppValidation.pipelineNationalNote")}
        </p>
      </div>

      {error && (
        <div style={MSPP_ERROR_CALLOUT} role="alert">
          <p style={{ color: "#991b1b", margin: 0, fontWeight: 600 }}>{error}</p>
        </div>
      )}

      <div style={MSPP_SECTION_CARD}>
        <h2 style={{ ...MSPP_SECTION_TITLE, display: "flex", alignItems: "center", flexWrap: "wrap" }}>
          File départementale (en attente)
          {!loading && <span style={queueCountStyle}>{pendingDept.length}</span>}
        </h2>
        {loading ? (
          <p style={{ color: "#64748b", margin: "12px 0 0" }}>Chargement…</p>
        ) : pendingDept.length === 0 ? (
          <p style={{ ...MSPP_EMPTY_STATE, marginTop: 16 }}>Aucun dossier en attente au niveau département.</p>
        ) : (
          <div style={{ overflowX: "auto", marginTop: 12 }}>
            <table style={MSPP_TABLE}>
              <thead>
                <tr>
                  <th style={MSPP_TABLE_HEAD_CELL}>{t("msppValidation.colReviewId")}</th>
                  <th style={MSPP_TABLE_HEAD_CELL}>{t("msppValidation.colReportId")}</th>
                  <th style={MSPP_TABLE_HEAD_CELL}>{t("msppValidation.colReportDisease")}</th>
                  <th style={MSPP_TABLE_HEAD_CELL}>{t("msppValidation.colReportLocation")}</th>
                  <th style={MSPP_TABLE_HEAD_CELL}>{t("msppValidation.colGeoReadiness")}</th>
                  <th style={MSPP_TABLE_HEAD_CELL}>{t("msppValidation.colStatus")}</th>
                  <th style={MSPP_TABLE_HEAD_CELL}>{t("msppValidation.colDepartmentId")}</th>
                  <th style={{ ...MSPP_TABLE_HEAD_CELL, minWidth: 220 }}>{t("msppValidation.colActions")}</th>
                </tr>
              </thead>
              <tbody>
                {pendingDept.map((r) => (
                  <tr key={r.id}>
                    <td style={{ ...MSPP_TABLE_CELL, ...mono }}>{r.id}</td>
                    <td style={{ ...MSPP_TABLE_CELL, ...mono }}>{r.diseaseCaseReportId ?? "—"}</td>
                    <td style={MSPP_TABLE_CELL}>
                      <div style={{ fontWeight: 600 }}>{r.reportDiseaseName ?? t("msppValidation.badgeDash")}</div>
                      <div style={{ ...mono, fontSize: 11 }}>{r.reportDiseaseCode ?? ""}</div>
                    </td>
                    <td style={MSPP_TABLE_CELL}>
                      <div>{r.reportDepartment ?? t("msppValidation.badgeDash")}</div>
                      <div style={{ color: "#64748b", fontSize: 12 }}>{r.reportCommune ?? ""}</div>
                    </td>
                    <td style={MSPP_TABLE_CELL}>
                      <MsppGeoReadinessBadges row={r} t={t} />
                    </td>
                    <td style={MSPP_TABLE_CELL}>{reviewStatusLabel(t, r.status)}</td>
                    <td style={{ ...MSPP_TABLE_CELL, ...mono }}>{r.departmentId}</td>
                    <td style={MSPP_TABLE_CELL}>
                      {canDept ? (
                        <div style={MSPP_BTN_ROW}>
                          <button
                            type="button"
                            style={{
                              ...MSPP_BTN_APPROVE,
                              opacity: busyId === r.id ? 0.45 : 1,
                              cursor: busyId === r.id ? "not-allowed" : "pointer",
                            }}
                            disabled={busyId === r.id}
                            onClick={() => void runAction(r.id, (id) => msppDepartmentApprove(id))}
                          >
                            Approuver (dépt.)
                          </button>
                          <button
                            type="button"
                            style={{
                              ...MSPP_BTN_REJECT,
                              opacity: busyId === r.id ? 0.45 : 1,
                              cursor: busyId === r.id ? "not-allowed" : "pointer",
                            }}
                            disabled={busyId === r.id}
                            onClick={() => void runAction(r.id, (id) => msppDepartmentReject(id))}
                          >
                            Rejeter (dépt.)
                          </button>
                        </div>
                      ) : (
                        <span style={MSPP_MUTED_INLINE}>Réservé aux validateurs départementaux</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ ...MSPP_SECTION_CARD, marginBottom: 0 }}>
        <h2 style={{ ...MSPP_SECTION_TITLE, display: "flex", alignItems: "center", flexWrap: "wrap" }}>
          File centrale (après département)
          {!loading && <span style={queueCountStyle}>{pendingCentral.length}</span>}
        </h2>
        {loading ? (
          <p style={{ color: "#64748b", margin: "12px 0 0" }}>Chargement…</p>
        ) : pendingCentral.length === 0 ? (
          <p style={{ ...MSPP_EMPTY_STATE, marginTop: 16 }}>Aucun dossier en attente au niveau central.</p>
        ) : (
          <div style={{ overflowX: "auto", marginTop: 12 }}>
            <table style={MSPP_TABLE}>
              <thead>
                <tr>
                  <th style={MSPP_TABLE_HEAD_CELL}>{t("msppValidation.colReviewId")}</th>
                  <th style={MSPP_TABLE_HEAD_CELL}>{t("msppValidation.colReportId")}</th>
                  <th style={MSPP_TABLE_HEAD_CELL}>{t("msppValidation.colReportDisease")}</th>
                  <th style={MSPP_TABLE_HEAD_CELL}>{t("msppValidation.colReportLocation")}</th>
                  <th style={MSPP_TABLE_HEAD_CELL}>{t("msppValidation.colGeoReadiness")}</th>
                  <th style={MSPP_TABLE_HEAD_CELL}>{t("msppValidation.colStatus")}</th>
                  <th style={{ ...MSPP_TABLE_HEAD_CELL, minWidth: 220 }}>{t("msppValidation.colActions")}</th>
                </tr>
              </thead>
              <tbody>
                {pendingCentral.map((r) => (
                  <tr key={r.id}>
                    <td style={{ ...MSPP_TABLE_CELL, ...mono }}>{r.id}</td>
                    <td style={{ ...MSPP_TABLE_CELL, ...mono }}>{r.diseaseCaseReportId ?? "—"}</td>
                    <td style={MSPP_TABLE_CELL}>
                      <div style={{ fontWeight: 600 }}>{r.reportDiseaseName ?? t("msppValidation.badgeDash")}</div>
                      <div style={{ ...mono, fontSize: 11 }}>{r.reportDiseaseCode ?? ""}</div>
                    </td>
                    <td style={MSPP_TABLE_CELL}>
                      <div>{r.reportDepartment ?? t("msppValidation.badgeDash")}</div>
                      <div style={{ color: "#64748b", fontSize: 12 }}>{r.reportCommune ?? ""}</div>
                    </td>
                    <td style={MSPP_TABLE_CELL}>
                      <MsppGeoReadinessBadges row={r} t={t} />
                    </td>
                    <td style={MSPP_TABLE_CELL}>{reviewStatusLabel(t, r.status)}</td>
                    <td style={MSPP_TABLE_CELL}>
                      {canCentral ? (
                        <div style={MSPP_BTN_ROW}>
                          <button
                            type="button"
                            style={{
                              ...MSPP_BTN_APPROVE,
                              opacity: busyId === r.id ? 0.45 : 1,
                              cursor: busyId === r.id ? "not-allowed" : "pointer",
                            }}
                            disabled={busyId === r.id}
                            onClick={() => void runAction(r.id, (id) => msppCentralApprove(id))}
                          >
                            Approuver (central)
                          </button>
                          <button
                            type="button"
                            style={{
                              ...MSPP_BTN_REJECT,
                              opacity: busyId === r.id ? 0.45 : 1,
                              cursor: busyId === r.id ? "not-allowed" : "pointer",
                            }}
                            disabled={busyId === r.id}
                            onClick={() => void runAction(r.id, (id) => msppCentralReject(id))}
                          >
                            Rejeter (central)
                          </button>
                        </div>
                      ) : (
                        <span style={MSPP_MUTED_INLINE}>Réservé aux validateurs centraux</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
