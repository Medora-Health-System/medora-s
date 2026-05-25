"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/apiClient";
import { EncounterResultsTab, type EncounterResultsLabRadSnapshot } from "@/components/encounters/EncounterResultsTab";
import {
  MedoraCard,
  MedoraCardActions,
  MedoraCardIdentity,
  MedoraCardInner,
  MedoraCardTitle,
} from "@/components/medora-card";
import { useI18n } from "@/lib/i18n";
import {
  buildEmergencyVisitSummaryModel,
  type ClinicalDocumentationEventApiEntry,
  type NursingReassessmentApiEntry,
  type VisitSummaryDocumentationHistoryEntry,
  type VisitSummaryReassessmentEntry,
  type VisitSummaryTextBlock,
} from "./emergencyVisitSummaryModel";
import { EnterpriseEncounterCommandTimeline } from "@/components/encounters/EnterpriseEncounterCommandTimeline";
import { ErIvAccessSummaryCard } from "@/components/clinical/ErIvAccessSummaryCard";
import { ErProceduresSummaryCard } from "@/components/clinical/ErProceduresSummaryCard";
import { ErMedicationMarSummaryCard } from "@/components/clinical/ErMedicationMarSummaryCard";
import { buildErClinicalTimeline } from "./erClinicalTimeline";
import type { EdClinicalTimelineEntry, EdClinicalTimelineResult } from "@medora/shared";

const sectionTitle: React.CSSProperties = {
  margin: 0,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.07em",
  textTransform: "uppercase",
  color: "#64748b",
};

const lineStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 13,
  color: "#334155",
  lineHeight: 1.45,
};

const CLINICAL_TIMELINE_COLLAPSE = 10;

function ClinicalTimelineCard({
  timeline,
  t,
}: {
  timeline: EdClinicalTimelineResult;
  t: (k: string) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  const datedVisible = expanded ? timeline.dated : timeline.dated.slice(0, CLINICAL_TIMELINE_COLLAPSE);
  const hiddenCount = Math.max(0, timeline.dated.length - CLINICAL_TIMELINE_COLLAPSE);

  const renderEntry = (entry: EdClinicalTimelineEntry) => (
    <div
      key={entry.id}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        padding: "6px 0",
        borderBottom: "1px solid #f1f5f9",
      }}
    >
      <p style={{ ...lineStyle, margin: 0, fontSize: 12 }}>
        <strong style={{ color: "#0f172a" }}>
          {entry.displayTime ?? "—"} — {entry.categoryLabel}
        </strong>
        {entry.actorDisplay ? (
          <span style={{ color: "#64748b" }}> — {entry.actorDisplay}</span>
        ) : null}
      </p>
      <p style={{ ...lineStyle, margin: 0, fontSize: 12, color: "#475569" }}>{entry.summary}</p>
    </div>
  );

  if (timeline.all.length === 0) return null;

  return (
    <MedoraCard leftAccentColor="#6366f1" variant="default">
      <MedoraCardInner>
        <p style={sectionTitle}>{t("emergencyVisitSummaryPanel.clinicalTimelineTitle")}</p>
        <p style={{ ...lineStyle, margin: "4px 0 8px 0", fontSize: 12, color: "#64748b" }}>
          {t("emergencyVisitSummaryPanel.clinicalTimelineSubline")}
        </p>
        <div>{datedVisible.map(renderEntry)}</div>
        {timeline.undated.length > 0 ? (
          <div style={{ marginTop: 10 }}>
            <p style={{ ...sectionTitle, marginBottom: 6 }}>
              {t("emergencyVisitSummaryPanel.clinicalTimelineUndated")}
            </p>
            {timeline.undated.map(renderEntry)}
          </div>
        ) : null}
        {hiddenCount > 0 && !expanded ? (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            style={{
              marginTop: 8,
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid #c7d2fe",
              background: "#eef2ff",
              color: "#4338ca",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t("emergencyVisitSummaryPanel.clinicalTimelineShowAll")}
          </button>
        ) : null}
        {expanded && timeline.dated.length > CLINICAL_TIMELINE_COLLAPSE ? (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            style={{
              marginTop: 8,
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              background: "#f8fafc",
              color: "#475569",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t("emergencyVisitSummaryPanel.clinicalTimelineShowLess")}
          </button>
        ) : null}
      </MedoraCardInner>
    </MedoraCard>
  );
}

const linkPill: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "6px 12px",
  borderRadius: 8,
  border: "1px solid #bfdbfe",
  backgroundColor: "#eff6ff",
  color: "#1d4ed8",
  fontSize: 12,
  fontWeight: 600,
  textDecoration: "none",
};

