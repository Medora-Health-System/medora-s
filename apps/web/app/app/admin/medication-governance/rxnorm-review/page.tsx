"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import {
  approveRxNormReviewCandidate,
  assignRxNormReviewCandidate,
  bulkRxNormReviewCandidates,
  deferRxNormReviewCandidate,
  fetchRxNormReviewCandidate,
  fetchRxNormReviewCandidates,
  fetchRxNormReviewDashboard,
  rejectRxNormReviewCandidate,
  retireRxNormReviewMapping,
  supersedeRxNormReviewMapping,
  type RxNormReviewCandidateDetail,
  type RxNormReviewDashboard,
  type RxNormReviewQueueRow,
} from "@/lib/medicationRxNormReviewApi";

function cardStyle(): CSSProperties {
  return {
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "12px 14px",
    background: "#fff",
  };
}

const STATUS_OPTIONS = [
  "",
  "CANDIDATE",
  "NEEDS_REVIEW",
  "AMBIGUOUS",
  "CONFLICT",
  "DEFERRED",
  "VERIFIED",
  "REJECTED",
] as const;

const TERM_OPTIONS = ["", "IN", "PIN", "MIN", "BN", "SCD", "SBD", "SCDF", "SBDF"] as const;

const REJECTION_REASONS = [
  "WRONG_INGREDIENT",
  "WRONG_STRENGTH",
  "WRONG_DOSE_FORM",
  "AMBIGUOUS_SOURCE",
  "INSUFFICIENT_EVIDENCE",
  "OTHER",
] as const;

