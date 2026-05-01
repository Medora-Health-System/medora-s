"use client";

import React, { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { useI18n } from "@/lib/i18n";
import { formatEncounterChromeDateTime } from "@/lib/encounterChromeI18n";

type IvActiveRow = {
  insertionEventId: string;
  site: string;
  gauge: string;
  insertedAt: string;
  recordedByDisplayName: string | null;
  notes: string | null;
};

type IvRemovedRow = {
  removalEventId: string;
  insertionEventId: string;
  site: string;
  gauge: string;
  insertedAt: string;
  insertedByDisplayName?: string | null;
  insertionNotes?: string | null;
  removedAt: string;
  removedByDisplayName?: string | null;
  removalReason?: string | null;
  removalNotes?: string | null;
  reason: string | null;
  notes: string | null;
  recordedByDisplayName: string | null;
};

function fillTpl(s: string, vars: Record<string, string>): string {
  let out = s;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{${k}}`).join(v);
  }
  return out;
}

function parseIvPayload(raw: unknown): { active: IvActiveRow[]; removed: IvRemovedRow[] } | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const a = o.active;
  const r = o.removed;
  if (!Array.isArray(a) || !Array.isArray(r)) return null;
  const active: IvActiveRow[] = [];
  for (const row of a) {
    if (!row || typeof row !== "object") continue;
    const x = row as Record<string, unknown>;
    const id = typeof x.insertionEventId === "string" ? x.insertionEventId : "";
    if (!id) continue;
    active.push({
      insertionEventId: id,
      site: typeof x.site === "string" ? x.site : "",
      gauge: typeof x.gauge === "string" ? x.gauge : "",
      insertedAt: typeof x.insertedAt === "string" ? x.insertedAt : "",
      recordedByDisplayName: typeof x.recordedByDisplayName === "string" ? x.recordedByDisplayName : null,
      notes: typeof x.notes === "string" ? x.notes : null,
    });
  }
  const removed: IvRemovedRow[] = [];
  for (const row of r) {
    if (!row || typeof row !== "object") continue;
    const x = row as Record<string, unknown>;
    const rid = typeof x.removalEventId === "string" ? x.removalEventId : "";
    if (!rid) continue;
    const removalReason =
      typeof x.removalReason === "string"
        ? x.removalReason
        : typeof x.reason === "string"
          ? x.reason
          : null;
    const removalNotes =
      typeof x.removalNotes === "string"
        ? x.removalNotes
        : typeof x.notes === "string"
          ? x.notes
          : null;
    const removedBy =
      typeof x.removedByDisplayName === "string"
        ? x.removedByDisplayName
        : typeof x.recordedByDisplayName === "string"
          ? x.recordedByDisplayName
          : null;
    removed.push({
      removalEventId: rid,
      insertionEventId: typeof x.insertionEventId === "string" ? x.insertionEventId : "",
      site: typeof x.site === "string" ? x.site : "",
      gauge: typeof x.gauge === "string" ? x.gauge : "",
      insertedAt: typeof x.insertedAt === "string" ? x.insertedAt : "",
      insertedByDisplayName:
        typeof x.insertedByDisplayName === "string" ? x.insertedByDisplayName : null,
      insertionNotes: typeof x.insertionNotes === "string" ? x.insertionNotes : null,
      removedAt: typeof x.removedAt === "string" ? x.removedAt : "",
      removedByDisplayName: removedBy,
      removalReason,
      removalNotes,
      reason: removalReason,
      notes: removalNotes,
      recordedByDisplayName: removedBy,
    });
  }
  return { active, removed };
}

/**
 * Compact IV summary for ER visit summary — loads only when mounted; refetch via refreshToken (e.g. after IV modal save).
 */
export function ErIvAccessSummaryCard({
  encounterId,
  facilityId,
  refreshToken,
  enabled,
}: {
  encounterId: string;
  facilityId: string;
  refreshToken: number;
  /** When false, skip network (e.g. roles without GET /iv-access). */
  enabled: boolean;
}) {
  const { t, language } = useI18n();
  const [state, setState] = useState<{
    loading: boolean;
    error: boolean;
    active: IvActiveRow[];
    removed: IvRemovedRow[];
  }>({ loading: false, error: false, active: [], removed: [] });

  useEffect(() => {
    if (!enabled || !encounterId || !facilityId) {
      setState({ loading: false, error: false, active: [], removed: [] });
      return;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: false }));
    void (async () => {
      try {
        const data = await apiFetch(`/encounters/${encounterId}/iv-access`, { facilityId });
        if (cancelled) return;
        const parsed = parseIvPayload(data);
        if (!parsed) {
          setState({ loading: false, error: true, active: [], removed: [] });
          return;
        }
        setState({ loading: false, error: false, active: parsed.active, removed: parsed.removed });
      } catch {
        if (!cancelled) {
          setState({ loading: false, error: true, active: [], removed: [] });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [encounterId, facilityId, refreshToken, enabled]);

  if (!enabled) return null;

  if (state.loading) {
    return (
      <div
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          backgroundColor: "#ffffff",
          padding: "12px 14px",
        }}
      >
        <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>{t("common.loading")}</p>
      </div>
    );
  }

  if (state.error) {
    return (
      <div
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          backgroundColor: "#fffbeb",
          padding: "12px 14px",
        }}
      >
        <p style={{ margin: 0, fontSize: 12, color: "#92400e", fontWeight: 600 }}>{t("erIvAccess.loadError")}</p>
      </div>
    );
  }

  if (state.active.length === 0 && state.removed.length === 0) {
    return null;
  }

  const sub: React.CSSProperties = {
    margin: "6px 0 0 0",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.07em",
    textTransform: "uppercase",
    color: "#64748b",
  };

  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        backgroundColor: "#ffffff",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "12px 14px 10px", borderBottom: "1px solid #f1f5f9" }}>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#64748b" }}>
          {t("erIvAccess.summaryTitle")}
        </p>
      </div>
      <div style={{ padding: "10px 14px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
        {state.active.length > 0 ? (
          <div>
            <p style={sub}>{t("erIvAccess.summaryActive")}</p>
            <ul style={{ margin: "4px 0 0 0", paddingLeft: 16, fontSize: 12, color: "#334155" }}>
              {state.active.map((row) => (
                <li key={row.insertionEventId} style={{ marginBottom: 4 }}>
                  {fillTpl(t("erIvAccess.activeLine"), {
                    gauge: row.gauge.trim(),
                    site: row.site.trim(),
                    by: (row.recordedByDisplayName ?? "").trim() || "—",
                    time: formatEncounterChromeDateTime(row.insertedAt, language),
                  })}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {state.removed.length > 0 ? (
          <div>
            <p style={sub}>{t("erIvAccess.summaryRemoved")}</p>
            <ul style={{ margin: "4px 0 0 0", paddingLeft: 16, fontSize: 12, color: "#64748b" }}>
              {state.removed.slice(0, 8).map((row) => {
                const insertedBy = (row.insertedByDisplayName ?? "").trim() || "—";
                const removedBy = (row.removedByDisplayName ?? row.recordedByDisplayName ?? "").trim() || "—";
                const meta = [row.removalReason, row.insertionNotes, row.removalNotes]
                  .filter((x): x is string => Boolean(x && String(x).trim()))
                  .join(" · ");
                return (
                  <li key={row.removalEventId} style={{ marginBottom: 6 }}>
                    <div style={{ color: "#334155", fontWeight: 600 }}>
                      {fillTpl(t("erIvAccess.removedLifecycleLine"), {
                        gauge: row.gauge.trim(),
                        site: row.site.trim(),
                        insertedBy,
                        insertedTime: formatEncounterChromeDateTime(row.insertedAt, language),
                        removedBy,
                        removedTime: formatEncounterChromeDateTime(row.removedAt, language),
                      })}
                    </div>
                    {meta ? (
                      <p style={{ margin: "3px 0 0 0", fontSize: 11, color: "#94a3b8", fontWeight: 400 }}>{meta}</p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
