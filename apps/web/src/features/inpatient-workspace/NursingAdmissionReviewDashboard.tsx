"use client";

/**
 * MEDUI.INP.2B.2 — Stage 6 review dashboard for nursing admission completion.
 */

import {
  NURSING_ADMISSION_STAGES,
  nursingAdmissionOutstandingSections,
  nursingAdmissionStageGroupStatus,
  type InpatientAdmissionClinicalSection,
  type MedSurgNursingAdmissionDocV1,
  type NursingAdmissionStageId,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";

const REVIEW_STAGE_IDS: NursingAdmissionStageId[] = [
  "ARRIVAL_IDENTITY",
  "IMMEDIATE_ASSESSMENT",
  "HISTORY_RECONCILIATION",
  "SAFETY_PHYSICAL",
  "PSYCHOSOCIAL_EDUCATION",
];

function statusGlyph(st: ReturnType<typeof nursingAdmissionStageGroupStatus>): string {
  if (st === "COMPLETE") return "✓";
  if (st === "UNABLE_TO_COMPLETE") return "—";
  if (st === "NOT_APPLICABLE") return "N/A";
  if (st === "IN_PROGRESS") return "•";
  return "⚠";
}

export function NursingAdmissionReviewDashboard({
  doc,
  review,
  readOnly,
  signed,
  onNavigate,
  onComplete,
  onDocumentProviderNotified,
  completionAllowed,
}: {
  doc: MedSurgNursingAdmissionDocV1 | null | undefined;
  review?: Record<string, unknown> | null;
  readOnly?: boolean;
  signed?: boolean;
  onNavigate: (sectionId: InpatientAdmissionClinicalSection) => void;
  onComplete: () => void;
  onDocumentProviderNotified?: () => void;
  completionAllowed?: boolean;
}) {
  const { t } = useI18n();
  const outstanding = nursingAdmissionOutstandingSections(doc);
  const handoffAnswers = (doc?.sections?.PROVIDER_ADMISSION?.answers ?? {}) as Record<string, unknown>;

  const cardStyle = {
    ...MEDORA_CARD_SHELL,
    padding: "10px 12px",
    cursor: "pointer",
    textAlign: "left" as const,
    width: "100%",
  };

  return (
    <div data-testid="nursing-admission-review-dashboard" style={{ display: "grid", gap: 12 }}>
      <p style={{ margin: 0, fontSize: 13, color: "#475569" }}>{t("inpatientAdmissionInp2b2.review.intro")}</p>

      <div
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}
        data-testid="nursing-admission-review-stage-cards"
      >
        {REVIEW_STAGE_IDS.map((stageId) => {
          const stage = NURSING_ADMISSION_STAGES.find((s) => s.id === stageId)!;
          const st = nursingAdmissionStageGroupStatus(doc, stageId);
          const firstSection = stage.sectionKeys[0] as InpatientAdmissionClinicalSection;
          return (
            <button
              key={stageId}
              type="button"
              style={cardStyle}
              data-testid={`review-stage-card-${stageId}`}
              onClick={() => onNavigate(firstSection)}
            >
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                {t(`inpatientAdmissionInp2b1.tracker.${stageId}`)}
              </div>
              <div style={{ fontSize: 12, color: "#64748b" }}>
                {statusGlyph(st)} {t(`inpatientAdmissionInp2b2.review.stageStatus.${st}`)}
              </div>
            </button>
          );
        })}
      </div>

      {outstanding.length > 0 ? (
        <div data-testid="nursing-admission-outstanding-list" style={cardStyle}>
          <h4 style={{ margin: "0 0 8px", fontSize: 13 }}>{t("inpatientAdmissionInp2b2.review.outstanding")}</h4>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
            {outstanding.map((id) => (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => onNavigate(id)}
                  style={{
                    border: "none",
                    background: "none",
                    padding: 0,
                    color: "#0f766e",
                    cursor: "pointer",
                    fontSize: 12,
                    textDecoration: "underline",
                  }}
                >
                  {t(`hospitalAdmissionD4a0.clinical.sections.${id}`)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div data-testid="nursing-admission-handoff-summary" style={{ ...cardStyle, cursor: "default" }}>
        <h4 style={{ margin: "0 0 8px", fontSize: 13 }}>{t("inpatientAdmissionInp2b2.review.handoffTitle")}</h4>
        <dl style={{ margin: 0, fontSize: 12, display: "grid", gridTemplateColumns: "160px 1fr", gap: "4px 8px" }}>
          <dt>{t("inpatientAdmissionInp2b2.review.handoffStatus")}</dt>
          <dd style={{ margin: 0 }} data-testid="stage6-handoff-status">
            {handoffAnswers.handoffStatus
              ? t(`inpatientAdmissionInp2b2d.handoffStatus.${String(handoffAnswers.handoffStatus)}`)
              : t("common.dash")}
            {handoffAnswers.handoffStatus === "ORDERS_PENDING" ||
            handoffAnswers.handoffStatus === "HP_PENDING" ||
            handoffAnswers.handoffStatus === "NOT_STARTED" ? (
              <span style={{ display: "block", color: "#64748b", fontSize: 11 }}>
                {t("inpatientAdmissionInp2b2d.pendingProjection")}
              </span>
            ) : null}
          </dd>
          <dt>{t("inpatientAdmissionInp2b2.review.providerNotified")}</dt>
          <dd style={{ margin: 0 }}>
            {handoffAnswers.providerNotifiedOfArrival
              ? t(`inpatientAdmissionInp2b2d.yn.${String(handoffAnswers.providerNotifiedOfArrival)}`)
              : t("common.dash")}
            {handoffAnswers.providerNotifiedOfArrival !== "YES" && !readOnly && !signed && onDocumentProviderNotified ? (
              <button
                type="button"
                data-testid="stage6-document-provider-notified"
                onClick={onDocumentProviderNotified}
                style={{ marginLeft: 8, fontSize: 12 }}
              >
                {t("inpatientAdmissionInp2b2d.notifyArrival")}
              </button>
            ) : null}
          </dd>
          <dt>{t("inpatientAdmissionInp2b2.review.ordersPresent")}</dt>
          <dd style={{ margin: 0 }}>
            {handoffAnswers.admissionOrdersPresent
              ? t(`inpatientAdmissionInp2b2d.yn.${String(handoffAnswers.admissionOrdersPresent)}`)
              : t("common.dash")}
          </dd>
          <dt>{t("inpatientAdmissionInp2b2.review.codeConfirmed")}</dt>
          <dd style={{ margin: 0 }}>
            {handoffAnswers.codeStatusConfirmed
              ? t(`inpatientAdmissionInp2b2d.yn.${String(handoffAnswers.codeStatusConfirmed)}`)
              : t("common.dash")}
          </dd>
          <dt>{t("inpatientAdmissionInp2b2.review.medRecon")}</dt>
          <dd style={{ margin: 0 }}>
            {handoffAnswers.medReconStatus
              ? t(`inpatientAdmissionInp2b2d.medRecon.${String(handoffAnswers.medReconStatus)}`)
              : t("common.dash")}
          </dd>
        </dl>
        {typeof handoffAnswers.unresolvedItems === "string" && handoffAnswers.unresolvedItems.trim() ? (
          <p style={{ margin: "8px 0 0", fontSize: 12 }}>
            <strong>{t("inpatientAdmissionInp2b2.review.unresolvedNote")}</strong>:{" "}
            {handoffAnswers.unresolvedItems}
          </p>
        ) : null}
      </div>

      {Array.isArray(review?.warnings) && (review!.warnings as string[]).length > 0 ? (
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#9a3412" }}>
          {(review!.warnings as string[]).map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      ) : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <button
          type="button"
          data-testid="nursing-admission-complete-button"
          disabled={readOnly || signed || completionAllowed === false}
          title={
            completionAllowed === false ? t("inpatientAdmissionInp2b2.review.completeBlocked") : undefined
          }
          onClick={onComplete}
          style={{
            padding: "10px 16px",
            borderRadius: 10,
            border: "none",
            background: readOnly || signed || completionAllowed === false ? "#94a3b8" : "#0f766e",
            color: "#fff",
            fontWeight: 700,
            fontSize: 13,
            cursor: readOnly || signed || completionAllowed === false ? "not-allowed" : "pointer",
          }}
        >
          {signed ? t("hospitalAdmissionD4a1.alreadySigned") : t("inpatientAdmissionInp2b2.review.completeAdmission")}
        </button>
        {completionAllowed === false && !signed ? (
          <span style={{ fontSize: 12, color: "#64748b" }}>{t("inpatientAdmissionInp2b2.review.completeBlocked")}</span>
        ) : null}
      </div>
    </div>
  );
}
