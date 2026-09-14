"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import {
  fetchAdminAuditEvents,
  type AdminAuditEventRow,
  type AdminAuditEventsQuery,
  type AdminAuditEventsResponse,
  type AdminAuditPreset,
} from "@/lib/adminAuditApi";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { auditActionLabel, auditEntityLabel } from "@/lib/auditDisplayLabels";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100, 200] as const;
const PRESETS: AdminAuditPreset[] = [
  "critical_events",
  "security_interop",
  "clinical_actions",
  "billing_exports",
  "access_views",
  "overrides",
];

function defaultDateRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to.getTime() - 7 * 86400_000);
  const isoDay = (d: Date) => d.toISOString().slice(0, 10);
  return { from: isoDay(from), to: isoDay(to) };
}

function safeTranslation(t: (key: string) => string, key: string, fallback: string): string {
  const value = t(key);
  if (!value || value === key || /^(Unavailable|Indisponible|No disponible)$/i.test(value.trim())) return fallback;
  return value;
}

function presetLabel(t: (key: string) => string, preset: AdminAuditPreset): string {
  const fallbacks: Record<AdminAuditPreset, string> = {
    critical_events: "Critical events",
    security_interop: "Security & interoperability",
    clinical_actions: "Clinical actions",
    billing_exports: "Billing exports",
    access_views: "Access / views",
    overrides: "Overrides & addenda",
  };
  return safeTranslation(t, `adminAudit.preset.${preset}`, fallbacks[preset]);
}

function contextForRow(row: AdminAuditEventRow): { title: string; detail: string } {
  if (row.encounterId) return { title: "Encounter", detail: "Patient context" };
  if (row.entity === "FHIR_INTEGRATION_CLIENT" || row.entity === "FHIR_INTEGRATION_ACCESS") {
    return { title: "Facility / integration", detail: "Non-encounter event" };
  }
  if (row.facilityId) return { title: "Facility / system", detail: "Facility-level event" };
  return { title: "System", detail: "System-level event" };
}

function operationalSummary(row: AdminAuditEventRow): { title: string; detail: string } {
  const meta = row.metadataSummary;
  const event = typeof meta.event === "string" ? meta.event : "";
  const scopeCount = typeof meta.scopeCount === "number" ? meta.scopeCount : null;

  switch (event) {
    case "FHIR_M2M_CLIENT_REVOKED":
      return { title: "Machine client revoked", detail: "All client credentials disabled for this integration." };
    case "FHIR_M2M_TOKEN_ISSUED":
      return {
        title: "Token issued for machine credential",
        detail: scopeCount == null ? "Authorized machine access granted." : `${scopeCount} scope${scopeCount === 1 ? "" : "s"} granted.`,
      };
    case "FHIR_M2M_CREDENTIAL_REVOKED":
      return { title: "Credential revoked", detail: "Access disabled for this credential." };
    case "FHIR_M2M_CREDENTIAL_ROTATED":
      return { title: "Credential rotated", detail: "Replacement machine credential created." };
    case "FHIR_M2M_CLIENT_PROVISIONED":
      return { title: "Machine client provisioned", detail: "Integration client and machine credential created." };
    default:
      break;
  }

  if (row.action === "ENCOUNTER_VIEW") return { title: "Encounter viewed", detail: "User accessed an encounter record." };
  if (row.action === "PATIENT_VIEW") return { title: "Patient chart accessed", detail: "User viewed the patient chart." };
  if (row.auditCategory === "access") return { title: "Access event recorded", detail: "A read or view operation was recorded." };
  if (row.auditCategory === "clinical") return { title: "Clinical activity recorded", detail: "A clinical workflow action was recorded." };
  if (row.auditCategory === "billing") return { title: "Billing activity recorded", detail: "A billing workflow action was recorded." };
  if (row.auditCategory === "critical") return { title: "Critical audit event", detail: "A high-priority audit event was recorded." };
  return { title: auditActionLabel((k) => k, row.action, row.entity, row.metadataSummary), detail: "Audit activity recorded." };
}

