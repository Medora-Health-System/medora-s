"use client";

import React from "react";
import { MEDORA_CARD_SHELL } from "@/components/medora-card";
import { useI18n } from "@/lib/i18n";
import type { ErCdsNavigableSection, ErCdsRecommendation } from "./erClinicalDecisionSupport";

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, k: string) =>
    params[k] !== undefined ? String(params[k]) : `{${k}}`
  );
}

/** Maps locale-neutral CDS params to i18n interpolation values (e.g. trauma level code → label). */
function cdsParamsForInterpolation(
  rec: ErCdsRecommendation,
  t: (key: string) => string
): Record<string, string | number> | undefined {
  if (!rec.params) return undefined;
  if (rec.id === "cds_er_trauma_protocol") {
    const code =
      typeof rec.params.levelCode === "string" ? rec.params.levelCode : "UNSPECIFIED";
    return { level: t(`erCds.params.traumaLevel.${code}`) };
  }
  return rec.params;
}

const SEVERITY_STYLE: Record<
  ErCdsRecommendation["severity"],
  { borderLeft: string; labelBg: string; labelText: string }
> = {
  info: { borderLeft: "#bae6fd", labelBg: "#f0f9ff", labelText: "#0369a1" },
  warning: { borderLeft: "#fbbf24", labelBg: "#fffbeb", labelText: "#b45309" },
  critical: { borderLeft: "#f87171", labelBg: "#fef2f2", labelText: "#b91c1c" },
};

type Props = {
  recommendations: ErCdsRecommendation[];
  onNavigate: (section: ErCdsNavigableSection, recommendation: ErCdsRecommendation) => void;
};

export function ErClinicalDecisionSupportPanel({ recommendations, onNavigate }: Props) {
  const { t } = useI18n();

  if (recommendations.length === 0) return null;

  return (
    <section
      aria-label={t("erCds.panelTitle")}
      style={{
        marginBottom: 14,
        padding: "12px 14px",
        backgroundColor: MEDORA_CARD_SHELL.background,
        border: MEDORA_CARD_SHELL.border,
        borderRadius: MEDORA_CARD_SHELL.radius,
        boxShadow: MEDORA_CARD_SHELL.boxShadow,
      }}
    >
      <div style={{ marginBottom: 8 }}>
        <h2
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 600,
            color: "#0f172a",
            letterSpacing: "0.02em",
          }}
        >
          {t("erCds.panelTitle")}
        </h2>
        <p style={{ margin: "6px 0 0 0", fontSize: 12, lineHeight: 1.45, color: "#64748b" }}>
          {t("erCds.panelHint")}
        </p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {recommendations.map((rec) => {
          const st = SEVERITY_STYLE[rec.severity];
          const title = t(`erCds.recommendations.${rec.id}.title`);
          const bodyRaw = t(`erCds.recommendations.${rec.id}.body`);
          const body = interpolate(bodyRaw, cdsParamsForInterpolation(rec, t));
          const actionLabel =
            rec.actionKey && rec.actionTarget ? t(`erCds.actions.${rec.actionKey}`) : null;

          return (
            <article
              key={rec.id}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                borderLeftWidth: 4,
                borderLeftColor: st.borderLeft,
                padding: "10px 12px",
                backgroundColor: "#ffffff",
              }}
            >
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 8 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    padding: "2px 8px",
                    borderRadius: 9999,
                    backgroundColor: st.labelBg,
                    color: st.labelText,
                  }}
                >
                  {t(`erCds.severity.${rec.severity}`)}
                </span>
              </div>
              <h3 style={{ margin: "8px 0 4px 0", fontSize: 14, fontWeight: 600, color: "#0f172a" }}>
                {title}
              </h3>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.45, color: "#334155" }}>{body}</p>
              {actionLabel && rec.actionTarget ? (
                <div style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    onClick={() => onNavigate(rec.actionTarget as ErCdsNavigableSection, rec)}
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      padding: "6px 12px",
                      borderRadius: 8,
                      border: "1px solid #cbd5e1",
                      backgroundColor: "#f8fafc",
                      color: "#0f172a",
                      cursor: "pointer",
                    }}
                  >
                    {actionLabel}
                  </button>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
