"use client";

import React, { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { useI18n } from "@/lib/i18n";
import { formatEncounterChromeDateTime } from "@/lib/encounterChromeI18n";

type ProcedureEntry = {
  id: string;
  createdAt: string;
  procedureType: string;
  site: string;
  performedAt: string | null;
  performerDisplayName: string | null;
};

function fillTpl(s: string, vars: Record<string, string>): string {
  let out = s;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{${k}}`).join(v);
  }
  return out;
}

function parseProceduresPayload(raw: unknown): ProcedureEntry[] | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const arr = o.entries;
  if (!Array.isArray(arr)) return null;
  const out: ProcedureEntry[] = [];
  for (const row of arr) {
    if (!row || typeof row !== "object") continue;
    const x = row as Record<string, unknown>;
    const id = typeof x.id === "string" ? x.id : "";
    if (!id) continue;
    out.push({
      id,
      createdAt: typeof x.createdAt === "string" ? x.createdAt : "",
      procedureType: typeof x.procedureType === "string" ? x.procedureType : "",
      site: typeof x.site === "string" ? x.site : "",
      performedAt: typeof x.performedAt === "string" && x.performedAt.trim() ? x.performedAt.trim() : null,
      performerDisplayName: typeof x.performerDisplayName === "string" ? x.performerDisplayName : null,
    });
  }
  return out;
}

function procedureDisplayName(t: (k: string) => string, procedureType: string): string {
  if (procedureType === "LACERATION_REPAIR") return t("erProcedureLauncher.procedureNames.lacerationRepair");
  return procedureType || "—";
}

/**
 * Compact documented procedures for ER visit summary (S14A).
 */
export function ErProceduresSummaryCard({
  encounterId,
  facilityId,
  refreshToken,
  enabled,
}: {
  encounterId: string;
  facilityId: string;
  refreshToken: number;
  enabled: boolean;
}) {
  const { t, language } = useI18n();
  const [state, setState] = useState<{
    loading: boolean;
    error: boolean;
    entries: ProcedureEntry[];
  }>({ loading: false, error: false, entries: [] });

  useEffect(() => {
    if (!enabled || !encounterId || !facilityId) {
      setState({ loading: false, error: false, entries: [] });
      return;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: false }));
    void (async () => {
      try {
        const data = await apiFetch(`/encounters/${encounterId}/procedures`, { facilityId });
        if (cancelled) return;
        const parsed = parseProceduresPayload(data);
        if (!parsed) {
          setState({ loading: false, error: true, entries: [] });
          return;
        }
        setState({ loading: false, error: false, entries: parsed });
      } catch {
        if (!cancelled) {
          setState({ loading: false, error: true, entries: [] });
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
        <p style={{ margin: 0, fontSize: 12, color: "#92400e", fontWeight: 600 }}>
          {t("erProcedureLauncher.summaryLoadError")}
        </p>
      </div>
    );
  }

  if (state.entries.length === 0) return null;

  const sub: React.CSSProperties = {
    margin: "0 0 6px 0",
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
        <p
          style={{
            margin: 0,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            color: "#64748b",
          }}
        >
          {t("erProcedureLauncher.summaryTitle")}
        </p>
      </div>
      <div style={{ padding: "10px 14px 12px" }}>
        <p style={sub}>{t("erProcedureLauncher.summaryRecent")}</p>
        <ul style={{ margin: "4px 0 0 0", paddingLeft: 16, fontSize: 12, color: "#334155", lineHeight: 1.45 }}>
          {state.entries.slice(0, 8).map((row) => {
            const whenIso = row.performedAt ?? row.createdAt;
            const when = whenIso ? formatEncounterChromeDateTime(whenIso, language) : "—";
            const by = (row.performerDisplayName ?? "").trim() || "—";
            return (
              <li key={row.id} style={{ marginBottom: 4 }}>
                {fillTpl(t("erProcedureLauncher.summaryLine"), {
                  name: procedureDisplayName(t, row.procedureType),
                  site: row.site.trim() || "—",
                  by,
                  time: when,
                })}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
