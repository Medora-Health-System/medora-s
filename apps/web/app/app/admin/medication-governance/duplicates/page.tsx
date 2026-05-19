"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import {
  blockStagingDuplicateGovernance,
  fetchStagingDuplicateGovernanceQueue,
  resolveStagingDuplicateGovernance,
  unblockStagingDuplicateGovernance,
  type DuplicateGovernanceStatus,
  type StagingDuplicateGovernanceRow,
} from "@/lib/medicationStagingDuplicateGovernanceApi";
import { normalizeUserFacingError } from "@/lib/userFacingError";

function cardStyle(): CSSProperties {
  return {
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "12px 14px",
    background: "#fff",
  };
}

function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const FILTER_KEYS = [
  "",
  "POSSIBLE_DUPLICATE",
  "EXACT_MATCH",
  "NEW_CANDIDATE",
  "REVIEW_REQUIRED",
  "PROMOTED_INACTIVE",
  "BLOCKED",
  "MISSING_NDC",
  "MISSING_BILLING",
] as const;

export default function MedicationGovernanceDuplicatesPage() {
  const { t, language } = useI18n();
  const { ready, roles, facilityId } = useFacilityAndRoles();
  const isAdmin = roles.includes("ADMIN") || roles.includes("MEDORA_SUPER_ADMIN");

  const [items, setItems] = useState<StagingDuplicateGovernanceRow[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<(typeof FILTER_KEYS)[number]>("");
  const [searchQ, setSearchQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [decision, setDecision] = useState<DuplicateGovernanceStatus>("UNREVIEWED");
  const [note, setNote] = useState("");
  const [confirmExact, setConfirmExact] = useState(false);
  const [linkedConceptId, setLinkedConceptId] = useState("");
  const [linkedProductId, setLinkedProductId] = useState("");

  const selected = useMemo(
    () => items.find((r) => r.id === selectedId) ?? null,
    [items, selectedId]
  );

  const loadQueue = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchStagingDuplicateGovernanceQueue(facilityId ?? undefined, {
        filter: filter || undefined,
        q: searchQ.trim() || undefined,
        limit: 200,
      });
      setItems(res.items);
      setTotal(res.total);
      if (res.items.length && !res.items.some((r) => r.id === selectedId)) {
        setSelectedId(res.items[0]?.id ?? null);
      }
    } catch (err) {
      setError(
        normalizeUserFacingError((err as Error)?.message, language) ||
          t("medicationGovernanceDuplicates.errorLoad")
      );
    } finally {
      setLoading(false);
    }
  }, [isAdmin, facilityId, filter, searchQ, language, t, selectedId]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    if (!selected) return;
    setDecision(selected.governance.governanceDecision);
    setNote(selected.governance.duplicateResolutionNote ?? "");
    setConfirmExact(false);
    setLinkedConceptId(selected.governance.linkedConceptId ?? "");
    setLinkedProductId(selected.governance.linkedProductId ?? "");
  }, [selected]);

  const handleExport = () => {
    downloadCsv(
      "medication-staging-duplicates.csv",
      [
        t("medicationGovernanceDuplicates.colSourceMedication"),
        t("medicationGovernanceDuplicates.colSourceDose"),
        t("medicationGovernanceDuplicates.colSourceForm"),
        t("medicationGovernanceDuplicates.colExactSource"),
        t("medicationGovernanceDuplicates.colReconciliation"),
        t("medicationGovernanceDuplicates.colGovernance"),
        t("medicationGovernanceDuplicates.colPromotion"),
      ],
      items.map((r) => [
        r.medication,
        r.dose,
        r.form,
        r.exactSourceText,
        r.reconciliationStatus,
        r.governance.governanceDecision,
        r.promotionEligible ? "eligible" : "blocked",
      ])
    );
  };

  const handleResolve = async () => {
    if (!selected || !facilityId) return;
    setActing(true);
    setError(null);
    try {
      const updated = await resolveStagingDuplicateGovernance(selected.id, facilityId, {
        decision,
        note: note.trim(),
        confirmExactSourcePreserved: true,
        linkedConceptId: linkedConceptId.trim() || undefined,
        linkedProductId: linkedProductId.trim() || undefined,
      });
      setItems((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (err) {
      setError(
        normalizeUserFacingError((err as Error)?.message, language) ||
          t("medicationGovernanceDuplicates.errorAction")
      );
    } finally {
      setActing(false);
    }
  };

  const handleBlock = async () => {
    if (!selected || !facilityId || note.trim().length < 3) return;
    setActing(true);
    setError(null);
    try {
      const updated = await blockStagingDuplicateGovernance(selected.id, facilityId, note.trim());
      setItems((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (err) {
      setError(
        normalizeUserFacingError((err as Error)?.message, language) ||
          t("medicationGovernanceDuplicates.errorAction")
      );
    } finally {
      setActing(false);
    }
  };

  const handleUnblock = async () => {
    if (!selected || !facilityId || note.trim().length < 3) return;
    setActing(true);
    setError(null);
    try {
      const updated = await unblockStagingDuplicateGovernance(selected.id, facilityId, note.trim());
      setItems((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (err) {
      setError(
        normalizeUserFacingError((err as Error)?.message, language) ||
          t("medicationGovernanceDuplicates.errorAction")
      );
    } finally {
      setActing(false);
    }
  };

  if (!ready) return null;

  if (!isAdmin) {
    return (
      <main style={{ padding: 24, maxWidth: 720 }}>
        <p>{t("medicationGovernanceDuplicates.accessDenied")}</p>
      </main>
    );
  }

  if (!facilityId) {
    return (
      <main style={{ padding: 24, maxWidth: 720 }}>
        <p>{t("medicationGovernanceDuplicates.errorFacility")}</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 20, maxWidth: 1280, margin: "0 auto" }}>
      <p style={{ margin: 0, fontSize: 13 }}>
        <Link href="/app/admin">{t("medicationGovernanceDuplicates.backAdmin")}</Link>
        {" · "}
        <Link href="/app/admin/medication-governance">
          {t("medicationGovernanceDuplicates.backGovernance")}
        </Link>
      </p>
      <h1 style={{ margin: "12px 0 4px", fontSize: 22 }}>{t("medicationGovernanceDuplicates.title")}</h1>
      <p style={{ margin: "0 0 12px", fontSize: 13, color: "#64748b", lineHeight: 1.45 }}>
        {t("medicationGovernanceDuplicates.intro")}
      </p>
      <p
        style={{
          margin: "0 0 16px",
          padding: "8px 12px",
          borderRadius: 10,
          background: "#fffbeb",
          border: "1px solid #fcd34d",
          fontSize: 12,
          color: "#92400e",
        }}
      >
        {t("medicationGovernanceDuplicates.readOnlyBanner")}
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as (typeof FILTER_KEYS)[number])}
          style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #cbd5e1" }}
        >
          <option value="">{t("medicationGovernanceDuplicates.filterAll")}</option>
          <option value="POSSIBLE_DUPLICATE">{t("medicationGovernanceDuplicates.filterPossibleDuplicate")}</option>
          <option value="EXACT_MATCH">{t("medicationGovernanceDuplicates.filterExactMatch")}</option>
          <option value="NEW_CANDIDATE">{t("medicationGovernanceDuplicates.filterNewCandidate")}</option>
          <option value="REVIEW_REQUIRED">{t("medicationGovernanceDuplicates.filterReviewRequired")}</option>
          <option value="PROMOTED_INACTIVE">{t("medicationGovernanceDuplicates.filterPromotedInactive")}</option>
          <option value="BLOCKED">{t("medicationGovernanceDuplicates.filterBlocked")}</option>
          <option value="MISSING_NDC">{t("medicationGovernanceDuplicates.filterMissingNdc")}</option>
          <option value="MISSING_BILLING">{t("medicationGovernanceDuplicates.filterMissingBilling")}</option>
        </select>
        <input
          type="search"
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          placeholder={t("medicationGovernanceDuplicates.searchPlaceholder")}
          style={{ flex: "1 1 200px", minWidth: 180, padding: "6px 10px", borderRadius: 8, border: "1px solid #cbd5e1" }}
        />
        <button type="button" onClick={() => void loadQueue()} disabled={loading} style={{ padding: "6px 12px" }}>
          {t("medicationGovernanceDuplicates.refresh")}
        </button>
        <button type="button" onClick={handleExport} disabled={!items.length} style={{ padding: "6px 12px" }}>
          {t("medicationGovernanceDuplicates.exportCsv")}
        </button>
      </div>

      {error ? (
        <p style={{ color: "#b91c1c", fontSize: 13, marginBottom: 12 }}>{error}</p>
      ) : null}

      <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 8px" }}>
        {t("medicationGovernanceDuplicates.rowCount").replace("{count}", String(total))}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1fr)", gap: 12 }}>
        <div style={cardStyle()}>
          {loading ? (
            <p style={{ fontSize: 13 }}>…</p>
          ) : items.length === 0 ? (
            <p style={{ fontSize: 13, color: "#64748b" }}>{t("medicationGovernanceDuplicates.noRows")}</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>
                    <th style={{ padding: 6 }}>{t("medicationGovernanceDuplicates.colExactSource")}</th>
                    <th style={{ padding: 6 }}>{t("medicationGovernanceDuplicates.colReconciliation")}</th>
                    <th style={{ padding: 6 }}>{t("medicationGovernanceDuplicates.colGovernance")}</th>
                    <th style={{ padding: 6 }}>{t("medicationGovernanceDuplicates.colPromotion")}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedId(r.id)}
                      style={{
                        cursor: "pointer",
                        background: r.id === selectedId ? "#f0fdfa" : undefined,
                        borderBottom: "1px solid #f1f5f9",
                      }}
                    >
                      <td style={{ padding: 6, fontFamily: "ui-monospace, monospace" }}>{r.exactSourceText}</td>
                      <td style={{ padding: 6 }}>{r.reconciliationStatus}</td>
                      <td style={{ padding: 6 }}>{r.governance.governanceDecision}</td>
                      <td style={{ padding: 6 }}>
                        {r.promotionEligible
                          ? t("medicationGovernanceDuplicates.promotionEligible")
                          : t("medicationGovernanceDuplicates.promotionBlocked")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selected ? (
          <div style={{ ...cardStyle(), display: "flex", flexDirection: "column", gap: 12 }}>
            <section>
              <h2 style={{ margin: "0 0 8px", fontSize: 14 }}>{t("medicationGovernanceDuplicates.sectionSource")}</h2>
              <p style={{ margin: 0, fontSize: 12 }}>
                <strong>{t("medicationGovernanceDuplicates.colSourceMedication")}:</strong> {selected.medication}
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 12 }}>
                <strong>{t("medicationGovernanceDuplicates.colSourceDose")}:</strong> {selected.dose}
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 12 }}>
                <strong>{t("medicationGovernanceDuplicates.colSourceForm")}:</strong> {selected.form}
              </p>
              <p style={{ margin: "8px 0 0", fontSize: 12, fontFamily: "ui-monospace, monospace" }}>
                {selected.exactSourceText}
              </p>
            </section>

            <section>
              <h2 style={{ margin: "0 0 8px", fontSize: 14 }}>{t("medicationGovernanceDuplicates.sectionCanonical")}</h2>
              {selected.canonicalMatches.length === 0 ? (
                <p style={{ fontSize: 12, color: "#64748b" }}>—</p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
                  {selected.canonicalMatches.map((m) => (
                    <li key={`${m.kind}-${m.id}`}>
                      {m.displayName} · {m.strengthDisplay ?? "—"} · {m.dosageForm ?? "—"} ·{" "}
                      {m.isActive ? t("medicationGovernanceDuplicates.active") : t("medicationGovernanceDuplicates.inactive")}
                    </li>
                  ))}
                </ul>
              )}
              {selected.matchCandidates.length > 0 ? (
                <div style={{ marginTop: 8, fontSize: 11, color: "#64748b" }}>
                  {selected.matchCandidates.slice(0, 4).map((m) => (
                    <p key={`${m.kind}-${m.id}-${m.matchType}`} style={{ margin: "2px 0" }}>
                      {t("medicationGovernanceDuplicates.matchType")}: {m.matchType} ·{" "}
                      {t("medicationGovernanceDuplicates.matchConfidence")}: {Math.round(m.confidence * 100)}%
                    </p>
                  ))}
                </div>
              ) : null}
            </section>

            <section>
              <h2 style={{ margin: "0 0 8px", fontSize: 14 }}>{t("medicationGovernanceDuplicates.sectionDecision")}</h2>
              <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>
                {t("medicationGovernanceDuplicates.decisionLabel")}
              </label>
              <select
                value={decision}
                onChange={(e) => setDecision(e.target.value as DuplicateGovernanceStatus)}
                style={{ width: "100%", padding: 6, borderRadius: 8, border: "1px solid #cbd5e1", marginBottom: 8 }}
              >
                <option value="UNREVIEWED">{t("medicationGovernanceDuplicates.decisionUnreviewed")}</option>
                <option value="LINK_TO_EXISTING">{t("medicationGovernanceDuplicates.decisionLinkExisting")}</option>
                <option value="CREATE_NEW_APPROVED">{t("medicationGovernanceDuplicates.decisionCreateNewApproved")}</option>
                <option value="BLOCKED_DUPLICATE">{t("medicationGovernanceDuplicates.decisionBlockedDuplicate")}</option>
                <option value="NEEDS_PHARMACY_REVIEW">{t("medicationGovernanceDuplicates.decisionNeedsPharmacy")}</option>
                <option value="NEEDS_BILLING_REVIEW">{t("medicationGovernanceDuplicates.decisionNeedsBilling")}</option>
                <option value="NEEDS_NDC_REVIEW">{t("medicationGovernanceDuplicates.decisionNeedsNdc")}</option>
              </select>
              <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>
                {t("medicationGovernanceDuplicates.linkedConceptId")}
              </label>
              <input
                value={linkedConceptId}
                onChange={(e) => setLinkedConceptId(e.target.value)}
                style={{ width: "100%", padding: 6, borderRadius: 8, border: "1px solid #cbd5e1", marginBottom: 8 }}
              />
              <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>
                {t("medicationGovernanceDuplicates.linkedProductId")}
              </label>
              <input
                value={linkedProductId}
                onChange={(e) => setLinkedProductId(e.target.value)}
                style={{ width: "100%", padding: 6, borderRadius: 8, border: "1px solid #cbd5e1", marginBottom: 8 }}
              />
              <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>
                {t("medicationGovernanceDuplicates.noteLabel")}
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder={t("medicationGovernanceDuplicates.notePlaceholder")}
                style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #cbd5e1", marginBottom: 8 }}
              />
              <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12, marginBottom: 10 }}>
                <input
                  type="checkbox"
                  checked={confirmExact}
                  onChange={(e) => setConfirmExact(e.target.checked)}
                  style={{ marginTop: 2 }}
                />
                <span>{t("medicationGovernanceDuplicates.confirmExactSource")}</span>
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <button
                  type="button"
                  disabled={acting || !confirmExact || note.trim().length < 3}
                  onClick={() => void handleResolve()}
                  style={{ padding: "6px 12px" }}
                >
                  {t("medicationGovernanceDuplicates.submitResolve")}
                </button>
                <button
                  type="button"
                  disabled={acting || note.trim().length < 3}
                  onClick={() => void handleBlock()}
                  style={{ padding: "6px 12px" }}
                >
                  {t("medicationGovernanceDuplicates.submitBlock")}
                </button>
                <button
                  type="button"
                  disabled={acting || note.trim().length < 3}
                  onClick={() => void handleUnblock()}
                  style={{ padding: "6px 12px" }}
                >
                  {t("medicationGovernanceDuplicates.submitUnblock")}
                </button>
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
}
