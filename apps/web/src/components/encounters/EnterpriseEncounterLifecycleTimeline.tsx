"use client";

import { useEffect, useState } from "react";
import { lifecycleTransitionLabelKey } from "@medora/shared";
import { apiFetch } from "@/lib/apiClient";
import { formatEncounterChromeDateTime } from "@/lib/encounterChromeI18n";
import { useI18n } from "@/lib/i18n";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";

type TimelineRow = {
  id: string;
  transitionType: string;
  previousState: string;
  newState: string;
  actorUserId?: string | null;
  actorRoleCodes?: unknown;
  reason?: string | null;
  reasonCode?: string | null;
  sequence: number;
  createdAt: string;
};

type TimelineResponse = {
  items?: TimelineRow[];
};

function roleCodesLabel(raw: unknown, t: (k: string) => string): string {
  if (!Array.isArray(raw) || raw.length === 0) return t("common.dash");
  const codes = raw.map((r) => String(r)).filter(Boolean);
  if (codes.length === 0) return t("common.dash");
  return codes
    .map((code) => {
      const key = `enterpriseClosedEncounterD4c8a.roles.${code}`;
      const translated = t(key);
      return translated === key ? code : translated;
    })
    .join(", ");
}

/**
 * MEDUI.D4C.8A — D4C.7K EncounterLifecycleTransition presentation.
 * Does not merge AuditLog. Does not dump metadata JSON.
 */
export function EnterpriseEncounterLifecycleTimeline(props: {
  facilityId: string;
  encounterId: string;
  refreshKey?: number;
}) {
  const { t, language } = useI18n();
  const [rows, setRows] = useState<TimelineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = (await apiFetch(
          `/encounters/${encodeURIComponent(props.encounterId)}/lifecycle-timeline?limit=100`,
          { facilityId: props.facilityId }
        )) as TimelineResponse;
        if (cancelled) return;
        setRows(Array.isArray(data?.items) ? data.items : []);
      } catch (err) {
        if (cancelled) return;
        setRows([]);
        setError(
          normalizeUserFacingError(err instanceof Error ? err.message : null, language) ||
            t("enterpriseClosedEncounterD4c8a.lifecycle.loadError")
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [props.encounterId, props.facilityId, props.refreshKey, language, t]);

  return (
    <section
      data-testid="enterprise-lifecycle-timeline"
      style={{ ...MEDORA_CARD_SHELL, padding: 16, marginTop: 14 }}
    >
      <h3 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
        {t("enterpriseClosedEncounterD4c8a.lifecycle.title")}
      </h3>
      {loading ? (
        <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{t("common.loading")}</p>
      ) : null}
      {error ? (
        <p role="alert" style={{ margin: 0, fontSize: 13, color: "#b91c1c" }}>
          {error}
        </p>
      ) : null}
      {!loading && !error && rows.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
          {t("enterpriseClosedEncounterD4c8a.lifecycle.empty")}
        </p>
      ) : null}
      {!loading && !error && rows.length > 0 ? (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {rows.map((row) => {
            const labelKey = lifecycleTransitionLabelKey(row.transitionType);
            const label = t(labelKey);
            return (
              <li
                key={row.id}
                data-testid="enterprise-lifecycle-row"
                style={{
                  borderTop: "1px solid #e2e8f0",
                  padding: "10px 0",
                  fontSize: 13,
                  color: "#334155",
                  lineHeight: 1.45,
                }}
              >
                <div style={{ fontWeight: 700, color: "#0f172a" }}>{label === labelKey ? row.transitionType : label}</div>
                <div>
                  {t("enterpriseClosedEncounterD4c8a.lifecycle.at")}{" "}
                  {formatEncounterChromeDateTime(row.createdAt, language)}
                </div>
                <div>
                  {t("enterpriseClosedEncounterD4c8a.lifecycle.roles")}{" "}
                  {roleCodesLabel(row.actorRoleCodes, t)}
                </div>
                {row.reason ? (
                  <div>
                    {t("enterpriseClosedEncounterD4c8a.lifecycle.reason")} {row.reason}
                  </div>
                ) : null}
                {row.reasonCode ? (
                  <div>
                    {t("enterpriseClosedEncounterD4c8a.lifecycle.reasonCode")} {row.reasonCode}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
