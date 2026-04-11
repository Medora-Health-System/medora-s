"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import {
  fetchMsppReviews,
  msppCentralApprove,
  msppCentralReject,
  msppCentralRequeue,
  msppDepartmentApprove,
  msppDepartmentReject,
  msppDepartmentRequeue,
  type MsppReviewActionBody,
  type MsppReviewRow,
} from "@/lib/msppApi";
import { MsppReviewDecisionModal } from "@/features/mspp/MsppReviewDecisionModal";
import { DiseaseCaseReviewStatus } from "@/features/mspp/msppWorkflow";
import {
  MSPP_BTN_APPROVE,
  MSPP_BTN_REJECT,
  MSPP_BTN_REQUEUE,
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
import {
  MsppValidationReporterCell,
  MsppValidationTechnicalIds,
} from "@/features/mspp/MsppValidationTechnicalIds";

type PendingMsppDecision =
  | { kind: "dept-approve"; reviewId: string }
  | { kind: "dept-reject"; reviewId: string }
  | { kind: "central-approve"; reviewId: string }
  | { kind: "central-reject"; reviewId: string };

function reviewStatusLabel(t: (key: string) => string, status: string): string {
  const key = `msppValidation.reviewStatus.${status}`;
  const out = t(key);
  return out === key ? status : out;
}

function formatDeclaredAt(iso: string | null | undefined, dash: string): string {
  if (!iso) return dash;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return dash;
    return d.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return dash;
  }
}

function MsppValidationPatientCell({
  row,
  t,
}: {
  row: MsppReviewRow;
  t: (key: string) => string;
}) {
  const name = row.patientFullName?.trim();
  const sexKey = row.patientSex ? `msppValidation.patientSex.${row.patientSex}` : "";
  const sexRaw = sexKey ? t(sexKey) : "";
  const sexLabel = sexRaw && sexRaw !== sexKey ? sexRaw : null;
  const agePart =
    row.patientAgeYears != null
      ? `${row.patientAgeYears} ${t("msppValidation.ageYearsSuffix")}`
      : null;
  const meta = [sexLabel, agePart].filter(Boolean).join(" · ");
  if (!name && !meta) {
    return <span style={MSPP_MUTED_INLINE}>{t("msppValidation.badgeDash")}</span>;
  }
  return (
    <div>
      {name ? (
        <div style={{ fontWeight: 600 }}>{name}</div>
      ) : (
        <span style={MSPP_MUTED_INLINE}>{t("msppValidation.badgeDash")}</span>
      )}
      {meta ? <div style={{ color: "#64748b", fontSize: 12 }}>{meta}</div> : null}
    </div>
  );
}