function badgeForCategory(category: string | undefined): { label: string; bg: string; border: string; text: string } {
  switch (category) {
    case "security":
      return { label: "Security", bg: "#eff6ff", border: "#93c5fd", text: "#1d4ed8" };
    case "access":
      return { label: "Access", bg: "#ecfdf5", border: "#86efac", text: "#047857" };
    case "clinical":
      return { label: "Clinical", bg: "#f1f5f9", border: "#cbd5e1", text: "#475569" };
    case "critical":
      return { label: "Critical", bg: "#fef2f2", border: "#fca5a5", text: "#b91c1c" };
    case "billing":
      return { label: "Billing", bg: "#fffbeb", border: "#fcd34d", text: "#92400e" };
    case "override":
      return { label: "Override", bg: "#fff7ed", border: "#fdba74", text: "#9a3412" };
    default:
      return { label: "System", bg: "#f8fafc", border: "#cbd5e1", text: "#475569" };
  }
}

function csvEscape(value: unknown): string {
  const s = value == null ? "" : String(value);
  return `"${s.replaceAll('"', '""')}"`;
}

function paginationTokens(page: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const wanted = new Set([1, totalPages, page - 2, page - 1, page, page + 1, page + 2]);
  const pages = [...wanted].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const out: Array<number | "ellipsis"> = [];
  pages.forEach((p, i) => {
    if (i > 0 && p - pages[i - 1] > 1) out.push("ellipsis");
    out.push(p);
  });
  return out;
}

const initialStats: AdminAuditEventsResponse["stats"] = {
  totalCount: 0,
  securityInteropCount: 0,
  encounterLinkedCount: 0,
  facilitySystemCount: 0,
};

