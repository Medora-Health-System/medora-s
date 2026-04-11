"use client";

import React from "react";
import { useI18n } from "@/lib/i18n";
import type { MsppFacilityDossier } from "@/lib/msppApi";

const BLOCK: React.CSSProperties = {
  padding: 12,
  borderRadius: 12,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  marginBottom: 12,
};

const ROW_LABEL: React.CSSProperties = {
  fontSize: 11,
  color: "#64748b",
  fontWeight: 600,
  marginBottom: 2,
};

const ROW_VAL: React.CSSProperties = {
  fontSize: 14,
  color: "#0f172a",
  lineHeight: 1.45,
};

const SUBHEAD: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: "#334155",
  marginBottom: 8,
};

function dash(s: string | null | undefined, dashChar: string): string {
  const t = s?.trim();
  return t ? t : dashChar;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={ROW_LABEL}>{label}</div>
      <div style={ROW_VAL}>{children}</div>
    </div>
  );
}

function formatWhen(iso: string | null | undefined, dashChar: string): string {
  if (!iso) return dashChar;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return dashChar;
    return d.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return dashChar;
  }
}

function formatDateOnly(iso: string | null | undefined, dashChar: string): string {
  if (!iso) return dashChar;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return dashChar;
    return d.toLocaleDateString("fr-FR", { dateStyle: "medium" });
  } catch {
    return dashChar;
  }
}

type Props = {
  dossier: MsppFacilityDossier | null;
};

export function MsppFacilityDossierReadonly({ dossier }: Props) {
  const { t } = useI18n();
  const dch = t("msppValidation.badgeDash");

  const boolFr = (v: boolean | null | undefined) => {
    if (v === true) return t("common.yes");
    if (v === false) return t("common.no");
    return t("msppValidation.dossierTriUnknown");
  };

  const caseStatusFr = (code: string) => {
    const key = `diseaseReports.statuses.${code}`;
    const out = t(key);
    return out === key ? code : out;
  };

  const provClassFr = (code: string | null | undefined) => {
    if (!code) return dch;
    const key = `msppValidation.caseClassification.${code}`;
    const out = t(key);
    return out === key ? code : out;
  };

  const labFr = (code: string | null | undefined) => {
    if (!code) return dch;
    const key = `msppValidation.labEvidenceType.${code}`;
    const out = t(key);
    return out === key ? code : out;
  };

  const sexFr = (code: string | null | undefined) => {
    if (!code) return null;
    const key = `msppValidation.patientSex.${code}`;
    const out = t(key);
    return out === key ? code : out;
  };

  if (!dossier) {
    return (
      <p style={{ fontSize: 14, color: "#92400e", margin: 0, padding: 12, background: "#fffbeb", borderRadius: 12 }}>
        {t("msppValidation.dossierEmpty")}
      </p>
    );
  }

  const agePart =
    dossier.patientAgeYears != null
      ? `${dossier.patientAgeYears} ${t("msppValidation.ageYearsSuffix")}`
      : null;
  const sexLabel = sexFr(dossier.patientSex);
  const patientMeta = [sexLabel, agePart].filter(Boolean).join(" · ");

  return (
    <div style={{ fontSize: 14 }}>
      <div style={BLOCK}>
        <div style={SUBHEAD}>{t("msppValidation.dossierBlockIdentity")}</div>
        <Row label={t("msppValidation.dossierPatient")}>
          {dash(dossier.patientFullName, dch)}
          {patientMeta ? <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{patientMeta}</div> : null}
        </Row>
        <Row label={t("msppValidation.dossierIdentifier")}>{dash(dossier.patientPrimaryIdentifier, dch)}</Row>
        <Row label={t("msppValidation.dossierFacility")}>{dossier.facilityName}</Row>
        <Row label={t("msppValidation.dossierEncounterRoom")}>{dash(dossier.reportEncounterRoomLabel, dch)}</Row>
        <Row label={t("msppValidation.dossierReporter")}>{dash(dossier.reporterName, dch)}</Row>
        <Row label={t("msppValidation.dossierReporterRole")}>{dash(dossier.reporterRole, dch)}</Row>
        <Row label={t("msppValidation.dossierDeclarationDate")}>{formatWhen(dossier.reportedAt, dch)}</Row>
      </div>

      <div style={BLOCK}>
        <div style={SUBHEAD}>{t("msppValidation.dossierBlockDisease")}</div>
        <Row label={t("msppValidation.dossierDisease")}>
          <strong>{dossier.diseaseName}</strong>
          <span style={{ color: "#64748b", marginLeft: 8 }}>({dossier.diseaseCode})</span>
        </Row>
        <Row label={t("msppValidation.dossierReportCaseStatus")}>{caseStatusFr(dossier.reportCaseStatus)}</Row>
      </div>

      <div style={BLOCK}>
        <div style={SUBHEAD}>{t("msppValidation.dossierBlockGeo")}</div>
        <Row label={t("msppValidation.dossierGeography")}>
          {dash(dossier.department, dch)}
          {dossier.commune ? (
            <span>
              {" "}
              — <span style={{ fontWeight: 600 }}>{dossier.commune}</span>
            </span>
          ) : null}
        </Row>
      </div>

      <div style={BLOCK}>
        <div style={SUBHEAD}>{t("msppValidation.dossierBlockSigns")}</div>
        <Row label={t("msppValidation.dossierOnset")}>{formatDateOnly(dossier.onsetDate, dch)}</Row>
        <Row label={t("msppValidation.dossierFever")}>{boolFr(dossier.feverReported)}</Row>
        <Row label={t("msppValidation.dossierSymptomDuration")}>{dash(dossier.symptomDuration, dch)}</Row>
        <Row label={t("msppValidation.dossierHospitalized")}>{boolFr(dossier.hospitalized)}</Row>
        <Row label={t("msppValidation.dossierOutcome")}>{dash(dossier.outcomeStatus, dch)}</Row>
      </div>

      <div style={BLOCK}>
        <div style={SUBHEAD}>{t("msppValidation.dossierBlockLab")}</div>
        <Row label={t("msppValidation.dossierLabConfirmed")}>{boolFr(dossier.labConfirmed)}</Row>
        <Row label={t("msppValidation.dossierLabEvidence")}>{labFr(dossier.labEvidenceType)}</Row>
      </div>

      <div style={BLOCK}>
        <div style={SUBHEAD}>{t("msppValidation.dossierBlockExposure")}</div>
        <Row label={t("msppValidation.dossierEpi")}>{boolFr(dossier.epiLinkedCase)}</Row>
        <Row label={t("msppValidation.dossierTravel")}>
          <span style={{ whiteSpace: "pre-wrap" }}>{dash(dossier.travelOrExposureContext, dch)}</span>
        </Row>
      </div>

      <div style={BLOCK}>
        <div style={SUBHEAD}>{t("msppValidation.dossierBlockSummary")}</div>
        <Row label={t("msppValidation.dossierProvisionalClassification")}>
          {provClassFr(dossier.provisionalCaseClassification)}
        </Row>
        <Row label={t("msppValidation.dossierClinicalSummary")}>
          <span style={{ whiteSpace: "pre-wrap" }}>{dash(dossier.clinicalSummary, dch)}</span>
        </Row>
        <Row label={t("msppValidation.dossierNotesExtra")}>
          <span style={{ whiteSpace: "pre-wrap" }}>{dash(dossier.notes, dch)}</span>
        </Row>
      </div>
    </div>
  );
}