function MsppValidationFacilityCell({
  row,
  t,
}: {
  row: MsppReviewRow;
  t: (key: string) => string;
}) {
  const fac = row.facilityName?.trim();
  const room = row.reportEncounterRoomLabel?.trim();
  if (!fac && !room) {
    return <span style={MSPP_MUTED_INLINE}>{t("msppValidation.badgeDash")}</span>;
  }
  return (
    <div>
      {fac ? (
        <div style={{ fontWeight: 600 }}>{fac}</div>
      ) : (
        <span style={MSPP_MUTED_INLINE}>{t("msppValidation.badgeDash")}</span>
      )}
      {room ? (
        <div style={{ color: "#64748b", fontSize: 12 }}>
          {t("msppValidation.facilityEncounterRoom").replace("{room}", room)}
        </div>
      ) : null}
    </div>
  );
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

function MsppValidationReviewRow({
  row: r,
  t,
  codeHint,
  showReviewedAtColumn,
  actionCell,
}: {
  row: MsppReviewRow;
  t: (key: string) => string;
  codeHint: React.CSSProperties;
  showReviewedAtColumn?: boolean;
  actionCell: React.ReactNode;
}) {
  return (
    <tr>
      <td style={MSPP_TABLE_CELL}>
        <MsppValidationPatientCell row={r} t={t} />
      </td>
      <td style={MSPP_TABLE_CELL}>
        {r.patientPrimaryIdentifier?.trim() ? (
          r.patientPrimaryIdentifier
        ) : (
          <span style={MSPP_MUTED_INLINE}>{t("msppValidation.badgeDash")}</span>
        )}
      </td>
      <td style={MSPP_TABLE_CELL}>
        <div style={{ fontWeight: 600 }}>{r.reportDiseaseName ?? t("msppValidation.badgeDash")}</div>
        {r.reportDiseaseCode ? <div style={codeHint}>{r.reportDiseaseCode}</div> : null}
      </td>
      <td style={MSPP_TABLE_CELL}>
        <div>{r.reportDepartment ?? t("msppValidation.badgeDash")}</div>
        <div style={{ color: "#64748b", fontSize: 12 }}>{r.reportCommune ?? ""}</div>
      </td>
      <td style={MSPP_TABLE_CELL}>{r.departmentName ?? t("msppValidation.badgeDash")}</td>
      <td style={MSPP_TABLE_CELL}>
        <MsppValidationFacilityCell row={r} t={t} />
      </td>
      <td style={MSPP_TABLE_CELL}>
        <MsppValidationReporterCell row={r} />
      </td>
      <td style={MSPP_TABLE_CELL}>{formatDeclaredAt(r.reportedAt, t("msppValidation.badgeDash"))}</td>
      <td style={MSPP_TABLE_CELL}>
        <MsppGeoReadinessBadges row={r} t={t} />
      </td>
      {showReviewedAtColumn ? (
        <td style={MSPP_TABLE_CELL}>
          {formatDeclaredAt(r.reviewedAt, t("msppValidation.badgeDash"))}
        </td>
      ) : null}
      <td style={MSPP_TABLE_CELL}>{reviewStatusLabel(t, r.status)}</td>
      <td style={MSPP_TABLE_CELL}>{actionCell}</td>
    </tr>
  );
}

export default function MsppValidationPage() {
  const { t } = useI18n();
  const { ready, msppRoles } = useFacilityAndRoles();
  const canMspp = msppRoles.length > 0;
  const canCentral = msppRoles.includes("MSPP_VALIDATOR_CENTRAL");
  /** Aligné API : validateur central peut aussi traiter la file départementale. */
  const canDeptActions =
    msppRoles.includes("MSPP_VALIDATOR_DEPT") || canCentral;

  const [rows, setRows] = useState<MsppReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingDecision, setPendingDecision] = useState<PendingMsppDecision | null>(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [requeueSubmittingId, setRequeueSubmittingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!canMspp) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMsppReviews();
      setRows(data.reviews ?? []);
    } catch {
      setError(t("msppValidation.loadError"));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [canMspp, t]);

  useEffect(() => {
    if (ready && canMspp) void load();
    else if (ready && !canMspp) setLoading(false);
  }, [ready, canMspp, load]);

  const activeRow = pendingDecision ? rows.find((r) => r.id === pendingDecision.reviewId) : undefined;

  const pendingDept = rows.filter((r) => r.status === DiseaseCaseReviewStatus.PENDING_DEPARTMENT);
  const pendingCentral = rows.filter(
    (r) =>
      r.status === DiseaseCaseReviewStatus.DEPARTMENT_APPROVED ||
      r.status === DiseaseCaseReviewStatus.PENDING_CENTRAL
  );
  const rejectedDept = rows.filter((r) => r.status === DiseaseCaseReviewStatus.DEPARTMENT_REJECTED);
  const rejectedCentral = rows.filter((r) => r.status === DiseaseCaseReviewStatus.CENTRAL_REJECTED);

  function decisionModalTitle(d: PendingMsppDecision): string {
    switch (d.kind) {
      case "dept-approve":
        return t("msppValidation.modalTitleDeptApprove");
      case "dept-reject":
        return t("msppValidation.modalTitleDeptReject");
      case "central-approve":
        return t("msppValidation.modalTitleCentralApprove");
      case "central-reject":
        return t("msppValidation.modalTitleCentralReject");
    }
  }

  async function submitDecision(body: MsppReviewActionBody) {
    if (!pendingDecision) return;
    setModalSubmitting(true);
    setError(null);
    try {
      const { reviewId } = pendingDecision;
      switch (pendingDecision.kind) {
        case "dept-approve":
          await msppDepartmentApprove(reviewId, body);
          break;
        case "dept-reject":
          await msppDepartmentReject(reviewId, body);
          break;
        case "central-approve":
          await msppCentralApprove(reviewId, body);
          break;
        case "central-reject":
          await msppCentralReject(reviewId, body);
          break;
      }
      setPendingDecision(null);
      await load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      /** Aligné sur `normalizeUserFacingError` (repli générique anglais → FR). */
      const NORMALIZED_GENERIC = "Une erreur est survenue.";
      if (!msg.trim() || msg === NORMALIZED_GENERIC) {
        setError(t("msppValidation.genericActionError"));
      } else {
        setError(msg);
      }
    } finally {
      setModalSubmitting(false);
    }
  }

  async function submitDepartmentRequeue(reviewId: string) {
    if (!window.confirm(t("msppValidation.requeueDeptConfirm"))) return;
    setRequeueSubmittingId(reviewId);
    setError(null);
    try {
      await msppDepartmentRequeue(reviewId);
      await load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      const NORMALIZED_GENERIC = "Une erreur est survenue.";
      if (!msg.trim() || msg === NORMALIZED_GENERIC) {
        setError(t("msppValidation.genericActionError"));
      } else {
        setError(msg);
      }
    } finally {
      setRequeueSubmittingId(null);
    }
  }

  async function submitCentralRequeue(reviewId: string) {
    if (!window.confirm(t("msppValidation.requeueCentralConfirm"))) return;
    setRequeueSubmittingId(reviewId);
    setError(null);
    try {
      await msppCentralRequeue(reviewId);
      await load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      const NORMALIZED_GENERIC = "Une erreur est survenue.";
      if (!msg.trim() || msg === NORMALIZED_GENERIC) {
        setError(t("msppValidation.genericActionError"));
      } else {
        setError(msg);
      }
    } finally {
      setRequeueSubmittingId(null);
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

  const codeHint: React.CSSProperties = { fontSize: 11, color: "#64748b" };

  if (!ready) {
    return (
      <div style={MSPP_PAGE_SHELL}>
        <p style={{ color: "#64748b", marginTop: 0 }}>{t("msppValidation.loading")}</p>
      </div>
    );
  }
  if (!canMspp) {
    return (
      <div style={MSPP_PAGE_SHELL}>
        <h1 style={MSPP_PAGE_TITLE}>{t("msppValidation.accessDeniedTitle")}</h1>
        <p style={{ color: "#64748b", marginTop: 0 }}>{t("msppValidation.accessDeniedBody")}</p>
      </div>
    );
  }

  return (
    <div style={MSPP_PAGE_SHELL}>
      <h1 style={MSPP_PAGE_TITLE}>{t("msppValidation.pageTitle")}</h1>
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
          {t("msppValidation.deptQueueTitle")}
          {!loading && <span style={queueCountStyle}>{pendingDept.length}</span>}
        </h2>
        {loading ? (
          <p style={{ color: "#64748b", margin: "12px 0 0" }}>{t("msppValidation.loading")}</p>
        ) : pendingDept.length === 0 ? (
          <p style={{ ...MSPP_EMPTY_STATE, marginTop: 16 }}>{t("msppValidation.deptQueueEmpty")}</p>
        ) : (
          <div style={{ overflowX: "auto", marginTop: 12 }}>
            <table style={MSPP_TABLE}>
              <thead>
                <tr>
                  <th style={MSPP_TABLE_HEAD_CELL}>{t("msppValidation.colPatient")}</th>
                  <th style={MSPP_TABLE_HEAD_CELL}>{t("msppValidation.colIdentifier")}</th>
                  <th style={MSPP_TABLE_HEAD_CELL}>{t("msppValidation.colReportDisease")}</th>
                  <th style={MSPP_TABLE_HEAD_CELL}>{t("msppValidation.colReportLocation")}</th>
                  <th style={MSPP_TABLE_HEAD_CELL}>{t("msppValidation.colDepartment")}</th>
                  <th style={MSPP_TABLE_HEAD_CELL}>{t("msppValidation.colFacility")}</th>
                  <th style={MSPP_TABLE_HEAD_CELL}>{t("msppValidation.colReporter")}</th>
                  <th style={MSPP_TABLE_HEAD_CELL}>{t("msppValidation.colReportedAt")}</th>
                  <th style={MSPP_TABLE_HEAD_CELL}>{t("msppValidation.colGeoReadiness")}</th>
                  <th style={MSPP_TABLE_HEAD_CELL}>{t("msppValidation.colStatus")}</th>
                  <th style={{ ...MSPP_TABLE_HEAD_CELL, minWidth: 220 }}>{t("msppValidation.colActions")}</th>
                </tr>
              </thead>
              <tbody>
                {pendingDept.map((r) => (
                  <MsppValidationReviewRow
                    key={r.id}
                    row={r}
                    t={t}
                    codeHint={codeHint}
                    showReviewedAtColumn={false}
                    actionCell={
                      <>
                        {canDeptActions ? (
                          <div style={MSPP_BTN_ROW}>
                            <button
                              type="button"
                              style={{
                                ...MSPP_BTN_APPROVE,
                                opacity: modalSubmitting ? 0.45 : 1,
                                cursor: modalSubmitting ? "not-allowed" : "pointer",
                              }}
                              disabled={modalSubmitting}
                              onClick={() => setPendingDecision({ kind: "dept-approve", reviewId: r.id })}
                            >
                              {t("msppValidation.btnApproveDept")}
                            </button>
                            <button
                              type="button"
                              style={{
                                ...MSPP_BTN_REJECT,
                                opacity: modalSubmitting ? 0.45 : 1,
                                cursor: modalSubmitting ? "not-allowed" : "pointer",
                              }}
                              disabled={modalSubmitting}
                              onClick={() => setPendingDecision({ kind: "dept-reject", reviewId: r.id })}
                            >
                              {t("msppValidation.btnRejectDept")}
                            </button>
                          </div>
                        ) : (
                          <span style={MSPP_MUTED_INLINE}>{t("msppValidation.reservedDeptValidators")}</span>
                        )}
                        <div style={{ marginTop: 8 }}>
                          <MsppValidationTechnicalIds
                            reviewId={r.id}
                            reportId={r.diseaseCaseReportId}
                            departmentId={r.departmentId}
                          />
                        </div>
                      </>
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ ...MSPP_SECTION_CARD, marginBottom: 18 }}>
        <h2 style={{ ...MSPP_SECTION_TITLE, display: "flex", alignItems: "center", flexWrap: "wrap" }}>
          {t("msppValidation.centralQueueTitle")}
          {!loading && <span style={queueCountStyle}>{pendingCentral.length}</span>}
        </h2>
        {loading ? (
          <p style={{ color: "#64748b", margin: "12px 0 0" }}>{t("msppValidation.loading")}</p>
        ) : pendingCentral.length === 0 ? (
          <p style={{ ...MSPP_EMPTY_STATE, marginTop: 16 }}>{t("msppValidation.centralQueueEmpty")}</p>
        ) : (
          <div style={{ overflowX: "auto", marginTop: 12 }}>
            <table style={MSPP_TABLE}>
              <thead>
                <tr>
                  <th style={MSPP_TABLE_HEAD_CELL}>{t("msppValidation.colPatient")}</th>
                  <th style={MSPP_TABLE_HEAD_CELL}>{t("msppValidation.colIdentifier")}</th>
                  <th style={MSPP_TABLE_HEAD_CELL}>{t("msppValidation.colReportDisease")}</th>
                  <th style={MSPP_TABLE_HEAD_CELL}>{t("msppValidation.colReportLocation")}</th>
                  <th style={MSPP_TABLE_HEAD_CELL}>{t("msppValidation.colDepartment")}</th>
                  <th style={MSPP_TABLE_HEAD_CELL}>{t("msppValidation.colFacility")}</th>
                  <th style={MSPP_TABLE_HEAD_CELL}>{t("msppValidation.colReporter")}</th>
                  <th style={MSPP_TABLE_HEAD_CELL}>{t("msppValidation.colReportedAt")}</th>
                  <th style={MSPP_TABLE_HEAD_CELL}>{t("msppValidation.colGeoReadiness")}</th>
                  <th style={MSPP_TABLE_HEAD_CELL}>{t("msppValidation.colStatus")}</th>
                  <th style={{ ...MSPP_TABLE_HEAD_CELL, minWidth: 220 }}>{t("msppValidation.colActions")}</th>
                </tr>
              </thead>
              <tbody>
                {pendingCentral.map((r) => (
                  <MsppValidationReviewRow
                    key={r.id}
                    row={r}
                    t={t}
                    codeHint={codeHint}
                    showReviewedAtColumn={false}
                    actionCell={
                      <>
                        {canCentral ? (
                          <div style={MSPP_BTN_ROW}>
                            <button
                              type="button"
                              style={{
                                ...MSPP_BTN_APPROVE,
                                opacity: modalSubmitting ? 0.45 : 1,
                                cursor: modalSubmitting ? "not-allowed" : "pointer",
                              }}
                              disabled={modalSubmitting}
                              onClick={() => setPendingDecision({ kind: "central-approve", reviewId: r.id })}
                            >
                              {t("msppValidation.btnApproveCentral")}
                            </button>
                            <button
                              type="button"
                              style={{
                                ...MSPP_BTN_REJECT,
                                opacity: modalSubmitting ? 0.45 : 1,
                                cursor: modalSubmitting ? "not-allowed" : "pointer",
                              }}
                              disabled={modalSubmitting}
                              onClick={() => setPendingDecision({ kind: "central-reject", reviewId: r.id })}
                            >
                              {t("msppValidation.btnRejectCentral")}
                            </button>
                          </div>
                        ) : (
                          <span style={MSPP_MUTED_INLINE}>{t("msppValidation.reservedCentralValidators")}</span>
                        )}
                        <div style={{ marginTop: 8 }}>
                          <MsppValidationTechnicalIds
                            reviewId={r.id}
                            reportId={r.diseaseCaseReportId}
                            departmentId={r.departmentId}
                          />
                        </div>
                      </>
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ ...MSPP_SECTION_CARD, marginBottom: 18 }}>
        <h2 style={{ ...MSPP_SECTION_TITLE, display: "flex", alignItems: "center", flexWrap: "wrap" }}>
          {t("msppValidation.deptRejectedTitle")}
          {!loading && <span style={queueCountStyle}>{rejectedDept.length}</span>}
        </h2>
        <p style={{ ...MSPP_SECTION_SUBTITLE, marginBottom: 12 }}>{t("msppValidation.deptRejectedIntro")}</p>
        {loading ? (
          <p style={{ color: "#64748b", margin: "12px 0 0" }}>{t("msppValidation.loading")}</p>
        ) : rejectedDept.length === 0 ? (
          <p style={{ ...MSPP_EMPTY_STATE, marginTop: 16 }}>{t("msppValidation.deptRejectedEmpty")}</p>
        ) : (
          <div style={{ overflowX: "auto", marginTop: 12 }}>
            <table style={MSPP_TABLE}>
              <thead>
                <tr>
                  <th style={MSPP_TABLE_HEAD_CELL}>{t("msppValidation.colPatient")}</th>
                  <th style={MSPP_TABLE_HEAD_CELL}>{t("msppValidation.colIdentifier")}</th>
                  <th style={MSPP_TABLE_HEAD_CELL}>{t("msppValidation.colReportDisease")}</th>
                  <th style={MSPP_TABLE_HEAD_CELL}>{t("msppValidation.colReportLocation")}</th>
                  <th style={MSPP_TABLE_HEAD_CELL}>{t("msppValidation.colDepartment")}</th>
                  <th style={MSPP_TABLE_HEAD_CELL}>{t("msppValidation.colFacility")}</th>
                  <th style={MSPP_TABLE_HEAD_CELL}>{t("msppValidation.colReporter")}</th>
                  <th style={MSPP_TABLE_HEAD_CELL}>{t("msppValidation.colReportedAt")}</th>
                  <th style={MSPP_TABLE_HEAD_CELL}>{t("msppValidation.colGeoReadiness")}</th>
                  <th style={MSPP_TABLE_HEAD_CELL}>{t("msppValidation.colLastDecision")}</th>
                  <th style={MSPP_TABLE_HEAD_CELL}>{t("msppValidation.colStatus")}</th>
                  <th style={{ ...MSPP_TABLE_HEAD_CELL, minWidth: 200 }}>{t("msppValidation.colActions")}</th>
                </tr>
              </thead>
              <tbody>
                {rejectedDept.map((r) => (
                  <MsppValidationReviewRow
                    key={r.id}
                    row={r}
                    t={t}
                    codeHint={codeHint}
                    showReviewedAtColumn
                    actionCell={
                      <>
                        {canDeptActions ? (
                          <div style={MSPP_BTN_ROW}>
                            <button
                              type="button"
                              style={{
                                ...MSPP_BTN_REQUEUE,
                                opacity: requeueSubmittingId === r.id || modalSubmitting ? 0.45 : 1,
                                cursor:
                                  requeueSubmittingId === r.id || modalSubmitting ? "not-allowed" : "pointer",
                              }}
                              disabled={Boolean(requeueSubmittingId) || modalSubmitting}
                              onClick={() => void submitDepartmentRequeue(r.id)}
                            >
                              {t("msppValidation.btnRequeueDept")}
                            </button>
                          </div>
                        ) : (
                          <span style={MSPP_MUTED_INLINE}>{t("msppValidation.reservedDeptValidators")}</span>
                        )}
                        <div style={{ marginTop: 8 }}>
                          <MsppValidationTechnicalIds
                            reviewId={r.id}
                            reportId={r.diseaseCaseReportId}
                            departmentId={r.departmentId}
                          />
                        </div>
                      </>
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ ...MSPP_SECTION_CARD, marginBottom: 0 }}>
        <h2 style={{ ...MSPP_SECTION_TITLE, display: "flex", alignItems: "center", flexWrap: "wrap" }}>
          {t("msppValidation.centralRejectedTitle")}
          {!loading && <span style={queueCountStyle}>{rejectedCentral.length}</span>}
        </h2>
        <p style={{ ...MSPP_SECTION_SUBTITLE, marginBottom: 12 }}>{t("msppValidation.centralRejectedIntro")}</p>
        {loading ? (
          <p style={{ color: "#64748b", margin: "12px 0 0" }}>{t("msppValidation.loading")}</p>
        ) : rejectedCentral.length === 0 ? (
          <p style={{ ...MSPP_EMPTY_STATE, marginTop: 16 }}>{t("msppValidation.centralRejectedEmpty")}</p>
        ) : (
          <div style={{ overflowX: "auto", marginTop: 12 }}>
            <table style={MSPP_TABLE}>
              <thead>
                <tr>
                  <th style={MSPP_TABLE_HEAD_CELL}>{t("msppValidation.colPatient")}</th>
                  <th style={MSPP_TABLE_HEAD_CELL}>{t("msppValidation.colIdentifier")}</th>
                  <th style={MSPP_TABLE_HEAD_CELL}>{t("msppValidation.colReportDisease")}</th>
                  <th style={MSPP_TABLE_HEAD_CELL}>{t("msppValidation.colReportLocation")}</th>
                  <th style={MSPP_TABLE_HEAD_CELL}>{t("msppValidation.colDepartment")}</th>
                  <th style={MSPP_TABLE_HEAD_CELL}>{t("msppValidation.colFacility")}</th>
                  <th style={MSPP_TABLE_HEAD_CELL}>{t("msppValidation.colReporter")}</th>
                  <th style={MSPP_TABLE_HEAD_CELL}>{t("msppValidation.colReportedAt")}</th>
                  <th style={MSPP_TABLE_HEAD_CELL}>{t("msppValidation.colGeoReadiness")}</th>
                  <th style={MSPP_TABLE_HEAD_CELL}>{t("msppValidation.colLastDecision")}</th>
                  <th style={MSPP_TABLE_HEAD_CELL}>{t("msppValidation.colStatus")}</th>
                  <th style={{ ...MSPP_TABLE_HEAD_CELL, minWidth: 200 }}>{t("msppValidation.colActions")}</th>
                </tr>
              </thead>
              <tbody>
                {rejectedCentral.map((r) => (
                  <MsppValidationReviewRow
                    key={r.id}
                    row={r}
                    t={t}
                    codeHint={codeHint}
                    showReviewedAtColumn
                    actionCell={
                      <>
                        {canCentral ? (
                          <div style={MSPP_BTN_ROW}>
                            <button
                              type="button"
                              style={{
                                ...MSPP_BTN_REQUEUE,
                                opacity: requeueSubmittingId === r.id || modalSubmitting ? 0.45 : 1,
                                cursor:
                                  requeueSubmittingId === r.id || modalSubmitting ? "not-allowed" : "pointer",
                              }}
                              disabled={Boolean(requeueSubmittingId) || modalSubmitting}
                              onClick={() => void submitCentralRequeue(r.id)}
                            >
                              {t("msppValidation.btnRequeueCentral")}
                            </button>
                          </div>
                        ) : (
                          <span style={MSPP_MUTED_INLINE}>{t("msppValidation.reservedCentralValidators")}</span>
                        )}
                        <div style={{ marginTop: 8 }}>
                          <MsppValidationTechnicalIds
                            reviewId={r.id}
                            reportId={r.diseaseCaseReportId}
                            departmentId={r.departmentId}
                          />
                        </div>
                      </>
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pendingDecision ? (
        <MsppReviewDecisionModal
          open
          title={decisionModalTitle(pendingDecision)}
          onClose={() => setPendingDecision(null)}
          onConfirm={submitDecision}
          submitting={modalSubmitting}
          facilityDossier={activeRow?.facilityDossier ?? null}
          departmentReview={activeRow?.departmentReview ?? null}
          variant={
            pendingDecision.kind === "dept-approve" || pendingDecision.kind === "dept-reject"
              ? "department"
              : "central"
          }
        />
      ) : null}
    </div>
  );
}