function SummaryBlockCard({
  accent,
  block,
}: {
  accent: string;
  block: VisitSummaryTextBlock;
}) {
  if (!block.lines.length) return null;
  return (
    <MedoraCard leftAccentColor={accent} variant="default">
      <MedoraCardInner>
        <p style={sectionTitle}>{block.title}</p>
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
          {block.lines.map((line, i) => (
            <p key={i} style={{ ...lineStyle, fontWeight: line.startsWith("— ") ? 600 : 400 }}>
              {line}
            </p>
          ))}
        </div>
      </MedoraCardInner>
    </MedoraCard>
  );
}

/**
 * Read-only nursing reassessment column history card. Renders one entry block per persisted
 * column. Each entry shows time, structured-preview lines (compact), narrative excerpt, and an
 * immutable footer with the original performer's initials/name/role pulled from the event row's
 * snapshot — never the current logged-in user.
 */
function ReassessmentHistoryCard({
  entries,
  latestEntryId,
  t,
}: {
  entries: VisitSummaryReassessmentEntry[];
  latestEntryId: string | null;
  t: (k: string) => string;
}) {
  return (
    <MedoraCard leftAccentColor="#0ea5e9" variant="default">
      <MedoraCardInner>
        <p style={sectionTitle}>{t("emergencyVisitSummaryPanel.nursingReassessmentHistoryTitle")}</p>
        <p style={{ ...lineStyle, margin: "4px 0 8px 0", fontSize: 12, color: "#64748b" }}>
          {t("emergencyVisitSummaryPanel.nursingReassessmentHistorySubline")}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {entries.map((entry) => {
            const isLatest = entry.id === latestEntryId;
            return (
              <div
                key={entry.id}
                style={{
                  borderRadius: 10,
                  border: `1px solid ${isLatest ? "#bae6fd" : "#e2e8f0"}`,
                  backgroundColor: isLatest ? "#f0f9ff" : "#ffffff",
                  padding: "10px 12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 6,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
                    {entry.displayWhen || "—"}
                  </span>
                  {isLatest ? (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: "#0369a1",
                        backgroundColor: "#e0f2fe",
                        border: "1px solid #bae6fd",
                        borderRadius: 9999,
                        padding: "2px 8px",
                      }}
                    >
                      {t("emergencyVisitSummaryPanel.nursingReassessmentHistoryCurrent")}
                    </span>
                  ) : null}
                </div>
                {entry.structuredLines.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {entry.structuredLines.map((line, i) => (
                      <p key={i} style={{ ...lineStyle, margin: 0 }}>
                        {line}
                      </p>
                    ))}
                  </div>
                ) : null}
                {entry.narrativeExcerpt ? (
                  <p
                    style={{
                      ...lineStyle,
                      margin:
                        entry.structuredLines.length > 0 ? "6px 0 0 0" : "0",
                      color: "#475569",
                      fontStyle: "italic",
                    }}
                  >
                    {entry.narrativeExcerpt}
                  </p>
                ) : null}
                {entry.structuredLines.length === 0 && !entry.narrativeExcerpt ? (
                  <p style={{ ...lineStyle, margin: 0, color: "#94a3b8" }}>
                    {t("emergencyVisitSummaryPanel.nursingReassessmentHistoryEmptyEntry")}
                  </p>
                ) : null}
                <div
                  style={{
                    marginTop: 10,
                    paddingTop: 8,
                    borderTop: "1px solid #e2e8f0",
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 11,
                    color: "#475569",
                  }}
                >
                  <span
                    title={entry.performerDisplayName || undefined}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      backgroundColor: "#e2e8f0",
                      color: "#0f172a",
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  >
                    {entry.performerInitials || "—"}
                  </span>
                  <span style={{ fontWeight: 600, color: "#0f172a" }}>
                    {entry.performerDisplayName ||
                      t("emergencyVisitSummaryPanel.nursingReassessmentHistoryUnknownAuthor")}
                  </span>
                  {entry.performerRoleTitle ? (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        color: "#475569",
                        backgroundColor: "#f1f5f9",
                        borderRadius: 6,
                        padding: "2px 6px",
                      }}
                    >
                      {entry.performerRoleTitle}
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </MedoraCardInner>
    </MedoraCard>
  );
}

function DocumentationHistoryCard({
  accent,
  entries,
  latestEntryId,
  title,
  subline,
  t,
}: {
  accent: string;
  entries: VisitSummaryDocumentationHistoryEntry[];
  latestEntryId: string | null;
  title: string;
  subline: string;
  t: (k: string) => string;
}) {
  return (
    <MedoraCard leftAccentColor={accent} variant="default">
      <MedoraCardInner>
        <p style={sectionTitle}>{title}</p>
        <p style={{ ...lineStyle, margin: "4px 0 8px 0", fontSize: 12, color: "#64748b" }}>
          {subline}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {entries.map((entry) => {
            const isLatest = entry.id === latestEntryId;
            return (
              <div
                key={entry.id}
                style={{
                  borderRadius: 10,
                  border: `1px solid ${isLatest ? "#c7d2fe" : "#e2e8f0"}`,
                  backgroundColor: isLatest ? "#eef2ff" : "#ffffff",
                  padding: "10px 12px",
                }}
              >
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
                    {entry.displayWhen || "—"}
                  </span>
                  {isLatest ? (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: "#3730a3",
                        backgroundColor: "#e0e7ff",
                        border: "1px solid #c7d2fe",
                        borderRadius: 9999,
                        padding: "2px 8px",
                      }}
                    >
                      {t("emergencyVisitSummaryPanel.documentationHistoryCurrent")}
                    </span>
                  ) : null}
                </div>
                {entry.structuredLines.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {entry.structuredLines.map((line, i) => (
                      <p key={i} style={{ ...lineStyle, margin: 0 }}>
                        {line}
                      </p>
                    ))}
                  </div>
                ) : null}
                {entry.narrativeExcerpt ? (
                  <p
                    style={{
                      ...lineStyle,
                      margin: entry.structuredLines.length > 0 ? "6px 0 0 0" : "0",
                      color: "#475569",
                      fontStyle: "italic",
                    }}
                  >
                    {entry.narrativeExcerpt}
                  </p>
                ) : null}
                {entry.structuredLines.length === 0 && !entry.narrativeExcerpt ? (
                  <p style={{ ...lineStyle, margin: 0, color: "#94a3b8" }}>
                    {t("emergencyVisitSummaryPanel.documentationHistoryEmptyEntry")}
                  </p>
                ) : null}
                <div
                  style={{
                    marginTop: 10,
                    paddingTop: 8,
                    borderTop: "1px solid #e2e8f0",
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 11,
                    color: "#475569",
                  }}
                >
                  <span
                    title={entry.performerDisplayName || undefined}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      backgroundColor: "#e2e8f0",
                      color: "#0f172a",
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  >
                    {entry.performerInitials || "—"}
                  </span>
                  <span style={{ fontWeight: 600, color: "#0f172a" }}>
                    {entry.performerDisplayName || t("emergencyVisitSummaryPanel.documentationHistoryUnknownAuthor")}
                  </span>
                  {entry.performerRoleTitle ? (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        color: "#475569",
                        backgroundColor: "#f1f5f9",
                        borderRadius: 6,
                        padding: "2px 6px",
                      }}
                    >
                      {entry.performerRoleTitle}
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </MedoraCardInner>
    </MedoraCard>
  );
}

export function EmergencyVisitSummaryPanel({
  encounterId,
  facilityId,
  encounter,
  triageSnapshot,
  resultsRefresh,
  resultsTabHref,
  diagnosticsTabHref,
  ivAccessFetchEnabled = false,
  proceduresFetchEnabled = false,
}: {
  encounterId: string;
  facilityId: string;
  encounter: Parameters<typeof buildEmergencyVisitSummaryModel>[0];
  triageSnapshot: Record<string, unknown> | null;
  resultsRefresh: number;
  resultsTabHref: string;
  diagnosticsTabHref: string;
  /** When true, loads GET /encounters/:id/iv-access (roles RN, PROVIDER, LAB, RADIOLOGY, ADMIN only). */
  ivAccessFetchEnabled?: boolean;
  /** When true, loads GET /encounters/:id/procedures (same role set as IV quick actions). */
  proceduresFetchEnabled?: boolean;
}) {
  const { language, t } = useI18n();
  const [resultsSnap, setResultsSnap] = useState<EncounterResultsLabRadSnapshot | null>(null);

  /**
   * Append-only nursing reassessment column history fetched from
   * `GET /encounters/:id/nursing-reassessment-events`. We keep a separate state slot from the
   * derived model so a transient API failure (offline / role denied) renders gracefully: the
   * existing latest single-block (`resumeInfirmier`) keeps working, and the history section
   * simply doesn't appear instead of breaking the page. Refreshes alongside `resultsRefresh`
   * so a save in the bedside panel propagates here without an extra wiring layer.
   */
  const [reassessmentEvents, setReassessmentEvents] = useState<NursingReassessmentApiEntry[]>([]);
  const [reassessmentEventsLoadFailed, setReassessmentEventsLoadFailed] = useState(false);
  const [documentationEvents, setDocumentationEvents] = useState<ClinicalDocumentationEventApiEntry[]>([]);
  const [timelineOrders, setTimelineOrders] = useState<unknown[]>([]);
  const [timelineMarAdmins, setTimelineMarAdmins] = useState<unknown[]>([]);
  const [timelineProcedures, setTimelineProcedures] = useState<unknown[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch(`/encounters/${encounterId}/nursing-reassessment-events`, {
          facilityId,
        });
        if (cancelled) return;
        if (data && typeof data === "object" && !Array.isArray(data)) {
          const entries = (data as { entries?: unknown }).entries;
          if (Array.isArray(entries)) {
            setReassessmentEvents(entries as NursingReassessmentApiEntry[]);
            setReassessmentEventsLoadFailed(false);
            return;
          }
        }
        /** Defensive: API returned an unexpected shape — treat as no history. */
        setReassessmentEvents([]);
        setReassessmentEventsLoadFailed(false);
      } catch {
        if (cancelled) return;
        setReassessmentEvents([]);
        setReassessmentEventsLoadFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [encounterId, facilityId, resultsRefresh]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch(
          `/encounters/${encounterId}/clinical-documentation-events?types=PROVIDER_MSE_SAVED,HANDOFF_NURSING,DISCHARGE_SUMMARY_SAVED,ADMISSION_SUMMARY_SAVED,DISPOSITION_SUPPLEMENT_SAVED,TRIAGE_ASSESSMENT_SAVED`,
          { facilityId }
        );
        if (cancelled) return;
        const entries =
          data && typeof data === "object" && !Array.isArray(data)
            ? (data as { entries?: unknown }).entries
            : null;
        setDocumentationEvents(Array.isArray(entries) ? (entries as ClinicalDocumentationEventApiEntry[]) : []);
      } catch {
        if (cancelled) return;
        setDocumentationEvents([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [encounterId, facilityId, resultsRefresh]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [ordersRaw, adminsRaw, proceduresRaw] = await Promise.all([
          apiFetch(`/encounters/${encounterId}/orders`, { facilityId }),
          apiFetch(`/encounters/${encounterId}/medication-administrations`, { facilityId }),
          proceduresFetchEnabled
            ? apiFetch(`/encounters/${encounterId}/procedures`, { facilityId })
            : Promise.resolve(null),
        ]);
        if (cancelled) return;
        setTimelineOrders(Array.isArray(ordersRaw) ? ordersRaw : []);
        setTimelineMarAdmins(Array.isArray(adminsRaw) ? adminsRaw : []);
        const procedureEntries =
          proceduresRaw && typeof proceduresRaw === "object" && !Array.isArray(proceduresRaw)
            ? (proceduresRaw as { entries?: unknown }).entries
            : null;
        setTimelineProcedures(Array.isArray(procedureEntries) ? procedureEntries : []);
      } catch {
        if (!cancelled) {
          setTimelineOrders([]);
          setTimelineMarAdmins([]);
          setTimelineProcedures([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [encounterId, facilityId, resultsRefresh, proceduresFetchEnabled]);

  const onLabRadSnapshot = useCallback((s: EncounterResultsLabRadSnapshot) => {
    setResultsSnap(s);
  }, []);

  const model = useMemo(
    () =>
      buildEmergencyVisitSummaryModel(
        encounter,
        triageSnapshot,
        resultsSnap,
        language,
        reassessmentEvents,
        documentationEvents
      ),
    [encounter, triageSnapshot, resultsSnap, language, reassessmentEvents, documentationEvents]
  );

  const clinicalTimeline = useMemo(() => {
    const resultAcknowledgements =
      resultsSnap?.rows
        ?.map((row, idx) => {
          const item = row.item;
          const result = item?.result;
          const acknowledgedAt =
            result && typeof result === "object"
              ? (result as { acknowledgedByProviderAt?: string | null }).acknowledgedByProviderAt
              : null;
          if (!acknowledgedAt) return null;
          const label =
            typeof item?.displayLabel === "string"
              ? item.displayLabel
              : typeof item?.manualLabel === "string"
                ? item.manualLabel
                : "Result";
          return {
            id: `result-${idx}`,
            label,
            acknowledgedAt,
            acknowledgedBy: null,
          };
        })
        .filter((r): r is NonNullable<typeof r> => r != null) ?? [];

    return buildErClinicalTimeline({
      locale: language,
      t,
      encounter,
      triageSnapshot,
      nursingReassessmentHistory: model.nursingReassessmentHistory,
      orders: timelineOrders,
      marAdmins: timelineMarAdmins,
      procedureEntries: timelineProcedures,
      resultAcknowledgements,
    });
  }, [
    encounter,
    triageSnapshot,
    language,
    t,
    model.nursingReassessmentHistory,
    timelineOrders,
    timelineMarAdmins,
    timelineProcedures,
    resultsSnap,
  ]);

  const hasStructuredContent = useMemo(() => {
    return Boolean(
      model.motifPresentation ||
        model.triageResume ||
        model.initialNursingAssessment ||
        model.resumeInfirmier ||
        model.evaluationMedicale ||
        model.disposition ||
        model.providerDischargeDocumentation ||
        model.nursingDischargeDocumentation ||
        model.handoff ||
        model.emtala ||
        clinicalTimeline.all.length > 0 ||
        model.timeline.length > 0 ||
        model.nursingReassessmentHistory.length > 0 ||
        model.providerMseHistory.length > 0 ||
        model.handoffHistory.length > 0 ||
        model.dischargeSummaryHistory.length > 0 ||
        model.admissionSummaryHistory.length > 0 ||
        model.dispositionSupplementHistory.length > 0 ||
        model.triageAssessmentHistory.length > 0
    );
  }, [model, clinicalTimeline.all.length]);

  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr)",
    gap: 10,
    width: "100%",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
      <MedoraCard leftAccentColor="#0f172a" variant="default">
        <MedoraCardInner>
          <MedoraCardIdentity initials="S">
            <MedoraCardTitle
              title={t("emergencyVisitSummaryPanel.cardTitle")}
              subline={
                <p style={{ margin: 0, fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
                  {t("emergencyVisitSummaryPanel.cardSubline")}
                </p>
              }
            />
          </MedoraCardIdentity>
          <MedoraCardActions railBorderTopColor="#e2e8f0" gap={6} minWidth={0}>
            <Link href={resultsTabHref} style={linkPill}>
              {t("emergencyVisitSummaryPanel.linkResultsTab")}
            </Link>
            <Link href={diagnosticsTabHref} style={linkPill}>
              {t("emergencyVisitSummaryPanel.linkDiagnosticsTab")}
            </Link>
          </MedoraCardActions>
        </MedoraCardInner>
      </MedoraCard>

      <EncounterResultsTab
        encounterId={encounterId}
        facilityId={facilityId}
        refreshToken={resultsRefresh}
        onLabRadSnapshot={onLabRadSnapshot}
        embeddedDetailList={false}
        hideIntroNote
      />

      <ErIvAccessSummaryCard
        encounterId={encounterId}
        facilityId={facilityId}
        refreshToken={resultsRefresh}
        enabled={ivAccessFetchEnabled}
      />

      <ErProceduresSummaryCard
        encounterId={encounterId}
        facilityId={facilityId}
        refreshToken={resultsRefresh}
        enabled={proceduresFetchEnabled}
      />

      <ErMedicationMarSummaryCard
        encounterId={encounterId}
        facilityId={facilityId}
        refreshToken={resultsRefresh}
        enabled={proceduresFetchEnabled}
      />

      <EnterpriseEncounterCommandTimeline
        encounterId={encounterId}
        facilityId={facilityId}
        refreshToken={resultsRefresh}
        embedded
        limit={40}
      />

      <div style={gridStyle}>
        {model.motifPresentation ? (
          <SummaryBlockCard accent="#2563eb" block={model.motifPresentation} />
        ) : null}
        {model.triageResume ? <SummaryBlockCard accent="#b91c1c" block={model.triageResume} /> : null}
        {model.triageAssessmentHistory.length > 0 ? (
          <DocumentationHistoryCard
            accent="#b91c1c"
            entries={model.triageAssessmentHistory}
            latestEntryId={model.triageAssessmentLatestId}
            title={t("emergencyVisitSummaryPanel.triageAssessmentHistoryTitle")}
            subline={t("emergencyVisitSummaryPanel.triageAssessmentHistorySubline")}
            t={t}
          />
        ) : null}
        {model.initialNursingAssessment ? (
          <SummaryBlockCard accent="#0284c7" block={model.initialNursingAssessment} />
        ) : null}
        {model.resumeInfirmier ? <SummaryBlockCard accent="#0ea5e9" block={model.resumeInfirmier} /> : null}
        {/**
         * Nursing reassessment history (append-only). Renders one card per persisted column,
         * newest-first; the latest entry is tagged "Actuel". Each card carries an immutable
         * footer (initials badge + display name + role) sourced from the row's saved snapshot,
         * so prior clinicians' attributions never disappear when a different nurse adds a new
         * column. Hidden entirely when there are no events yet — the legacy single-block
         * `resumeInfirmier` above continues to render in that case.
         */}
        {model.nursingReassessmentHistory.length > 0 ? (
          <ReassessmentHistoryCard
            entries={model.nursingReassessmentHistory}
            latestEntryId={model.nursingReassessmentLatestId}
            t={t}
          />
        ) : reassessmentEventsLoadFailed ? (
          <MedoraCard leftAccentColor="#fbbf24" variant="default">
            <MedoraCardInner>
              <p style={sectionTitle}>
                {t("emergencyVisitSummaryPanel.nursingReassessmentHistoryTitle")}
              </p>
              <p style={{ ...lineStyle, marginTop: 8, color: "#92400e" }}>
                {t("emergencyVisitSummaryPanel.nursingReassessmentHistoryLoadError")}
              </p>
            </MedoraCardInner>
          </MedoraCard>
        ) : null}
        {model.evaluationMedicale ? <SummaryBlockCard accent="#4f46e5" block={model.evaluationMedicale} /> : null}
        {model.providerMseHistory.length > 0 ? (
          <DocumentationHistoryCard
            accent="#4f46e5"
            entries={model.providerMseHistory}
            latestEntryId={model.providerMseLatestId}
            title={t("emergencyVisitSummaryPanel.providerMseHistoryTitle")}
            subline={t("emergencyVisitSummaryPanel.providerMseHistorySubline")}
            t={t}
          />
        ) : null}

        {model.resultats ? (
          <MedoraCard leftAccentColor="#6366f1" variant="default">
            <MedoraCardInner>
              <p style={sectionTitle}>{t("emergencyVisitSummaryPanel.resultsPreviewTitle")}</p>
              {model.resultats.loading ? (
                <p style={{ ...lineStyle, marginTop: 8 }}>{t("common.loading")}</p>
              ) : model.resultats.failed ? (
                <p style={{ ...lineStyle, marginTop: 8, color: "#92400e", fontWeight: 600 }}>
                  {t("emergencyVisitSummaryPanel.resultsOffline")}
                </p>
              ) : model.resultats.empty ? (
                <p style={{ ...lineStyle, marginTop: 8, color: "#64748b" }}>
                  {t("emergencyVisitSummaryPanel.resultsEmpty")}
                </p>
              ) : (
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                  {model.resultats.labLine ? (
                    <p style={lineStyle}>
                      <strong style={{ color: "#0f172a" }}>{t("emergencyVisitSummaryPanel.labPrefix")}</strong>{" "}
                      {model.resultats.labLine}
                    </p>
                  ) : null}
                  {model.resultats.imagingLine ? (
                    <p style={lineStyle}>
                      <strong style={{ color: "#0f172a" }}>{t("emergencyVisitSummaryPanel.imagingPrefix")}</strong>{" "}
                      {model.resultats.imagingLine}
                    </p>
                  ) : null}
                  {model.resultats.priorityLines.length > 0 ? (
                    <div>
                      <p style={{ ...sectionTitle, marginBottom: 6 }}>{t("emergencyVisitSummaryPanel.priorityTitle")}</p>
                      {model.resultats.priorityLines.map((ln, i) => (
                        <p key={i} style={{ ...lineStyle, marginBottom: 4 }}>
                          {ln}
                        </p>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
            </MedoraCardInner>
          </MedoraCard>
        ) : null}

        {model.disposition ? <SummaryBlockCard accent="#64748b" block={model.disposition} /> : null}
        {model.providerDischargeDocumentation ?
          <SummaryBlockCard accent="#4f46e5" block={model.providerDischargeDocumentation} />
        : null}
        {model.nursingDischargeDocumentation ? (
          <SummaryBlockCard accent="#0891b2" block={model.nursingDischargeDocumentation} />
        ) : null}
        {model.dischargeSummaryHistory.length > 0 ? (
          <DocumentationHistoryCard
            accent="#64748b"
            entries={model.dischargeSummaryHistory}
            latestEntryId={model.dischargeSummaryLatestId}
            title={t("emergencyVisitSummaryPanel.dischargeSummaryHistoryTitle")}
            subline={t("emergencyVisitSummaryPanel.dischargeSummaryHistorySubline")}
            t={t}
          />
        ) : null}
        {model.admissionSummaryHistory.length > 0 ? (
          <DocumentationHistoryCard
            accent="#64748b"
            entries={model.admissionSummaryHistory}
            latestEntryId={model.admissionSummaryLatestId}
            title={t("emergencyVisitSummaryPanel.admissionSummaryHistoryTitle")}
            subline={t("emergencyVisitSummaryPanel.admissionSummaryHistorySubline")}
            t={t}
          />
        ) : null}
        {model.dispositionSupplementHistory.length > 0 ? (
          <DocumentationHistoryCard
            accent="#64748b"
            entries={model.dispositionSupplementHistory}
            latestEntryId={model.dispositionSupplementLatestId}
            title={t("emergencyVisitSummaryPanel.dispositionSupplementHistoryTitle")}
            subline={t("emergencyVisitSummaryPanel.dispositionSupplementHistorySubline")}
            t={t}
          />
        ) : null}
        {model.handoff ? <SummaryBlockCard accent="#0d9488" block={model.handoff} /> : null}
        {model.handoffHistory.length > 0 ? (
          <DocumentationHistoryCard
            accent="#0d9488"
            entries={model.handoffHistory}
            latestEntryId={model.handoffLatestId}
            title={t("emergencyVisitSummaryPanel.handoffHistoryTitle")}
            subline={t("emergencyVisitSummaryPanel.handoffHistorySubline")}
            t={t}
          />
        ) : null}
        {model.emtala ? <SummaryBlockCard accent="#0e7490" block={model.emtala} /> : null}

        {clinicalTimeline.all.length > 0 ? (
          <ClinicalTimelineCard timeline={clinicalTimeline} t={t} />
        ) : null}

        {model.timeline.length > 0 ? (
          <MedoraCard leftAccentColor="#94a3b8" variant="default">
            <MedoraCardInner>
              <p style={sectionTitle}>{t("emergencyVisitSummaryPanel.timelineTitle")}</p>
              <ul style={{ margin: "8px 0 0 0", paddingLeft: 18, fontSize: 13, color: "#475569", lineHeight: 1.45 }}>
                {model.timeline.map((item, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>
                    <strong style={{ color: "#334155" }}>{item.label}</strong>
                    {t("emergencyVisitSummaryPanel.timelineSep")}
                    {item.value}
                  </li>
                ))}
              </ul>
            </MedoraCardInner>
          </MedoraCard>
        ) : null}

        {!hasStructuredContent &&
        model.resultats &&
        !model.resultats.loading &&
        !model.resultats.failed &&
        model.resultats.empty ? (
          <MedoraCard leftAccentColor="#e2e8f0" variant="default">
            <MedoraCardInner>
              <p style={{ ...lineStyle, margin: 0, color: "#64748b" }}>{t("emergencyVisitSummaryPanel.emptyState")}</p>
            </MedoraCardInner>
          </MedoraCard>
        ) : null}
      </div>
    </div>
  );
}
