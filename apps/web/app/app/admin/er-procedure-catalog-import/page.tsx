"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import {
  approveErProcedureComplexity,
  commitErProcedureCatalog,
  dryRunErProcedureCatalog,
  fetchErProcedureComplexityQueue,
  rejectErProcedureComplexity,
  type ErProcedureComplexityRow,
  type ErProcedureDryRunResult,
} from "@/lib/erProcedureCatalogImportApi";
import { normalizeUserFacingError } from "@/lib/userFacingError";

function cardStyle(): CSSProperties {
  return { border: "1px solid #e2e8f0", borderRadius: 12, padding: "12px 14px", background: "#fff" };
}

function bannerStyle(): CSSProperties {
  return {
    border: "1px solid #fcd34d",
    borderRadius: 10,
    padding: "10px 12px",
    background: "#fffbeb",
    color: "#92400e",
    fontSize: 13,
    lineHeight: 1.5,
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

export default function ErProcedureCatalogImportPage() {
  const { t, language } = useI18n();
  const { ready, roles, facilityId, isPlatformOperator } = useFacilityAndRoles();
  const canImport =
    isPlatformOperator ||
    roles.includes("ADMIN") ||
    roles.includes("PHARMACY") ||
    roles.includes("BILLING") ||
    roles.includes("MEDORA_SUPER_ADMIN");

  const [file, setFile] = useState<File | null>(null);
  const [dryRun, setDryRun] = useState<ErProcedureDryRunResult | null>(null);
  const [complexityRows, setComplexityRows] = useState<ErProcedureComplexityRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmOrdering, setConfirmOrdering] = useState(false);
  const [confirmBilling, setConfirmBilling] = useState(false);
  const [confirmInventory, setConfirmInventory] = useState(false);
  const [note, setNote] = useState("");
  const [reviewNote, setReviewNote] = useState<Record<string, string>>({});

  const blockedRows = useMemo(
    () =>
      dryRun?.rows.filter((r) =>
        ["NON_ER_EXCLUDED", "HIGH_COMPLEXITY_MANUAL_REVIEW", "DUPLICATE_OR_CONFLICT"].includes(
          r.classification
        )
      ) ?? [],
    [dryRun]
  );

  const loadComplexity = useCallback(async () => {
    if (!facilityId || !canImport) return;
    try {
      const q = await fetchErProcedureComplexityQueue(facilityId);
      setComplexityRows(q.rows);
    } catch {
      setComplexityRows([]);
    }
  }, [facilityId, canImport]);

  useEffect(() => {
    if (ready) void loadComplexity();
  }, [ready, loadComplexity]);

  const runDryRun = useCallback(async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      setDryRun(await dryRunErProcedureCatalog(file, facilityId || undefined));
    } catch (e: unknown) {
      setDryRun(null);
      const raw = e instanceof Error ? e.message : "";
      setError(normalizeUserFacingError(raw, language) || t("erProcedureCatalog.errorDryRun"));
    } finally {
      setBusy(false);
    }
  }, [file, facilityId, language, t]);

  const runCommit = useCallback(async () => {
    if (!file || !facilityId || !dryRun) return;
    if (!confirmOrdering || !confirmBilling || !confirmInventory) {
      setError(t("erProcedureCatalog.errorConfirmRequired"));
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const out = await commitErProcedureCatalog(file, {
        facilityId,
        note,
        confirmOrderingOnly: true,
        confirmBillingOff: true,
        confirmInventoryOff: true,
      });
      setSuccess(
        t("erProcedureCatalog.commitSuccess")
          .replace("{committed}", String(out.committed))
          .replace("{complexity}", String(out.complexityQueued))
          .replace("{skipped}", String(out.skipped))
      );
      await loadComplexity();
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : "";
      setError(normalizeUserFacingError(raw, language) || t("erProcedureCatalog.errorCommit"));
    } finally {
      setBusy(false);
    }
  }, [
    file,
    facilityId,
    dryRun,
    confirmOrdering,
    confirmBilling,
    confirmInventory,
    note,
    language,
    t,
    loadComplexity,
  ]);

  if (!ready) return <p>{t("erProcedureCatalog.loading")}</p>;
  if (!canImport) {
    return (
      <main style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
        <p role="alert">{t("erProcedureCatalog.accessDenied")}</p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
      <p>
        <Link href="/app/admin">{t("erProcedureCatalog.backAdmin")}</Link>
      </p>
      <h1 style={{ fontSize: 24 }}>{t("erProcedureCatalog.title")}</h1>
      <p style={{ color: "#64748b" }}>{t("erProcedureCatalog.intro")}</p>

      <div style={{ ...bannerStyle(), margin: "16px 0" }}>
        <p style={{ margin: 0 }}>{t("erProcedureCatalog.bannerOrderingOnly")}</p>
        <p style={{ margin: "6px 0 0 0" }}>{t("erProcedureCatalog.bannerBillingOff")}</p>
        <p style={{ margin: "6px 0 0 0" }}>{t("erProcedureCatalog.bannerNoCharges")}</p>
        <p style={{ margin: "6px 0 0 0" }}>{t("erProcedureCatalog.bannerInventoryOff")}</p>
      </div>

      <section style={cardStyle()}>
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setDryRun(null);
            setError(null);
            setSuccess(null);
          }}
        />
        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" disabled={!file || busy} onClick={() => void runDryRun()}>
            {t("erProcedureCatalog.dryRunButton")}
          </button>
          <button type="button" disabled={!file || !dryRun || busy} onClick={() => void runCommit()}>
            {t("erProcedureCatalog.commitButton")}
          </button>
        </div>

        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={confirmOrdering} onChange={(e) => setConfirmOrdering(e.target.checked)} />
            {t("erProcedureCatalog.confirmOrderingOnly")}
          </label>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={confirmBilling} onChange={(e) => setConfirmBilling(e.target.checked)} />
            {t("erProcedureCatalog.confirmBillingOff")}
          </label>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={confirmInventory} onChange={(e) => setConfirmInventory(e.target.checked)} />
            {t("erProcedureCatalog.confirmInventoryOff")}
          </label>
          <label>
            {t("erProcedureCatalog.noteLabel")}
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} style={{ display: "block", width: "100%", marginTop: 4 }} />
          </label>
        </div>
      </section>

      {error && <p style={{ color: "#b91c1c" }} role="alert">{error}</p>}
      {success && <p style={{ color: "#166534" }} role="status">{success}</p>}

      {dryRun && (
        <section style={{ ...cardStyle(), marginTop: 16 }}>
          <h2 style={{ fontSize: 16, marginTop: 0 }}>{t("erProcedureCatalog.countsTitle")}</h2>
          <p>{t("erProcedureCatalog.totalParsed")}: {dryRun.totalParsed}</p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {Object.entries(dryRun.counts).map(([k, v]) => (
              <li key={k}>
                {t(`erProcedureCatalog.classification.${k}` as "erProcedureCatalog.classification.ER_INCLUDED")}: {v}
              </li>
            ))}
          </ul>
          {blockedRows.length > 0 && (
            <button
              type="button"
              style={{ marginTop: 12 }}
              onClick={() =>
                downloadCsv(
                  "er-procedure-excluded.csv",
                  ["row", "code", "system", "description", "classification", "category"],
                  blockedRows.map((r) => [
                    String(r.rowNumber),
                    r.code,
                    r.codeSystem,
                    r.shortDescription,
                    r.classification,
                    r.category ?? "",
                  ])
                )
              }
            >
              {t("erProcedureCatalog.exportExcluded")}
            </button>
          )}
        </section>
      )}

      <section style={{ ...cardStyle(), marginTop: 16 }}>
        <h2 style={{ fontSize: 16, marginTop: 0 }}>{t("erProcedureCatalog.complexityTitle")}</h2>
        <p style={{ fontSize: 13, color: "#64748b" }}>{t("erProcedureCatalog.complexityIntro")}</p>
        {complexityRows.length === 0 ? (
          <p>{t("erProcedureCatalog.complexityEmpty")}</p>
        ) : (
          complexityRows.map((row) => (
            <article key={row.id} style={{ borderTop: "1px solid #e2e8f0", paddingTop: 10, marginTop: 10 }}>
              <strong>
                {row.code} ({row.codeSystem}) — {row.shortDescription}
              </strong>
              <textarea
                value={reviewNote[row.id] ?? ""}
                onChange={(e) => setReviewNote((prev) => ({ ...prev, [row.id]: e.target.value }))}
                rows={2}
                style={{ display: "block", width: "100%", marginTop: 6 }}
                placeholder={t("erProcedureCatalog.noteLabel")}
              />
              <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                <button
                  type="button"
                  disabled={busy || !facilityId}
                  onClick={async () => {
                    if (!facilityId || !reviewNote[row.id]?.trim()) {
                      setError(t("erProcedureCatalog.errorNoteRequired"));
                      return;
                    }
                    setBusy(true);
                    try {
                      await approveErProcedureComplexity(row.id, {
                        facilityId,
                        note: reviewNote[row.id]!.trim(),
                        confirmOrderingOnly: true,
                        confirmBillingOff: true,
                      });
                      setSuccess(t("erProcedureCatalog.complexityApproved"));
                      await loadComplexity();
                    } catch (e: unknown) {
                      setError(normalizeUserFacingError(e instanceof Error ? e.message : "", language));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {t("erProcedureCatalog.approveComplexity")}
                </button>
                <button
                  type="button"
                  disabled={busy || !facilityId}
                  onClick={async () => {
                    if (!facilityId || !reviewNote[row.id]?.trim()) {
                      setError(t("erProcedureCatalog.errorNoteRequired"));
                      return;
                    }
                    setBusy(true);
                    try {
                      await rejectErProcedureComplexity(row.id, {
                        facilityId,
                        note: reviewNote[row.id]!.trim(),
                      });
                      setSuccess(t("erProcedureCatalog.complexityRejected"));
                      await loadComplexity();
                    } catch (e: unknown) {
                      setError(normalizeUserFacingError(e instanceof Error ? e.message : "", language));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {t("erProcedureCatalog.rejectComplexity")}
                </button>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
