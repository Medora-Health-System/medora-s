"use client";

/**
 * D4A.2.7B — Coordinated inpatient chart unavailable recovery surface.
 */

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import { INPATIENT_CENSUS_PATH } from "./inpatientWorkspacePaths";
import type { EncounterResolutionFailureCategory } from "@medora/shared";

export function InpatientEncounterUnavailablePanel({
  category,
  requestedEncounterId,
  actualEncounterType,
  onRetry,
  sourceEncounterHref,
  showTechnical,
}: {
  category: EncounterResolutionFailureCategory | string;
  requestedEncounterId?: string | null;
  actualEncounterType?: string | null;
  onRetry?: () => void;
  sourceEncounterHref?: string | null;
  showTechnical?: boolean;
}) {
  const { t } = useI18n();
  const messageKey = `inpatientWorkspaceRecoveryD4a27b.errors.${category}`;
  const message = t(messageKey);
  const resolvedMessage =
    message === messageKey
      ? t("inpatientWorkspaceRecoveryD4a27b.errors.UNKNOWN")
      : message;

  return (
    <section
      role="alert"
      data-testid="inpatient-encounter-unavailable"
      style={{ ...MEDORA_CARD_SHELL, padding: "16px 18px", marginBottom: 12 }}
    >
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#991b1b" }}>
        {t("inpatientWorkspaceRecoveryD4a27b.unavailable.title")}
      </h2>
      <p style={{ margin: "8px 0 0", fontSize: 13, color: "#334155", lineHeight: 1.45 }}>
        {resolvedMessage}
      </p>
      <p style={{ margin: "8px 0 0", fontSize: 12, color: "#64748b" }}>
        {t("inpatientWorkspaceRecoveryD4a27b.unavailable.writersDisabled")}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            style={{
              fontSize: 13,
              fontWeight: 600,
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid #99f6e4",
              background: "#f0fdfa",
              color: "#0f766e",
              cursor: "pointer",
            }}
          >
            {t("inpatientWorkspaceRecoveryD4a27b.unavailable.retry")}
          </button>
        ) : null}
        <Link
          href={INPATIENT_CENSUS_PATH}
          style={{
            fontSize: 13,
            fontWeight: 600,
            padding: "8px 12px",
            borderRadius: 10,
            border: "1px solid #cbd5e1",
            background: "#fff",
            color: "#334155",
            textDecoration: "none",
          }}
        >
          {t("inpatientWorkspaceRecoveryD4a27b.unavailable.returnCensus")}
        </Link>
        {sourceEncounterHref ? (
          <Link
            href={sourceEncounterHref}
            style={{
              fontSize: 13,
              fontWeight: 600,
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid #cbd5e1",
              background: "#fff",
              color: "#0f766e",
              textDecoration: "none",
            }}
          >
            {t("inpatientWorkspaceRecoveryD4a27b.unavailable.openSource")}
          </Link>
        ) : null}
      </div>
      {showTechnical ? (
        <pre
          style={{
            marginTop: 12,
            fontSize: 11,
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 10,
            padding: 10,
            overflow: "auto",
          }}
        >
          {JSON.stringify(
            { category, requestedEncounterId, actualEncounterType },
            null,
            2
          )}
        </pre>
      ) : null}
    </section>
  );
}
