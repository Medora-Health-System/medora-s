"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";

const btn: React.CSSProperties = {
  padding: "8px 12px",
  fontSize: 13,
  fontWeight: 500,
  border: "1px solid #c5c5c5",
  borderRadius: 6,
  background: "#fafafa",
  cursor: "pointer",
  textAlign: "center",
  lineHeight: 1.35,
};

const btnDisabled: React.CSSProperties = {
  ...btn,
  opacity: 0.5,
  cursor: "not-allowed",
};

export function PatientQuickActions({
  clinicalChartAccess,
  isRNOnly,
  isProviderLike,
  isFrontDeskQuick,
  isBillingOnlyQuick,
  openEncounter,
  canOpenEncounterDetail,
  canPrescribe,
  chartSummaryReady,
  onTabEncounters,
  onTabResults,
  onTabSummary,
  onAddDiagnosis,
  onAddFollowUp,
  onEditPatient,
  onPendingCreateEncounter,
}: {
  clinicalChartAccess: boolean;
  isRNOnly: boolean;
  isProviderLike: boolean;
  isFrontDeskQuick: boolean;
  isBillingOnlyQuick: boolean;
  openEncounter: { id: string } | null | undefined;
  canOpenEncounterDetail: boolean;
  canPrescribe: boolean;
  chartSummaryReady: boolean;
  onTabEncounters: () => void;
  onTabResults: () => void;
  onTabSummary: () => void;
  onAddDiagnosis: () => void;
  onAddFollowUp: () => void;
  onEditPatient: () => void;
  onPendingCreateEncounter: () => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const show =
    clinicalChartAccess || isFrontDeskQuick || isBillingOnlyQuick;

  if (!show) return null;

  return (
    <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #eee" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#616161", marginBottom: 10, textTransform: "uppercase" }}>
        {t("patientQuickActions.sectionTitle")}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(168px, 1fr))",
          gap: 8,
        }}
      >
        {clinicalChartAccess && isRNOnly && (
          <>
            <button
              type="button"
              style={openEncounter && canOpenEncounterDetail ? btn : btnDisabled}
              disabled={!openEncounter || !canOpenEncounterDetail}
              title={
                !openEncounter
                  ? t("patientQuickActions.noOpenEncounter")
                  : !canOpenEncounterDetail
                    ? t("patientQuickActions.accessDenied")
                    : undefined
              }
              onClick={() => {
                if (openEncounter && canOpenEncounterDetail) {
                  router.push(`/app/encounters/${openEncounter.id}?tab=triage`);
                }
              }}
            >
              {t("patientQuickActions.enterVitals")}
            </button>
            <button type="button" style={btn} onClick={onTabEncounters}>
              {t("patientQuickActions.viewEncounters")}
            </button>
            <button
              type="button"
              style={openEncounter && canOpenEncounterDetail ? btn : btnDisabled}
              disabled={!openEncounter || !canOpenEncounterDetail}
              title={!openEncounter ? t("patientQuickActions.noOpenEncounter") : undefined}
              onClick={() => {
                if (openEncounter && canOpenEncounterDetail) {
                  router.push(`/app/encounters/${openEncounter.id}?tab=notes`);
                }
              }}
            >
              {t("patientQuickActions.addNote")}
            </button>
            <button type="button" style={btn} onClick={onAddFollowUp}>
              {t("patientQuickActions.addFollowUp")}
            </button>
          </>
        )}

        {clinicalChartAccess && isProviderLike && (
          <>
            <button
              type="button"
              style={btn}
              onClick={() => {
                if (openEncounter && canOpenEncounterDetail) {
                  router.push(`/app/encounters/${openEncounter.id}`);
                } else {
                  onTabEncounters();
                  onPendingCreateEncounter();
                }
              }}
            >
              {openEncounter ? t("patientQuickActions.openEncounterOrStart") : t("patientQuickActions.startEncounter")}
            </button>
            <button
              type="button"
              style={chartSummaryReady ? btn : { ...btnDisabled, opacity: 0.55 }}
              disabled={!chartSummaryReady}
              title={!chartSummaryReady ? t("patientQuickActions.chartLoading") : undefined}
              onClick={() => chartSummaryReady && onAddDiagnosis()}
            >
              {t("patientQuickActions.addDiagnosis")}
            </button>
            <button
              type="button"
              style={
                openEncounter && canOpenEncounterDetail && canPrescribe ? btn : { ...btnDisabled, opacity: 0.65 }
              }
              disabled={!openEncounter || !canOpenEncounterDetail || !canPrescribe}
              title={
                !canPrescribe
                  ? t("patientQuickActions.prescRightRequired")
                  : !openEncounter
                    ? t("patientQuickActions.openOrCreateEncounter")
                    : undefined
              }
              onClick={() => {
                if (openEncounter && canOpenEncounterDetail && canPrescribe) {
                  router.push(`/app/encounters/${openEncounter.id}?tab=orders`);
                }
              }}
            >
              {t("patientQuickActions.createOrder")}
            </button>
            <button type="button" style={btn} onClick={onTabResults}>
              {t("patientQuickActions.viewResults")}
            </button>
            <button type="button" style={btn} onClick={onAddFollowUp}>
              {t("patientQuickActions.addFollowUp")}
            </button>
          </>
        )}

        {isFrontDeskQuick && (
          <>
            <button
              type="button"
              style={btn}
              onClick={() => {
                onTabEncounters();
                onPendingCreateEncounter();
              }}
            >
              {t("patientQuickActions.newEncounter")}
            </button>
            <button type="button" style={btn} onClick={onAddFollowUp}>
              {t("patientQuickActions.addFollowUp")}
            </button>
            <button type="button" style={btn} onClick={onEditPatient}>
              {t("patientQuickActions.editPatientInfo")}
            </button>
          </>
        )}

        {isBillingOnlyQuick && (
          <button type="button" style={btn} onClick={onTabSummary}>
            {t("patientQuickActions.patientSummary")}
          </button>
        )}
      </div>
    </div>
  );
}
