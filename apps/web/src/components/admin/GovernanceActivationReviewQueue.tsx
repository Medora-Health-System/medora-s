"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import {
  formatActivationBlockerMessage,
} from "@/lib/medicationActivationGovernanceUi.util";
import {
  approveProductForActivationReview,
  blockProductActivationReview,
  fetchPendingGovernanceActivationReview,
  formatProductGovernanceError,
  type GovernanceActivationReviewRow,
} from "@/lib/medicationProductGovernanceActionsApi";

function cardStyle(): CSSProperties {
  return {
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "12px 14px",
    background: "#fff",
  };
}

export function GovernanceActivationReviewQueue({
  facilityId,
  facilityLabel,
  onQueueLoaded,
}: {
  facilityId: string;
  facilityLabel: string;
  onQueueLoaded?: (count: number) => void;
}) {
  const { t } = useI18n();
  const [items, setItems] = useState<GovernanceActivationReviewRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [note, setNote] = useState("");
  const [confirmExact, setConfirmExact] = useState(false);
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);

  const selected = useMemo(
    () => items.find((r) => r.productId === selectedId) ?? null,
    [items, selectedId]
  );

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetchPendingGovernanceActivationReview(facilityId, {
        q: searchQ.trim() || undefined,
        limit: 100,
      });
      const rows = Array.isArray(res.items) ? res.items : [];
      setItems(rows);
      onQueueLoaded?.(rows.length);
      if (rows.length && !rows.some((r) => r.productId === selectedId)) {
        setSelectedId(rows[0]?.productId ?? null);
      }
      if (rows.length === 0) setSelectedId(null);
    } catch (err) {
      setItems([]);
      setLoadError(
        formatProductGovernanceError(err, t) || t("medicationGovernance.activationReview.errorLoad")
      );
    } finally {
      setLoading(false);
    }
  }, [facilityId, searchQ, t, selectedId]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  const buildBody = () => ({
    facilityId,
    governanceNote: note.trim(),
    confirmExactSourcePreserved: true as const,
    confirmDuplicateGovernanceResolved: true as const,
  });

  const runAction = async (fn: () => Promise<unknown>) => {
    if (!selected) return;
    if (!note.trim() || !confirmExact || !confirmDuplicate) {
      setActionError(t("medicationGovernance.activationReview.errorConfirmations"));
      return;
    }
    setActing(true);
    setActionError(null);
    try {
      await fn();
      setNote("");
      setConfirmExact(false);
      setConfirmDuplicate(false);
      await loadQueue();
    } catch (err) {
      setActionError(formatProductGovernanceError(err, t));
    } finally {
      setActing(false);
    }
  };

  const blockerLabels = (row: GovernanceActivationReviewRow) =>
    row.blockerReasons.map((c) => formatActivationBlockerMessage(c, t));

  return (
    <div style={{ marginTop: 8 }}>
      <p style={{ margin: "0 0 12px 0", fontSize: 13 }}>
        <Link href="/app/admin/medication-governance/activation">
          {t("medicationGovernance.activationReview.openActivationQueue")}
        </Link>
      </p>

      {loadError && items.length === 0 ? (
        <p style={{ color: "#b91c1c", fontSize: 13 }} role="alert">
          {loadError}
        </p>
      ) : null}

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <input
          type="search"
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          placeholder={t("medicationGovernance.activationReview.searchPlaceholder")}
          style={{ flex: 1, minWidth: 180, padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1" }}
        />
        <button type="button" onClick={() => void loadQueue()} disabled={loading}>
          {loading
            ? t("medicationGovernance.activationReview.loading")
            : t("medicationGovernance.activationReview.refresh")}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.25fr", gap: 12, alignItems: "start" }}>
        <section style={cardStyle()}>
          <h3 style={{ margin: "0 0 8px 0", fontSize: 14 }}>
            {t("medicationGovernance.activationReview.queueTitle")} ({items.length})
          </h3>
          {items.length === 0 ? (
            <p style={{ color: "#64748b", fontSize: 13 }}>
              {t("medicationGovernance.activationReview.noRows")}
            </p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, maxHeight: 360, overflow: "auto" }}>
              {items.map((row) => (
                <li key={row.productId}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(row.productId);
                      setActionError(null);
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "8px 10px",
                      marginBottom: 4,
                      borderRadius: 8,
                      border:
                        selectedId === row.productId ? "2px solid #2563eb" : "1px solid #e2e8f0",
                      background: selectedId === row.productId ? "#eff6ff" : "#fff",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 13 }}>
                      {row.medicationDisplayName ?? row.exactSourceMedication ?? row.productCode}
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>
                      {t(`medicationGovernance.status.${row.governanceStatus}`)}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {selected ? (
          <section style={cardStyle()}>
            <h3 style={{ margin: "0 0 8px 0", fontSize: 14 }}>
              {t("medicationGovernance.activationReview.detailTitle")}
            </h3>

            {actionError ? (
              <div
                role="alert"
                style={{
                  marginBottom: 10,
                  padding: "8px 10px",
                  borderRadius: 8,
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  fontSize: 12,
                  color: "#b91c1c",
                }}
              >
                <strong>{t("medicationGovernance.activationReview.actionErrorTitle")}</strong>
                <p style={{ margin: "4px 0 0 0" }}>{actionError}</p>
              </div>
            ) : null}

            <dl style={{ margin: 0, fontSize: 13, display: "grid", gap: 4 }}>
              <div>
                <dt style={{ fontWeight: 600, display: "inline" }}>
                  {t("medicationGovernance.activationReview.colMedication")}:{" "}
                </dt>
                <dd style={{ display: "inline", margin: 0 }}>
                  {selected.medicationDisplayName ?? selected.exactSourceMedication ?? "—"}
                </dd>
              </div>
              <div>
                <dt style={{ fontWeight: 600, display: "inline" }}>
                  {t("medicationGovernance.activationReview.colExactSource")}:{" "}
                </dt>
                <dd style={{ display: "inline", margin: 0 }}>{selected.exactSourceText ?? "—"}</dd>
              </div>
              <div>
                <dt style={{ fontWeight: 600, display: "inline" }}>
                  {t("medicationGovernance.activationReview.colDose")}:{" "}
                </dt>
                <dd style={{ display: "inline", margin: 0 }}>{selected.exactSourceDose ?? "—"}</dd>
              </div>
              <div>
                <dt style={{ fontWeight: 600, display: "inline" }}>
                  {t("medicationGovernance.activationReview.colForm")}:{" "}
                </dt>
                <dd style={{ display: "inline", margin: 0 }}>{selected.exactSourceFormRoute ?? "—"}</dd>
              </div>
              <div>
                <dt style={{ fontWeight: 600, display: "inline" }}>
                  {t("medicationGovernance.activationReview.colProduct")}:{" "}
                </dt>
                <dd style={{ display: "inline", margin: 0 }}>{selected.productCode}</dd>
              </div>
              <div>
                <dt style={{ fontWeight: 600, display: "inline" }}>
                  {t("medicationGovernance.activationReview.colFacility")}:{" "}
                </dt>
                <dd style={{ display: "inline", margin: 0 }}>{facilityLabel}</dd>
              </div>
              <div>
                <dt style={{ fontWeight: 600, display: "inline" }}>
                  {t("medicationGovernance.activationReview.colDuplicate")}:{" "}
                </dt>
                <dd style={{ display: "inline", margin: 0 }}>
                  {selected.duplicateGovernanceStatus ?? "—"}
                  {selected.duplicateGovernanceResolved
                    ? ` ${t("medicationGovernance.activationReview.duplicateResolved")}`
                    : ` ${t("medicationGovernance.activationReview.duplicateUnresolved")}`}
                </dd>
              </div>
              <div>
                <dt style={{ fontWeight: 600, display: "inline" }}>
                  {t("medicationGovernance.activationReview.colGovernance")}:{" "}
                </dt>
                <dd style={{ display: "inline", margin: 0 }}>
                  {t(`medicationGovernance.status.${selected.governanceStatus}`)}
                </dd>
              </div>
            </dl>

            {blockerLabels(selected).length > 0 ? (
              <div style={{ margin: "10px 0", fontSize: 12, color: "#92400e" }}>
                <strong>{t("medicationGovernance.activationReview.colBlockers")}:</strong>
                <ul style={{ margin: "4px 0 0 16px", padding: 0 }}>
                  {blockerLabels(selected).map((msg) => (
                    <li key={msg}>{msg}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <label style={{ display: "block", fontSize: 13, margin: "10px 0 6px 0" }}>
              {t("medicationGovernance.activationReview.noteLabel")}
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                style={{ display: "block", width: "100%", marginTop: 4, padding: 8, borderRadius: 8 }}
                placeholder={t("medicationGovernance.activationReview.notePlaceholder")}
              />
            </label>
            <label style={{ display: "flex", gap: 8, fontSize: 12, marginBottom: 4 }}>
              <input
                type="checkbox"
                checked={confirmExact}
                onChange={(e) => setConfirmExact(e.target.checked)}
              />
              {t("medicationGovernance.activationReview.confirmExactSource")}
            </label>
            <label style={{ display: "flex", gap: 8, fontSize: 12, marginBottom: 10 }}>
              <input
                type="checkbox"
                checked={confirmDuplicate}
                onChange={(e) => setConfirmDuplicate(e.target.checked)}
              />
              {t("medicationGovernance.activationReview.confirmDuplicateResolved")}
            </label>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                type="button"
                disabled={acting}
                onClick={() =>
                  void runAction(() =>
                    approveProductForActivationReview(selected.productId, buildBody())
                  )
                }
              >
                {t("medicationGovernance.activationReview.actionApprove")}
              </button>
              <button
                type="button"
                disabled={acting}
                style={{ color: "#b91c1c" }}
                onClick={() =>
                  void runAction(() =>
                    blockProductActivationReview(selected.productId, buildBody())
                  )
                }
              >
                {t("medicationGovernance.activationReview.actionBlock")}
              </button>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
