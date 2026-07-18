"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import {
  fetchMedicationGovernanceDuplicates,
  fetchMedicationGovernanceSummary,
  fetchMedicationGovernanceUnmapped,
  fetchMedicationGovernanceWarnings,
  type MedicationGovernanceDuplicateGroup,
  type MedicationGovernanceSummary,
  type MedicationGovernanceUnmappedRow,
  type MedicationGovernanceWarningRow,
} from "@/lib/medicationMasterGovernanceApi";
import { searchMedicationMaster, type MedicationMasterSearchHit } from "@/lib/medicationMasterApi";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { GovernanceActivationReviewQueue } from "@/components/admin/GovernanceActivationReviewQueue";
import { GlobalBaselineAutoApprovalPanel } from "@/components/admin/GlobalBaselineAutoApprovalPanel";

type SectionId =
  | "activationReview"
  | "promotion"
  | "missingNdc"
  | "missingBilling"
  | "missingSafety"
  | "missingInfusion"
  | "duplicates"
  | "highAlert"
  | "controlled"
  | "edFormulary"
  | "unmapped";

function cardStyle(): CSSProperties {
  return {
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "12px 14px",
    background: "#fff",
  };
}

function severityStyle(severity: string): CSSProperties {
  if (severity === "critical") return { background: "#fef2f2", color: "#991b1b" };
  if (severity === "warning") return { background: "#fffbeb", color: "#92400e" };
  return { background: "#f0f9ff", color: "#0c4a6e" };
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

function ReadinessCard({ label, percent }: { label: string; percent: number }) {
  return (
    <div style={cardStyle()}>
      <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>{label}</p>
      <p style={{ margin: "4px 0 0 0", fontSize: 22, fontWeight: 700 }}>{percent}%</p>
    </div>
  );
}

function CountCard({ label, count }: { label: string; count: number }) {
  return (
    <div style={cardStyle()}>
      <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>{label}</p>
      <p style={{ margin: "4px 0 0 0", fontSize: 22, fontWeight: 700 }}>{count}</p>
    </div>
  );
}

function WarningsTable({
  rows,
  t,
  sortKey,
  sortDir,
  onSort,
}: {
  rows: MedicationGovernanceWarningRow[];
  t: (k: string) => string;
  sortKey: string;
  sortDir: "asc" | "desc";
  onSort: (key: string) => void;
}) {
  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = String((a as Record<string, unknown>)[sortKey] ?? "");
      const bv = String((b as Record<string, unknown>)[sortKey] ?? "");
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      <thead>
        <tr style={{ textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>
          {[
            ["displayName", t("medicationGovernance.colMedication")],
            ["code", t("medicationGovernance.colCode")],
            ["severity", t("medicationGovernance.colSeverity")],
            ["scopeLabel", t("medicationGovernance.colScope")],
          ].map(([key, label]) => (
            <th key={key} style={{ padding: "6px 8px", cursor: "pointer" }} onClick={() => onSort(key)}>
              {label} {sortKey === key ? (sortDir === "asc" ? "↑" : "↓") : ""}
            </th>
          ))}
          <th style={{ padding: "6px 8px" }}>{t("medicationGovernance.colAction")}</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((row, i) => (
          <tr key={`${row.conceptId}-${row.code}-${i}`} style={{ borderBottom: "1px solid #f1f5f9" }}>
            <td style={{ padding: "6px 8px" }}>{row.displayName}</td>
            <td style={{ padding: "6px 8px", color: "#64748b" }}>{row.scopeLabel}</td>
            <td style={{ padding: "6px 8px" }}>
              <span
                style={{
                  ...severityStyle(row.severity),
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: 9999,
                }}
              >
                {t(`medicationGovernance.severity.${row.severity}`)}
              </span>
            </td>
            <td style={{ padding: "6px 8px", color: "#64748b" }}>
              {t(`medicationGovernance.warning.${row.code}`)}
            </td>
            <td style={{ padding: "6px 8px" }}>
              <Link href={`/app/admin/medication-master/review/${encodeURIComponent(row.conceptId)}`}>
                {t("medicationGovernance.openReview")}
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function MedicationGovernancePage() {
  const { t, language } = useI18n();
  const { ready, roles, facilityId } = useFacilityAndRoles();
  const isAdmin = roles.includes("ADMIN") || roles.includes("MEDORA_SUPER_ADMIN");

  const [summary, setSummary] = useState<MedicationGovernanceSummary | null>(null);
  const [section, setSection] = useState<SectionId>("activationReview");
  const [pendingReviewCount, setPendingReviewCount] = useState<number | null>(null);
  const [warnings, setWarnings] = useState<MedicationGovernanceWarningRow[]>([]);
  const [unmapped, setUnmapped] = useState<MedicationGovernanceUnmappedRow[]>([]);
  const [duplicates, setDuplicates] = useState<MedicationGovernanceDuplicateGroup[]>([]);
  const [searchHits, setSearchHits] = useState<MedicationMasterSearchHit[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [sectionLoading, setSectionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState("displayName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filterQ, setFilterQ] = useState("");

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const loadSummary = useCallback(async () => {
    if (!facilityId) {
      setError(t("medicationGovernance.errorFacility"));
      return;
    }
    setSummaryLoading(true);
    setError(null);
    try {
      const data = await fetchMedicationGovernanceSummary(facilityId);
      setSummary(data);
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : "";
      setSummary(null);
      setError(normalizeUserFacingError(raw, language) || t("medicationGovernance.errorLoad"));
    } finally {
      setSummaryLoading(false);
    }
  }, [facilityId, language, t]);

  const loadSection = useCallback(async () => {
    if (!facilityId) return;
    setSectionLoading(true);
    setError(null);
    try {
      if (section === "missingNdc") {
        const r = await fetchMedicationGovernanceWarnings(facilityId, { code: "MISSING_NDC" });
        setWarnings(r.items);
      } else if (section === "missingBilling") {
        const r = await fetchMedicationGovernanceWarnings(facilityId, { code: "MISSING_BILLING_PROFILE" });
        setWarnings(r.items);
      } else if (section === "missingSafety") {
        const r = await fetchMedicationGovernanceWarnings(facilityId, { code: "MISSING_SAFETY_PROFILE" });
        setWarnings(r.items);
      } else if (section === "missingInfusion") {
        const r = await fetchMedicationGovernanceWarnings(facilityId, { code: "MISSING_INFUSION_PROFILE" });
        setWarnings(r.items);
      } else if (section === "duplicates") {
        const r = await fetchMedicationGovernanceDuplicates(facilityId);
        setDuplicates(r.items);
      } else if (section === "unmapped") {
        const r = await fetchMedicationGovernanceUnmapped(facilityId, { q: filterQ || undefined });
        setUnmapped(r.items);
      } else if (section === "highAlert") {
        const r = await searchMedicationMaster(facilityId, { highAlertOnly: true, limit: 200 });
        setSearchHits(r.items);
      } else if (section === "controlled") {
        const r = await searchMedicationMaster(facilityId, { controlledOnly: true, limit: 200 });
        setSearchHits(r.items);
      } else if (section === "edFormulary") {
        const r = await searchMedicationMaster(facilityId, { edFormularyOnly: true, limit: 200 });
        setSearchHits(r.items);
      }
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : "";
      setError(normalizeUserFacingError(raw, language) || t("medicationGovernance.errorLoad"));
    } finally {
      setSectionLoading(false);
    }
  }, [facilityId, section, filterQ, language, t]);

  useEffect(() => {
    if (!ready || !isAdmin || !facilityId) return;
    void loadSummary();
  }, [ready, isAdmin, facilityId, loadSummary]);

  useEffect(() => {
    if (!ready || !isAdmin || !facilityId || section === "promotion" || section === "activationReview") {
      return;
    }
    void loadSection();
  }, [ready, isAdmin, facilityId, section, loadSection]);

  const exportCsv = () => {
    if (section === "unmapped") {
      downloadCsv(
        "governance-unmapped.csv",
        ["code", "name", "genericName", "strength", "ndc11"],
        unmapped.map((r) => [
          r.catalogCode,
          r.name,
          r.genericName ?? "",
          r.strength ?? "",
          r.ndc11 ?? "",
        ])
      );
      return;
    }
    if (section === "duplicates") {
      downloadCsv(
        "governance-duplicates.csv",
        ["kind", "matchKey", "severity", "entries"],
        duplicates.map((g) => [g.kind, g.matchKey, g.severity, String(g.entries.length)])
      );
      return;
    }
    if (["missingNdc", "missingBilling", "missingSafety", "missingInfusion"].includes(section)) {
      downloadCsv(
        `governance-${section}.csv`,
        ["displayName", "conceptCode", "severity", "code", "scopeLabel"],
        warnings.map((w) => [w.displayName, w.conceptCode, w.severity, w.code, w.scopeLabel])
      );
    }
  };

  const sections: Array<{ id: SectionId; label: string; count?: number }> = [
    {
      id: "activationReview",
      label: t("medicationGovernance.sectionActivationReview"),
      count: pendingReviewCount ?? summary?.activation.pendingReview,
    },
    { id: "promotion", label: t("medicationGovernance.sectionPromotion") },
    {
      id: "missingNdc",
      label: t("medicationGovernance.sectionMissingNdc"),
      count: summary?.counts.missingNdc,
    },
    {
      id: "missingBilling",
      label: t("medicationGovernance.sectionMissingBilling"),
      count: summary?.counts.missingBillingProfile,
    },
    {
      id: "missingSafety",
      label: t("medicationGovernance.sectionMissingSafety"),
      count: summary?.counts.missingSafetyProfile,
    },
    {
      id: "missingInfusion",
      label: t("medicationGovernance.sectionMissingInfusion"),
      count: summary?.counts.missingInfusionProfile,
    },
    {
      id: "duplicates",
      label: t("medicationGovernance.sectionDuplicates"),
      count: summary?.counts.duplicateNdcGroups,
    },
    {
      id: "highAlert",
      label: t("medicationGovernance.sectionHighAlert"),
      count: summary?.counts.highAlertConcepts,
    },
    {
      id: "controlled",
      label: t("medicationGovernance.sectionControlled"),
      count: summary?.counts.controlledConcepts,
    },
    {
      id: "edFormulary",
      label: t("medicationGovernance.sectionEdFormulary"),
      count: summary?.counts.edFormularyPackages,
    },
    {
      id: "unmapped",
      label: t("medicationGovernance.sectionUnmapped"),
      count: summary?.counts.legacyCatalogUnmapped,
    },
  ];

  if (!ready) {
    return (
      <div style={{ padding: 24 }}>
        <p>{t("common.loading")}</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div style={{ padding: 24 }}>
        <p>{t("medicationGovernance.accessDenied")}</p>
        <Link href="/app">{t("medicationGovernance.backApp")}</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1100 }}>
      <Link href="/app/admin" style={{ color: "#1a1a1a" }}>
        {t("medicationGovernance.backAdmin")}
      </Link>
      <h1 style={{ margin: "12px 0 4px 0" }}>{t("medicationGovernance.title")}</h1>
      <p style={{ color: "#475569", maxWidth: 800 }}>
        {section === "activationReview"
          ? t("medicationGovernance.activationReview.intro")
          : t("medicationGovernance.intro")}
      </p>

      <div
        style={{
          margin: "12px 0 16px 0",
          padding: "10px 12px",
          borderRadius: 8,
          background: "#f0f9ff",
          border: "1px solid #bae6fd",
          color: "#0c4a6e",
          fontSize: 13,
        }}
      >
        {t("medicationGovernance.readOnlyBanner")}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <button type="button" onClick={() => void loadSummary()} disabled={summaryLoading}>
          {t("medicationGovernance.refresh")}
        </button>
        {section !== "promotion" && section !== "activationReview" ? (
          <button type="button" onClick={exportCsv} disabled={sectionLoading}>
            {t("medicationGovernance.exportCsv")}
          </button>
        ) : null}
        <Link href="/app/admin/medication-master" style={{ alignSelf: "center", fontSize: 14 }}>
          {t("medicationGovernance.openExplorer")}
        </Link>
        <Link
          href="/app/admin/medication-governance/duplicates"
          style={{ alignSelf: "center", fontSize: 14 }}
        >
          {t("medicationGovernance.openDuplicateQueue")}
        </Link>
        <Link
          href="/app/admin/medication-governance/clinical-knowledge"
          style={{ alignSelf: "center", fontSize: 14 }}
        >
          {t("medicationGovernance.openClinicalKnowledge")}
        </Link>
        <Link
          href="/app/admin/medication-governance/activation"
          style={{ alignSelf: "center", fontSize: 14 }}
        >
          {t("medicationGovernanceActivation.openActivationQueue")}
        </Link>
      </div>

      {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}

      {summaryLoading && !summary ? <p>{t("common.loading")}</p> : null}

      {summary ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: 10,
            marginBottom: 20,
          }}
        >
          <ReadinessCard label={t("medicationGovernance.readinessConcepts")} percent={summary.readiness.conceptsReadyPercent} />
          <ReadinessCard label={t("medicationGovernance.readinessNdc")} percent={summary.readiness.packagesWithNdcPercent} />
          <ReadinessCard
            label={t("medicationGovernance.readinessFormulary")}
            percent={summary.readiness.packagesOnFormularyPercent}
          />
          <ReadinessCard
            label={t("medicationGovernance.readinessLegacy")}
            percent={summary.readiness.legacyCatalogMappedPercent}
          />
        </div>
      ) : null}

      {summary ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: 8,
            marginBottom: 20,
          }}
        >
          <CountCard label={t("medicationGovernance.metricApproved")} count={summary.activation.activationApproved} />
          <CountCard label={t("medicationGovernance.metricBlocked")} count={summary.activation.blocked} />
          <CountCard label={t("medicationGovernance.metricRetired")} count={summary.activation.retired} />
          <CountCard label={t("medicationGovernance.metricPending")} count={summary.activation.pendingReview} />
          <CountCard label={t("medicationGovernance.metricReady")} count={summary.activation.readyForActivation} />
          <CountCard
            label={t("medicationGovernance.metricGlobalBaseline")}
            count={summary.globalBaseline?.priorityErAvailable ?? 0}
          />
          <CountCard
            label={t("medicationGovernance.metricFacilityBaselineLinked")}
            count={summary.globalBaseline?.facilityFormularyLinked ?? 0}
          />
        </div>
      ) : null}

      <GlobalBaselineAutoApprovalPanel facilityId={facilityId} isAdmin={isAdmin} />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
        {sections.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSection(s.id)}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: section === s.id ? "2px solid #1e40af" : "1px solid #e2e8f0",
              background: section === s.id ? "#eff6ff" : "#fff",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            {s.label}
            {s.count != null ? ` (${s.count})` : ""}
          </button>
        ))}
      </div>

      {section === "activationReview" && facilityId ? (
        <div style={cardStyle()}>
          <GovernanceActivationReviewQueue
            facilityId={facilityId}
            facilityLabel={facilityId}
            onQueueLoaded={(count) => setPendingReviewCount(count)}
          />
        </div>
      ) : null}

      {section === "promotion" && summary ? (
        <div style={cardStyle()}>
          <h2 style={{ margin: "0 0 10px 0", fontSize: 16 }}>{t("medicationGovernance.sectionPromotion")}</h2>
          <p style={{ margin: "4px 0", fontSize: 14 }}>
            {t("medicationGovernance.promotionConcepts")} : {summary.promotion.activeConcepts}
          </p>
          <p style={{ margin: "4px 0", fontSize: 14 }}>
            {t("medicationGovernance.promotionProducts")} : {summary.promotion.activeProducts}
          </p>
          <p style={{ margin: "4px 0", fontSize: 14 }}>
            {t("medicationGovernance.promotionPackages")} : {summary.promotion.activePackages}
          </p>
          <p style={{ margin: "4px 0", fontSize: 14 }}>
            {t("medicationGovernance.promotionLatestBatch")} : {summary.promotion.latestBatchId ?? "—"}
          </p>
          <p style={{ margin: "4px 0", fontSize: 14 }}>
            {t("medicationGovernance.promotionPromoted")} : {summary.promotion.promotedStagingRows} ·{" "}
            {t("medicationGovernance.promotionPending")} : {summary.promotion.pendingStagingRows}
          </p>
          {Object.keys(summary.promotion.stagingByOverallStatus).length > 0 ? (
            <ul style={{ fontSize: 13, marginTop: 10 }}>
              {Object.entries(summary.promotion.stagingByOverallStatus).map(([k, v]) => (
                <li key={k}>
                  {k} : {v}
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: "#64748b", fontSize: 13 }}>{t("medicationGovernance.noStaging")}</p>
          )}
        </div>
      ) : null}

      {sectionLoading ? <p>{t("common.loading")}</p> : null}

      {!sectionLoading &&
      ["missingNdc", "missingBilling", "missingSafety", "missingInfusion"].includes(section) ? (
        <div style={cardStyle()}>
          {warnings.length === 0 ? (
            <p style={{ color: "#166534" }}>{t("medicationGovernance.emptySection")}</p>
          ) : (
            <WarningsTable rows={warnings} t={t} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
          )}
        </div>
      ) : null}

      {!sectionLoading && section === "duplicates" ? (
        <div style={cardStyle()}>
          {duplicates.length === 0 ? (
            <p style={{ color: "#166534" }}>{t("medicationGovernance.emptySection")}</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
              {duplicates.map((g) => (
                <li key={`${g.kind}-${g.matchKey}`} style={{ marginBottom: 12 }}>
                  <span style={{ ...severityStyle(g.severity), padding: "2px 8px", borderRadius: 9999, fontSize: 11 }}>
                    {g.kind}
                  </span>{" "}
                  <strong>{g.matchKey}</strong> ({g.entries.length})
                  <ul>
                    {g.entries.map((e, i) => (
                      <li key={i}>
                        {e.label} ({e.code})
                        {e.conceptId ? (
                          <>
                            {" "}
                            <Link
                              href={`/app/admin/medication-master/review/${encodeURIComponent(e.conceptId)}`}
                            >
                              {t("medicationGovernance.openReview")}
                            </Link>
                          </>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {!sectionLoading && section === "unmapped" ? (
        <div style={cardStyle()}>
          <input
            type="search"
            value={filterQ}
            onChange={(e) => setFilterQ(e.target.value)}
            placeholder={t("medicationGovernance.filterSearch")}
            style={{ marginBottom: 10, padding: "6px 10px", width: "100%", maxWidth: 360 }}
          />
          <button type="button" onClick={() => void loadSection()} style={{ marginBottom: 10, marginLeft: 8 }}>
            {t("medicationGovernance.applyFilter")}
          </button>
          {unmapped.length === 0 ? (
            <p style={{ color: "#166534" }}>{t("medicationGovernance.emptySection")}</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                  <th style={{ padding: 6 }}>{t("medicationGovernance.colCode")}</th>
                  <th style={{ padding: 6 }}>{t("medicationGovernance.colMedication")}</th>
                  <th style={{ padding: 6 }}>{t("medicationGovernance.colNdc")}</th>
                </tr>
              </thead>
              <tbody>
                {unmapped.map((r) => (
                  <tr key={r.catalogMedicationId} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: 6 }}>{r.catalogCode}</td>
                    <td style={{ padding: 6 }}>{r.name}</td>
                    <td style={{ padding: 6 }}>{r.ndc11 ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : null}

      {!sectionLoading && ["highAlert", "controlled", "edFormulary"].includes(section) ? (
        <div style={cardStyle()}>
          {searchHits.length === 0 ? (
            <p style={{ color: "#166534" }}>{t("medicationGovernance.emptySection")}</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                  <th style={{ padding: 6 }}>{t("medicationGovernance.colMedication")}</th>
                  <th style={{ padding: 6 }}>{t("medicationGovernance.colCode")}</th>
                  <th style={{ padding: 6 }}>{t("medicationGovernance.colAction")}</th>
                </tr>
              </thead>
              <tbody>
                {[...new Map(searchHits.map((h) => [h.conceptId, h])).values()].map((h) => (
                  <tr key={h.conceptId} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: 6 }}>{h.displayName}</td>
                    <td style={{ padding: 6 }}>{h.conceptCode}</td>
                    <td style={{ padding: 6 }}>
                      <Link href={`/app/admin/medication-master/review/${encodeURIComponent(h.conceptId)}`}>
                        {t("medicationGovernance.openReview")}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : null}
    </div>
  );
}
