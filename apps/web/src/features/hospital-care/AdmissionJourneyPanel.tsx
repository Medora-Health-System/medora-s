"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useI18n } from "@/lib/i18n";
import { apiFetch } from "@/lib/apiClient";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import { DISPLAY_DASH } from "@/lib/patientDisplay";
import { inpatientActiveWorkspacePath } from "@/features/inpatient-workspace/inpatientWorkspacePaths";

type LifecycleStep = {
  order: number;
  stepKey: string;
  labelKey: string;
  reached: boolean;
  current: boolean;
};

type Journey = {
  admissionSource?: string | null;
  admissionIntent?: string | null;
  sourceEncounterContext?: string | null;
  requestedUnit?: string | null;
  currentDestinationUnit?: string | null;
  placementState?: string | null;
  bed?: string | null;
  receivingNurse?: string | null;
  receivingEncounterStatus?: string | null;
  arrivalTime?: string | null;
  cancellationState?: string | null;
  correlationStatus?: string | null;
  correlationVersion?: number | null;
  resumeAvailable?: boolean;
  lifecycleSteps?: LifecycleStep[];
  diagnostics?: { correlationStatus?: string | null; linkageHealthy?: boolean };
};

const STEP_I18N: Record<string, string> = {
  "admissionJourney.admissionDecision": "hospitalCareD3e8a.journey.steps.admissionDecision",
  "admissionJourney.placementRequested": "hospitalCareD3e8a.journey.steps.placementRequested",
  "admissionJourney.placementAccepted": "hospitalCareD3e8a.journey.steps.placementAccepted",
  "admissionJourney.bedAssigned": "hospitalCareD3e8a.journey.steps.bedAssigned",
  "admissionJourney.receivingStarted": "hospitalCareD3e8a.journey.steps.receivingStarted",
  "admissionJourney.encounterCreated": "hospitalCareD3e8a.journey.steps.encounterCreated",
  "admissionJourney.arrivedOnUnit": "hospitalCareD3e8a.journey.steps.arrivedOnUnit",
  "admissionJourney.activeAdmission": "hospitalCareD3e8a.journey.steps.activeAdmission",
};

/**
 * D3E.8A — Admission Journey panel with lifecycle + governed actions.
 * No raw internal IDs for clinicians.
 */
