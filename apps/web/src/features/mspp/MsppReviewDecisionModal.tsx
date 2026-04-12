"use client";

import React, { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Field, inputStyle } from "@/components/pharmacy/Modal";
import type {
  MsppDepartmentReviewSnapshot,
  MsppFacilityDossier,
  MsppReviewActionBody,
} from "@/lib/msppApi";
import { MEDORA_CARD_SHELL } from "@/components/medora-card";
import { MsppFacilityDossierReadonly } from "@/features/mspp/MsppFacilityDossierReadonly";
import { MsppDepartmentReviewReadonly } from "@/features/mspp/MsppDepartmentReviewReadonly";
import { buildReviewActionBodyFromFacilityDossier } from "@/features/mspp/msppReviewPayloadFromDossier";
import { buildReviewActionBodyForCentral } from "@/features/mspp/msppCentralReviewPayload";
import { MsppReviewGuidancePanel } from "@/features/mspp/MsppReviewGuidancePanel";

const OVERLAY: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,0.45)",
  zIndex: 1000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
};

const PANEL: React.CSSProperties = {
  background: MEDORA_CARD_SHELL.background,
  border: MEDORA_CARD_SHELL.border,
  borderRadius: MEDORA_CARD_SHELL.radius,
  boxShadow: MEDORA_CARD_SHELL.boxShadow,
  maxWidth: 960,
  width: "100%",
  maxHeight: "92vh",
  overflow: "auto",
  padding: "20px 22px",
};

const BTN_ROW: React.CSSProperties = {
  display: "flex",
  gap: 10,
  marginTop: 16,
  flexWrap: "wrap",
};

const BTN_PRIMARY: React.CSSProperties = {
  padding: "10px 18px",
  backgroundColor: "#1a1a1a",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 14,
};

const BTN_GHOST: React.CSSProperties = {
  ...BTN_PRIMARY,
  backgroundColor: "#f1f5f9",
  color: "#0f172a",
};

const SECTION_HEAD: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: "#0f172a",
  marginTop: 18,
  marginBottom: 10,
  borderBottom: "1px solid #e2e8f0",
  paddingBottom: 6,
};

export type MsppReviewDecisionModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  onConfirm: (body: MsppReviewActionBody) => Promise<void>;
  submitting: boolean;
  facilityDossier?: MsppFacilityDossier | null;
  /** Revue structurée enregistrée (chaîne département) — requis pour la décision centrale. */
  departmentReview?: MsppDepartmentReviewSnapshot | null;
  variant?: "department" | "central";
  /** Profil d’aide (code maladie) — lecture seule. */
  reviewGuidanceProfileId?: string | null;
};

const CASE_CLASSIFICATION = ["SUSPECT", "PROBABLE", "CONFIRMED", "NOT_A_CASE"] as const;

