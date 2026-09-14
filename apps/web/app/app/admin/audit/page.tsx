"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import {
  fetchAdminAuditEvents,
  type AdminAuditEventRow,
  type AdminAuditEventsQuery,
  type AdminAuditPreset,
} from "@/lib/adminAuditApi";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import {
  auditActionLabel,
  auditCategoryLabel,
  auditEntityLabel,
  auditMetadataSummaryEntries,
  auditSummaryEmptyText,
  getAuditActorRoleLabel,
  getAuditSourceLabel,
} from "@/lib/auditDisplayLabels";

function formatSummary(
  t: (key: string) => string,
  meta: Record<string, string | number | boolean>
): string {
  const entries = auditMetadataSummaryEntries(meta);
  if (entries.length === 0) return auditSummaryEmptyText(t);
  return entries
    .map(([k, v]) => `${k}=${typeof v === "string" ? v : String(v)}`)
    .join(" · ");
}

function highlightTagLabel(t: (key: string) => string, tag: string): string {
  const key = `adminAudit.tag.${tag}`;
  const out = t(key);
  return out === key ? tag : out;
}

function auditActorContextBlock(
  t: (key: string) => string,
  meta: Record<string, string | number | boolean>
) {
  const ar = meta.actorRole;
  const src = meta.source;
  const hasAr = ar !== undefined && ar !== null && String(ar).trim() !== "";
  const hasSrc = src !== undefined && src !== null && String(src).trim() !== "";
  if (!hasAr && !hasSrc) return null;
  return (
    <div style={{ marginTop: 6, fontSize: 11, color: "#64748b", lineHeight: 1.45 }}>
      {hasAr ? (
        <div>
          {t("audit.context.actorRole")}: {getAuditActorRoleLabel(String(ar), t)}
        </div>
      ) : null}
      {hasSrc ? (
        <div>
          {t("audit.context.source")}: {getAuditSourceLabel(String(src), t)}
        </div>
      ) : null}
    </div>
  );
}

function defaultDateRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to.getTime() - 7 * 86400_000);
  const isoDay = (d: Date) => d.toISOString().slice(0, 10);
  return { from: isoDay(from), to: isoDay(to) };
}