export function AdmissionJourneyPanel({
  encounterId,
  receivingEncounterId,
}: {
  encounterId: string;
  /** When known, enables Open Inpatient chart. */
  receivingEncounterId?: string | null;
}) {
  const { t } = useI18n();
  const [journey, setJourney] = useState<Journey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  async function load() {
    if (!encounterId) return;
    try {
      const data = await apiFetch(
        `/admission-correlation/encounters/${encodeURIComponent(encounterId)}/journey`
      );
      setJourney((data as { journey?: Journey | null })?.journey ?? null);
      setError(null);
    } catch {
      setJourney(null);
      setError(t("hospitalCareD3e8.journey.loadError"));
    }
  }

  useEffect(() => {
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

  async function cancelAdmission() {
    if (journey?.correlationVersion == null) return;
    setBusy(true);
    setActionMsg(null);
    try {
      await apiFetch(
        `/admission-correlation/encounters/${encodeURIComponent(encounterId)}/cancel`,
        {
          method: "POST",
          body: JSON.stringify({
            expectedVersion: journey.correlationVersion,
            reason: "CANCELLED_FROM_JOURNEY_UI",
          }),
        }
      );
      setActionMsg(t("hospitalCareD3e8a.journey.actions.cancelDone"));
      await load();
    } catch {
      setActionMsg(t("hospitalCareD3e8a.journey.actions.cancelError"));
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <p style={{ fontSize: 12, color: "#64748b" }} data-testid="admission-journey-error">
        {error}
      </p>
    );
  }
  if (!journey) return null;

  const dash = DISPLAY_DASH;
  const steps = journey.lifecycleSteps ?? [];
  const cancelled = journey.cancellationState === "CANCELLED";

  return (
    <section
      style={{ ...MEDORA_CARD_SHELL, padding: 12, marginBottom: 12 }}
      data-testid="admission-journey-panel"
    >
      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>
        {t("hospitalCareD3e8.journey.title")}
      </h3>

      {steps.length > 0 ? (
        <ol style={stepsStyle} data-testid="admission-journey-lifecycle">
          {steps.map((step) => {
            const labelKey = STEP_I18N[step.labelKey] ?? step.labelKey;
            return (
              <li
                key={step.stepKey}
                style={{
                  opacity: cancelled ? 0.45 : step.reached ? 1 : 0.45,
                  fontWeight: step.current ? 700 : 400,
                }}
              >
                {t(labelKey)}
              </li>
            );
          })}
        </ol>
      ) : null}

      <dl style={dlStyle}>
        <div>
          <dt>{t("hospitalCareD3e8.journey.source")}</dt>
          <dd>{journey.admissionSource?.trim() || dash}</dd>
        </div>
        <div>
          <dt>{t("hospitalCareD3e8a.journey.requestedUnit")}</dt>
          <dd>{journey.requestedUnit?.trim() || dash}</dd>
        </div>
        <div>
          <dt>{t("hospitalCareD3e8a.journey.destinationUnit")}</dt>
          <dd>{journey.currentDestinationUnit?.trim() || dash}</dd>
        </div>
        <div>
          <dt>{t("hospitalCareD3e8.journey.placement")}</dt>
          <dd>{journey.placementState?.trim() || t("hospitalCareD3e8.journey.placementNone")}</dd>
        </div>
        <div>
          <dt>{t("hospitalCareD3e8a.journey.bed")}</dt>
          <dd>{journey.bed?.trim() || dash}</dd>
        </div>
        <div>
          <dt>{t("hospitalCareD3e8a.journey.receivingNurse")}</dt>
          <dd>
            {journey.receivingNurse === "ASSIGNED"
              ? t("hospitalCareD3e8a.journey.receivingNurseAssigned")
              : dash}
          </dd>
        </div>
        <div>
          <dt>{t("hospitalCareD3e8.journey.receiving")}</dt>
          <dd>{journey.correlationStatus?.trim() || dash}</dd>
        </div>
        <div>
          <dt>{t("hospitalCareD3e8.journey.encounterStatus")}</dt>
          <dd>{journey.receivingEncounterStatus?.trim() || dash}</dd>
        </div>
        <div>
          <dt>{t("hospitalCareD3e8.journey.arrival")}</dt>
          <dd>{journey.arrivalTime?.trim() || dash}</dd>
        </div>
        {cancelled ? (
          <div>
            <dt>{t("hospitalCareD3e8a.journey.cancellation")}</dt>
            <dd>{t("hospitalCareD3e8a.journey.cancelled")}</dd>
          </div>
        ) : null}
      </dl>

      <div style={actionsStyle} data-testid="admission-journey-actions">
        {journey.resumeAvailable ? (
          <a
            href={`/app/hospitalisation/admissions/new?resume=1&sourceEncounterId=${encodeURIComponent(encounterId)}`}
            style={actionLinkStyle}
          >
            {t("hospitalCareD3e8a.journey.actions.resume")}
          </a>
        ) : (
          <a href="/app/hospitalisation/admissions/new" style={actionLinkStyle}>
            {t("hospitalCareD3e8a.journey.actions.startNew")}
          </a>
        )}
        {receivingEncounterId ? (
          <a href={inpatientActiveWorkspacePath(receivingEncounterId)} style={actionLinkStyle}>
            {t("hospitalCareD3e8a.journey.actions.openChart")}
          </a>
        ) : null}
        {!cancelled &&
        journey.correlationStatus &&
        ["INTENT_CREATED", "PLACEMENT_REQUESTED", "ACCEPTED", "RECEIVING_STARTED", "ENCOUNTER_CREATED"].includes(
          journey.correlationStatus
        ) ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void cancelAdmission()}
            style={actionBtnStyle}
          >
            {t("hospitalCareD3e8a.journey.actions.cancel")}
          </button>
        ) : null}
      </div>
      {actionMsg ? (
        <p style={{ margin: "8px 0 0", fontSize: 12, color: "#334155" }}>{actionMsg}</p>
      ) : null}

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

const stepsStyle: CSSProperties = {
  margin: "10px 0 0",
  paddingLeft: 18,
  fontSize: 12,
  color: "#334155",
  display: "grid",
  gap: 2,
};

const actionsStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginTop: 10,
};

const actionLinkStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "#1d4ed8",
  textDecoration: "none",
};

const actionBtnStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  border: "1px solid #cbd5e1",
  background: "#fff",
  borderRadius: 8,
  padding: "4px 10px",
  cursor: "pointer",
};
