"use client";

import React, { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { EncounterResultsTab, type EncounterResultsLabRadSnapshot } from "@/components/encounters/EncounterResultsTab";
import {
  MedoraCard,
  MedoraCardActions,
  MedoraCardIdentity,
  MedoraCardInner,
  MedoraCardTitle,
} from "@/components/medora-card";
import { useI18n } from "@/lib/i18n";
import { buildEmergencyVisitSummaryModel, type VisitSummaryTextBlock } from "./emergencyVisitSummaryModel";

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

export function EmergencyVisitSummaryPanel({
  encounterId,
  facilityId,
  encounter,
  triageSnapshot,
  resultsRefresh,
  resultsTabHref,
  diagnosticsTabHref,
}: {
  encounterId: string;
  facilityId: string;
  encounter: Parameters<typeof buildEmergencyVisitSummaryModel>[0];
  triageSnapshot: Record<string, unknown> | null;
  resultsRefresh: number;
  resultsTabHref: string;
  diagnosticsTabHref: string;
}) {
  const { language, t } = useI18n();
  const [resultsSnap, setResultsSnap] = useState<EncounterResultsLabRadSnapshot | null>(null);
  const onLabRadSnapshot = useCallback((s: EncounterResultsLabRadSnapshot) => {
    setResultsSnap(s);
  }, []);

  const model = useMemo(
    () => buildEmergencyVisitSummaryModel(encounter, triageSnapshot, resultsSnap, language),
    [encounter, triageSnapshot, resultsSnap, language]
  );

  const hasStructuredContent = useMemo(() => {
    return Boolean(
      model.motifPresentation ||
        model.triageResume ||
        model.resumeInfirmier ||
        model.evaluationMedicale ||
        model.disposition ||
        model.handoff ||
        model.emtala ||
        model.timeline.length > 0
    );
  }, [model]);

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

      <div style={gridStyle}>
        {model.motifPresentation ? (
          <SummaryBlockCard accent="#2563eb" block={model.motifPresentation} />
        ) : null}
        {model.triageResume ? <SummaryBlockCard accent="#b91c1c" block={model.triageResume} /> : null}
        {model.resumeInfirmier ? <SummaryBlockCard accent="#0ea5e9" block={model.resumeInfirmier} /> : null}
        {model.evaluationMedicale ? <SummaryBlockCard accent="#4f46e5" block={model.evaluationMedicale} /> : null}

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
        {model.handoff ? <SummaryBlockCard accent="#0d9488" block={model.handoff} /> : null}
        {model.emtala ? <SummaryBlockCard accent="#0e7490" block={model.emtala} /> : null}

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
