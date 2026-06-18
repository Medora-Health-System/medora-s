"use client";

import Link from "next/link";
import type { BillingReadinessExplainerSummary } from "@medora/shared";
import {
  BILLING_READINESS_EXPLAINER_CATEGORY_I18N,
  resolveBillingReadinessExplainerActionLink,
} from "./billingReadinessExplainerNavigation";

type BillingReadinessExplainerPanelProps = {
  encounterId: string;
  patientId?: string | null;
  patientLabel?: string;
  summary: BillingReadinessExplainerSummary;
  t: (key: string) => string;
};

export function BillingReadinessExplainerPanel({
  encounterId,
  patientId,
  patientLabel,
  summary,
  t,
}: BillingReadinessExplainerPanelProps) {
  const grouped = new Map<string, BillingReadinessExplainerSummary["items"]>();
  for (const item of summary.items) {
    const list = grouped.get(item.category) ?? [];
    list.push(item);
    grouped.set(item.category, list);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h2 style={{ margin: "0 0 6px", fontSize: 18 }}>{t("billingPage.readinessExplainerTitle")}</h2>
        {patientLabel ? (
          <p style={{ margin: 0, color: "#475569", fontSize: 13 }}>{patientLabel}</p>
        ) : null}
        <p style={{ margin: "8px 0 0", color: "#334155", fontSize: 14, lineHeight: 1.45 }}>
          {summary.isReady
            ? t("billingPage.readinessExplainerReady")
            : t("billingPage.readinessExplainerBlockedSummary")
                .replace("{blockers}", String(summary.blockerCount))
                .replace("{warnings}", String(summary.warningCount))}
        </p>
      </div>

      {summary.items.length === 0 ? (
        <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>{t("billingPage.readinessExplainerNoBlockers")}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[...grouped.entries()].map(([category, items]) => (
            <section
              key={category}
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                padding: 12,
                background: "#fff",
              }}
            >
              <h3 style={{ margin: "0 0 8px", fontSize: 14, color: "#0f172a" }}>
                {t(BILLING_READINESS_EXPLAINER_CATEGORY_I18N[category] ?? category)}
              </h3>
              <ul style={{ margin: 0, paddingLeft: 18, color: "#334155", fontSize: 13, lineHeight: 1.45 }}>
                {items.map((item, index) => {
                  const action = resolveBillingReadinessExplainerActionLink(item.suggestedAction, encounterId, patientId);
                  return (
                    <li key={`${category}-${index}`} style={{ marginBottom: 10 }}>
                      <div style={{ fontWeight: 600 }}>
                        {item.label}
                        {item.count > 0 ? ` (${item.count})` : ""}
                      </div>
                      <div style={{ color: "#64748b", marginTop: 2 }}>{item.detail}</div>
                      <div style={{ marginTop: 4, fontSize: 12, color: "#475569" }}>
                        {t("billingPage.readinessExplainerSuggestedAction")}:{" "}
                        <Link href={action.href} style={{ color: "#0f766e", fontWeight: 600 }}>
                          {t(action.labelKey)}
                        </Link>
                        {item.blocksBilling ? (
                          <span style={{ color: "#b91c1c", marginLeft: 8 }}>
                            · {t("billingPage.readinessExplainerBlocksBilling")}
                          </span>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
