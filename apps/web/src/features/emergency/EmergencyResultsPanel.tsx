"use client";

import React, { useCallback, useMemo, useState } from "react";
import {
  EncounterResultsTab,
  type EncounterResultsLabRadSnapshot,
} from "@/components/encounters/EncounterResultsTab";
import { buildErResultsCockpitModel } from "@/features/emergency/emergencyResultsCockpitModel";
import { useI18n } from "@/lib/i18n";
import type { PrintFacilityInfo } from "@/lib/printFacilityHeader";
import type { ResultPrintEncounter, ResultPrintPatient } from "@/features/emergency/resultPrintPacket";
import {
  MedoraCard,
  MedoraCardBadge,
  MedoraCardBadgeRow,
  MedoraCardIdentity,
  MedoraCardInner,
  MedoraCardTitle,
  type PriorityBadgeSoft,
} from "@/components/medora-card";

const sectionLabel: React.CSSProperties = {
  margin: 0,
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "#64748b",
};

const BADGE_SOFT_NEUTRAL: PriorityBadgeSoft = { bg: "#f8fafc", text: "#64748b", border: "#e2e8f0" };

function fillTemplate(s: string, vars: Record<string, string | number>) {
  let out = s;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{${k}}`).join(String(v));
  }
  return out;
}

export function EmergencyResultsPanel({
  encounterId,
  facilityId,
  refreshToken,
  canAcknowledgeResults = false,
  patient,
  encounterMeta,
  facilityName,
  facility,
}: {
  encounterId: string;
  facilityId: string;
  refreshToken: number;
  /** Si true : affiche un bouton « Accuser réception » par résultat non encore accusé (RN/PROVIDER/ADMIN). */
  canAcknowledgeResults?: boolean;
  patient?: ResultPrintPatient | null;
  encounterMeta?: ResultPrintEncounter | null;
  facilityName?: string | null;
  facility?: PrintFacilityInfo | null;
}) {
  const { t } = useI18n();
  const [snap, setSnap] = useState<EncounterResultsLabRadSnapshot | null>(null);
  const onLabRadSnapshot = useCallback((s: EncounterResultsLabRadSnapshot) => {
    setSnap(s);
  }, []);

  const model = useMemo(() => buildErResultsCockpitModel(snap), [snap]);

  return (
    <MedoraCard leftAccentColor="#6366f1" variant="default">
      <MedoraCardInner>
        <div style={{ width: "100%", margin: "-4px 0 0 0" }}>
          <MedoraCardIdentity initials="R">
            <MedoraCardTitle
              title={t("emergencyResultsPanel.cardTitle")}
              subline={
                <p style={{ margin: 0, fontSize: 12, color: "#64748b", lineHeight: 1.35 }}>
                  {t("emergencyResultsPanel.cardSubline")}
                </p>
              }
            />
          </MedoraCardIdentity>

          <div
            data-testid="enterprise-results-summary-counts"
            style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}
          >
            {!model.ready ? (
              <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>{t("emergencyResultsPanel.loading")}</p>
            ) : model.failed ? (
              <p style={{ margin: 0, fontSize: 12, color: "#92400e", fontWeight: 600, lineHeight: 1.4 }}>
                {t("emergencyResultsPanel.offlineHint")}
              </p>
            ) : model.empty ? (
              <p style={{ margin: 0, fontSize: 12, color: "#64748b", lineHeight: 1.4 }}>{t("emergencyResultsPanel.emptyBody")}</p>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: 8,
                  alignItems: "stretch",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <p style={sectionLabel}>{t("emergencyResultsPanel.sectionLab")}</p>
                  <p style={{ margin: 0, fontSize: 11, color: "#94a3b8" }}>
                    {fillTemplate(t("emergencyResultsPanel.labCountLine"), { count: model.labTotal })}
                  </p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <p style={sectionLabel}>{t("emergencyResultsPanel.sectionImaging")}</p>
                  <p style={{ margin: 0, fontSize: 11, color: "#94a3b8" }}>
                    {fillTemplate(t("emergencyResultsPanel.imagingCountLine"), { count: model.imagingTotal })}
                  </p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <p style={sectionLabel}>{t("emergencyResultsPanel.sectionPriority")}</p>
                  <MedoraCardBadgeRow marginTop={0}>
                    {model.priorityRows.length === 0 ? (
                      <MedoraCardBadge soft={BADGE_SOFT_NEUTRAL}>{t("emergencyResultsPanel.nothingToReport")}</MedoraCardBadge>
                    ) : (
                      <MedoraCardBadge soft={{ bg: "#fef2f2", text: "#991b1b", border: "#fecaca" }}>
                        {String(model.priorityRows.length)}
                      </MedoraCardBadge>
                    )}
                    {model.pendingSyncCount > 0 ? (
                      <MedoraCardBadge soft={{ bg: "#fffbeb", text: "#92400e", border: "#fde68a" }}>
                        {fillTemplate(t("emergencyResultsPanel.pendingSyncBadge"), {
                          count: model.pendingSyncCount,
                        })}
                      </MedoraCardBadge>
                    ) : null}
                  </MedoraCardBadgeRow>
                </div>
              </div>
            )}
          </div>
        </div>

        <div data-testid="enterprise-results-detail-list" style={{ marginTop: 10, width: "100%" }}>
          <EncounterResultsTab
            encounterId={encounterId}
            facilityId={facilityId}
            refreshToken={refreshToken}
            onLabRadSnapshot={onLabRadSnapshot}
            hideIntroNote
            embeddedDetailList
            compactResultViewer
            suppressEmptyDetailPlaceholder
            canAcknowledgeResults={canAcknowledgeResults}
            patient={patient}
            encounterMeta={encounterMeta}
            facilityName={facilityName}
            facility={facility}
            enableResultPrint
          />
        </div>
      </MedoraCardInner>
    </MedoraCard>
  );
}
