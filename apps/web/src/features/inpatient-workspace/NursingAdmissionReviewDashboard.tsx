"use client";

/**
 * MEDUI.INP.2B.2 — Stage 6 review dashboard for nursing admission completion.
 */

import {
  NURSING_ADMISSION_STAGES,
  nursingAdmissionOutstandingSections,
  nursingAdmissionStage6HandoffIsPending,
  nursingAdmissionStageGroupStatus,
  type InpatientAdmissionClinicalSection,
  type MedSurgNursingAdmissionDocV1,
  type NursingAdmissionStage6Projection,
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

const HANDOFF_NURSE_ACTIONS = ["PROVIDER_NOTIFIED", "ORDERS_PENDING", "NOT_STARTED"] as const;
const YN_ACTIONS = ["YES", "NO", "UNKNOWN"] as const;

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
  stage6Projection,
  onNavigate,
  onComplete,
  onHandoffStatus,
  onProviderNotified,
  onOpenCodeStatus,
  onOpenHomeMedications,
  completionAllowed,
}: {
  doc: MedSurgNursingAdmissionDocV1 | null | undefined;
  review?: Record<string, unknown> | null;
  readOnly?: boolean;
  signed?: boolean;
  stage6Projection?: NursingAdmissionStage6Projection | null;
  onNavigate: (sectionId: InpatientAdmissionClinicalSection) => void;
  onComplete: () => void;
  onHandoffStatus?: (status: string) => void;
  onProviderNotified?: (value: "YES" | "NO" | "UNKNOWN") => void;
  onOpenCodeStatus?: () => void;
  onOpenHomeMedications?: () => void;
  completionAllowed?: boolean;
}) {
  const { t } = useI18n();
  const outstanding = nursingAdmissionOutstandingSections(doc);
  const stored = (doc?.sections?.PROVIDER_ADMISSION?.answers ?? {}) as Record<string, unknown>;
  const projected = stage6Projection?.answers;
  const handoffStatus = String(stored.handoffStatus ?? projected?.handoffStatus ?? "");
  const providerNotified = String(
    stored.providerNotifiedOfArrival ?? projected?.providerNotifiedOfArrival ?? ""
  );
  const ordersPresent = String(projected?.admissionOrdersPresent ?? stored.admissionOrdersPresent ?? "");
  const codeConfirmed = String(projected?.codeStatusConfirmed ?? stored.codeStatusConfirmed ?? "");
  const medRecon = String(projected?.medReconStatus ?? stored.medReconStatus ?? "");
  const handoffPending = nursingAdmissionStage6HandoffIsPending(handoffStatus);

  const cardStyle = {
    ...MEDORA_CARD_SHELL,
    padding: "10px 12px",
    cursor: "pointer",
    textAlign: "left" as const,
    width: "100%",
  };

  const actionBtn = (selected: boolean) => ({
    padding: "4px 8px",
    borderRadius: 9999,
    border: selected ? "1px solid #0f766e" : "1px solid #cbd5e1",
    background: selected ? "#ccfbf1" : "#fff",
    color: selected ? "#0f766e" : "#334155",
    fontSize: 11,
    cursor: readOnly || signed ? "not-allowed" : "pointer",
  });

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
        <dl style={{ margin: 0, fontSize: 12, display: "grid", gridTemplateColumns: "160px 1fr", gap: "8px 8px" }}>
          <dt>{t("inpatientAdmissionInp2b2.review.handoffStatus")}</dt>
          <dd style={{ margin: 0 }} data-testid="stage6-handoff-status">
            {handoffStatus ? t(`inpatientAdmissionInp2b2d.handoffStatus.${handoffStatus}`) : t("common.dash")}
            {handoffPending ? (
              <span style={{ display: "block", color: "#64748b", fontSize: 11 }}>
                {t("inpatientAdmissionInp2b2d.pendingProjection")}
              </span>
            ) : null}
            {!readOnly && !signed && onHandoffStatus ? (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                {HANDOFF_NURSE_ACTIONS.map((status) => (
                  <button
                    key={status}
                    type="button"
                    data-testid={`stage6-handoff-${status}`}
                    disabled={readOnly || signed}
                    onClick={() => onHandoffStatus(status)}
                    style={actionBtn(handoffStatus === status)}
                  >
                    {t(`inpatientAdmissionInp2b2d.handoffAction.${status}`)}
                  </button>
                ))}
              </div>
            ) : null}
          </dd>
          <dt>{t("inpatientAdmissionInp2b2.review.providerNotified")}</dt>
          <dd style={{ margin: 0 }} data-testid="stage6-provider-notified">
            {providerNotified ? t(`inpatientAdmissionInp2b2d.yn.${providerNotified}`) : t("common.dash")}
            {!readOnly && !signed && onProviderNotified ? (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                {YN_ACTIONS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    data-testid={`stage6-notify-${value}`}
                    disabled={readOnly || signed}
                    onClick={() => onProviderNotified(value)}
                    style={actionBtn(providerNotified === value)}
                  >
                    {t(`inpatientAdmissionInp2b2d.yn.${value}`)}
                  </button>
                ))}
              </div>
            ) : null}
          </dd>
          <dt>{t("inpatientAdmissionInp2b2.review.ordersPresent")}</dt>
          <dd style={{ margin: 0 }} data-testid="stage6-orders-present">
            {ordersPresent ? t(`inpatientAdmissionInp2b2d.yn.${ordersPresent}`) : t("common.dash")}
            <span style={{ display: "block", color: "#64748b", fontSize: 11 }}>
              {t("inpatientAdmissionInp2b2d.ordersInformational")}
            </span>
          </dd>
          <dt>{t("inpatientAdmissionInp2b2.review.codeConfirmed")}</dt>
          <dd style={{ margin: 0 }} data-testid="stage6-code-status">
            {codeConfirmed === "YES"
              ? t("inpatientAdmissionInp2b2d.yn.YES")
              : t("inpatientAdmissionInp2b2d.codeStatusNotDocumented")}
            {!readOnly && !signed && onOpenCodeStatus ? (
              <button
                type="button"
                data-testid="stage6-open-code-status"
                onClick={onOpenCodeStatus}
                style={{ marginTop: 6, display: "block", fontSize: 12, color: "#0f766e" }}
              >
                {t("inpatientAdmissionInp2b2d.openCodeStatus")}
              </button>
            ) : null}
          </dd>
          <dt>{t("inpatientAdmissionInp2b2.review.medRecon")}</dt>
          <dd style={{ margin: 0 }} data-testid="stage6-med-recon">
            {medRecon ? t(`inpatientAdmissionInp2b2d.medRecon.${medRecon}`) : t("common.dash")}
            {medRecon !== "COMPLETE" && !readOnly && !signed && onOpenHomeMedications ? (
              <button
                type="button"
                data-testid="stage6-open-home-meds"
                onClick={onOpenHomeMedications}
                style={{ marginTop: 6, display: "block", fontSize: 12, color: "#0f766e" }}
              >
                {t("inpatientAdmissionInp2b2d.openHomeMeds")}
              </button>
            ) : null}
          </dd>
        </dl>
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
