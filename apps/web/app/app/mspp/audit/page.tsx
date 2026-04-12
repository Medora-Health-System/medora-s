"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { fetchMsppReviews, type MsppReviewAuditTrailItem, type MsppReviewRow } from "@/lib/msppApi";
import {
  MSPP_EMPTY_STATE,
  MSPP_ERROR_CALLOUT,
  MSPP_NAV_LINK,
  MSPP_PAGE_SHELL,
  MSPP_PAGE_SUBTITLE,
  MSPP_PAGE_TITLE,
  MSPP_TABLE,
  MSPP_TABLE_CELL,
  MSPP_TABLE_HEAD_CELL,
} from "@/features/mspp/msppUiChrome";

function reviewStatusLabel(t: (key: string) => string, status: string): string {
  const key = `msppValidation.reviewStatus.${status}`;
  const out = t(key);
  return out === key ? status : out;
}

function actionLabel(t: (key: string) => string, action: string): string {
  const key = `msppValidation.auditAction.${action}`;
  const out = t(key);
  return out === key ? action : out;
}

function levelLabel(t: (key: string) => string, level: string): string {
  const key = `msppValidation.reviewerLevel.${level}`;
  const out = t(key);
  return out === key ? level : out;
}

function dossierLine(row: MsppReviewRow): string {
  const p = row.patientFullName?.trim();
  const d = row.reportDiseaseName?.trim() || row.reportDiseaseCode?.trim();
  if (p && d) return `${p} — ${d}`;
  if (p) return p;
  if (d) return d;
  return row.id;
}

function formatWhen(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

type FlatRow = {
  key: string;
  event: MsppReviewAuditTrailItem;
  review: MsppReviewRow;
};

export default function MsppAuditHistoryPage() {
  const { t } = useI18n();
  const { ready, msppRoles } = useFacilityAndRoles();
  const canMspp = msppRoles.length > 0;

  const [rows, setRows] = useState<MsppReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!canMspp) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMsppReviews({ includeAuditEvents: true });
      setRows(data.reviews ?? []);
    } catch {
      setError(t("msppAuditPage.loadError"));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [canMspp, t]);

  useEffect(() => {
    if (ready && canMspp) void load();
    else if (ready && !canMspp) setLoading(false);
  }, [ready, canMspp, load]);

  const flatRows: FlatRow[] = useMemo(() => {
    const out: FlatRow[] = [];
    for (const review of rows) {
      const trail = review.auditTrail ?? [];
      for (const ev of trail) {
        out.push({
          key: `${review.id}-${ev.id}`,
          event: ev,
          review,
        });
      }
    }
    out.sort((a, b) => {
      const ta = new Date(a.event.createdAt).getTime();
      const tb = new Date(b.event.createdAt).getTime();
      return tb - ta;
    });
    return out;
  }, [rows]);

  if (!ready) {
    return (
      <div style={MSPP_PAGE_SHELL}>
        <p style={{ color: "#64748b", marginTop: 0 }}>{t("common.loading")}</p>
      </div>
    );
  }

  if (!canMspp) {
    return (
      <div style={MSPP_PAGE_SHELL}>
        <h1 style={MSPP_PAGE_TITLE}>{t("msppAuditPage.pageTitle")}</h1>
        <p style={{ color: "#64748b", marginTop: 0 }}>{t("common.unauthorizedRedirect")}</p>
      </div>
    );
  }

  return (
    <div style={MSPP_PAGE_SHELL}>
      <h1 style={MSPP_PAGE_TITLE}>{t("msppAuditPage.pageTitle")}</h1>
      <p style={MSPP_PAGE_SUBTITLE}>{t("msppAuditPage.subtitle")}</p>
      <p style={{ fontSize: 13, color: "#64748b", marginTop: 8, marginBottom: 12 }}>{t("msppAuditPage.disclaimer")}</p>

      <p style={{ marginBottom: 16 }}>
        <Link href="/app/mspp/validation" style={MSPP_NAV_LINK}>
          {t("msppAuditPage.linkValidation")}
        </Link>
      </p>

      {error && (
        <div style={MSPP_ERROR_CALLOUT} role="alert">
          <p style={{ color: "#991b1b", margin: 0, fontWeight: 600 }}>{error}</p>
        </div>
      )}

      {loading ? (
        <p style={{ color: "#64748b", marginTop: 0 }}>{t("common.loading")}</p>
      ) : flatRows.length === 0 ? (
        <p style={MSPP_EMPTY_STATE}>{t("msppAuditPage.empty")}</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={MSPP_TABLE}>
            <thead>
              <tr>
                <th style={MSPP_TABLE_HEAD_CELL}>{t("msppAuditPage.colDate")}</th>
                <th style={MSPP_TABLE_HEAD_CELL}>{t("msppAuditPage.colDossier")}</th>
                <th style={MSPP_TABLE_HEAD_CELL}>{t("msppAuditPage.colDepartment")}</th>
                <th style={MSPP_TABLE_HEAD_CELL}>{t("msppAuditPage.colAction")}</th>
                <th style={MSPP_TABLE_HEAD_CELL}>{t("msppAuditPage.colLevel")}</th>
                <th style={MSPP_TABLE_HEAD_CELL}>{t("msppAuditPage.colStatus")}</th>
                <th style={MSPP_TABLE_HEAD_CELL}>{t("msppAuditPage.colActor")}</th>
              </tr>
            </thead>
            <tbody>
              {flatRows.map(({ key, event: ev, review: r }) => {
                const beforeL = ev.statusBefore ? reviewStatusLabel(t, ev.statusBefore) : "—";
                const afterL = ev.statusAfter ? reviewStatusLabel(t, ev.statusAfter) : "—";
                return (
                  <tr key={key}>
                    <td style={{ ...MSPP_TABLE_CELL, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                      {formatWhen(ev.createdAt)}
                    </td>
                    <td style={MSPP_TABLE_CELL}>{dossierLine(r)}</td>
                    <td style={MSPP_TABLE_CELL}>{r.departmentName?.trim() || "—"}</td>
                    <td style={MSPP_TABLE_CELL}>
                      <span style={{ fontWeight: 600 }}>{actionLabel(t, ev.action)}</span>
                      {ev.requeued ? (
                        <span
                          style={{
                            marginLeft: 8,
                            display: "inline-block",
                            padding: "1px 6px",
                            borderRadius: 6,
                            background: "rgba(59,130,246,0.15)",
                            color: "#1d4ed8",
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          {t("msppAuditPage.requeuedBadge")}
                        </span>
                      ) : null}
                    </td>
                    <td style={MSPP_TABLE_CELL}>{levelLabel(t, ev.reviewerLevel)}</td>
                    <td style={{ ...MSPP_TABLE_CELL, fontSize: 13, color: "#475569" }}>
                      {beforeL} → {afterL}
                    </td>
                    <td style={MSPP_TABLE_CELL}>{ev.reviewerDisplayName}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
