"use client";

/**
 * INP.HIST.1A — CLOSED inpatient All Encounters archive (ED historical-chart model).
 */

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import { printEncounterChartLivePreview } from "@/components/encounters/EncounterChartLivePreview";
import { buildRxPrintFacilityIdentity } from "@/components/pharmacy/RxPrintLayout";
import {
  fetchInpatientEncountersArchive,
  inpatientHistoryRecordHref,
  loadInpatientArchiveMedicalRecordPrintInputs,
  type InpatientEncountersArchiveApiRow,
} from "./inpatientEncounterHistoryApi";

type Props = {
  embedded?: boolean;
};

export function InpatientAllEncountersWorkspace({ embedded = false }: Props) {
  const { t, language } = useI18n();
  const { facilityId, ready } = useFacilityAndRoles();
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<InpatientEncountersArchiveApiRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [printingId, setPrintingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!ready || !facilityId?.trim()) {
      setLoading(!ready);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchInpatientEncountersArchive({
        search,
        limit: 50,
        offset: 0,
      });
      setRows(data.rows);
      setTotal(data.total);
    } catch {
      setRows([]);
      setTotal(0);
      setError(t("inpatientEncounterHistoryInpHist1a.loadError"));
    } finally {
      setLoading(false);
    }
  }, [facilityId, ready, search, t]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void load();
    }, 250);
    return () => window.clearTimeout(handle);
  }, [load]);

  const printRow = async (row: InpatientEncountersArchiveApiRow) => {
    if (!facilityId || !row.patient?.id) return;
    setPrintingId(row.id);
    try {
      const { encounter, triage, orders } = await loadInpatientArchiveMedicalRecordPrintInputs({
        facilityId,
        encounterId: row.id,
      });
      const facilityIdentity = buildRxPrintFacilityIdentity({
        facilityName: null,
      });
      await printEncounterChartLivePreview({
        encounter,
        triage,
        orders,
        facilityId,
        facilityName: facilityIdentity.name,
        facilityIdentity,
        language,
        legalMedicalRecord: true,
      });
    } catch {
      setError(t("inpatientEncounterHistoryInpHist1a.printError"));
    } finally {
      setPrintingId(null);
    }
  };

  const shellStyle: CSSProperties = embedded
    ? { display: "grid", gap: 10 }
    : { ...MEDORA_CARD_SHELL, padding: 12, display: "grid", gap: 10 };

  return (
    <div data-testid="inp-hist-1a-all-encounters" style={shellStyle}>
      <header>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
          {t("inpatientEncounterHistoryInpHist1a.title")}
        </h2>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>
          {t("inpatientEncounterHistoryInpHist1a.subtitle")}
        </p>
      </header>

      <div
        style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "end" }}
        data-testid="inp-hist-1a-filters"
      >
        <label style={{ fontSize: 12, display: "grid", gap: 4, minWidth: 220, flex: 1 }}>
          {t("inpatientEncounterHistoryInpHist1a.searchLabel")}
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("inpatientEncounterHistoryInpHist1a.searchPlaceholder")}
            style={inputStyle}
            data-testid="inp-hist-1a-search"
          />
        </label>
      </div>

      {error ? (
        <p role="alert" style={{ margin: 0, fontSize: 13, color: "#b91c1c" }}>
          {error}
        </p>
      ) : null}

      {loading ? (
        <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{t("common.loading")}</p>
      ) : rows.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
          {t("inpatientEncounterHistoryInpHist1a.empty")}
        </p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            data-testid="inp-hist-1a-table"
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}
          >
            <thead>
              <tr>
                <th style={thStyle}>{t("inpatientEncounterHistoryInpHist1a.table.date")}</th>
                <th style={thStyle}>{t("inpatientEncounterHistoryInpHist1a.table.patient")}</th>
                <th style={thStyle}>{t("inpatientEncounterHistoryInpHist1a.table.mrn")}</th>
                <th style={thStyle}>{t("inpatientEncounterHistoryInpHist1a.table.course")}</th>
                <th style={thStyle}>{t("inpatientEncounterHistoryInpHist1a.table.disposition")}</th>
                <th style={thStyle}>{t("inpatientEncounterHistoryInpHist1a.table.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const name =
                  `${row.patient?.firstName ?? ""} ${row.patient?.lastName ?? ""}`.trim() ||
                  t("common.dash");
                return (
                  <tr key={row.id} data-testid={`inp-hist-1a-row-${row.id}`}>
                    <td style={tdStyle}>{row.dateRangeLabel}</td>
                    <td style={tdStyle}>{name}</td>
                    <td style={tdStyle}>{row.patient?.mrn || t("common.dash")}</td>
                    <td style={tdStyle}>{row.courseSummary}</td>
                    <td style={tdStyle}>{row.dispositionLabel || t("common.dash")}</td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        <Link
                          href={inpatientHistoryRecordHref(row)}
                          style={linkBtnStyle}
                          data-testid={`inp-hist-1a-view-${row.id}`}
                        >
                          {t("inpatientEncounterHistoryInpHist1a.actions.viewRecord")}
                        </Link>
                        <button
                          type="button"
                          style={btnStyle}
                          disabled={printingId === row.id || !row.patient?.id}
                          onClick={() => void printRow(row)}
                          data-testid={`inp-hist-1a-print-${row.id}`}
                        >
                          {printingId === row.id
                            ? t("inpatientEncounterHistoryInpHist1a.printBusy")
                            : t("inpatientEncounterHistoryInpHist1a.actions.print")}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p
            style={{ margin: "8px 0 0", fontSize: 11, color: "#64748b" }}
            data-testid="inp-hist-1a-page-count"
          >
            {t("inpatientEncounterHistoryInpHist1a.showingCount")
              .replace("{shown}", String(rows.length))
              .replace("{total}", String(total))}
          </p>
        </div>
      )}
    </div>
  );
}

const inputStyle: CSSProperties = {
  padding: "6px 8px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  fontSize: 13,
};

const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "6px 8px",
  borderBottom: "1px solid #e2e8f0",
  color: "#475569",
  fontWeight: 700,
  whiteSpace: "nowrap",
};

const tdStyle: CSSProperties = {
  padding: "6px 8px",
  borderBottom: "1px solid #f1f5f9",
  verticalAlign: "top",
  color: "#0f172a",
};

const btnStyle: CSSProperties = {
  padding: "4px 8px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  background: "#fff",
  fontSize: 11,
  fontWeight: 600,
  cursor: "pointer",
};

const linkBtnStyle: CSSProperties = {
  ...btnStyle,
  textDecoration: "none",
  color: "#1e40af",
  display: "inline-block",
};
