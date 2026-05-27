"use client";

import React from "react";
import type { PatientClinicalHistoryProfile } from "@/features/emergency/patientClinicalHistoryProfile";
import { buildPatientClinicalHistorySummary } from "@/features/emergency/patientClinicalHistoryProfile";
import { useI18n } from "@/lib/i18n";

const SECTION_LABEL: Record<string, string> = {
  allergies: "patientChartUi.clinicalHistorySectionAllergies",
  homeMedications: "patientChartUi.clinicalHistorySectionHomeMeds",
  medicalHistory: "patientChartUi.clinicalHistorySectionPmh",
  surgicalHistory: "patientChartUi.clinicalHistorySectionPsh",
  socialHistory: "patientChartUi.clinicalHistorySectionSocial",
};

function formatDate(iso: string | null | undefined, language: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(language === "fr" ? "fr-FR" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function sectionText(
  profile: PatientClinicalHistoryProfile,
  section: keyof PatientClinicalHistoryProfile
): string | null {
  switch (section) {
    case "allergies": {
      const a = profile.allergies;
      if (!a) return null;
      const parts = [a.allergyNote, a.medicationAllergiesDetail, a.foodAllergiesDetail, a.additionalAllergyInfo]
        .filter(Boolean)
        .map((x) => String(x).trim())
        .filter(Boolean);
      return parts.length ? parts.join(" · ") : null;
    }
    case "homeMedications":
      return profile.homeMedications?.medicationsSummary?.trim() || null;
    case "medicalHistory":
      return profile.medicalHistory?.pastMedicalHistory?.trim() || null;
    case "surgicalHistory":
      return profile.surgicalHistory?.pastSurgicalHistory?.trim() || null;
    case "socialHistory": {
      const s = profile.socialHistory;
      if (!s) return null;
      return [s.smokingStatus, s.alcoholUse, s.marijuanaUse, s.stimulantUse, s.opioidHeroinUse, s.historySocialComments]
        .filter(Boolean)
        .map((x) => String(x).trim())
        .filter(Boolean)
        .join(" · ") || null;
    }
    default:
      return null;
  }
}

export function PatientClinicalHistoryProfileBlock({
  profile,
}: {
  profile: PatientClinicalHistoryProfile | null | undefined;
}) {
  const { t, language } = useI18n();
  const summary = buildPatientClinicalHistorySummary(profile ?? null);
  if (!summary.hasProfile) return null;

  const rows = summary.sections
    .map((row) => {
      const text = profile ? sectionText(profile, row.section) : null;
      if (!text) return null;
      return { ...row, text };
    })
    .filter(Boolean) as Array<{
    section: string;
    text: string;
    lastReviewedAt: string | null;
    sourceEncounterDate: string | null;
  }>;

  if (!rows.length) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
        {t("patientChartUi.clinicalHistoryUpdatedAt").replace(
          "{date}",
          formatDate(summary.updatedAt, language)
        )}
      </p>
      {rows.map((row) => (
        <div
          key={row.section}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #e2e8f0",
            background: "#fff",
          }}
        >
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
            {t(SECTION_LABEL[row.section] ?? "patientChartUi.clinicalHistorySectionAllergies")}
          </div>
          <div style={{ fontSize: 13, color: "#334155", whiteSpace: "pre-wrap" }}>{row.text}</div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 6 }}>
            {t("patientChartUi.clinicalHistoryLastReviewed")
              .replace("{date}", formatDate(row.lastReviewedAt ?? row.sourceEncounterDate, language))}
          </div>
        </div>
      ))}
    </div>
  );
}
