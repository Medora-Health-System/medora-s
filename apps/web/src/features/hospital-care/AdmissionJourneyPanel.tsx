"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useI18n } from "@/lib/i18n";
import { apiFetch } from "@/lib/apiClient";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import { DISPLAY_DASH } from "@/lib/patientDisplay";

type Journey = {
  admissionSource?: string | null;
  sourceEncounterId?: string | null;
  placementRequestId?: string | null;
  receivingStatus?: string | null;
  receivingUnit?: string | null;
  receivingEncounterStatus?: string | null;
  arrivalTime?: string | null;
  diagnostics?: { correlationStatus?: string | null; linkageHealthy?: boolean };
};

/**
 * D3E.8 — Concise Admission Journey panel (no raw IDs for clinicians).
 * Shown when admission correlation UI flag is enabled.
 */
export function AdmissionJourneyPanel({ encounterId }: { encounterId: string }) {
  const { t } = useI18n();
  const [journey, setJourney] = useState<Journey | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!encounterId) return;
    let cancelled = false;
    void (async () => {
      try {
        const data = await apiFetch(
          `/admission-correlation/encounters/${encodeURIComponent(encounterId)}/journey`
        );
        if (!cancelled) {
          setJourney((data as { journey?: Journey | null })?.journey ?? null);
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setJourney(null);
          setError(t("hospitalCareD3e8.journey.loadError"));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [encounterId, t]);

  if (error) {
    return (
      <p style={{ fontSize: 12, color: "#64748b" }} data-testid="admission-journey-error">
        {error}
      </p>
    );
  }
  if (!journey) return null;

  const dash = DISPLAY_DASH;
  return (
    <section
      style={{ ...MEDORA_CARD_SHELL, padding: 12, marginBottom: 12 }}
      data-testid="admission-journey-panel"
    >
      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>
        {t("hospitalCareD3e8.journey.title")}
      </h3>
      <dl style={dlStyle}>
        <div>
          <dt>{t("hospitalCareD3e8.journey.source")}</dt>
          <dd>{journey.admissionSource?.trim() || dash}</dd>
        </div>
        <div>
          <dt>{t("hospitalCareD3e8.journey.placement")}</dt>
          <dd>
            {journey.placementRequestId
              ? t("hospitalCareD3e8.journey.placementLinked")
              : t("hospitalCareD3e8.journey.placementNone")}
          </dd>
        </div>
        <div>
          <dt>{t("hospitalCareD3e8.journey.receiving")}</dt>
          <dd>{journey.receivingStatus?.trim() || dash}</dd>
        </div>
        <div>
          <dt>{t("hospitalCareD3e8.journey.unit")}</dt>
          <dd>{journey.receivingUnit?.trim() || dash}</dd>
        </div>
        <div>
          <dt>{t("hospitalCareD3e8.journey.encounterStatus")}</dt>
          <dd>{journey.receivingEncounterStatus?.trim() || dash}</dd>
        </div>
        <div>
          <dt>{t("hospitalCareD3e8.journey.arrival")}</dt>
          <dd>{journey.arrivalTime?.trim() || dash}</dd>
        </div>
      </dl>
      {journey.diagnostics?.linkageHealthy === false ? (
        <p style={{ margin: "8px 0 0", fontSize: 12, color: "#b45309" }}>
          {t("hospitalCareD3e8.journey.linkageReview")}
        </p>
      ) : null}
    </section>
  );
}

const dlStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
  gap: "8px 12px",
  margin: "10px 0 0",
  fontSize: 12,
  color: "#334155",
};
