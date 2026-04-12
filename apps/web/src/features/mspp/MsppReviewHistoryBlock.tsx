"use client";

import React from "react";
import type { MsppReviewAuditTrailItem } from "@/lib/msppApi";
import { MSPP_MUTED_INLINE } from "@/features/mspp/msppUiChrome";

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

function truncate(s: string, max: number) {
  const x = s.trim();
  if (x.length <= max) return x;
  return `${x.slice(0, max)}…`;
}

/** Ligne courte à partir du cliché JSON des critères (lecture seule). */
function criteriaShortLine(
  t: (key: string) => string,
  snap: Record<string, unknown> | null
): string | null {
  if (!snap) return null;
  const parts: string[] = [];
  const cc = snap.caseClassification;
  if (typeof cc === "string" && cc.trim()) {
    const ck = `msppValidation.caseClassification.${cc}`;
    const cl = t(ck);
    parts.push(cl !== ck ? cl : cc);
  }
  const comm = snap.comment;
  if (typeof comm === "string" && comm.trim()) {
    parts.push(truncate(comm, 120));
  }
  const fr = snap.finalDecisionRationale;
  if (typeof fr === "string" && fr.trim() && parts.length < 2) {
    parts.push(truncate(fr, 100));
  }
  if (parts.length === 0) return null;
  return parts.join(" — ");
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

export function MsppReviewHistoryBlock({
  events,
  t,
}: {
  events: MsppReviewAuditTrailItem[] | undefined;
  t: (key: string) => string;
}) {
  const list = events ?? [];
  return (
    <div
      style={{
        marginTop: 10,
        padding: "10px 12px",
        background: "#f8fafc",
        borderRadius: 10,
        border: "1px solid #e2e8f0",
        maxWidth: 420,
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: "#0f172a" }}>
        {t("msppValidation.auditHistoryTitle")}
      </div>
      {list.length === 0 ? (
        <p style={{ ...MSPP_MUTED_INLINE, margin: 0, fontSize: 13 }}>{t("msppValidation.auditHistoryEmpty")}</p>
      ) : (
        <ul style={{ margin: 0, paddingLeft: 18, color: "#334155", fontSize: 12, lineHeight: 1.5 }}>
          {list.map((ev) => {
            const snapLine = criteriaShortLine(t, ev.criteriaSnapshot);
            const beforeL = ev.statusBefore ? reviewStatusLabel(t, ev.statusBefore) : "—";
            const afterL = ev.statusAfter ? reviewStatusLabel(t, ev.statusAfter) : "—";
            return (
              <li key={ev.id} style={{ marginBottom: 12 }}>
                <div>
                  <strong>{formatWhen(ev.createdAt)}</strong>
                  {" — "}
                  {actionLabel(t, ev.action)}
                  {" · "}
                  {levelLabel(t, ev.reviewerLevel)}
                  {ev.requeued ? (
                    <span
                      style={{
                        marginLeft: 6,
                        display: "inline-block",
                        padding: "1px 6px",
                        borderRadius: 6,
                        background: "rgba(59,130,246,0.15)",
                        color: "#1d4ed8",
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      {t("msppValidation.auditRequeuedBadge")}
                    </span>
                  ) : null}
                </div>
                <div style={{ marginTop: 2 }}>
                  {t("msppValidation.auditActor")} : {ev.reviewerDisplayName}
                </div>
                {ev.statusBefore != null || ev.statusAfter != null ? (
                  <div style={{ marginTop: 2, color: "#64748b" }}>
                    {t("msppValidation.auditStatusTransition")
                      .replace("{before}", beforeL)
                      .replace("{after}", afterL)}
                  </div>
                ) : null}
                {snapLine ? (
                  <div style={{ marginTop: 4, color: "#475569" }}>
                    {t("msppValidation.auditSnapshotPrefix")} : {snapLine}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
