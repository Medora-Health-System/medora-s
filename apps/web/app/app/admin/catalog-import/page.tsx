"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import {
  catalogImportErrorMessage,
  commitMedicationCatalog,
  commitProcedureCatalog,
  dryRunMedicationCatalog,
  dryRunProcedureCatalog,
  type MedicationDryRunResult,
  type ProcedureDryRunResult,
} from "@/lib/catalogImportApi";
import { stagingImportErrorMessage } from "@/lib/medicationInventoryStagingApi";
import { normalizeUserFacingError } from "@/lib/userFacingError";

type TabId = "medications" | "procedures";

function cardStyle(): CSSProperties {
  return {
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "12px 14px",
    background: "#fff",
  };
}

function downloadBlockedCsv(
  filename: string,
  headers: string[],
  rows: string[][]
) {
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

export default function CatalogImportPage() {
  const { t, language } = useI18n();
  const { ready, roles, facilityId } = useFacilityAndRoles();
  const isAdmin = roles.includes("ADMIN") || roles.includes("MEDORA_SUPER_ADMIN");

  const [tab, setTab] = useState<TabId>("medications");
  const [file, setFile] = useState<File | null>(null);
  const [medDryRun, setMedDryRun] = useState<MedicationDryRunResult | null>(null);
  const [procDryRun, setProcDryRun] = useState<ProcedureDryRunResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [enableOrderSearch, setEnableOrderSearch] = useState(false);
  const [confirmOrderSearch, setConfirmOrderSearch] = useState(false);
  const [confirmMarOff, setConfirmMarOff] = useState(false);
  const [confirmBillingOff, setConfirmBillingOff] = useState(false);
  const [note, setNote] = useState("");

  const activeDryRun = tab === "medications" ? medDryRun : procDryRun;

  const onFileChange = useCallback((f: File | null) => {
    setFile(f);
    setMedDryRun(null);
    setProcDryRun(null);
    setError(null);
    setSuccess(null);
  }, []);

  const runDryRun = useCallback(async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      if (tab === "medications") {
        setMedDryRun(await dryRunMedicationCatalog(file, facilityId || undefined));
        setProcDryRun(null);
      } else {
        setProcDryRun(await dryRunProcedureCatalog(file, facilityId || undefined));
        setMedDryRun(null);
      }
    } catch (e: unknown) {
      setError(
        catalogImportErrorMessage(e, language) ||
          stagingImportErrorMessage(e, language) ||
          t("catalogImport.errorDryRun")
      );
    } finally {
      setBusy(false);
    }
  }, [file, tab, language, t, facilityId]);

  const runCommit = useCallback(async () => {
    if (!file || !facilityId) return;
    if (!activeDryRun) {
      setError(t("catalogImport.dryRunRequired"));
      return;
    }
    if (tab === "medications" && enableOrderSearch) {
      if (!confirmOrderSearch || !confirmMarOff || !confirmBillingOff) {
        setError(t("catalogImport.errorConfirmOrderSearch"));
        return;
      }
      if (!note.trim()) {
        setError(t("catalogImport.errorNoteRequired"));
        return;
      }
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      if (tab === "medications") {
        const out = await commitMedicationCatalog(file, {
          facilityId,
          enableProviderOrderSearch: enableOrderSearch,
          confirmOrderSearchEnablement: confirmOrderSearch,
          confirmMarRemainsOff: confirmMarOff,
          confirmBillingRemainsOff: confirmBillingOff,
          note,
        });
        let successMsg = t("catalogImport.commitSuccess")
          .replace("{committed}", String(out.committed))
          .replace("{skipped}", String(out.skipped));
        if (out.orderSearchEnabled > 0) {
          successMsg += ` ${t("catalogImport.commitOrderSearch").replace("{count}", String(out.orderSearchEnabled))}`;
        }
        const blocked = out.orderSearchBlocked ?? [];
        setSuccess(successMsg);
        if (blocked.length > 0) {
          const header = t("catalogImport.commitOrderSearchBlocked").replace(
            "{count}",
            String(blocked.length)
          );
          const rowLines = blocked
            .slice(0, 8)
            .map((b) =>
              t("catalogImport.commitOrderSearchBlockedRow")
                .replace("{row}", String(b.rowNumber))
                .replace("{medication}", b.medication)
                .replace(
                  "{reason}",
                  b.reason + (b.blockers?.length ? ` (${b.blockers.join(", ")})` : "")
                )
            )
            .join(" ");
          setError(`${header} ${rowLines}`);
        }
      } else {
        const out = await commitProcedureCatalog(file, { facilityId, note });
        setSuccess(
          t("catalogImport.commitSuccess")
            .replace("{committed}", String(out.committed))
            .replace("{skipped}", String(out.skipped))
        );
      }
    } catch (e: unknown) {
      setError(
        catalogImportErrorMessage(e, language) ||
          stagingImportErrorMessage(e, language) ||
          t("catalogImport.errorCommit")
      );
    } finally {
      setBusy(false);
    }
  }, [
    file,
    facilityId,
    activeDryRun,
    tab,
    enableOrderSearch,
    confirmOrderSearch,
    confirmMarOff,
    confirmBillingOff,
    note,
    language,
    t,
  ]);

  const blockedRows = useMemo(() => {
    if (tab === "medications" && medDryRun) {
      return medDryRun.rows.filter((r) => r.classification !== "SAFE_LOW_RISK");
    }
    if (tab === "procedures" && procDryRun) {
      return procDryRun.rows.filter((r) => r.classification !== "SAFE_TO_IMPORT");
    }
    return [];
  }, [tab, medDryRun, procDryRun]);

  if (!ready) {
    return <p style={{ padding: 24 }}>{t("catalogImport.loading")}</p>;
  }

  if (!isAdmin) {
    return (
      <main style={{ padding: 24, maxWidth: 900 }}>
        <p>{t("catalogImport.accessDenied")}</p>
        <Link href="/app/admin">{t("catalogImport.backAdmin")}</Link>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <p>
        <Link href="/app/admin">{t("catalogImport.backAdmin")}</Link>
      </p>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>{t("catalogImport.title")}</h1>
      <p style={{ color: "#475569", marginBottom: 16 }}>{t("catalogImport.intro")}</p>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => setTab("medications")}
          style={{
            padding: "8px 14px",
            borderRadius: 8,
            border: tab === "medications" ? "2px solid #2563eb" : "1px solid #e2e8f0",
            background: tab === "medications" ? "#eff6ff" : "#fff",
            fontWeight: 600,
          }}
        >
          {t("catalogImport.tabMedications")}
        </button>
        <button
          type="button"
          onClick={() => setTab("procedures")}
          style={{
            padding: "8px 14px",
            borderRadius: 8,
            border: tab === "procedures" ? "2px solid #2563eb" : "1px solid #e2e8f0",
            background: tab === "procedures" ? "#eff6ff" : "#fff",
            fontWeight: 600,
          }}
        >
          {t("catalogImport.tabProcedures")}
        </button>
      </div>

      <section style={cardStyle()}>
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
        />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
          <button type="button" disabled={!file || busy} onClick={() => void runDryRun()}>
            {t("catalogImport.dryRunButton")}
          </button>
          <button
            type="button"
            disabled={!file || !facilityId || !activeDryRun || busy}
            onClick={() => void runCommit()}
          >
            {t("catalogImport.commitButton")}
          </button>
          <button
            type="button"
            disabled={blockedRows.length === 0}
            onClick={() => {
              if (tab === "medications") {
                downloadBlockedCsv(
                  "medication-import-blocked.csv",
                  ["row", "medication", "dose", "form", "classification"],
                  blockedRows.map((r) => [
                    String(r.rowNumber),
                    "medication" in r ? r.medication : "",
                    "dose" in r ? r.dose : "",
                    "form" in r ? r.form : "",
                    t(`catalogImport.classification.${r.classification}` as "catalogImport.classification.SAFE_LOW_RISK"),
                  ])
                );
              } else {
                downloadBlockedCsv(
                  "procedure-import-blocked.csv",
                  ["row", "code", "codeSystem", "description", "classification"],
                  blockedRows.map((r) => [
                    String(r.rowNumber),
                    "code" in r ? r.code : "",
                    "codeSystem" in r ? r.codeSystem : "",
                    "shortDescription" in r ? r.shortDescription : "",
                    t(`catalogImport.classification.${r.classification}` as "catalogImport.classification.SAFE_TO_IMPORT"),
                  ])
                );
              }
            }}
          >
            {t("catalogImport.exportBlocked")}
          </button>
        </div>

        {tab === "medications" && (
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={enableOrderSearch}
                onChange={(e) => setEnableOrderSearch(e.target.checked)}
              />
              {t("catalogImport.enableOrderSearch")}
            </label>
            {enableOrderSearch && (
              <>
                <p style={{ fontSize: 13, color: "#64748b" }}>{t("catalogImport.orderSearchHint")}</p>
                <p style={{ fontSize: 13, color: "#64748b" }}>{t("catalogImport.billingDisclaimer")}</p>
                <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={confirmOrderSearch}
                    onChange={(e) => setConfirmOrderSearch(e.target.checked)}
                  />
                  {t("catalogImport.confirmOrderSearch")}
                </label>
                <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={confirmMarOff}
                    onChange={(e) => setConfirmMarOff(e.target.checked)}
                  />
                  {t("catalogImport.confirmMarOff")}
                </label>
                <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={confirmBillingOff}
                    onChange={(e) => setConfirmBillingOff(e.target.checked)}
                  />
                  {t("catalogImport.confirmBillingOff")}
                </label>
                <label>
                  {t("catalogImport.noteLabel")}
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    style={{ display: "block", width: "100%", marginTop: 4 }}
                  />
                </label>
              </>
            )}
          </div>
        )}
      </section>

      {error && (
        <p style={{ color: "#b91c1c", marginTop: 12 }} role="alert">
          {error}
        </p>
      )}
      {success && (
        <p style={{ color: "#166534", marginTop: 12 }} role="status">
          {success}
        </p>
      )}

      {activeDryRun && (
        <section style={{ ...cardStyle(), marginTop: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>{t("catalogImport.countsTitle")}</h2>
          <ul style={{ margin: "8px 0", paddingLeft: 20 }}>
            {Object.entries(activeDryRun.counts).map(([k, v]) => (
              <li key={k}>
                {t(`catalogImport.classification.${k}` as "catalogImport.classification.SAFE_LOW_RISK")}: {v}
              </li>
            ))}
          </ul>
          <div style={{ overflowX: "auto", maxHeight: 400 }}>
            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>
                  <th>{t("catalogImport.colRow")}</th>
                  {tab === "medications" ? (
                    <>
                      <th>{t("catalogImport.colMedication")}</th>
                      <th>{t("catalogImport.colDose")}</th>
                      <th>{t("catalogImport.colForm")}</th>
                    </>
                  ) : (
                    <>
                      <th>{t("catalogImport.colCode")}</th>
                      <th>{t("catalogImport.colSystem")}</th>
                      <th>{t("catalogImport.colDescription")}</th>
                    </>
                  )}
                  <th>{t("catalogImport.colClassification")}</th>
                </tr>
              </thead>
              <tbody>
                {activeDryRun.rows.map((r) => (
                  <tr key={r.rowKey} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td>{r.rowNumber}</td>
                    {tab === "medications" && "medication" in r ? (
                      <>
                        <td>{r.medication}</td>
                        <td>{r.dose}</td>
                        <td>{r.form}</td>
                      </>
                    ) : (
                      <>
                        <td>{"code" in r ? r.code : ""}</td>
                        <td>{"codeSystem" in r ? r.codeSystem : ""}</td>
                        <td>{"shortDescription" in r ? r.shortDescription : ""}</td>
                      </>
                    )}
                    <td>
                      {t(
                        `catalogImport.classification.${r.classification}` as "catalogImport.classification.SAFE_LOW_RISK"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