export function MsppReviewDecisionModal({
  open,
  title,
  onClose,
  onConfirm,
  submitting,
  facilityDossier = null,
  departmentReview = null,
  variant = "central",
  reviewGuidanceProfileId = null,
}: MsppReviewDecisionModalProps) {
  const { t } = useI18n();

  /** Revue départementale (saisie validateur). */
  const [comment, setComment] = useState("");
  const [caseClassification, setCaseClassification] =
    useState<(typeof CASE_CLASSIFICATION)[number]>("SUSPECT");
  const [inclusionCriteriaSummary, setInclusionCriteriaSummary] = useState("");
  const [exclusionCriteriaSummary, setExclusionCriteriaSummary] = useState("");
  const [finalDecisionRationale, setFinalDecisionRationale] = useState("");

  /** Décision centrale (saisie seule). */
  const [centralComment, setCentralComment] = useState("");
  const [centralClassification, setCentralClassification] =
    useState<(typeof CASE_CLASSIFICATION)[number]>("SUSPECT");
  const [centralFinalRationale, setCentralFinalRationale] = useState("");
  const [centralEpiComment, setCentralEpiComment] = useState("");

  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLocalError(null);
    if (variant === "department") {
      setComment("");
      const pc = facilityDossier?.provisionalCaseClassification;
      if (pc && (CASE_CLASSIFICATION as readonly string[]).includes(pc)) {
        setCaseClassification(pc as (typeof CASE_CLASSIFICATION)[number]);
      } else {
        setCaseClassification("SUSPECT");
      }
      setInclusionCriteriaSummary("");
      setExclusionCriteriaSummary("");
      setFinalDecisionRationale("");
      return;
    }
    setCentralComment("");
    const cc = departmentReview?.caseClassification;
    if (cc && (CASE_CLASSIFICATION as readonly string[]).includes(cc)) {
      setCentralClassification(cc as (typeof CASE_CLASSIFICATION)[number]);
    } else {
      setCentralClassification("SUSPECT");
    }
    setCentralFinalRationale("");
    setCentralEpiComment("");
  }, [open, variant, facilityDossier?.diseaseCaseReportId, departmentReview?.updatedAt]);

  if (!open) return null;

  const caseClassLabel = (code: string) => {
    const key = `msppValidation.caseClassification.${code}`;
    const out = t(key);
    return out === key ? code : out;
  };

  const handleSubmitDepartment = async () => {
    setLocalError(null);
    if (!comment.trim()) {
      setLocalError(t("msppValidation.checklistErrorComment"));
      return;
    }
    if (!inclusionCriteriaSummary.trim()) {
      setLocalError(t("msppValidation.errorInclusion"));
      return;
    }
    if (!exclusionCriteriaSummary.trim()) {
      setLocalError(t("msppValidation.errorExclusion"));
      return;
    }
    if (!finalDecisionRationale.trim()) {
      setLocalError(t("msppValidation.errorFinalRationale"));
      return;
    }
    const body = buildReviewActionBodyFromFacilityDossier(facilityDossier ?? undefined, {
      comment: comment.trim(),
      inclusionCriteriaSummary,
      exclusionCriteriaSummary,
      caseClassification,
      finalDecisionRationale: finalDecisionRationale.trim(),
    });
    await onConfirm(body);
  };

  const handleSubmitCentral = async () => {
    setLocalError(null);
    if (!departmentReview) {
      setLocalError(t("msppValidation.errorDepartmentSnapshotMissing"));
      return;
    }
    if (!centralComment.trim()) {
      setLocalError(t("msppValidation.centralErrorComment"));
      return;
    }
    if (!centralFinalRationale.trim()) {
      setLocalError(t("msppValidation.centralErrorDecision"));
      return;
    }
    const body = buildReviewActionBodyForCentral(departmentReview, {
      comment: centralComment.trim(),
      caseClassification: centralClassification,
      finalDecisionRationale: centralFinalRationale.trim(),
      epidemiologicComment: centralEpiComment.trim() || undefined,
    });
    await onConfirm(body);
  };

  const handleClick = async () => {
    if (variant === "department") await handleSubmitDepartment();
    else await handleSubmitCentral();
  };

  const disableCentralSubmit = variant === "central" && !departmentReview;

  return (
    <div
      style={OVERLAY}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mspp-decision-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={PANEL} onClick={(e) => e.stopPropagation()}>
        <h2 id="mspp-decision-title" style={{ marginTop: 0, fontSize: "1.1rem", fontWeight: 700 }}>
          {title}
        </h2>

        {variant === "department" ? (
          <p style={{ fontSize: 13, color: "#64748b", marginTop: 0, marginBottom: 14 }}>
            {t("msppValidation.checklistIntroDepartment")}
          </p>
        ) : null}

        {variant === "central" ? (
          <p style={{ fontSize: 13, color: "#64748b", marginTop: 0, marginBottom: 14 }}>
            {t("msppValidation.checklistIntroCentral")}
          </p>
        ) : null}

        <MsppReviewGuidancePanel profileId={reviewGuidanceProfileId ?? "DEFAULT"} />

        {variant === "department" ? (
          <>
            <h3 style={{ ...SECTION_HEAD, marginTop: 0 }}>{t("msppValidation.sectionFacilityDossier")}</h3>
            <MsppFacilityDossierReadonly dossier={facilityDossier} />

            <h3 style={SECTION_HEAD}>{t("msppValidation.sectionDepartmentReview")}</h3>

            <h3 style={SECTION_HEAD}>{t("msppValidation.sectionInclusion")}</h3>
            <Field label={`${t("msppValidation.inclusionDetailLabel")} *`}>
              <textarea
                style={{ ...inputStyle, minHeight: 88 }}
                value={inclusionCriteriaSummary}
                onChange={(e) => setInclusionCriteriaSummary(e.target.value)}
                placeholder={t("msppValidation.fieldInclusionPlaceholder")}
              />
            </Field>

            <h3 style={SECTION_HEAD}>{t("msppValidation.sectionExclusion")}</h3>
            <Field label={`${t("msppValidation.exclusionDetailLabel")} *`}>
              <textarea
                style={{ ...inputStyle, minHeight: 88 }}
                value={exclusionCriteriaSummary}
                onChange={(e) => setExclusionCriteriaSummary(e.target.value)}
                placeholder={t("msppValidation.fieldExclusionPlaceholder")}
              />
            </Field>

            <Field label={`${t("msppValidation.checklistComment")} *`}>
              <textarea
                style={{ ...inputStyle, minHeight: 88 }}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t("msppValidation.checklistCommentPlaceholder")}
              />
            </Field>

            <Field label={`${t("msppValidation.fieldCaseClassification")} *`}>
              <select
                style={inputStyle}
                value={caseClassification}
                onChange={(e) => setCaseClassification(e.target.value as (typeof CASE_CLASSIFICATION)[number])}
              >
                {CASE_CLASSIFICATION.map((v) => (
                  <option key={v} value={v}>
                    {caseClassLabel(v)}
                  </option>
                ))}
              </select>
            </Field>

            <h3 style={SECTION_HEAD}>{t("msppValidation.sectionFinalJustification")}</h3>
            <Field label={`${t("msppValidation.finalJustificationDetailLabel")} *`}>
              <textarea
                style={{ ...inputStyle, minHeight: 100 }}
                value={finalDecisionRationale}
                onChange={(e) => setFinalDecisionRationale(e.target.value)}
                placeholder={t("msppValidation.fieldFinalRationalePlaceholder")}
              />
            </Field>
          </>
        ) : (
          <>
            <h3 style={{ ...SECTION_HEAD, marginTop: 0 }}>{t("msppValidation.sectionFacilityDossier")}</h3>
            <MsppFacilityDossierReadonly dossier={facilityDossier} />

            <h3 style={SECTION_HEAD}>{t("msppValidation.sectionDepartmentReview")}</h3>
            <MsppDepartmentReviewReadonly snapshot={departmentReview} />

            <h3 style={SECTION_HEAD}>{t("msppValidation.sectionCentralDecision")}</h3>

            <Field label={`${t("msppValidation.centralFieldComment")} *`}>
              <textarea
                style={{ ...inputStyle, minHeight: 88 }}
                value={centralComment}
                onChange={(e) => setCentralComment(e.target.value)}
                placeholder={t("msppValidation.centralFieldCommentPlaceholder")}
              />
            </Field>

            <Field label={`${t("msppValidation.centralFieldClassification")} *`}>
              <select
                style={inputStyle}
                value={centralClassification}
                onChange={(e) =>
                  setCentralClassification(e.target.value as (typeof CASE_CLASSIFICATION)[number])
                }
              >
                {CASE_CLASSIFICATION.map((v) => (
                  <option key={v} value={v}>
                    {caseClassLabel(v)}
                  </option>
                ))}
              </select>
            </Field>

            <Field label={`${t("msppValidation.centralFieldFinalDecision")} *`}>
              <textarea
                style={{ ...inputStyle, minHeight: 100 }}
                value={centralFinalRationale}
                onChange={(e) => setCentralFinalRationale(e.target.value)}
                placeholder={t("msppValidation.centralFieldFinalDecisionPlaceholder")}
              />
            </Field>

            <Field label={t("msppValidation.centralFieldEpiOptional")}>
              <textarea
                style={{ ...inputStyle, minHeight: 72 }}
                value={centralEpiComment}
                onChange={(e) => setCentralEpiComment(e.target.value)}
                placeholder={t("msppValidation.centralFieldEpiPlaceholder")}
              />
            </Field>
          </>
        )}

        {localError ? (
          <p style={{ color: "#b91c1c", fontSize: 13, fontWeight: 600, margin: "8px 0 0" }} role="alert">
            {localError}
          </p>
        ) : null}

        <div style={BTN_ROW}>
          <button
            type="button"
            style={BTN_PRIMARY}
            disabled={submitting || disableCentralSubmit}
            onClick={() => void handleClick()}
          >
            {submitting ? t("msppValidation.checklistSubmitting") : t("msppValidation.checklistConfirm")}
          </button>
          <button type="button" style={BTN_GHOST} disabled={submitting} onClick={onClose}>
            {t("msppValidation.checklistCancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