export default function RxNormReviewConsolePage() {
  const { t, language } = useI18n();
  const { ready, facilityId, roles, userId } = useFacilityAndRoles();

  const canAccess =
    roles.includes("ADMIN") ||
    roles.includes("MEDORA_SUPER_ADMIN") ||
    roles.includes("MEDICATION_ADMIN") ||
    roles.includes("MEDICATION_REVIEWER") ||
    roles.includes("PHARMACY");

  const canWrite =
    roles.includes("ADMIN") ||
    roles.includes("MEDORA_SUPER_ADMIN") ||
    roles.includes("MEDICATION_ADMIN") ||
    roles.includes("MEDICATION_REVIEWER");

  const [rows, setRows] = useState<RxNormReviewQueueRow[]>([]);
  const [total, setTotal] = useState(0);
  const [dashboard, setDashboard] = useState<RxNormReviewDashboard | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<RxNormReviewCandidateDetail | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [termType, setTermType] = useState("");
  const [ambiguityOnly, setAmbiguityOnly] = useState(false);
  const [conflictOnly, setConflictOnly] = useState(false);
  const [rationale, setRationale] = useState("");
  const [rejectionReason, setRejectionReason] = useState<string>("INSUFFICIENT_EVIDENCE");
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [confirmReject, setConfirmReject] = useState(false);
  const [confirmDefer, setConfirmDefer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadQueue = useCallback(async () => {
    if (!facilityId) return;
    setLoading(true);
    setError(null);
    try {
      const [queue, metrics] = await Promise.all([
        fetchRxNormReviewCandidates(facilityId, {
          search: search.trim() || undefined,
          status: status || undefined,
          termType: termType || undefined,
          ambiguityOnly: ambiguityOnly || undefined,
          conflictOnly: conflictOnly || undefined,
          limit: 100,
        }),
        fetchRxNormReviewDashboard(facilityId),
      ]);
      setRows(queue.rows);
      setTotal(queue.total);
      setDashboard(metrics);
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : "";
      setError(normalizeUserFacingError(raw, language) || t("medicationRxNormReview.errorLoad"));
    } finally {
      setLoading(false);
    }
  }, [facilityId, search, status, termType, ambiguityOnly, conflictOnly, language, t]);

  const loadDetail = useCallback(
    async (candidateId: string) => {
      if (!facilityId) return;
      setDetailLoading(true);
      setError(null);
      try {
        const row = await fetchRxNormReviewCandidate(facilityId, candidateId);
        setDetail(row);
      } catch (e: unknown) {
        const raw = e instanceof Error ? e.message : "";
        setError(normalizeUserFacingError(raw, language) || t("medicationRxNormReview.errorLoad"));
        setDetail(null);
      } finally {
        setDetailLoading(false);
      }
    },
    [facilityId, language, t]
  );

  useEffect(() => {
    if (!ready || !facilityId || !canAccess) return;
    void loadQueue();
  }, [ready, facilityId, canAccess, loadQueue]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  const selectedRows = useMemo(
    () => rows.filter((row) => selectedIds.has(row.candidateId)),
    [rows, selectedIds]
  );

  async function runAction(action: () => Promise<void>, successKey: string) {
    if (!facilityId || !canWrite) return;
    if (!rationale.trim()) {
      setError(t("medicationRxNormReview.errorRationale"));
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await action();
      setSuccess(t(successKey));
      setRationale("");
      setConfirmApprove(false);
      setConfirmReject(false);
      setConfirmDefer(false);
      await loadQueue();
      if (selectedId) await loadDetail(selectedId);
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : "";
      setError(normalizeUserFacingError(raw, language) || t("medicationRxNormReview.errorAction"));
    } finally {
      setBusy(false);
    }
  }

  if (!ready) {
    return <div style={{ padding: 24 }}>{t("medicationRxNormReview.loading")}</div>;
  }

  if (!canAccess) {
    return (
      <div style={{ padding: 24 }}>
        <p>{t("medicationRxNormReview.accessDenied")}</p>
        <Link href="/app/admin">{t("medicationRxNormReview.backAdmin")}</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, display: "grid", gap: 16 }}>
      <div>
        <Link href="/app/admin" style={{ color: "#334155" }}>
          {t("medicationRxNormReview.backAdmin")}
        </Link>
        <h1 style={{ margin: "8px 0 4px" }}>{t("medicationRxNormReview.title")}</h1>
        <p style={{ color: "#555", marginTop: 0 }}>{t("medicationRxNormReview.intro")}</p>
        <div
          style={{
            ...cardStyle(),
            background: "#fffbeb",
            borderColor: "#f59e0b",
            color: "#92400e",
          }}
        >
          {t("medicationRxNormReview.safetyBanner")}
          <div style={{ marginTop: 6, fontSize: 13 }}>
            {t("medicationRxNormReview.autoVerifyOff")} ·{" "}
            {t("medicationRxNormReview.clinicalActivationOff")}
          </div>
        </div>
      </div>

      {dashboard && (
        <section style={cardStyle()}>
          <h2 style={{ marginTop: 0, fontSize: 16 }}>{t("medicationRxNormReview.dashboardTitle")}</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 13 }}>
            <span>
              {t("medicationRxNormReview.metricOpen")}: {dashboard.candidatesOpen}
            </span>
            <span>
              {t("medicationRxNormReview.metricReviewed")}: {dashboard.candidatesReviewed}
            </span>
            <span>
              {t("medicationRxNormReview.metricApprovalRate")}:{" "}
              {dashboard.approvalRate == null ? "—" : `${Math.round(dashboard.approvalRate * 100)}%`}
            </span>
            <span>
              {t("medicationRxNormReview.metricRejectionRate")}:{" "}
              {dashboard.rejectionRate == null
                ? "—"
                : `${Math.round(dashboard.rejectionRate * 100)}%`}
            </span>
            <span>
              {t("medicationRxNormReview.metricConflicts")}: {dashboard.conflictCount}
            </span>
            <span>
              {t("medicationRxNormReview.metricAmbiguity")}: {dashboard.unresolvedAmbiguity}
            </span>
            <span>
              {t("medicationRxNormReview.metricAvgTime")}:{" "}
              {dashboard.averageReviewTimeSeconds == null
                ? "—"
                : Math.round(dashboard.averageReviewTimeSeconds)}
            </span>
            <span>
              {t("medicationRxNormReview.metricSuperseded")}: {dashboard.supersededMappings}
            </span>
            <span>
              {t("medicationRxNormReview.metricRetired")}: {dashboard.retiredMappings}
            </span>
          </div>
          <div style={{ marginTop: 10, fontSize: 13, color: "#64748b" }}>
            <strong>{t("medicationRxNormReview.pilotTitle")}</strong> —{" "}
            {t("medicationRxNormReview.pilotDisabled")}
          </div>
        </section>
      )}

      <section style={{ ...cardStyle(), display: "grid", gap: 10 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("medicationRxNormReview.searchPlaceholder")}
            style={{ minWidth: 240, padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1" }}
          />
          <label style={{ fontSize: 13 }}>
            {t("medicationRxNormReview.filterStatus")}{" "}
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt || "all"} value={opt}>
                  {opt || t("medicationRxNormReview.filterAll")}
                </option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: 13 }}>
            {t("medicationRxNormReview.filterTermType")}{" "}
            <select value={termType} onChange={(e) => setTermType(e.target.value)}>
              {TERM_OPTIONS.map((opt) => (
                <option key={opt || "all"} value={opt}>
                  {opt || t("medicationRxNormReview.filterAll")}
                </option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: 13 }}>
            <input
              type="checkbox"
              checked={ambiguityOnly}
              onChange={(e) => setAmbiguityOnly(e.target.checked)}
            />{" "}
            {t("medicationRxNormReview.ambiguityOnly")}
          </label>
          <label style={{ fontSize: 13 }}>
            <input
              type="checkbox"
              checked={conflictOnly}
              onChange={(e) => setConflictOnly(e.target.checked)}
            />{" "}
            {t("medicationRxNormReview.conflictOnly")}
          </label>
          <button type="button" onClick={() => void loadQueue()} disabled={loading || busy}>
            {t("medicationRxNormReview.refresh")}
          </button>
        </div>
        {error && <div style={{ color: "#b91c1c" }}>{error}</div>}
        {success && <div style={{ color: "#047857" }}>{success}</div>}
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 1fr) minmax(360px, 1.2fr)", gap: 16 }}>
        <section style={cardStyle()}>
          <h2 style={{ marginTop: 0, fontSize: 16 }}>
            {t("medicationRxNormReview.queueTitle")} ({total})
          </h2>
          {loading ? (
            <p>{t("medicationRxNormReview.loading")}</p>
          ) : rows.length === 0 ? (
            <p>{t("medicationRxNormReview.empty")}</p>
          ) : (
            <div style={{ display: "grid", gap: 6, maxHeight: 560, overflow: "auto" }}>
              {rows.map((row) => {
                const active = selectedId === row.candidateId;
                const checked = selectedIds.has(row.candidateId);
                return (
                  <div
                    key={row.candidateId}
                    style={{
                      border: active ? "2px solid #2563eb" : "1px solid #e2e8f0",
                      borderRadius: 10,
                      padding: 10,
                      background: active ? "#eff6ff" : "#fff",
                      display: "grid",
                      gridTemplateColumns: "auto 1fr",
                      gap: 8,
                      cursor: "pointer",
                    }}
                    onClick={() => setSelectedId(row.candidateId)}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        setSelectedIds((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(row.candidateId);
                          else next.delete(row.candidateId);
                          return next;
                        });
                      }}
                    />
                    <div style={{ fontSize: 13 }}>
                      <div style={{ fontWeight: 600 }}>
                        {row.rxcui} · {row.termType} · {row.status}
                      </div>
                      <div style={{ color: "#475569" }}>
                        {row.displayTerm || "—"} → {row.targetCode || row.targetId}
                      </div>
                      <div style={{ color: "#64748b" }}>
                        {row.releaseIdentifier} ·{" "}
                        {row.isSynthetic
                          ? t("medicationRxNormReview.synthetic")
                          : t("medicationRxNormReview.real")}
                        {row.status === "CONFLICT" ? ` · ${t("medicationRxNormReview.conflict")}` : ""}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {canWrite && selectedRows.length > 0 && (
            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13 }}>
                {t("medicationRxNormReview.selectedCount").replace(
                  "{count}",
                  String(selectedRows.length)
                )}
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void runAction(async () => {
                    if (!confirmDefer) throw new Error(t("medicationRxNormReview.errorConfirm"));
                    await bulkRxNormReviewCandidates(facilityId!, {
                      action: "DEFER",
                      confirmBulk: true,
                      rationaleNotes: rationale,
                      items: selectedRows.map((r) => ({
                        candidateId: r.candidateId,
                        expectedReviewVersion: r.reviewVersion,
                      })),
                    });
                    setSelectedIds(new Set());
                  }, "medicationRxNormReview.successBulk")
                }
              >
                {t("medicationRxNormReview.bulkDefer")}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void runAction(async () => {
                    if (!confirmReject) throw new Error(t("medicationRxNormReview.errorConfirm"));
                    await bulkRxNormReviewCandidates(facilityId!, {
                      action: "REJECT",
                      confirmBulk: true,
                      rationaleNotes: rationale,
                      rejectionReasonCategory: rejectionReason,
                      items: selectedRows.map((r) => ({
                        candidateId: r.candidateId,
                        expectedReviewVersion: r.reviewVersion,
                      })),
                    });
                    setSelectedIds(new Set());
                  }, "medicationRxNormReview.successBulk")
                }
              >
                {t("medicationRxNormReview.bulkReject")}
              </button>
            </div>
          )}
        </section>

        <section style={{ ...cardStyle(), display: "grid", gap: 12 }}>
          <h2 style={{ marginTop: 0, fontSize: 16 }}>{t("medicationRxNormReview.detailTitle")}</h2>
          {!selectedId ? (
            <p>{t("medicationRxNormReview.selectRow")}</p>
          ) : detailLoading || !detail ? (
            <p>{t("medicationRxNormReview.loading")}</p>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ ...cardStyle(), background: "#f8fafc" }}>
                  <strong>{t("medicationRxNormReview.rxcui")}</strong>
                  <div>{detail.rxcui}</div>
                  <div>
                    {t("medicationRxNormReview.termType")}: {detail.termType}
                  </div>
                  <div>{detail.displayTerm}</div>
                </div>
                <div style={{ ...cardStyle(), background: "#f8fafc" }}>
                  <strong>{t("medicationRxNormReview.target")}</strong>
                  <div>{detail.target.displayName || detail.target.code}</div>
                  <div>{detail.target.code}</div>
                  <div>{detail.target.dataClassification}</div>
                  <div>{detail.target.rxNormMappingStatus}</div>
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: 14, marginBottom: 4 }}>
                  {t("medicationRxNormReview.provenanceTitle")}
                </h3>
                <div style={{ fontSize: 13, color: "#334155" }}>
                  {t("medicationRxNormReview.release")}: {detail.release.releaseIdentifier} (
                  {detail.release.sourceClassification || "—"}) ·{" "}
                  {detail.release.isSynthetic
                    ? t("medicationRxNormReview.synthetic")
                    : t("medicationRxNormReview.real")}
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: 14, marginBottom: 4 }}>
                  {t("medicationRxNormReview.evidenceTitle")}
                </h3>
                <pre
                  style={{
                    margin: 0,
                    fontSize: 11,
                    maxHeight: 140,
                    overflow: "auto",
                    background: "#0f172a",
                    color: "#e2e8f0",
                    padding: 10,
                    borderRadius: 8,
                  }}
                >
                  {JSON.stringify(detail.evidenceJson, null, 2)}
                </pre>
              </div>

              <div>
                <h3 style={{ fontSize: 14, marginBottom: 4 }}>
                  {t("medicationRxNormReview.timelineTitle")}
                </h3>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                  {detail.mappingTimeline.length === 0 ? (
                    <li>—</li>
                  ) : (
                    detail.mappingTimeline.map((m) => (
                      <li key={m.id}>
                        {m.rxcui} · {m.lifecycleStatus} · {m.verifiedAt}
                      </li>
                    ))
                  )}
                </ul>
              </div>

              <div>
                <h3 style={{ fontSize: 14, marginBottom: 4 }}>
                  {t("medicationRxNormReview.historyTitle")}
                </h3>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
                  {detail.auditHistory.length === 0 ? (
                    <li>—</li>
                  ) : (
                    detail.auditHistory.slice(0, 12).map((e) => (
                      <li key={e.id}>
                        {e.createdAt} · {e.action} · {e.actorRoleLabel || e.actorUserId || "—"}
                        {e.rationaleNotes ? ` — ${e.rationaleNotes}` : ""}
                      </li>
                    ))
                  )}
                </ul>
              </div>

              {canWrite && (
                <div style={{ display: "grid", gap: 8 }}>
                  <label style={{ fontSize: 13 }}>
                    {t("medicationRxNormReview.rationaleLabel")}
                    <textarea
                      value={rationale}
                      onChange={(e) => setRationale(e.target.value)}
                      rows={3}
                      style={{ width: "100%", marginTop: 4 }}
                    />
                  </label>
                  <label style={{ fontSize: 13 }}>
                    {t("medicationRxNormReview.rejectionReason")}{" "}
                    <select
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                    >
                      {REJECTION_REASONS.map((reason) => (
                        <option key={reason} value={reason}>
                          {reason}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label style={{ fontSize: 13 }}>
                    <input
                      type="checkbox"
                      checked={confirmApprove}
                      onChange={(e) => setConfirmApprove(e.target.checked)}
                    />{" "}
                    {t("medicationRxNormReview.confirmApprove")}
                  </label>
                  <label style={{ fontSize: 13 }}>
                    <input
                      type="checkbox"
                      checked={confirmReject}
                      onChange={(e) => setConfirmReject(e.target.checked)}
                    />{" "}
                    {t("medicationRxNormReview.confirmReject")}
                  </label>
                  <label style={{ fontSize: 13 }}>
                    <input
                      type="checkbox"
                      checked={confirmDefer}
                      onChange={(e) => setConfirmDefer(e.target.checked)}
                    />{" "}
                    {t("medicationRxNormReview.confirmDefer")}
                  </label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void runAction(async () => {
                          if (!confirmApprove) {
                            throw new Error(t("medicationRxNormReview.errorConfirm"));
                          }
                          await approveRxNormReviewCandidate(facilityId!, {
                            candidateId: detail.candidateId,
                            expectedReviewVersion: detail.reviewVersion,
                            confirmApprove: true,
                            rationaleNotes: rationale,
                            conflictOverrideAcknowledged: detail.status === "CONFLICT",
                            conflictOverrideReasons:
                              detail.status === "CONFLICT" ? ["MANUAL_ADJUDICATION"] : undefined,
                          });
                        }, "medicationRxNormReview.successApprove")
                      }
                    >
                      {t("medicationRxNormReview.approve")}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void runAction(async () => {
                          if (!confirmReject) {
                            throw new Error(t("medicationRxNormReview.errorConfirm"));
                          }
                          await rejectRxNormReviewCandidate(facilityId!, {
                            candidateId: detail.candidateId,
                            expectedReviewVersion: detail.reviewVersion,
                            confirmReject: true,
                            rationaleNotes: rationale,
                            rejectionReasonCategory: rejectionReason,
                          });
                        }, "medicationRxNormReview.successReject")
                      }
                    >
                      {t("medicationRxNormReview.reject")}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void runAction(async () => {
                          if (!confirmDefer) {
                            throw new Error(t("medicationRxNormReview.errorConfirm"));
                          }
                          await deferRxNormReviewCandidate(facilityId!, {
                            candidateId: detail.candidateId,
                            expectedReviewVersion: detail.reviewVersion,
                            confirmDefer: true,
                            deferredReason: rationale,
                          });
                        }, "medicationRxNormReview.successDefer")
                      }
                    >
                      {t("medicationRxNormReview.defer")}
                    </button>
                    {userId && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setBusy(true);
                          setError(null);
                          setSuccess(null);
                          void assignRxNormReviewCandidate(facilityId!, {
                            candidateId: detail.candidateId,
                            expectedReviewVersion: detail.reviewVersion,
                            assignedToUserId: userId,
                          })
                            .then(async () => {
                              setSuccess(t("medicationRxNormReview.successAssign"));
                              await loadQueue();
                              await loadDetail(detail.candidateId);
                            })
                            .catch((e: unknown) => {
                              const raw = e instanceof Error ? e.message : "";
                              setError(
                                normalizeUserFacingError(raw, language) ||
                                  t("medicationRxNormReview.errorAction")
                              );
                            })
                            .finally(() => setBusy(false));
                        }}
                      >
                        {t("medicationRxNormReview.assignToMe")}
                      </button>
                    )}
                    {detail.activeVerifiedMappings[0] && (
                      <>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void runAction(async () => {
                              await retireRxNormReviewMapping(facilityId!, {
                                verifiedMappingId: detail.activeVerifiedMappings[0].id,
                                confirmRetire: true,
                                retireReason: rationale,
                                candidateId: detail.candidateId,
                              });
                            }, "medicationRxNormReview.successRetire")
                          }
                        >
                          {t("medicationRxNormReview.retire")}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void runAction(async () => {
                              if (!confirmApprove) {
                                throw new Error(t("medicationRxNormReview.errorConfirm"));
                              }
                              await supersedeRxNormReviewMapping(facilityId!, {
                                candidateId: detail.candidateId,
                                expectedReviewVersion: detail.reviewVersion,
                                previousVerifiedMappingId: detail.activeVerifiedMappings[0].id,
                                confirmApprove: true,
                                rationaleNotes: rationale,
                              });
                            }, "medicationRxNormReview.successSupersede")
                          }
                        >
                          {t("medicationRxNormReview.supersede")}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
