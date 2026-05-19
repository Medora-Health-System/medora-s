"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import {
  fetchStagingBatches,
  fetchStagingRows,
  stagingImportErrorMessage,
  uploadPriorityErInventory,
  type PriorityErInventoryImportResult,
  type StagingBatchListItem,
  type StagingRowListItem,
} from "@/lib/medicationInventoryStagingApi";
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

export default function MedicationInventoryStagingPage() {
  const { t, language } = useI18n();
  const { ready, roles, facilityId } = useFacilityAndRoles();
  const isAdmin = roles.includes("ADMIN") || roles.includes("MEDORA_SUPER_ADMIN");

  const [batches, setBatches] = useState<StagingBatchListItem[]>([]);
  const [rows, setRows] = useState<StagingRowListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [reconciliationFilter, setReconciliationFilter] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dryRun, setDryRun] = useState(true);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastImport, setLastImport] = useState<PriorityErInventoryImportResult | null>(null);

  const loadQueue = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const [batchList, rowList] = await Promise.all([
        fetchStagingBatches(50),
        fetchStagingRows({
          batchId: selectedBatchId || undefined,
          reconciliationStatus: reconciliationFilter || undefined,
          q: searchQ.trim() || undefined,
          limit: 200,
        }),
      ]);
      setBatches(batchList);
      setRows(rowList.rows);
      setTotal(rowList.total);
    } catch (err) {
      setError(
        normalizeUserFacingError((err as Error)?.message, language) ||
          t("medicationInventoryStaging.errorLoad")
      );
    } finally {
      setLoading(false);
    }
  }, [isAdmin, selectedBatchId, reconciliationFilter, searchQ, language, t]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setError(null);
    try {
      const result = await uploadPriorityErInventory({
        file,
        dryRun,
        facilityId: facilityId ?? undefined,
      });
      setLastImport(result);
      if (!dryRun) {
        setSelectedBatchId(result.summary.batchId);
      }
      await loadQueue();
    } catch (err) {
      setError(stagingImportErrorMessage(err, language));
    } finally {
      setImporting(false);
    }
  };

  const exportRows = useMemo(() => {
    const headers = [
      t("medicationInventoryStaging.colExactSource"),
      t("medicationInventoryStaging.colMedication"),
      t("medicationInventoryStaging.colDose"),
      t("medicationInventoryStaging.colForm"),
      t("medicationInventoryStaging.colReconciliation"),
      t("medicationInventoryStaging.colGate"),
      t("medicationInventoryStaging.colFlags"),
    ];
    const data = rows.map((r) => [
      r.exactSourceText,
      r.medication,
      r.dose,
      r.form,
      r.reconciliationStatus,
      r.importGateStatus,
      r.reviewFlags.join("|"),
    ]);
    return { headers, data };
  }, [rows, t]);

  if (!isAdmin) {
    return (
      <main style={{ padding: 24 }}>
        <p>{t("medicationInventoryStaging.accessDenied")}</p>
        <Link href="/app">{t("medicationMasterExplorer.backApp")}</Link>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, maxWidth: 1200 }}>
      <Link href="/app/admin" style={{ color: "#1a1a1a" }}>
        {t("medicationInventoryStaging.backAdmin")}
      </Link>
      <h1 style={{ margin: "12px 0 4px 0" }}>{t("medicationInventoryStaging.title")}</h1>
      <p style={{ color: "#475569", maxWidth: 720 }}>{t("medicationInventoryStaging.intro")}</p>
      <p
        style={{
          margin: "12px 0",
          padding: "8px 12px",
          background: "#fffbeb",
          border: "1px solid #fcd34d",
          borderRadius: 8,
          fontSize: 13,
        }}
      >
        {t("medicationInventoryStaging.readOnlyBanner")}
      </p>

      {error ? (
        <p style={{ color: "#b91c1c", fontSize: 14 }} role="alert">
          {error}
        </p>
      ) : null}

      <section style={{ ...cardStyle(), marginTop: 16 }}>
        <h2 style={{ margin: "0 0 8px 0", fontSize: 16 }}>{t("medicationInventoryStaging.uploadTitle")}</h2>
        <p style={{ margin: "0 0 12px 0", fontSize: 13, color: "#64748b" }}>
          {t("medicationInventoryStaging.uploadHint")}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <label style={{ fontSize: 14 }}>
            <span style={{ display: "block", marginBottom: 4 }}>{t("medicationInventoryStaging.chooseFile")}</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <label style={{ fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
            <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
            {t("medicationInventoryStaging.dryRunLabel")}
          </label>
          <button
            type="button"
            disabled={!file || importing}
            onClick={() => void handleImport()}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "none",
              background: importing ? "#94a3b8" : "#2563eb",
              color: "#fff",
              fontWeight: 600,
              cursor: file && !importing ? "pointer" : "not-allowed",
            }}
          >
            {dryRun
              ? t("medicationInventoryStaging.importDryRunButton")
              : t("medicationInventoryStaging.importCommitButton")}
          </button>
        </div>
      </section>

      {lastImport ? (
        <section style={{ ...cardStyle(), marginTop: 16 }}>
          <h2 style={{ margin: "0 0 8px 0", fontSize: 16 }}>{t("medicationInventoryStaging.summaryTitle")}</h2>
          <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
            {lastImport.summary.workbookFilename} · {lastImport.summary.batchId}
            {lastImport.summary.dryRun ? " · dry-run" : ""}
          </p>
          <ul style={{ margin: "8px 0 0 0", paddingLeft: 20, fontSize: 14 }}>
            <li>
              {t("medicationInventoryStaging.summaryTotal")}: {lastImport.summary.totalRows}
            </li>
            <li>
              {t("medicationInventoryStaging.summaryStaged")}: {lastImport.summary.stagedRows}
            </li>
            <li>
              {t("medicationInventoryStaging.summaryExact")}: {lastImport.summary.exactMatches}
            </li>
            <li>
              {t("medicationInventoryStaging.summaryPossible")}: {lastImport.summary.possibleDuplicates}
            </li>
            <li>
              {t("medicationInventoryStaging.summaryReview")}: {lastImport.summary.reviewRequired}
            </li>
            <li>
              {t("medicationInventoryStaging.summaryNew")}: {lastImport.summary.newCandidates}
            </li>
            <li>
              {t("medicationInventoryStaging.summaryBilling")}: {lastImport.summary.billingReviewRequired}
            </li>
            <li>
              {t("medicationInventoryStaging.summaryNdc")}: {lastImport.summary.ndcReviewRequired}
            </li>
          </ul>
        </section>
      ) : null}

      <section style={{ marginTop: 20 }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            alignItems: "flex-end",
            marginBottom: 12,
          }}
        >
          <label style={{ fontSize: 13 }}>
            {t("medicationInventoryStaging.filterBatch")}
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              style={{ display: "block", marginTop: 4, minWidth: 200 }}
            >
              <option value="">{t("medicationInventoryStaging.filterAll")}</option>
              {batches.map((b) => (
                <option key={b.batchId} value={b.batchId}>
                  {b.batchId} ({b.rowCount})
                </option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: 13 }}>
            {t("medicationInventoryStaging.filterReconciliation")}
            <select
              value={reconciliationFilter}
              onChange={(e) => setReconciliationFilter(e.target.value)}
              style={{ display: "block", marginTop: 4, minWidth: 180 }}
            >
              <option value="">{t("medicationInventoryStaging.filterAll")}</option>
              <option value="EXACT_MATCH">EXACT_MATCH</option>
              <option value="POSSIBLE_DUPLICATE">POSSIBLE_DUPLICATE</option>
              <option value="REVIEW_REQUIRED">REVIEW_REQUIRED</option>
              <option value="NEW_CANDIDATE">NEW_CANDIDATE</option>
            </select>
          </label>
          <label style={{ fontSize: 13, flex: 1, minWidth: 200 }}>
            {t("medicationInventoryStaging.filterSearch")}
            <input
              type="search"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              style={{ display: "block", marginTop: 4, width: "100%" }}
            />
          </label>
          <button type="button" onClick={() => void loadQueue()} style={{ padding: "6px 12px" }}>
            {t("medicationInventoryStaging.refresh")}
          </button>
          <button
            type="button"
            disabled={rows.length === 0}
            onClick={() =>
              downloadCsv("medication-inventory-staging.csv", exportRows.headers, exportRows.data)
            }
            style={{ padding: "6px 12px" }}
          >
            {t("medicationInventoryStaging.exportCsv")}
          </button>
        </div>

        <p style={{ fontSize: 13, color: "#64748b" }}>
          {loading ? t("medicationInventoryStaging.loading") : `${total} ligne(s)`}
        </p>

        {rows.length === 0 && !loading ? (
          <p>{t("medicationInventoryStaging.emptyRows")}</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ padding: 8 }}>{t("medicationInventoryStaging.colExactSource")}</th>
                  <th style={{ padding: 8 }}>{t("medicationInventoryStaging.colMedication")}</th>
                  <th style={{ padding: 8 }}>{t("medicationInventoryStaging.colDose")}</th>
                  <th style={{ padding: 8 }}>{t("medicationInventoryStaging.colForm")}</th>
                  <th style={{ padding: 8 }}>{t("medicationInventoryStaging.colReconciliation")}</th>
                  <th style={{ padding: 8 }}>{t("medicationInventoryStaging.colFlags")}</th>
                  <th style={{ padding: 8 }}>{t("medicationInventoryStaging.colReview")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9", verticalAlign: "top" }}>
                    <td style={{ padding: 8, maxWidth: 280, whiteSpace: "pre-wrap" }}>{r.exactSourceText}</td>
                    <td style={{ padding: 8 }}>{r.medication}</td>
                    <td style={{ padding: 8 }}>{r.dose}</td>
                    <td style={{ padding: 8 }}>{r.form}</td>
                    <td style={{ padding: 8 }}>
                      {t(
                        `medicationInventoryStaging.reconciliation.${r.reconciliationStatus}` as "medicationInventoryStaging.reconciliation.EXACT_MATCH"
                      ) || r.reconciliationStatus}
                    </td>
                    <td style={{ padding: 8, fontSize: 12 }}>{r.reviewFlags.join(", ")}</td>
                    <td style={{ padding: 8 }}>
                      {r.reviewConceptUrl ? (
                        <Link href={r.reviewConceptUrl}>{t("medicationInventoryStaging.openConceptReview")}</Link>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
