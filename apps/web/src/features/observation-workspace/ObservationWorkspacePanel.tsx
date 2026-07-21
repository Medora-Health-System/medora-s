"use client";

import { useI18n } from "@/lib/i18n";
import {
  OBSERVATION_DISPOSITION_PATHWAYS,
  OBSERVATION_NURSING_SURFACES,
  OBSERVATION_PROVIDER_NOTE_KINDS,
  OBSERVATION_TIMELINE_KINDS,
} from "@medora/shared";
import type { ObservationWorkspaceSection } from "./observationWorkspaceSections";
import { isObservationWorkspaceEnabledInBrowser } from "./observationWorkspacePaths";

export function ObservationWorkspacePanel({
  section,
  encounterId,
  workspaceEnabled,
}: {
  section: ObservationWorkspaceSection;
  encounterId: string;
  workspaceEnabled?: boolean;
}) {
  const { t } = useI18n();
  const enabled = workspaceEnabled ?? isObservationWorkspaceEnabledInBrowser();

  if (!enabled) {
    return (
      <p
        style={{ fontSize: 13, color: "#64748b", lineHeight: 1.45 }}
        data-testid={`observation-panel-feature-off-${section}`}
      >
        {t("observationD3d.featureUnavailable")}
      </p>
    );
  }

  switch (section) {
    case "overview":
      return (
        <div data-testid="observation-panel-overview">
          <p style={{ margin: 0, fontSize: 13, color: "#334155", lineHeight: 1.45 }}>
            {t("observationD3d.overview.body")}
          </p>
          <p style={{ margin: "10px 0 0", fontSize: 12, color: "#64748b" }}>
            {t("observationD3d.overview.encounterId")}: {encounterId}
          </p>
        </div>
      );
    case "providerNotes":
      return (
        <ul data-testid="observation-panel-provider-notes" style={{ margin: 0, paddingLeft: 18 }}>
          {OBSERVATION_PROVIDER_NOTE_KINDS.map((kind) => (
            <li key={kind} style={{ marginBottom: 6, fontSize: 13, color: "#334155" }}>
              {t(`observationD3d.providerNotes.kinds.${kind}`)}
            </li>
          ))}
          <li style={{ marginTop: 8, fontSize: 12, color: "#64748b" }}>
            {t("observationD3d.providerNotes.timelineHint")}
          </li>
        </ul>
      );
    case "nursing":
      return (
        <ul data-testid="observation-panel-nursing" style={{ margin: 0, paddingLeft: 18 }}>
          {OBSERVATION_NURSING_SURFACES.map((surface) => (
            <li key={surface} style={{ marginBottom: 6, fontSize: 13, color: "#334155" }}>
              {t(`observationD3d.nursing.surfaces.${surface}`)}
            </li>
          ))}
        </ul>
      );
    case "orders":
      return (
        <div data-testid="observation-panel-orders" style={{ fontSize: 13, color: "#334155" }}>
          <p style={{ margin: "0 0 8px" }}>{t("observationD3d.orders.reuseEngine")}</p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li>{t("observationD3d.orders.completedEd")}</li>
            <li>{t("observationD3d.orders.activeObs")}</li>
            <li>{t("observationD3d.orders.pendingObs")}</li>
          </ul>
        </div>
      );
    case "results":
      return (
        <ul data-testid="observation-panel-results" style={{ margin: 0, paddingLeft: 18 }}>
          {["labs", "imaging", "ecg", "consults", "pending", "completed"].map((lane) => (
            <li key={lane} style={{ marginBottom: 6, fontSize: 13, color: "#334155" }}>
              {t(`observationD3d.results.${lane}`)}
            </li>
          ))}
        </ul>
      );
    case "medications":
      return (
        <div data-testid="observation-panel-medications" style={{ fontSize: 13, color: "#334155" }}>
          <p style={{ margin: 0 }}>{t("observationD3d.medications.separateMar")}</p>
          <p style={{ margin: "8px 0 0", color: "#64748b" }}>
            {t("observationD3d.medications.noAutoImport")}
          </p>
        </div>
      );
    case "reassessment":
      return (
        <p data-testid="observation-panel-reassessment" style={{ margin: 0, fontSize: 13 }}>
          {t("observationD3d.reassessment.body")}
        </p>
      );
    case "carePlan":
      return (
        <p data-testid="observation-panel-care-plan" style={{ margin: 0, fontSize: 13 }}>
          {t("observationD3d.carePlan.body")}
        </p>
      );
    case "summary":
      return (
        <p data-testid="observation-panel-summary" style={{ margin: 0, fontSize: 13 }}>
          {t("observationD3d.summary.body")}
        </p>
      );
    case "disposition":
      return (
        <ul data-testid="observation-panel-disposition" style={{ margin: 0, paddingLeft: 18 }}>
          {OBSERVATION_DISPOSITION_PATHWAYS.map((pathway) => (
            <li key={pathway} style={{ marginBottom: 6, fontSize: 13, color: "#334155" }}>
              {t(`observationD3d.disposition.pathways.${pathway}`)}
            </li>
          ))}
        </ul>
      );
    case "timeline":
      return (
        <ul data-testid="observation-panel-timeline" style={{ margin: 0, paddingLeft: 18 }}>
          {OBSERVATION_TIMELINE_KINDS.map((kind) => (
            <li key={kind} style={{ marginBottom: 6, fontSize: 13, color: "#334155" }}>
              {t(`observationD3d.timeline.kinds.${kind}`)}
            </li>
          ))}
        </ul>
      );
    default:
      return null;
  }
}
