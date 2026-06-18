"use client";

import type { ExternalBillingExportCertificationSummary } from "@medora/shared";

type ExternalBillingExportCertificationPanelProps = {
  certification: ExternalBillingExportCertificationSummary;
  t: (key: string) => string;
};

function statusLabelKey(status: ExternalBillingExportCertificationSummary["status"]): string {
  switch (status) {
    case "READY":
      return "billingPage.externalExportCertificationReady";
    case "READY_WITH_WARNINGS":
      return "billingPage.externalExportCertificationReadyWithWarnings";
    default:
      return "billingPage.externalExportCertificationNotReady";
  }
}

export function ExternalBillingExportCertificationPanel({
  certification,
  t,
}: ExternalBillingExportCertificationPanelProps) {
  return (
    <div
      style={{
        marginTop: 12,
        padding: 12,
        borderRadius: 8,
        border: "1px solid #e2e8f0",
        background: "#f8fafc",
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>
        {t("billingPage.externalExportCertificationTitle")}
      </div>
      <div style={{ fontSize: 13, color: "#334155", marginBottom: 8 }}>
        {t("billingPage.externalExportCertificationStatusLabel")}:{" "}
        <span style={{ fontWeight: 700 }}>{t(statusLabelKey(certification.status))}</span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 12, color: "#475569", marginBottom: 8 }}>
        <span>
          {t("billingPage.externalExportCertificationEncounters")}: {certification.encounterCount}
        </span>
        <span>
          {t("billingPage.externalExportCertificationLines")}: {certification.lineCount}
        </span>
        <span>
          {t("billingPage.externalExportCertificationWarnings")}: {certification.warningCount}
        </span>
        <span>
          {t("billingPage.externalExportCertificationBlockers")}: {certification.blockerCount}
        </span>
      </div>
      {certification.warnings.length > 0 ? (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#92400e" }}>
            {t("billingPage.externalExportCertificationWarnings")}
          </div>
          <ul style={{ margin: "4px 0 0", paddingLeft: 18, fontSize: 12, color: "#78350f" }}>
            {certification.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {certification.blockers.length > 0 ? (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#991b1b" }}>
            {t("billingPage.externalExportCertificationBlockers")}
          </div>
          <ul style={{ margin: "4px 0 0", paddingLeft: 18, fontSize: 12, color: "#7f1d1d" }}>
            {certification.blockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <p style={{ margin: "10px 0 0", fontSize: 11, color: "#64748b", lineHeight: 1.4 }}>
        {t("billingPage.externalExportCertificationHelper")}
      </p>
    </div>
  );
}
