"use client";

import React from "react";
import { useI18n } from "@/lib/i18n";
import type { MsppDepartmentReviewSnapshot } from "@/lib/msppApi";

const BLOCK: React.CSSProperties = {
  padding: 12,
  borderRadius: 12,
  background: "#f0fdf4",
  border: "1px solid #bbf7d0",
  marginBottom: 12,
};

const ROW_LABEL: React.CSSProperties = {
  fontSize: 11,
  color: "#166534",
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
  color: "#14532d",
  marginBottom: 8,
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={ROW_LABEL}>{label}</div>
      <div style={ROW_VAL}>{children}</div>
    </div>
  );
}

function formatWhen(iso: string | null | undefined, dash: string): string {
  if (!iso) return dash;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return dash;
    return d.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return dash;
  }
}

function formatDateOnly(iso: string | null | undefined, dash: string): string {
  if (!iso) return dash;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return dash;
    return d.toLocaleDateString("fr-FR", { dateStyle: "medium" });
  } catch {
    return dash;
  }
}

type Props = {
  snapshot: MsppDepartmentReviewSnapshot | null;
};

export function MsppDepartmentReviewReadonly({ snapshot }: Props) {
  const { t } = useI18n();
  const dch = t("msppValidation.badgeDash");

  const boolFr = (v: boolean | null | undefined) => {
    if (v === true) return t("common.yes");
    if (v === false) return t("common.no");
    return t("msppValidation.dossierTriUnknown");
  };

  const caseClassFr = (code: string | null | undefined) => {
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

  const exposureFr = (code: string | null | undefined) => {
    if (!code) return dch;
    const key = `msppValidation.exposureRisk.${code}`;
    const out = t(key);
    return out === key ? code : out;
  };

  const statusFr = (code: string) => {
    const key = `msppValidation.reviewStatus.${code}`;
    const out = t(key);
    return out === key ? code : out;
  };

  const levelFr = (lv: string) => {
    const key = `msppValidation.reviewerLevel.${lv}`;
    const out = t(key);
    return out === key ? lv : out;
  };

  if (!snapshot) {
    return (
      <p style={{ fontSize: 14, color: "#92400e", margin: 0, padding: 12, background: "#fffbeb", borderRadius: 12 }}>
        {t("msppValidation.deptReviewUnavailable")}
      </p>
    );
  }

  return (
    <div style={{ fontSize: 14 }}>
      <div style={BLOCK}>
        <div style={SUBHEAD}>{t("msppValidation.deptReviewMeta")}</div>
        <Row label={t("msppValidation.deptReviewStatus")}>{statusFr(snapshot.reviewStatus)}</Row>
        <Row label={t("msppValidation.deptReviewLevel")}>{levelFr(snapshot.reviewerLevel)}</Row>
        <Row label={t("msppValidation.deptReviewStructUpdated")}>
          {formatWhen(snapshot.reviewedAt, dch)}
        </Row>
        <Row label={t("msppValidation.deptReviewRecordUpdated")}>
          {formatWhen(snapshot.updatedAt, dch)}
        </Row>
      </div>

      <div style={{ ...BLOCK, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
        <div style={{ ...SUBHEAD, color: "#334155" }}>{t("msppValidation.deptReviewBlockInitial")}</div>
        <Row label={t("msppValidation.checklistFever")}>{boolFr(snapshot.validationFever)}</Row>
        <Row label={t("msppValidation.checklistDuration")}>
          {snapshot.validationDuration?.trim() ? snapshot.validationDuration : dch}
        </Row>
        <Row label={t("msppValidation.checklistLab")}>{boolFr(snapshot.validationLabConfirmed)}</Row>
        <Row label={t("msppValidation.checklistExposure")}>
          {exposureFr(snapshot.validationExposureRisk)}
        </Row>
      </div>

      <div style={{ ...BLOCK, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
        <div style={{ ...SUBHEAD, color: "#334155" }}>{t("msppValidation.deptReviewBlockCase")}</div>
        <Row label={t("msppValidation.fieldCaseClassification")}>{caseClassFr(snapshot.caseClassification)}</Row>
        <Row label={t("msppValidation.fieldSymptomOnset")}>
          {formatDateOnly(snapshot.symptomOnsetDate, dch)}
        </Row>
        <Row label={t("msppValidation.fieldHospitalized")}>{boolFr(snapshot.hospitalized)}</Row>
        <Row label={t("msppValidation.fieldOutcomeStatus")}>
          {snapshot.outcomeStatus?.trim() ? snapshot.outcomeStatus : dch}
        </Row>
        <Row label={t("msppValidation.fieldLabEvidenceType")}>{labFr(snapshot.labEvidenceType)}</Row>
        <Row label={t("msppValidation.fieldEpiLinked")}>{boolFr(snapshot.epiLinkedCase)}</Row>
        <Row label={t("msppValidation.fieldTravelExposure")}>
          <span style={{ whiteSpace: "pre-wrap" }}>
            {snapshot.travelOrExposureContext?.trim() ? snapshot.travelOrExposureContext : dch}
          </span>
        </Row>
      </div>

      <div style={{ ...BLOCK, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
        <div style={{ ...SUBHEAD, color: "#334155" }}>{t("msppValidation.sectionInclusion")}</div>
        <p style={{ ...ROW_VAL, whiteSpace: "pre-wrap", margin: 0 }}>
          {snapshot.inclusionCriteriaSummary?.trim() ? snapshot.inclusionCriteriaSummary : dch}
        </p>
      </div>

      <div style={{ ...BLOCK, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
        <div style={{ ...SUBHEAD, color: "#334155" }}>{t("msppValidation.sectionExclusion")}</div>
        <p style={{ ...ROW_VAL, whiteSpace: "pre-wrap", margin: 0 }}>
          {snapshot.exclusionCriteriaSummary?.trim() ? snapshot.exclusionCriteriaSummary : dch}
        </p>
      </div>

      <div style={{ ...BLOCK, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
        <div style={{ ...SUBHEAD, color: "#334155" }}>{t("msppValidation.deptReviewMotivation")}</div>
        <p style={{ ...ROW_VAL, whiteSpace: "pre-wrap", margin: 0 }}>
          {snapshot.finalDecisionRationale?.trim() ? snapshot.finalDecisionRationale : dch}
        </p>
      </div>
    </div>
  );
}
