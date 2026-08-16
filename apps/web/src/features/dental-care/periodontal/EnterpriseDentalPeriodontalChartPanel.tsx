"use client";

/**
 * MEDUI.D5A.5 — Periodontal chart panel.
 */

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  D5A5_CERTIFICATION_ID,
  D5A5_PERIODONTAL_EXTENT,
  D5A5_PERIODONTAL_SITES,
  D5A5_PERIODONTAL_STATUS,
  D5A5_PERIODONTITIS_GRADES,
  D5A5_PERIODONTITIS_STAGES,
  D5A4_PERMANENT_TEETH,
  formatToothDisplayLabel,
  getCanonicalTooth,
  type D5a5PeriodontalSite,
} from "@medora/shared";
import { apiFetch } from "@/lib/apiClient";
import { useI18n } from "@/lib/i18n";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";

const QUICK_TEETH = D5A4_PERMANENT_TEETH.filter((t) =>
  ["18", "16", "11", "21", "26", "28", "38", "36", "31", "41", "46", "48"].includes(t.fdi)
);

type SiteRow = {
  toothCode: string;
  site: D5a5PeriodontalSite;
  probingDepthMm: string;
  gingivalMarginMm: string;
  bleedingOnProbing: boolean;
  plaque: boolean;
};

type Props = {
  encounterId: string;
  facilityId: string;
  locked?: boolean;
};

function emptySiteRow(toothCode: string, site: D5a5PeriodontalSite): SiteRow {
  return {
    toothCode,
    site,
    probingDepthMm: "",
    gingivalMarginMm: "",
    bleedingOnProbing: false,
    plaque: false,
  };
}

function sitesFromApi(
  sites: Array<{
    toothCode: string;
    site: string;
    probingDepthMm?: number | null;
    gingivalMarginMm?: number | null;
    bleedingOnProbing?: boolean;
    plaque?: boolean;
  }>
): SiteRow[] {
  return sites.map((s) => ({
    toothCode: s.toothCode,
    site: s.site as D5a5PeriodontalSite,
    probingDepthMm: s.probingDepthMm != null ? String(s.probingDepthMm) : "",
    gingivalMarginMm: s.gingivalMarginMm != null ? String(s.gingivalMarginMm) : "",
    bleedingOnProbing: Boolean(s.bleedingOnProbing),
    plaque: Boolean(s.plaque),
  }));
}

const cellInput: CSSProperties = {
  width: "100%",
  padding: "2px 4px",
  borderRadius: 4,
  border: "1px solid #e2e8f0",
  fontSize: 12,
  boxSizing: "border-box",
};