export default function AdminAuditPage() {
  const { t, language } = useI18n();
  const { ready, facilityId } = useFacilityAndRoles();
  const [range, setRange] = useState(defaultDateRange);
  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("");
  const [encounterId, setEncounterId] = useState("");
  const [preset, setPreset] = useState<AdminAuditPreset | "">("");
  const [items, setItems] = useState<AdminAuditEventRow[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState(initialStats);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPage = useCallback(
    async (targetPage = page, targetPageSize = pageSize, presetOverride?: AdminAuditPreset | "") => {
      if (!facilityId) {
        setError(t("adminAudit.errorFacility"));
        return;
      }
      setLoading(true);
      setError(null);
      const effectivePreset = presetOverride === undefined ? preset : presetOverride;
      const q: AdminAuditEventsQuery = {
        from: `${range.from}T00:00:00.000Z`,
        to: `${range.to}T23:59:59.999Z`,
        limit: targetPageSize,
        page: targetPage,
        ...(effectivePreset ? { preset: effectivePreset } : {}),
        ...(!effectivePreset && action.trim() ? { action: action.trim() } : {}),
        ...(!effectivePreset && entity.trim() ? { entity: entity.trim() } : {}),
        ...(encounterId.trim() ? { encounterId: encounterId.trim() } : {}),
      };
      try {
        const res = await fetchAdminAuditEvents(facilityId, q);
        setItems(res.events);
        setPage(res.pagination.page);
        setPageSize(res.pagination.pageSize);
        setTotalPages(res.pagination.totalPages);
        setStats(res.stats);
      } catch (e: unknown) {
        const raw = e instanceof Error ? e.message : "";
        setError(normalizeUserFacingError(raw, language) || t("adminAudit.errorLoad"));
        setItems([]);
        setStats(initialStats);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    },
    [facilityId, range.from, range.to, action, entity, encounterId, preset, page, pageSize, language, t]
  );

  useEffect(() => {
    if (!ready || !facilityId) return;
    void loadPage(1, 10, "");
    // Initial load only; administrators explicitly refresh after editing filters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, facilityId]);

  const shownStart = stats.totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const shownEnd = stats.totalCount === 0 ? 0 : Math.min((page - 1) * pageSize + items.length, stats.totalCount);
  const pageTokens = useMemo(() => paginationTokens(page, totalPages), [page, totalPages]);

  const applyPreset = (value: AdminAuditPreset | "") => {
    setPreset(value);
    setAction("");
    setEntity("");
    setPage(1);
    void loadPage(1, pageSize, value);
  };

  const exportCsv = () => {
    const header = ["Time", "Actor", "Action", "Category", "Entity", "Entity ID", "Context", "Summary", "Details"];
    const rows = items.map((row) => {
      const context = contextForRow(row);
      const summary = operationalSummary(row);
      return [
        row.createdAt,
        row.actor.displayName,
        auditActionLabel(t, row.action, row.entity, row.metadataSummary),
        badgeForCategory(row.auditCategory).label,
        row.entity,
        row.entityId ?? "",
        `${context.title}: ${row.encounterId ?? context.detail}`,
        `${summary.title}: ${summary.detail}`,
        Object.entries(row.metadataSummary).map(([k, v]) => `${k}=${String(v)}`).join("; "),
      ];
    });
    const csv = [header, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `medora-audit-${range.from}-${range.to}-page-${page}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const cardStyle = {
    border: "1px solid #dbe5f1",
    borderRadius: 10,
    background: "#fff",
    padding: "14px 16px",
    minHeight: 76,
    display: "flex",
    gap: 14,
    alignItems: "center",
  } as const;

  return (
    <div style={{ padding: "18px 24px 28px", maxWidth: 1650, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <div>
          <p style={{ margin: 0, fontSize: 14 }}>
            <Link href="/app/admin" style={{ color: "#334155" }}>{t("adminAudit.backAdmin")}</Link>
            {" › "}
            <Link href="/app/reports" style={{ color: "#334155" }}>{t("adminAudit.linkOpsReports")}</Link>
          </p>
          <h1 style={{ margin: "8px 0 2px", fontSize: 30, lineHeight: 1.1 }}>{t("adminAudit.title")}</h1>
          <p style={{ color: "#475569", margin: "6px 0 0", maxWidth: 900, fontSize: 13 }}>
            {t("adminAudit.intro")} Non-encounter events are explicitly labeled as facility, integration, or system context.
          </p>
        </div>
      </div>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12, margin: "16px 0 18px" }}>
        <div style={cardStyle}>
          <div style={{ width: 44, height: 44, borderRadius: 9, background: "#eff6ff", display: "grid", placeItems: "center", color: "#2563eb", fontSize: 22 }}>▤</div>
          <div><div style={{ fontSize: 12, color: "#475569", fontWeight: 700 }}>Total matching events</div><div style={{ fontSize: 25, fontWeight: 800 }}>{stats.totalCount}</div><div style={{ fontSize: 11, color: "#64748b" }}>{items.length} currently shown</div></div>
        </div>
        <div style={cardStyle}>
          <div style={{ width: 44, height: 44, borderRadius: 9, background: "#eff6ff", display: "grid", placeItems: "center", color: "#2563eb", fontSize: 22 }}>◇</div>
          <div><div style={{ fontSize: 12, color: "#475569", fontWeight: 700 }}>Security & interoperability</div><div style={{ fontSize: 25, fontWeight: 800 }}>{stats.securityInteropCount}</div><div style={{ fontSize: 11, color: "#64748b" }}>FHIR, integrations, API access</div></div>
        </div>
        <div style={cardStyle}>
          <div style={{ width: 44, height: 44, borderRadius: 9, background: "#eff6ff", display: "grid", placeItems: "center", color: "#2563eb", fontSize: 22 }}>◎</div>
          <div><div style={{ fontSize: 12, color: "#475569", fontWeight: 700 }}>Encounter-linked events</div><div style={{ fontSize: 25, fontWeight: 800 }}>{stats.encounterLinkedCount}</div><div style={{ fontSize: 11, color: "#64748b" }}>Patient, clinical, encounter actions</div></div>
        </div>
        <div style={cardStyle}>
          <div style={{ width: 44, height: 44, borderRadius: 9, background: "#eff6ff", display: "grid", placeItems: "center", color: "#2563eb", fontSize: 22 }}>▥</div>
          <div><div style={{ fontSize: 12, color: "#475569", fontWeight: 700 }}>Facility / system level</div><div style={{ fontSize: 25, fontWeight: 800 }}>{stats.facilitySystemCount}</div><div style={{ fontSize: 11, color: "#64748b" }}>Administration, configuration, system</div></div>
        </div>
      </section>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 8 }}>{t("adminAudit.presetHeading")}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button type="button" onClick={() => applyPreset("")} style={{ padding: "6px 13px", borderRadius: 999, border: preset === "" ? "2px solid #0f172a" : "1px solid #cbd5e1", background: preset === "" ? "#0f172a" : "#fff", color: preset === "" ? "#fff" : "#0f172a", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>{t("adminAudit.presetAll")}</button>
          {PRESETS.map((p) => (
            <button key={p} type="button" onClick={() => applyPreset(p)} style={{ padding: "6px 13px", borderRadius: 999, border: preset === p ? "2px solid #0f172a" : "1px solid #cbd5e1", background: preset === p ? "#f1f5f9" : "#fff", color: "#0f172a", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>{presetLabel(t, p)}</button>
          ))}
        </div>
      </div>

      <section style={{ display: "grid", gridTemplateColumns: "180px 180px minmax(180px, 1fr) minmax(180px, 1fr) minmax(240px, 1.2fr) auto auto", gap: 10, alignItems: "end", marginBottom: 14 }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12 }}><span>{t("adminAudit.filterFrom")}</span><input type="date" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} style={{ padding: 9, borderRadius: 6, border: "1px solid #cbd5e1" }} /></label>
        <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12 }}><span>{t("adminAudit.filterTo")}</span><input type="date" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} style={{ padding: 9, borderRadius: 6, border: "1px solid #cbd5e1" }} /></label>
        <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, opacity: preset ? 0.5 : 1 }}><span>{t("adminAudit.filterAction")}</span><input value={action} onChange={(e) => setAction(e.target.value)} disabled={Boolean(preset)} placeholder="e.g. TOKEN_ISSUED" style={{ padding: 9, borderRadius: 6, border: "1px solid #cbd5e1" }} /></label>
        <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12, opacity: preset ? 0.5 : 1 }}><span>{t("adminAudit.filterEntity")}</span><input value={entity} onChange={(e) => setEntity(e.target.value)} disabled={Boolean(preset)} placeholder="e.g. FHIR_INTEGRATION_CLIENT" style={{ padding: 9, borderRadius: 6, border: "1px solid #cbd5e1" }} /></label>
        <label style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 12 }}><span>{t("adminAudit.filterEncounterId")}</span><input value={encounterId} onChange={(e) => setEncounterId(e.target.value)} placeholder="uuid (optional)" style={{ padding: 9, borderRadius: 6, border: "1px solid #cbd5e1", fontFamily: "monospace", fontSize: 11 }} /></label>
        <button type="button" disabled={loading || !facilityId} onClick={() => void loadPage(1, pageSize)} style={{ height: 36, padding: "0 18px", borderRadius: 5, border: "none", background: "#0f172a", color: "#fff", fontWeight: 700, cursor: loading ? "wait" : "pointer" }}>Refresh</button>
        <button type="button" disabled={items.length === 0} onClick={exportCsv} style={{ height: 36, padding: "0 16px", borderRadius: 5, border: "1px solid #64748b", background: "#fff", color: "#0f172a", fontWeight: 700, cursor: items.length ? "pointer" : "not-allowed", whiteSpace: "nowrap" }}>⇩ Export evidence CSV</button>
      </section>

      {error ? <p style={{ color: "#b91c1c", padding: 10, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6 }}>{error}</p> : null}

      <div id="audit-events" style={{ overflowX: "auto", border: "1px solid #dbe5f1", borderRadius: 8, background: "#fff" }}>
        <table style={{ width: "100%", minWidth: 1180, borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #dbe5f1", textAlign: "left" }}>
              <th style={{ padding: "10px 12px", width: 145 }}>Time ↓</th>
              <th style={{ padding: "10px 12px", width: 170 }}>Actor</th>
              <th style={{ padding: "10px 12px", width: 205 }}>Action</th>
              <th style={{ padding: "10px 12px", width: 220 }}>Entity</th>
              <th style={{ padding: "10px 12px", width: 190 }}>Context</th>
              <th style={{ padding: "10px 12px" }}>Summary</th>
              <th style={{ padding: "10px 12px", width: 125 }}>Details</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => {
              const badge = badgeForCategory(row.auditCategory);
              const context = contextForRow(row);
              const summary = operationalSummary(row);
              return (
                <tr key={row.id} style={{ borderBottom: "1px solid #e5e7eb", verticalAlign: "top" }}>
                  <td style={{ padding: "9px 12px", whiteSpace: "nowrap", color: "#334155" }}>{new Date(row.createdAt).toLocaleString(language === "en" ? "en-CA" : "fr-CA", { dateStyle: "short", timeStyle: "short" })}</td>
                  <td style={{ padding: "9px 12px" }}><div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}><span style={{ fontSize: 15, color: "#334155" }}>{row.actor.displayName === "System" ? "▣" : "⚙"}</span><div><div style={{ fontWeight: 600 }}>{row.actor.displayName || "—"}</div>{row.actor.roleHint ? <div style={{ fontSize: 10, color: "#64748b" }}>{row.actor.roleHint}</div> : null}</div></div></td>
                  <td style={{ padding: "9px 12px" }}><div style={{ fontWeight: 700 }}>{auditActionLabel(t, row.action, row.entity, row.metadataSummary)}</div><span style={{ display: "inline-block", marginTop: 4, padding: "1px 7px", borderRadius: 999, border: `1px solid ${badge.border}`, background: badge.bg, color: badge.text, fontSize: 10, fontWeight: 700 }}>{badge.label}</span></td>
                  <td style={{ padding: "9px 12px" }}><div style={{ fontWeight: 700 }}>{auditEntityLabel(t, row.entity)}</div><div style={{ fontSize: 9, color: "#64748b", fontFamily: "monospace" }}>{row.entity}</div>{row.entityId ? <div style={{ fontSize: 9, color: "#64748b", fontFamily: "monospace", wordBreak: "break-all", marginTop: 2 }}>{row.entityId}</div> : null}</td>
                  <td style={{ padding: "9px 12px" }}><div style={{ fontWeight: 700 }}>{context.title}</div><div style={{ fontSize: 10, color: "#64748b" }}>{row.encounterId ?? context.detail}</div></td>
                  <td style={{ padding: "9px 12px" }}><div style={{ fontWeight: 700 }}>{summary.title}</div><div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>{summary.detail}</div></td>
                  <td style={{ padding: "9px 12px" }}>
                    <details>
                      <summary style={{ cursor: "pointer", listStyle: "none", border: "1px solid #94a3b8", borderRadius: 5, padding: "5px 8px", fontWeight: 700, textAlign: "center", whiteSpace: "nowrap" }}>▶ View details</summary>
                      <div style={{ marginTop: 7, padding: 8, minWidth: 250, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 5, fontSize: 10, lineHeight: 1.55 }}>
                        <div><strong>Audit ID:</strong> <span style={{ fontFamily: "monospace" }}>{row.id}</span></div>
                        <div><strong>Raw action:</strong> <span style={{ fontFamily: "monospace" }}>{row.action}</span></div>
                        <div><strong>Raw entity:</strong> <span style={{ fontFamily: "monospace" }}>{row.entity}</span></div>
                        {row.encounterId ? <div><strong>Encounter:</strong> <span style={{ fontFamily: "monospace" }}>{row.encounterId}</span></div> : null}
                        {Object.entries(row.metadataSummary).map(([key, value]) => <div key={key}><strong>{key}:</strong> <span style={{ fontFamily: "monospace", wordBreak: "break-all" }}>{String(value)}</span></div>)}
                      </div>
                    </details>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && !loading ? <tr><td colSpan={7} style={{ padding: 22, color: "#64748b", textAlign: "center" }}>{t("adminAudit.empty")}</td></tr> : null}
            {loading ? <tr><td colSpan={7} style={{ padding: 22, color: "#64748b", textAlign: "center" }}>{t("adminAudit.loading")}</td></tr> : null}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", fontSize: 12, color: "#475569" }}>
        <div>Showing {shownStart}–{shownEnd} of {stats.totalCount} events</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span>Events per page:</span>
            <select value={pageSize} onChange={(e) => { const next = Number(e.target.value); setPageSize(next); setPage(1); void loadPage(1, next); }} style={{ padding: "6px 28px 6px 9px", border: "1px solid #94a3b8", borderRadius: 5, background: "#fff", fontWeight: 700 }}>
              {PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>
          <button type="button" disabled={page <= 1 || loading} onClick={() => void loadPage(page - 1, pageSize)} style={{ width: 32, height: 32, borderRadius: 5, border: "1px solid #cbd5e1", background: "#fff", cursor: page <= 1 ? "not-allowed" : "pointer" }}>‹</button>
          {pageTokens.map((token, index) => token === "ellipsis" ? <span key={`e-${index}`} style={{ padding: "0 2px" }}>…</span> : <button key={token} type="button" disabled={loading} onClick={() => void loadPage(token, pageSize)} style={{ minWidth: 32, height: 32, padding: "0 8px", borderRadius: 5, border: token === page ? "1px solid #2563eb" : "1px solid #cbd5e1", background: token === page ? "#2563eb" : "#fff", color: token === page ? "#fff" : "#334155", fontWeight: token === page ? 800 : 600, cursor: "pointer" }}>{token}</button>)}
          <button type="button" disabled={page >= totalPages || loading} onClick={() => void loadPage(page + 1, pageSize)} style={{ width: 32, height: 32, borderRadius: 5, border: "1px solid #cbd5e1", background: "#fff", cursor: page >= totalPages ? "not-allowed" : "pointer" }}>›</button>
        </div>
      </div>
    </div>
  );
}
