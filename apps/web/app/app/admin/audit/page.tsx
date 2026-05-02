"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import {
  fetchAdminAuditEvents,
  type AdminAuditEventRow,
  type AdminAuditEventsQuery,
} from "@/lib/adminAuditApi";
import { normalizeUserFacingError } from "@/lib/userFacingError";

function formatSummary(meta: Record<string, string | number | boolean>): string {
  const entries = Object.entries(meta);
  if (entries.length === 0) return "—";
  return entries
    .map(([k, v]) => `${k}=${typeof v === "string" ? v : String(v)}`)
    .join(" · ");
}

function highlightTagLabel(t: (key: string) => string, tag: string): string {
  const key = `adminAudit.tag.${tag}`;
  const out = t(key);
  return out === key ? tag : out;
}

function defaultDateRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to.getTime() - 7 * 86400_000);
  const isoDay = (d: Date) => d.toISOString().slice(0, 10);
  return { from: isoDay(from), to: isoDay(to) };
}

export default function AdminAuditPage() {
  const { t, language } = useI18n();
  const { ready, facilityId } = useFacilityAndRoles();
  const [range, setRange] = useState(defaultDateRange);
  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("");
  const [encounterId, setEncounterId] = useState("");
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
        ...(action.trim() ? { action: action.trim() } : {}),
        ...(entity.trim() ? { entity: entity.trim() } : {}),
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
    [facilityId, range.from, range.to, action, entity, encounterId, language, t]
  );

  useEffect(() => {
    if (!ready || !facilityId) return;
    void loadPage(undefined, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- filter changes require « Actualiser »
  }, [ready, facilityId]);

  const hasHighlight = (row: AdminAuditEventRow) => row.highlightTags.length > 0;

  return (
    <div style={{ padding: 24, maxWidth: 1400 }}>
      <p style={{ marginTop: 0 }}>
        <Link href="/app/admin" style={{ color: "#1a1a1a" }}>
          {t("adminAudit.backAdmin")}
        </Link>
      </p>
      <h1 style={{ marginTop: 8 }}>{t("adminAudit.title")}</h1>
      <p style={{ color: "#555", maxWidth: 720 }}>{t("adminAudit.intro")}</p>

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
          <input
            type="date"
            value={range.from}
            onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
            style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
          <span>{t("adminAudit.filterTo")}</span>
          <input
            type="date"
            value={range.to}
            onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
            style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
          <span>{t("adminAudit.filterAction")}</span>
          <input
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder={t("adminAudit.placeholderAction")}
            list="admin-audit-actions"
            style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
          />
          <datalist id="admin-audit-actions">
            <option value="ENCOUNTER_CLOSE" />
            <option value="ORDER_CREATE" />
            <option value="VIEW" />
            <option value="ENCOUNTER_UPDATE" />
            <option value="LOGIN" />
            <option value="LOGOUT" />
          </datalist>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
          <span>{t("adminAudit.filterEntity")}</span>
          <input
            value={entity}
            onChange={(e) => setEntity(e.target.value)}
            placeholder={t("adminAudit.placeholderEntity")}
            list="admin-audit-entities"
            style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
          />
          <datalist id="admin-audit-entities">
            <option value="EXTERNAL_BILLING_EXPORT" />
            <option value="EXTERNAL_BILLING_AUTO_EXPORT" />
            <option value="ENCOUNTER" />
            <option value="ORDER" />
          </datalist>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, gridColumn: "span 2" }}>
          <span>{t("adminAudit.filterEncounterId")}</span>
          <input
            value={encounterId}
            onChange={(e) => setEncounterId(e.target.value)}
            placeholder="uuid"
            style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc", fontFamily: "monospace", fontSize: 12 }}
          />
        </label>
        <div>
          <button
            type="button"
            disabled={loading || !facilityId}
            onClick={() => void loadPage(undefined, false)}
            style={{
              padding: "10px 16px",
              borderRadius: 6,
              border: "none",
              background: "#1a1a1a",
              color: "#fff",
              fontWeight: 600,
              cursor: loading ? "wait" : "pointer",
            }}
          >
            {t("adminAudit.apply")}
          </button>
        </div>
      </section>

      {error ? (
        <p style={{ color: "#b71c1c" }}>{error}</p>
      ) : null}

      <div style={{ overflowX: "auto", border: "1px solid #e0e0e0", borderRadius: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#fafafa", borderBottom: "1px solid #e0e0e0", textAlign: "left" }}>
              <th style={{ padding: 10, whiteSpace: "nowrap" }}>{t("adminAudit.colTime")}</th>
              <th style={{ padding: 10 }}>{t("adminAudit.colActor")}</th>
              <th style={{ padding: 10 }}>{t("adminAudit.colAction")}</th>
              <th style={{ padding: 10 }}>{t("adminAudit.colEntity")}</th>
              <th style={{ padding: 10 }}>{t("adminAudit.colEncounter")}</th>
              <th style={{ padding: 10 }}>{t("adminAudit.colSummary")}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr
                key={row.id}
                style={{
                  borderBottom: "1px solid #eee",
                  background: hasHighlight(row) ? "rgba(153,27,27,0.06)" : undefined,
                }}
              >
                <td style={{ padding: 10, whiteSpace: "nowrap", verticalAlign: "top" }}>
                  {new Date(row.createdAt).toLocaleString(language === "en" ? "en-CA" : "fr-CA", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </td>
                <td style={{ padding: 10, verticalAlign: "top" }}>
                  <div>{row.actor.displayName || "—"}</div>
                  {row.actor.roleHint ? (
                    <div style={{ fontSize: 11, color: "#666" }}>{row.actor.roleHint}</div>
                  ) : null}
                </td>
                <td style={{ padding: 10, verticalAlign: "top", fontFamily: "monospace", fontSize: 12 }}>
                  {row.action}
                </td>
                <td style={{ padding: 10, verticalAlign: "top", fontFamily: "monospace", fontSize: 12 }}>
                  <div>{row.entity}</div>
                  {row.entityId ? (
                    <div style={{ fontSize: 11, color: "#666", wordBreak: "break-all" }}>{row.entityId}</div>
                  ) : null}
                </td>
                <td style={{ padding: 10, verticalAlign: "top", fontFamily: "monospace", fontSize: 11, wordBreak: "break-all" }}>
                  {row.encounterId ?? "—"}
                </td>
                <td style={{ padding: 10, verticalAlign: "top", color: "#333", maxWidth: 420 }}>
                  {hasHighlight(row) ? (
                    <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4, color: "#7f1d1d" }}>
                      {row.highlightTags.map((tag) => highlightTagLabel(t, tag)).join(" · ")}
                    </div>
                  ) : null}
                  <span style={{ wordBreak: "break-word" }}>{formatSummary(row.metadataSummary)}</span>
                </td>
              </tr>
            ))}
            {items.length === 0 && !loading ? (
              <tr>
                <td colSpan={6} style={{ padding: 16, color: "#666" }}>
                  {t("adminAudit.empty")}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 12, alignItems: "center" }}>
        {nextCursor ? (
          <button
            type="button"
            disabled={loading}
            onClick={() => void loadPage(nextCursor, true)}
            style={{
              padding: "8px 14px",
              borderRadius: 6,
              border: "1px solid #1a1a1a",
              background: "#fff",
              cursor: loading ? "wait" : "pointer",
            }}
          >
            {t("adminAudit.loadMore")}
          </button>
        ) : null}
        {loading ? <span style={{ color: "#666", fontSize: 13 }}>{t("adminAudit.loading")}</span> : null}
      </div>
    </div>
  );
}