export function EnterpriseDentalPeriodontalChartPanel({ encounterId, facilityId, locked }: Props) {
  const { t, language } = useI18n();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [periodontalStatus, setPeriodontalStatus] = useState("NOT_ASSESSED");
  const [periodontitisStage, setPeriodontitisStage] = useState("");
  const [periodontitisGrade, setPeriodontitisGrade] = useState("");
  const [extentDistribution, setExtentDistribution] = useState("");
  const [narrativeAssessment, setNarrativeAssessment] = useState("");
  const [siteRows, setSiteRows] = useState<SiteRow[]>([]);
  const [summary, setSummary] = useState<{
    bleedingPercent?: number | null;
    deepestProbingDepthMm?: number | null;
    siteCount?: number;
  } | null>(null);
  const [pickTooth, setPickTooth] = useState(QUICK_TEETH[0]?.code ?? "PERM_16");
  const [freeTooth, setFreeTooth] = useState("");

  const readOnly = locked || !canEdit;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = (await apiFetch(
        `/dental-care/encounters/${encodeURIComponent(encounterId)}/periodontal-exam`,
        { facilityId }
      )) as {
        canEdit?: boolean;
        exam?: {
          periodontalStatus?: string;
          periodontitisStage?: string | null;
          periodontitisGrade?: string | null;
          extentDistribution?: string | null;
          narrativeAssessment?: string | null;
          sites?: Array<{
            toothCode: string;
            site: string;
            probingDepthMm?: number | null;
            gingivalMarginMm?: number | null;
            bleedingOnProbing?: boolean;
            plaque?: boolean;
          }>;
          summary?: typeof summary;
        } | null;
      };
      setCanEdit(Boolean(res.canEdit));
      const exam = res.exam;
      if (exam) {
        setPeriodontalStatus(exam.periodontalStatus ?? "NOT_ASSESSED");
        setPeriodontitisStage(exam.periodontitisStage ?? "");
        setPeriodontitisGrade(exam.periodontitisGrade ?? "");
        setExtentDistribution(exam.extentDistribution ?? "");
        setNarrativeAssessment(exam.narrativeAssessment ?? "");
        setSiteRows(sitesFromApi(exam.sites ?? []));
        setSummary(exam.summary ?? null);
      } else {
        setSiteRows([]);
        setSummary(null);
      }
    } catch (e) {
      setError(normalizeUserFacingError(e instanceof Error ? e.message : null, language));
    } finally {
      setLoading(false);
    }
  }, [encounterId, facilityId, language]);

  useEffect(() => {
    void load();
  }, [load]);

  const teethInChart = useMemo(() => {
    const codes = new Set(siteRows.map((r) => r.toothCode));
    return Array.from(codes);
  }, [siteRows]);

  const addTooth = (raw: string) => {
    const code = raw.trim().toUpperCase();
    if (!code) return;
    const normalized = code.startsWith("PERM_") || code.startsWith("PRIM_") ? code : `PERM_${code}`;
    if (siteRows.some((r) => r.toothCode === normalized)) return;
    setSiteRows((prev) => [
      ...prev,
      ...D5A5_PERIODONTAL_SITES.map((site) => emptySiteRow(normalized, site)),
    ]);
  };

  const updateRow = (idx: number, patch: Partial<SiteRow>) => {
    setSiteRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const removeTooth = (toothCode: string) => {
    setSiteRows((prev) => prev.filter((r) => r.toothCode !== toothCode));
  };

  const save = async () => {
    if (readOnly) return;
    setSaving(true);
    setError(null);
    try {
      const res = (await apiFetch(
        `/dental-care/encounters/${encodeURIComponent(encounterId)}/periodontal-exam`,
        {
          method: "PUT",
          facilityId,
          body: JSON.stringify({
            periodontalStatus,
            periodontitisStage: periodontitisStage || null,
            periodontitisGrade: periodontitisGrade || null,
            extentDistribution: extentDistribution || null,
            narrativeAssessment: narrativeAssessment.trim() || null,
            sites: siteRows.map((r) => ({
              toothCode: r.toothCode,
              site: r.site,
              probingDepthMm: r.probingDepthMm.trim() ? Number(r.probingDepthMm) : null,
              gingivalMarginMm: r.gingivalMarginMm.trim() ? Number(r.gingivalMarginMm) : null,
              bleedingOnProbing: r.bleedingOnProbing,
              plaque: r.plaque,
            })),
          }),
        }
      )) as { exam?: { summary?: typeof summary } };
      setSummary(res.exam?.summary ?? null);
    } catch (e) {
      setError(normalizeUserFacingError(e instanceof Error ? e.message : null, language));
    } finally {
      setSaving(false);
    }
  };

  const toothLabel = (code: string) => {
    const tooth = getCanonicalTooth(code);
    return tooth ? formatToothDisplayLabel(tooth, "FDI") : code;
  };

  if (loading) {
    return <p style={{ margin: 0, color: "#64748b" }}>{t("common.loading")}</p>;
  }

  return (
    <div data-testid="dental-periodontal-chart" data-certification={D5A5_CERTIFICATION_ID}>
      <div style={{ ...MEDORA_CARD_SHELL, padding: 12 }}>
        <h3 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 700 }}>{t("dentalCareD5a5.periodontal.title")}</h3>

        {summary ? (
          <p style={{ margin: "0 0 10px", fontSize: 12, color: "#475569" }}>
            {summary.bleedingPercent != null
              ? `${t("dentalCareD5a5.periodontal.bleedingPercent")}: ${summary.bleedingPercent}%`
              : ""}
            {summary.deepestProbingDepthMm != null
              ? ` · ${t("dentalCareD5a5.periodontal.deepestPd")}: ${summary.deepestProbingDepthMm} mm`
              : ""}
            {summary.siteCount != null ? ` · ${t("dentalCareD5a5.periodontal.siteCount")}: ${summary.siteCount}` : ""}
          </p>
        ) : null}

        {!readOnly ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10, alignItems: "flex-end" }}>
            <label style={{ fontSize: 12 }}>
              {t("dentalCareD5a5.periodontal.addTooth")}
              <select
                value={pickTooth}
                onChange={(e) => setPickTooth(e.target.value)}
                style={{ display: "block", marginTop: 4, padding: "4px 6px", fontSize: 12, borderRadius: 6, border: "1px solid #e2e8f0" }}
              >
                {QUICK_TEETH.map((tooth) => (
                  <option key={tooth.code} value={tooth.code}>
                    {formatToothDisplayLabel(tooth, "FDI")} ({tooth.code})
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => addTooth(pickTooth)}
              style={{ padding: "6px 10px", fontSize: 12, borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer" }}
            >
              {t("dentalCareD5a5.periodontal.addSelectedTooth")}
            </button>
            <label style={{ fontSize: 12 }}>
              {t("dentalCareD5a5.periodontal.freeTooth")}
              <input
                value={freeTooth}
                onChange={(e) => setFreeTooth(e.target.value)}
                placeholder="PERM_16"
                style={{ display: "block", marginTop: 4, padding: "4px 6px", fontSize: 12, borderRadius: 6, border: "1px solid #e2e8f0", width: 100 }}
              />
            </label>
            <button
              type="button"
              onClick={() => {
                addTooth(freeTooth);
                setFreeTooth("");
              }}
              style={{ padding: "6px 10px", fontSize: 12, borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer" }}
            >
              {t("dentalCareD5a5.periodontal.addFreeTooth")}
            </button>
          </div>
        ) : null}

        {teethInChart.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{t("dentalCareD5a5.periodontal.noSites")}</p>
        ) : (
          teethInChart.map((toothCode) => (
            <div key={toothCode} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <strong style={{ fontSize: 12 }}>#{toothLabel(toothCode)}</strong>
                {!readOnly ? (
                  <button
                    type="button"
                    onClick={() => removeTooth(toothCode)}
                    style={{ fontSize: 11, border: "none", background: "transparent", color: "#b91c1c", cursor: "pointer" }}
                  >
                    {t("dentalCareD5a5.periodontal.removeTooth")}
                  </button>
                ) : null}
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      <th style={{ padding: 4, textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>{t("dentalCareD5a5.periodontal.site")}</th>
                      <th style={{ padding: 4, textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>{t("dentalCareD5a5.periodontal.pd")}</th>
                      <th style={{ padding: 4, textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>{t("dentalCareD5a5.periodontal.gm")}</th>
                      <th style={{ padding: 4, textAlign: "center", borderBottom: "1px solid #e2e8f0" }}>{t("dentalCareD5a5.periodontal.bop")}</th>
                      <th style={{ padding: 4, textAlign: "center", borderBottom: "1px solid #e2e8f0" }}>{t("dentalCareD5a5.periodontal.plaque")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {siteRows
                      .map((row, idx) => ({ row, idx }))
                      .filter(({ row }) => row.toothCode === toothCode)
                      .map(({ row, idx }) => (
                        <tr key={`${row.toothCode}-${row.site}`}>
                          <td style={{ padding: 4, borderBottom: "1px solid #f1f5f9" }}>{row.site}</td>
                          <td style={{ padding: 4, borderBottom: "1px solid #f1f5f9" }}>
                            <input
                              type="number"
                              min={0}
                              max={20}
                              step={0.5}
                              disabled={readOnly}
                              value={row.probingDepthMm}
                              onChange={(e) => updateRow(idx, { probingDepthMm: e.target.value })}
                              style={cellInput}
                            />
                          </td>
                          <td style={{ padding: 4, borderBottom: "1px solid #f1f5f9" }}>
                            <input
                              type="number"
                              min={0}
                              max={20}
                              step={0.5}
                              disabled={readOnly}
                              value={row.gingivalMarginMm}
                              onChange={(e) => updateRow(idx, { gingivalMarginMm: e.target.value })}
                              style={cellInput}
                            />
                          </td>
                          <td style={{ padding: 4, borderBottom: "1px solid #f1f5f9", textAlign: "center" }}>
                            <input
                              type="checkbox"
                              disabled={readOnly}
                              checked={row.bleedingOnProbing}
                              onChange={(e) => updateRow(idx, { bleedingOnProbing: e.target.checked })}
                            />
                          </td>
                          <td style={{ padding: 4, borderBottom: "1px solid #f1f5f9", textAlign: "center" }}>
                            <input
                              type="checkbox"
                              disabled={readOnly}
                              checked={row.plaque}
                              onChange={(e) => updateRow(idx, { plaque: e.target.checked })}
                            />
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}

        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>
            {t("dentalCareD5a5.periodontal.status")}
            <select
              disabled={readOnly}
              value={periodontalStatus}
              onChange={(e) => setPeriodontalStatus(e.target.value)}
              style={{ display: "block", width: "100%", marginTop: 4, padding: 6, fontSize: 12, borderRadius: 6, border: "1px solid #e2e8f0" }}
            >
              {D5A5_PERIODONTAL_STATUS.map((s) => (
                <option key={s} value={s}>
                  {t(`dentalCareD5a5.periodontal.statuses.${s}`)}
                </option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: 12, fontWeight: 600 }}>
            {t("dentalCareD5a5.periodontal.stage")}
            <select
              disabled={readOnly}
              value={periodontitisStage}
              onChange={(e) => setPeriodontitisStage(e.target.value)}
              style={{ display: "block", width: "100%", marginTop: 4, padding: 6, fontSize: 12, borderRadius: 6, border: "1px solid #e2e8f0" }}
            >
              <option value="">{t("dentalCareD5a5.notDocumented")}</option>
              {D5A5_PERIODONTITIS_STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: 12, fontWeight: 600 }}>
            {t("dentalCareD5a5.periodontal.grade")}
            <select
              disabled={readOnly}
              value={periodontitisGrade}
              onChange={(e) => setPeriodontitisGrade(e.target.value)}
              style={{ display: "block", width: "100%", marginTop: 4, padding: 6, fontSize: 12, borderRadius: 6, border: "1px solid #e2e8f0" }}
            >
              <option value="">{t("dentalCareD5a5.notDocumented")}</option>
              {D5A5_PERIODONTITIS_GRADES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: 12, fontWeight: 600 }}>
            {t("dentalCareD5a5.periodontal.extent")}
            <select
              disabled={readOnly}
              value={extentDistribution}
              onChange={(e) => setExtentDistribution(e.target.value)}
              style={{ display: "block", width: "100%", marginTop: 4, padding: 6, fontSize: 12, borderRadius: 6, border: "1px solid #e2e8f0" }}
            >
              <option value="">{t("dentalCareD5a5.notDocumented")}</option>
              {D5A5_PERIODONTAL_EXTENT.map((s) => (
                <option key={s} value={s}>
                  {t(`dentalCareD5a5.periodontal.extents.${s}`)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label style={{ display: "block", marginTop: 10, fontSize: 12, fontWeight: 600 }}>
          {t("dentalCareD5a5.periodontal.narrative")}
          <textarea
            disabled={readOnly}
            value={narrativeAssessment}
            onChange={(e) => setNarrativeAssessment(e.target.value)}
            rows={3}
            style={{ display: "block", width: "100%", marginTop: 4, padding: 8, fontSize: 12, borderRadius: 6, border: "1px solid #e2e8f0", fontFamily: "inherit" }}
          />
        </label>

        {error ? (
          <p role="alert" style={{ margin: "8px 0 0", color: "#b91c1c", fontSize: 13 }}>
            {error}
          </p>
        ) : null}

        {!readOnly ? (
          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            style={{
              marginTop: 10,
              padding: "8px 14px",
              borderRadius: 6,
              border: "none",
              background: "#0f172a",
              color: "#fff",
              fontWeight: 600,
              fontSize: 13,
              cursor: saving ? "wait" : "pointer",
            }}
          >
            {saving ? t("common.loading") : t("dentalCareD5a5.periodontal.save")}
          </button>
        ) : (
          <p style={{ margin: "10px 0 0", fontSize: 12, color: "#64748b" }}>{t("dentalCareD5a5.periodontal.readOnly")}</p>
        )}
      </div>
    </div>
  );
}
