"use client";

import React from "react";
import type { MarClinicalCorrectionChainStep } from "@/features/mar/marClinicalCorrectionWorkflow";
import { isMarClinicalCorrectionReviewRecommended } from "@/features/mar/marClinicalCorrectionWorkflow";

export function MedicationAdministrationCorrectionChainViewer({
  steps,
  t,
  formatClinicalTime,
  readOnly,
}: {
  steps: MarClinicalCorrectionChainStep[];
  t: (key: string) => string;
  formatClinicalTime: (iso: string) => string;
  readOnly?: boolean;
}) {
  if (steps.length === 0) return null;

  return (
    <div
      data-testid="mar-clinical-correction-chain"
      style={{
        marginTop: 10,
        padding: "10px 12px",
        borderRadius: 10,
        border: "1px solid #e2e8f0",
        background: readOnly ? "#f8fafc" : "#fff",
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 8 }}>
        {t("marClinicalCorrection.chain.title")}
      </div>
      <ol style={{ margin: 0, padding: 0, listStyle: "none" }}>
        {steps.map((step, index) => (
          <li
            key={step.id}
            data-testid={`mar-clinical-correction-chain-step-${index}`}
            style={{ position: "relative", paddingLeft: 18, marginBottom: index < steps.length - 1 ? 14 : 0 }}
          >
            {index < steps.length - 1 ? (
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  left: 4,
                  top: 14,
                  bottom: -6,
                  width: 2,
                  background: "#cbd5e1",
                }}
              />
            ) : null}
            <span
              aria-hidden
              style={{
                position: "absolute",
                left: 0,
                top: 4,
                width: 10,
                height: 10,
                borderRadius: 9999,
                background: step.stepKind === "ADMINISTRATION" ? "#334155" : "#ea580c",
                border: "2px solid #fff",
                boxShadow: "0 0 0 1px #cbd5e1",
              }}
            />
            <div style={{ fontSize: 12, fontWeight: 600, color: "#0f172a" }}>
              {step.stepKind === "ADMINISTRATION"
                ? t("marClinicalCorrection.chain.administration")
                : step.correctionTypeLabelKey
                  ? t(step.correctionTypeLabelKey)
                  : t("marClinicalCorrection.chain.correction")}
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
              {formatClinicalTime(step.eventAt)}
              {step.performedByDisplay ? ` · ${step.performedByDisplay}` : ""}
            </div>
            {step.beforeSummary || step.afterSummary ? (
              <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>
                {step.beforeSummary && step.afterSummary && step.afterSummary !== "duplicate_documentation_flagged" ? (
                  <span>
                    {t("marClinicalCorrection.chain.before")}: {step.beforeSummary} →{" "}
                    {t("marClinicalCorrection.chain.after")}: {step.afterSummary}
                  </span>
                ) : step.afterSummary === "duplicate_documentation_flagged" ? (
                  <span>{t("marAdministrationCorrection.duplicateFlagged")}</span>
                ) : (
                  <span>{step.beforeSummary ?? step.afterSummary}</span>
                )}
              </div>
            ) : null}
            {step.reasonCode ? (
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                {t("marClinicalCorrection.chain.reason")}:{" "}
                {t(`marAdministrationCorrection.reason.${step.reasonCode}`)}
                {step.reasonDetail ? ` — ${step.reasonDetail}` : ""}
              </div>
            ) : null}
            {step.stepKind === "CORRECTION" &&
            isMarClinicalCorrectionReviewRecommended(step.reasonCode) ? (
              <div
                data-testid="mar-clinical-correction-review-recommended"
                style={{ fontSize: 11, fontWeight: 600, color: "#b45309", marginTop: 6 }}
              >
                {t("marClinicalCorrection.review.recommended")}
              </div>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