function presetLabel(t: (key: string) => string, preset: AdminAuditPreset): string {
  const key = `adminAudit.preset.${preset}`;
  const translated = t(key);
  if (translated !== key && !/^(Unavailable|Indisponible|No disponible)$/i.test(translated.trim())) return translated;
  if (preset === "security_interop") return "Security & interoperability";
  return preset.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function contextForRow(row: AdminAuditEventRow): { title: string; value: string } {
  if (row.encounterId) return { title: "Encounter", value: row.encounterId };
  if (row.entity === "FHIR_INTEGRATION_CLIENT" || row.entity === "FHIR_INTEGRATION_ACCESS") {
    return { title: "Facility / integration", value: "Non-encounter interoperability event" };
  }
  if (row.facilityId) return { title: "Facility", value: "Facility-level event" };
  return { title: "System", value: "System-level event" };
}

function csvEscape(value: unknown): string {
  const s = value == null ? "" : String(value);
  return `"${s.replaceAll('"', '""')}"`;
}

const PRESETS: AdminAuditPreset[] = [
  "critical_events",
  "security_interop",
  "clinical_actions",
  "billing_exports",
  "access_views",
  "overrides",
];

const CATEGORY_ORDER = ["critical", "security", "clinical", "billing", "access", "override", "other"] as const;

export default function AdminAuditPage() {
  const { t, language } = useI18n();
  const { ready, facilityId } = useFacilityAndRoles();
  const [range, setRange] = useState(defaultDateRange);
  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("");
  const [encounterId, setEncounterId] = useState("");
  const [preset, setPreset] = useState<AdminAuditPreset | "">("");
  const [items, setItems] = useState<AdminAuditEventRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPage = useCallback(
    async (cursor: string | undefined, append: boolean) => {
      if (!facilityId) {
        setError(t("adminAudit.errorFacility"));
        return;
      }
      setLoading(true);
      setError(null);
      const q: AdminAuditEventsQuery = {
        from: `${range.from}T00:00:00.000Z`,
        to: `${range.to}T23:59:59.999Z`,
        limit: 50,
        ...(preset ? { preset } : {}),
        ...(!preset && action.trim() ? { action: action.trim() } : {}),
        ...(!preset && entity.trim() ? { entity: entity.trim() } : {}),
        ...(encounterId.trim() ? { encounterId: encounterId.trim() } : {}),
        ...(cursor ? { cursor } : {}),
      };
      try {
        const res = await fetchAdminAuditEvents(facilityId, q);
        setItems((prev) => (append ? [...prev, ...res.events] : res.events));
        setNextCursor(res.nextCursor);
      } catch (e: unknown) {
        const raw = e instanceof Error ? e.message : "";
        setError(normalizeUserFacingError(raw, language) || t("adminAudit.errorLoad"));
        if (!append) setItems([]);
        setNextCursor(null);
      } finally {
        setLoading(false);
      }
    },
    [facilityId, range.from, range.to, action, entity, encounterId, preset, language, t]
  );

  useEffect(() => {
    if (!ready || !facilityId) return;
    void loadPage(undefined, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- filter changes require « Actualiser »
  }, [ready, facilityId]);

  const hasHighlight = (row: AdminAuditEventRow) => row.highlightTags.length > 0;

  const grouped = useMemo(() => {
    const buckets = new Map<string, AdminAuditEventRow[]>();
    for (const cat of CATEGORY_ORDER) buckets.set(cat, []);
    for (const row of items) {
      const raw = row.auditCategory ?? "other";
      const cat = buckets.has(raw) ? raw : "other";
      buckets.get(cat)!.push(row);
    }
    return CATEGORY_ORDER.map((cat) => ({ cat, rows: buckets.get(cat) ?? [] })).filter((g) => g.rows.length > 0);
  }, [items]);

  const metrics = useMemo(() => {
    const security = items.filter((x) => x.auditCategory === "security").length;
    const encounterLinked = items.filter((x) => Boolean(x.encounterId)).length;
    return {
      total: items.length,
      security,
      encounterLinked,
      nonEncounter: items.length - encounterLinked,
    };
  }, [items]);

  const exportCsv = () => {
    const header = ["Time", "Actor", "Action", "Entity", "Entity ID", "Context", "Summary"];
    const rows = items.map((row) => {
      const context = contextForRow(row);
      return [
        row.createdAt,
        row.actor.displayName,
        auditActionLabel(t, row.action, row.entity, row.metadataSummary),
        row.entity,
        row.entityId ?? "",
        `${context.title}: ${context.value}`,
        formatSummary(t, row.metadataSummary),
      ];
    });
    const csv = [header, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `medora-audit-${range.from}-${range.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: 24, maxWidth: 1500 }}>
      <p style={{ marginTop: 0 }}>
        <Link href="/app/admin" style={{ color: "#1a1a1a" }}>
          {t("adminAudit.backAdmin")}
        </Link>
        {" · "}
        <Link href="/app/reports" style={{ color: "#1a1a1a" }}>
          {t("adminAudit.linkOpsReports")}
        </Link>
      </p>
      <h1 style={{ marginTop: 8 }}>{t("adminAudit.title")}</h1>
      <p style={{ color: "#555", maxWidth: 860 }}>
        {t("adminAudit.intro")} Non-encounter events are explicitly labeled as facility, integration, or system context.
      </p>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10, margin: "16px 0" }}>
        {[
          ["Events loaded", metrics.total],
          ["Security / interoperability", metrics.security],
          ["Encounter-linked", metrics.encounterLinked],
          ["Facility / system level", metrics.nonEncounter],
        ].map(([label, value]) => (
          <div key={String(label)} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 12, background: "#fff" }}>
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700 }}>{label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{value}</div>
          </div>
        ))}
      </section>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 8 }}>
          {t("adminAudit.presetHeading")}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button
            type="button"
            onClick={() => setPreset("")}
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              border: preset === "" ? "2px solid #0f172a" : "1px solid #cbd5e1",
              background: preset === "" ? "#f1f5f9" : "#fff",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {t("adminAudit.presetAll")}
          </button>
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setPreset(p);
                setAction("");
                setEntity("");
              }}
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                border: preset === p ? "2px solid #0f172a" : "1px solid #cbd5e1",
                background: preset === p ? "#f1f5f9" : "#fff",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {presetLabel(t, p)}
            </button>
          ))}
        </div>
        {preset ? <p style={{ fontSize: 12, color: "#64748b", marginTop: 8 }}>{t("adminAudit.presetHint")}</p> : null}
      </div>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 12,
          marginBottom: 16,
          alignItems: "end",
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
          <span>{t("adminAudit.filterFrom")}</span>
          <input type="date" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc" }} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
          <span>{t("adminAudit.filterTo")}</span>
          <input type="date" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc" }} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, opacity: preset ? 0.45 : 1 }}>
          <span>{t("adminAudit.filterAction")}</span>
          <input value={action} onChange={(e) => setAction(e.target.value)} disabled={Boolean(preset)} placeholder={t("adminAudit.placeholderAction")} list="admin-audit-actions" style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc" }} />
          <datalist id="admin-audit-actions">
            <option value="ENCOUNTER_CLOSE" /><option value="ENCOUNTER_VIEW" /><option value="ORDER_VIEW" /><option value="ORDER_CREATE" /><option value="TRIAGE_SAVE" /><option value="VIEW" /><option value="CREATE" /><option value="UPDATE" /><option value="DELETE" /><option value="ENCOUNTER_UPDATE" /><option value="LOGIN" /><option value="LOGOUT" />
          </datalist>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, opacity: preset ? 0.45 : 1 }}>
          <span>{t("adminAudit.filterEntity")}</span>
          <input value={entity} onChange={(e) => setEntity(e.target.value)} disabled={Boolean(preset)} placeholder={t("adminAudit.placeholderEntity")} list="admin-audit-entities" style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc" }} />
          <datalist id="admin-audit-entities">
            <option value="FHIR_INTEGRATION_CLIENT" /><option value="FHIR_INTEGRATION_ACCESS" /><option value="EXTERNAL_BILLING_EXPORT" /><option value="EXTERNAL_BILLING_AUTO_EXPORT" /><option value="ED_REPORT_EXPORT" /><option value="ENCOUNTER" /><option value="ORDER" /><option value="TRIAGE" /><option value="DIAGNOSIS" /><option value="MEDICATION_ADMINISTRATION" />
          </datalist>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, gridColumn: "span 2" }}>
          <span>{t("adminAudit.filterEncounterId")}</span>
          <input value={encounterId} onChange={(e) => setEncounterId(e.target.value)} placeholder="uuid" style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc", fontFamily: "monospace", fontSize: 12 }} />
        </label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" disabled={loading || !facilityId} onClick={() => void loadPage(undefined, false)} style={{ padding: "10px 16px", borderRadius: 6, border: "none", background: "#1a1a1a", color: "#fff", fontWeight: 600, cursor: loading ? "wait" : "pointer" }}>
            {t("adminAudit.apply")}
          </button>
          <button type="button" disabled={items.length === 0} onClick={exportCsv} style={{ padding: "10px 16px", borderRadius: 6, border: "1px solid #334155", background: "#fff", color: "#0f172a", fontWeight: 600, cursor: items.length === 0 ? "not-allowed" : "pointer" }}>
            Export evidence CSV
          </button>
        </div>
      </section>

      {error ? <p style={{ color: "#b71c1c" }}>{error}</p> : null}

      <div style={{ overflowX: "auto", border: "1px solid #e0e0e0", borderRadius: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#fafafa", borderBottom: "1px solid #e0e0e0", textAlign: "left" }}>
              <th style={{ padding: 10, whiteSpace: "nowrap" }}>{t("adminAudit.colTime")}</th>
              <th style={{ padding: 10 }}>{t("adminAudit.colActor")}</th>
              <th style={{ padding: 10 }}>{t("adminAudit.colAction")}</th>
              <th style={{ padding: 10 }}>{t("adminAudit.colEntity")}</th>
              <th style={{ padding: 10 }}>Context</th>
              <th style={{ padding: 10 }}>{t("adminAudit.colSummary")}</th>
            </tr>
          </thead>
          <tbody>
            {grouped.map(({ cat, rows }) => (
              <Fragment key={cat}>
                <tr style={{ background: cat === "security" ? "#f0f9ff" : "#f8fafc" }}>
                  <td colSpan={6} style={{ padding: "8px 10px", fontWeight: 800, fontSize: 12, color: "#0f172a" }}>
                    {cat === "security" ? "Security & interoperability" : auditCategoryLabel(t, cat)}
                  </td>
                </tr>
                {rows.map((row) => {
                  const context = contextForRow(row);
                  return (
                    <tr key={row.id} style={{ borderBottom: "1px solid #eee", background: hasHighlight(row) ? "rgba(153,27,27,0.06)" : undefined }}>
                      <td style={{ padding: 10, whiteSpace: "nowrap", verticalAlign: "top" }}>
                        {new Date(row.createdAt).toLocaleString(language === "en" ? "en-CA" : "fr-CA", { dateStyle: "short", timeStyle: "short" })}
                      </td>
                      <td style={{ padding: 10, verticalAlign: "top" }}>
                        <div>{row.actor.displayName || "—"}</div>
                        {row.actor.roleHint ? <div style={{ fontSize: 11, color: "#666" }}>{row.actor.roleHint}</div> : null}
                      </td>
                      <td style={{ padding: 10, verticalAlign: "top" }}>
                        <div style={{ fontWeight: 600 }}>{auditActionLabel(t, row.action, row.entity, row.metadataSummary)}</div>
                        <div style={{ fontSize: 10, color: "#94a3b8", fontFamily: "monospace" }}>{row.action}</div>
                        {auditActorContextBlock(t, row.metadataSummary)}
                      </td>
                      <td style={{ padding: 10, verticalAlign: "top" }}>
                        <div style={{ fontWeight: 600 }}>{auditEntityLabel(t, row.entity)}</div>
                        <div style={{ fontSize: 10, color: "#94a3b8", fontFamily: "monospace" }}>{row.entity}</div>
                        {row.entityId ? <div style={{ fontSize: 10, color: "#64748b", wordBreak: "break-all", fontFamily: "monospace" }}>{row.entityId}</div> : null}
                      </td>
                      <td style={{ padding: 10, verticalAlign: "top", minWidth: 180 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#334155" }}>{context.title}</div>
                        <div style={{ marginTop: 3, fontSize: 11, color: "#475569", fontFamily: row.encounterId ? "monospace" : undefined, wordBreak: "break-all" }}>{context.value}</div>
                      </td>
                      <td style={{ padding: 10, verticalAlign: "top", color: "#333", maxWidth: 480 }}>
                        {hasHighlight(row) ? <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4, color: "#7f1d1d" }}>{row.highlightTags.map((tag) => highlightTagLabel(t, tag)).join(" · ")}</div> : null}
                        <div style={{ wordBreak: "break-word" }}>{formatSummary(t, row.metadataSummary)}</div>
                        <details style={{ marginTop: 6 }}>
                          <summary style={{ cursor: "pointer", fontSize: 11, fontWeight: 700, color: "#334155" }}>Evidence details</summary>
                          <div style={{ marginTop: 6, fontSize: 11, lineHeight: 1.5 }}>
                            <div><strong>Audit ID:</strong> <span style={{ fontFamily: "monospace" }}>{row.id}</span></div>
                            <div><strong>Category:</strong> {row.auditCategory ?? "other"}</div>
                            <div><strong>Raw action:</strong> <span style={{ fontFamily: "monospace" }}>{row.action}</span></div>
                            <div><strong>Raw entity:</strong> <span style={{ fontFamily: "monospace" }}>{row.entity}</span></div>
                          </div>
                        </details>
                      </td>
                    </tr>
                  );
                })}
              </Fragment>
            ))}
            {items.length === 0 && !loading ? (
              <tr><td colSpan={6} style={{ padding: 16, color: "#666" }}>{t("adminAudit.empty")}</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 12, alignItems: "center" }}>
        {nextCursor ? (
          <button type="button" disabled={loading} onClick={() => void loadPage(nextCursor, true)} style={{ padding: "8px 14px", borderRadius: 6, border: "1px solid #1a1a1a", background: "#fff", cursor: loading ? "wait" : "pointer" }}>
            {t("adminAudit.loadMore")}
          </button>
        ) : null}
        {loading ? <span style={{ color: "#666", fontSize: 13 }}>{t("adminAudit.loading")}</span> : null}
      </div>
    </div>
  );
}
