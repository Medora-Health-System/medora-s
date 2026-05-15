"use client";

import React, { useMemo } from "react";
import type { DispositionSafetyReadinessResponse, ObservationOperationalSnapshot } from "@medora/shared";
import { MEDORA_CARD_SHELL } from "@/components/medora-card";
import { dispositionReadinessIssueText } from "@/components/clinical/DispositionReadinessBanner";
import { BLOCKER_LABEL_KEY, READINESS_LABEL_KEY } from "@/components/encounters/ObservationWorkflowEncounterChrome";
import { ObservationMarEncounterSummaryBlock } from "@/components/encounters/ObservationMarEncounterSummaryBlock";

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  marginBottom: 6,
};

const rowLabelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "#475569",
  minWidth: 0,
};

const rowValueStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#0f172a",
  lineHeight: 1.45,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 4 }}>
      <div style={rowLabelStyle}>{label}</div>
      <div style={rowValueStyle}>{value}</div>
    </div>
  );
}

export function ObservationDocumentationSummaryPanel({
  snapshot,
  initialObservationReason,
  resultsPendingCount,
  criticalResultsUnacknowledged,
  dispositionReadiness,
  formatDateTime,
  t,
  encounterId,
  facilityId,
  medicationMarSummaryRefreshKey,
}: {
  snapshot: ObservationOperationalSnapshot;
  initialObservationReason: string;
  resultsPendingCount: number;
  criticalResultsUnacknowledged: boolean;
  dispositionReadiness: DispositionSafetyReadinessResponse | null;
  formatDateTime: (iso: string) => string;
  t: (key: string) => string;
  encounterId?: string;
  facilityId?: string;
  medicationMarSummaryRefreshKey?: string;
}) {
  const providerLast = snapshot.reassessmentLanes.provider.lastAtIso;
  const rnLast = snapshot.reassessmentLanes.rnObservation.lastAtIso;

  const activeReadinessLines = useMemo(() => {
    return snapshot.readinessLines.filter((l) => l.active).map((l) => t(READINESS_LABEL_KEY[l.id]));
  }, [snapshot.readinessLines, t]);

  const documentationGaps = useMemo(() => {
    const lines: string[] = [];
    const seen = new Set<string>();
    const push = (s: string) => {
      const x = s.trim();
      if (!x || seen.has(x)) return;
      seen.add(x);
      lines.push(x);
    };
    for (const b of snapshot.operationalBlockers) {
      push(t(BLOCKER_LABEL_KEY[b.id]));
    }
    if (dispositionReadiness) {
      for (const iss of dispositionReadiness.blockers) {
        push(dispositionReadinessIssueText(t, iss, dispositionReadiness));
      }
      for (const iss of dispositionReadiness.warnings) {
        push(dispositionReadinessIssueText(t, iss, dispositionReadiness));
      }
    }
    return lines;
  }, [snapshot.operationalBlockers, dispositionReadiness, t]);

  const pendingLine =
    resultsPendingCount > 0
      ? t("encounterChrome.observationWorkflow.pendingResultsCount").replace("{count}", String(resultsPendingCount)) +
        (criticalResultsUnacknowledged ? ` ${t("encounterChrome.observationWorkflow.criticalResultFlag")}` : "")
      : t("encounterChrome.observationWorkflow.pendingResultsNone");

  const initialReasonDisplay =
    initialObservationReason.trim() !== ""
      ? initialObservationReason.trim()
      : t("encounterChrome.observationDocSummary.noneRecorded");

  return (
    <div
      style={{
        marginTop: 12,
        padding: "14px 16px",
        backgroundColor: MEDORA_CARD_SHELL.background,
        border: MEDORA_CARD_SHELL.border,
        borderRadius: MEDORA_CARD_SHELL.radius,
        boxShadow: MEDORA_CARD_SHELL.boxShadow,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>
        {t("encounterChrome.observationDocSummary.title")}
      </div>
      <p style={{ margin: "0 0 12px 0", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
        {t("encounterChrome.observationDocSummary.footnote")}
      </p>
      <div
        style={{
          marginBottom: 14,
          padding: "10px 12px",
          borderRadius: 12,
          border: "1px solid #bae6fd",
          backgroundColor: "#f0f9ff",
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, color: "#0c4a6e", marginBottom: 6 }}>
          {t("encounterChrome.observationDocSummary.dischargePacketHintTitle")}
        </div>
        <p style={{ margin: 0, fontSize: 12, color: "#334155", lineHeight: 1.5 }}>
          {t("encounterChrome.observationDocSummary.dischargePacketHintBody")}
        </p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <div style={sectionTitleStyle}>{t("encounterChrome.observationDocSummary.sectionInitialReason")}</div>
          <div style={rowValueStyle}>{initialReasonDisplay}</div>
        </div>
        <div>
          <div style={sectionTitleStyle}>{t("encounterChrome.observationDocSummary.sectionLos")}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Row label={t("encounterChrome.observationLosLabel")} value={snapshot.losLabel} />
            <Row
              label={t("encounterChrome.observationOvernightUtc")}
              value={
                snapshot.overnightUtcSpan
                  ? t("encounterChrome.observationDocSummary.yes")
                  : t("encounterChrome.observationDocSummary.no")
              }
            />
            <Row
              label={t("encounterChrome.observationExtended24h")}
              value={
                snapshot.extendedStay24h
                  ? t("encounterChrome.observationDocSummary.yes")
                  : t("encounterChrome.observationDocSummary.no")
              }
            />
          </div>
        </div>
        <div>
          <div style={sectionTitleStyle}>{t("encounterChrome.observationWorkflow.reassessmentLanesTitle")}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Row
              label={t("encounterChrome.observationWorkflow.lastProviderObsReassess")}
              value={providerLast ? formatDateTime(providerLast) : t("encounterChrome.observationDocSummary.noneYet")}
            />
            <Row
              label={t("encounterChrome.observationWorkflow.lastRnObsReassess")}
              value={rnLast ? formatDateTime(rnLast) : t("encounterChrome.observationDocSummary.noneYet")}
            />
          </div>
        </div>
        <div>
          <div style={sectionTitleStyle}>{t("encounterChrome.observationWorkflow.pendingResultsLabel")}</div>
          <div style={rowValueStyle}>{pendingLine}</div>
        </div>
        {encounterId && facilityId && medicationMarSummaryRefreshKey ? (
          <ObservationMarEncounterSummaryBlock
            encounterId={encounterId}
            facilityId={facilityId}
            refreshKey={medicationMarSummaryRefreshKey}
          />
        ) : null}
        <div>
          <div style={sectionTitleStyle}>{t("encounterChrome.observationDocSummary.readinessContext")}</div>
          {activeReadinessLines.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: 18, color: "#334155", fontSize: 13, lineHeight: 1.45 }}>
              {activeReadinessLines.map((line, idx) => (
                <li key={`readiness-${idx}`} style={{ marginBottom: 4 }}>
                  {line}
                </li>
              ))}
            </ul>
          ) : (
            <div style={rowValueStyle}>{t("encounterChrome.observationDocSummary.readinessNoneActive")}</div>
          )}
        </div>
        <div>
          <div style={sectionTitleStyle}>{t("encounterChrome.observationDocSummary.gapsTitle")}</div>
          {documentationGaps.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: 18, color: "#334155", fontSize: 13, lineHeight: 1.45 }}>
              {documentationGaps.map((line, idx) => (
                <li key={`gap-${idx}`} style={{ marginBottom: 4 }}>
                  {line}
                </li>
              ))}
            </ul>
          ) : (
            <div style={rowValueStyle}>{t("encounterChrome.observationDocSummary.gapsNone")}</div>
          )}
        </div>
        <div>
          <div style={sectionTitleStyle}>{t("encounterChrome.observationDocSummary.sectionWorkflowTabsTitle")}</div>
          <p style={{ margin: 0, fontSize: 13, color: "#334155", lineHeight: 1.5 }}>
            {t("encounterChrome.observationDocSummary.sectionWorkflowTabsBody")
              .replace("{triage}", t("encounterChrome.tabs.triage"))
              .replace("{orders}", t("encounterChrome.tabs.orders"))
              .replace("{mar}", t("encounterChrome.tabs.mar"))}
          </p>
        </div>
      </div>
    </div>
  );
}
