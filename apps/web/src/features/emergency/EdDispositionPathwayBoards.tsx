"use client";

/**
 * D2.5 — dedicated disposition pathway clinical boards.
 * Only one board mounts at a time from EmergencyDispositionPanel.
 * Home discharge uses ProviderDischargeDocumentationSection (not this file).
 */

import type { CSSProperties } from "react";
import { useI18n } from "@/lib/i18n";
import type {
  AmaDispositionV1,
  DeceasedDispositionV1,
  ElopementDispositionV1,
  LwbsDispositionV1,
  OtherDispositionV1,
} from "@medora/shared";
import { projectMseStatusForDisposition } from "@medora/shared";

const sectionHeading: CSSProperties = {
  margin: 0,
  fontSize: 13,
  fontWeight: 700,
  color: "#0f172a",
};
const labelStyle: CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "#475569",
  marginBottom: 4,
};
const inputBase: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  fontSize: 13,
};

function BoardShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div
      data-testid="ed-disposition-pathway-board"
      style={{
        marginTop: 8,
        padding: "12px 12px",
        borderRadius: 12,
        border: "1px solid #e2e8f0",
        background: "#f8fafc",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div>
        <p style={sectionHeading}>{title}</p>
        <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function MseReferenceCard({ nursingAssessment }: { nursingAssessment: unknown }) {
  const { t } = useI18n();
  const mse = projectMseStatusForDisposition(nursingAssessment);
  return (
    <div
      style={{
        padding: "8px 10px",
        borderRadius: 10,
        border: "1px solid #bae6fd",
        background: "#f0f9ff",
        fontSize: 12,
        color: "#0c4a6e",
        lineHeight: 1.45,
      }}
      data-testid="ed-mse-reference-card"
    >
      <strong>{t("emergencyDisposition.d25.mseReferenceTitle")}</strong>
      {" — "}
      {t(`emergencyDisposition.d25.mseStatus.${mse.status}`)}
      {mse.clinicianNameSnapshot ? ` · ${mse.clinicianNameSnapshot}` : ""}
      <div style={{ marginTop: 4, color: "#0369a1" }}>{t("emergencyDisposition.d25.mseNoComplianceClaim")}</div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

export function HomeDischargeBoardMountNote() {
  const { t } = useI18n();
  return (
    <p style={{ margin: 0, fontSize: 12, color: "#64748b" }} data-testid="ed-home-board-note">
      {t("emergencyDisposition.d25.homeBoardNote")}
    </p>
  );
}

export function AmaDispositionBoard({
  value,
  onChange,
  nursingAssessment,
  disabled,
}: {
  value: AmaDispositionV1;
  onChange: (next: AmaDispositionV1) => void;
  nursingAssessment: unknown;
  disabled: boolean;
}) {
  const { t } = useI18n();
  const patch = (p: Partial<AmaDispositionV1>) => onChange({ ...value, ...p, source: "CURRENT" });
  return (
    <BoardShell
      title={t("emergencyDisposition.d25.amaBoardTitle")}
      subtitle={t("emergencyDisposition.d25.amaBoardSubtitle")}
    >
      <MseReferenceCard nursingAssessment={nursingAssessment} />
      <Field label={t("emergencyDisposition.d25.ama.intentToLeaveAt")}>
        <input
          type="datetime-local"
          value={value.intentToLeaveAt}
          disabled={disabled}
          onChange={(e) => patch({ intentToLeaveAt: e.target.value })}
          style={{ ...inputBase, background: disabled ? "#f8fafc" : "#fff" }}
        />
      </Field>
      <Field label={t("emergencyDisposition.d25.ama.reasonStated")}>
        <textarea
          rows={2}
          value={value.reasonStated}
          disabled={disabled}
          onChange={(e) => patch({ reasonStated: e.target.value })}
          style={{ ...inputBase, background: disabled ? "#f8fafc" : "#fff", resize: "vertical" }}
        />
      </Field>
      <Field label={t("emergencyDisposition.d25.ama.recommendedCare")}>
        <textarea
          rows={2}
          value={value.recommendedCareSummary}
          disabled={disabled}
          onChange={(e) => patch({ recommendedCareSummary: e.target.value })}
          style={{ ...inputBase, background: disabled ? "#f8fafc" : "#fff", resize: "vertical" }}
        />
      </Field>
      <Field label={t("emergencyDisposition.d25.ama.capacityAssessed")}>
        <select
          value={value.capacityAssessed}
          disabled={disabled}
          onChange={(e) =>
            patch({ capacityAssessed: e.target.value as AmaDispositionV1["capacityAssessed"] })
          }
          style={{ ...inputBase, background: disabled ? "#f8fafc" : "#fff" }}
        >
          <option value="">—</option>
          <option value="YES">{t("emergencyDisposition.d25.ama.capacityYes")}</option>
          <option value="NO">{t("emergencyDisposition.d25.ama.capacityNo")}</option>
          <option value="UNABLE">{t("emergencyDisposition.d25.ama.capacityUnable")}</option>
        </select>
      </Field>
      <Field label={t("emergencyDisposition.d25.ama.capacityNarrative")}>
        <textarea
          rows={2}
          value={value.capacityNarrative}
          disabled={disabled}
          onChange={(e) => patch({ capacityNarrative: e.target.value })}
          style={{ ...inputBase, background: disabled ? "#f8fafc" : "#fff", resize: "vertical" }}
        />
      </Field>
      <Field label={t("emergencyDisposition.d25.ama.materialRisks")}>
        <textarea
          rows={2}
          value={value.materialRisksDiscussed}
          disabled={disabled}
          onChange={(e) => patch({ materialRisksDiscussed: e.target.value })}
          style={{ ...inputBase, background: disabled ? "#f8fafc" : "#fff", resize: "vertical" }}
        />
      </Field>
      <Field label={t("emergencyDisposition.d25.ama.benefits")}>
        <textarea
          rows={2}
          value={value.benefitsDiscussed}
          disabled={disabled}
          onChange={(e) => patch({ benefitsDiscussed: e.target.value })}
          style={{ ...inputBase, background: disabled ? "#f8fafc" : "#fff", resize: "vertical" }}
        />
      </Field>
      <Field label={t("emergencyDisposition.d25.ama.alternatives")}>
        <textarea
          rows={2}
          value={value.alternativesOffered}
          disabled={disabled}
          onChange={(e) => patch({ alternativesOffered: e.target.value })}
          style={{ ...inputBase, background: disabled ? "#f8fafc" : "#fff", resize: "vertical" }}
        />
      </Field>
      <Field label={t("emergencyDisposition.d25.ama.returnPrecautions")}>
        <textarea
          rows={2}
          value={value.returnPrecautions}
          disabled={disabled}
          onChange={(e) => patch({ returnPrecautions: e.target.value })}
          style={{ ...inputBase, background: disabled ? "#f8fafc" : "#fff", resize: "vertical" }}
        />
      </Field>
      <Field label={t("emergencyDisposition.d25.ama.signatureOrRefusal")}>
        <select
          value={value.signatureOrRefusal}
          disabled={disabled}
          onChange={(e) =>
            patch({ signatureOrRefusal: e.target.value as AmaDispositionV1["signatureOrRefusal"] })
          }
          style={{ ...inputBase, background: disabled ? "#f8fafc" : "#fff" }}
        >
          <option value="">—</option>
          <option value="SIGNED">{t("emergencyDisposition.d25.ama.sigSigned")}</option>
          <option value="REFUSED">{t("emergencyDisposition.d25.ama.sigRefused")}</option>
          <option value="UNABLE">{t("emergencyDisposition.d25.ama.sigUnable")}</option>
        </select>
      </Field>
      <Field label={t("emergencyDisposition.d25.ama.departureAt")}>
        <input
          type="datetime-local"
          value={value.departureAt}
          disabled={disabled}
          onChange={(e) => patch({ departureAt: e.target.value })}
          style={{ ...inputBase, background: disabled ? "#f8fafc" : "#fff" }}
        />
      </Field>
      <Field label={t("emergencyDisposition.d25.ama.conditionLast")}>
        <input
          type="text"
          value={value.conditionAtLastObservation}
          disabled={disabled}
          onChange={(e) => patch({ conditionAtLastObservation: e.target.value })}
          style={{ ...inputBase, background: disabled ? "#f8fafc" : "#fff" }}
        />
      </Field>
    </BoardShell>
  );
}

export function LwbsDispositionBoard({
  value,
  onChange,
  nursingAssessment,
  disabled,
}: {
  value: LwbsDispositionV1;
  onChange: (next: LwbsDispositionV1) => void;
  nursingAssessment: unknown;
  disabled: boolean;
}) {
  const { t } = useI18n();
  const patch = (p: Partial<LwbsDispositionV1>) => onChange({ ...value, ...p, source: "CURRENT" });
  return (
    <BoardShell
      title={t("emergencyDisposition.d25.lwbsBoardTitle")}
      subtitle={t("emergencyDisposition.d25.lwbsBoardSubtitle")}
    >
      <MseReferenceCard nursingAssessment={nursingAssessment} />
      <p style={{ margin: 0, fontSize: 12, color: "#b45309" }}>{t("emergencyDisposition.d25.lwbsNoHomeFields")}</p>
      <Field label={t("emergencyDisposition.d25.lwbs.careStage")}>
        <select
          value={value.careStage}
          disabled={disabled}
          onChange={(e) => patch({ careStage: e.target.value })}
          style={{ ...inputBase, background: disabled ? "#f8fafc" : "#fff" }}
        >
          <option value="">—</option>
          {[
            "REGISTERED_ONLY",
            "TRIAGE_INITIATED",
            "TRIAGE_COMPLETED",
            "WAITING_FOR_MSE",
            "CALLED_NOT_LOCATED",
            "LEFT_BEFORE_MSE",
            "OTHER_PRE_MSE",
          ].map((c) => (
            <option key={c} value={c}>
              {t(`emergencyDisposition.d25.lwbs.stage.${c}`)}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("emergencyDisposition.d25.lwbs.lastSeenAt")}>
        <input
          type="datetime-local"
          value={value.lastSeenAt}
          disabled={disabled}
          onChange={(e) => patch({ lastSeenAt: e.target.value })}
          style={{ ...inputBase, background: disabled ? "#f8fafc" : "#fff" }}
        />
      </Field>
      <label style={{ ...labelStyle, display: "flex", gap: 8, alignItems: "center" }}>
        <input
          type="checkbox"
          checked={value.searchAttemptsDocumented}
          disabled={disabled}
          onChange={(e) => patch({ searchAttemptsDocumented: e.target.checked })}
        />
        {t("emergencyDisposition.d25.lwbs.searchAttempts")}
      </label>
      <Field label={t("emergencyDisposition.d25.lwbs.departureAt")}>
        <input
          type="datetime-local"
          value={value.departureAt}
          disabled={disabled}
          onChange={(e) => patch({ departureAt: e.target.value })}
          style={{ ...inputBase, background: disabled ? "#f8fafc" : "#fff" }}
        />
      </Field>
    </BoardShell>
  );
}

export function ElopementDispositionBoard({
  value,
  onChange,
  nursingAssessment,
  disabled,
}: {
  value: ElopementDispositionV1;
  onChange: (next: ElopementDispositionV1) => void;
  nursingAssessment: unknown;
  disabled: boolean;
}) {
  const { t } = useI18n();
  const patch = (p: Partial<ElopementDispositionV1>) => onChange({ ...value, ...p, source: "CURRENT" });
  return (
    <BoardShell
      title={t("emergencyDisposition.d25.elopementBoardTitle")}
      subtitle={t("emergencyDisposition.d25.elopementBoardSubtitle")}
    >
      <MseReferenceCard nursingAssessment={nursingAssessment} />
      <Field label={t("emergencyDisposition.d25.elopement.careStage")}>
        <select
          value={value.careStage}
          disabled={disabled}
          onChange={(e) => patch({ careStage: e.target.value })}
          style={{ ...inputBase, background: disabled ? "#f8fafc" : "#fff" }}
        >
          <option value="">—</option>
          {[
            "MSE_INITIATED",
            "MSE_COMPLETED",
            "TREATMENT_INITIATED",
            "TREATMENT_IN_PROGRESS",
            "AWAITING_RESULTS",
            "AWAITING_CONSULT",
            "AWAITING_ADMISSION_TRANSFER",
            "BEHAVIORAL_HEALTH_PRECAUTIONS",
            "UNDER_OBSERVATION",
            "OTHER_POST_MSE",
          ].map((c) => (
            <option key={c} value={c}>
              {t(`emergencyDisposition.d25.elopement.stage.${c}`)}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("emergencyDisposition.d25.elopement.lastSeenAt")}>
        <input
          type="datetime-local"
          value={value.lastSeenAt}
          disabled={disabled}
          onChange={(e) => patch({ lastSeenAt: e.target.value })}
          style={{ ...inputBase, background: disabled ? "#f8fafc" : "#fff" }}
        />
      </Field>
      <Field label={t("emergencyDisposition.d25.elopement.lastKnownStatus")}>
        <textarea
          rows={2}
          value={value.lastKnownStatus}
          disabled={disabled}
          onChange={(e) => patch({ lastKnownStatus: e.target.value })}
          style={{ ...inputBase, background: disabled ? "#f8fafc" : "#fff", resize: "vertical" }}
        />
      </Field>
      {(
        [
          ["outstandingRisksDocumented", "outstandingRisks"],
          ["searchResponseDocumented", "searchResponse"],
          ["notificationsDocumented", "notifications"],
        ] as const
      ).map(([key, labelKey]) => (
        <label key={key} style={{ ...labelStyle, display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={value[key]}
            disabled={disabled}
            onChange={(e) => patch({ [key]: e.target.checked })}
          />
          {t(`emergencyDisposition.d25.elopement.${labelKey}`)}
        </label>
      ))}
      <Field label={t("emergencyDisposition.d25.elopement.classification")}>
        <input
          type="text"
          value={value.eventClassification}
          disabled={disabled}
          onChange={(e) => patch({ eventClassification: e.target.value })}
          style={{ ...inputBase, background: disabled ? "#f8fafc" : "#fff" }}
        />
      </Field>
    </BoardShell>
  );
}

export function DeceasedDispositionBoard({
  value,
  onChange,
  nursingAssessment,
  disabled,
}: {
  value: DeceasedDispositionV1;
  onChange: (next: DeceasedDispositionV1) => void;
  nursingAssessment: unknown;
  disabled: boolean;
}) {
  const { t } = useI18n();
  const patch = (p: Partial<DeceasedDispositionV1>) => onChange({ ...value, ...p, source: "CURRENT" });
  return (
    <BoardShell
      title={t("emergencyDisposition.d25.deceasedBoardTitle")}
      subtitle={t("emergencyDisposition.d25.deceasedBoardSubtitle")}
    >
      <MseReferenceCard nursingAssessment={nursingAssessment} />
      <p style={{ margin: 0, fontSize: 12, color: "#b45309" }}>
        {t("emergencyDisposition.d25.deceasedNoHomeInstructions")}
      </p>
      <label style={{ ...labelStyle, display: "flex", gap: 8, alignItems: "center" }}>
        <input
          type="checkbox"
          checked={value.pronouncementComplete}
          disabled={disabled}
          onChange={(e) => patch({ pronouncementComplete: e.target.checked })}
        />
        {t("emergencyDisposition.d25.deceased.pronouncementComplete")}
      </label>
      <Field label={t("emergencyDisposition.d25.deceased.dateOfDeath")}>
        <input
          type="date"
          value={value.dateOfDeath}
          disabled={disabled}
          onChange={(e) => patch({ dateOfDeath: e.target.value })}
          style={{ ...inputBase, background: disabled ? "#f8fafc" : "#fff" }}
        />
      </Field>
      <Field label={t("emergencyDisposition.d25.deceased.timeOfDeath")}>
        <input
          type="time"
          value={value.timeOfDeath}
          disabled={disabled}
          onChange={(e) => patch({ timeOfDeath: e.target.value })}
          style={{ ...inputBase, background: disabled ? "#f8fafc" : "#fff" }}
        />
      </Field>
      <Field label={t("emergencyDisposition.d25.deceased.pronouncedBy")}>
        <input
          type="text"
          value={value.pronouncedBy}
          disabled={disabled}
          onChange={(e) => patch({ pronouncedBy: e.target.value })}
          style={{ ...inputBase, background: disabled ? "#f8fafc" : "#fff" }}
        />
      </Field>
      <Field label={t("emergencyDisposition.d25.deceased.nextOfKin")}>
        <input
          type="text"
          value={value.nextOfKinNotificationStatus}
          disabled={disabled}
          onChange={(e) => patch({ nextOfKinNotificationStatus: e.target.value })}
          style={{ ...inputBase, background: disabled ? "#f8fafc" : "#fff" }}
        />
      </Field>
      <Field label={t("emergencyDisposition.d25.deceased.medicalExaminer")}>
        <input
          type="text"
          value={value.medicalExaminerStatus}
          disabled={disabled}
          onChange={(e) => patch({ medicalExaminerStatus: e.target.value })}
          style={{ ...inputBase, background: disabled ? "#f8fafc" : "#fff" }}
        />
      </Field>
      <Field label={t("emergencyDisposition.d25.deceased.donation")}>
        <input
          type="text"
          value={value.donationReferralStatus}
          disabled={disabled}
          onChange={(e) => patch({ donationReferralStatus: e.target.value })}
          style={{ ...inputBase, background: disabled ? "#f8fafc" : "#fff" }}
        />
      </Field>
      <Field label={t("emergencyDisposition.d25.deceased.autopsy")}>
        <select
          value={value.autopsyRequested}
          disabled={disabled}
          onChange={(e) =>
            patch({ autopsyRequested: e.target.value as DeceasedDispositionV1["autopsyRequested"] })
          }
          style={{ ...inputBase, background: disabled ? "#f8fafc" : "#fff" }}
        >
          <option value="">—</option>
          <option value="YES">{t("common.yes")}</option>
          <option value="NO">{t("common.no")}</option>
          <option value="UNDETERMINED">{t("emergencyDisposition.d25.deceased.undetermined")}</option>
        </select>
      </Field>
      <p style={{ margin: 0, fontSize: 11, color: "#64748b" }}>
        {t("emergencyDisposition.d25.deceased.autopsyVsPostmortem")}
      </p>
      {(
        [
          ["postmortemCareComplete", "postmortemCare"],
          ["belongingsDocumented", "belongings"],
          ["bodyCustodyDocumented", "bodyCustody"],
        ] as const
      ).map(([key, labelKey]) => (
        <label key={key} style={{ ...labelStyle, display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={value[key]}
            disabled={disabled}
            onChange={(e) => patch({ [key]: e.target.checked })}
          />
          {t(`emergencyDisposition.d25.deceased.${labelKey}`)}
        </label>
      ))}
    </BoardShell>
  );
}

export function GovernedOtherDispositionBoard({
  value,
  onChange,
  disabled,
}: {
  value: OtherDispositionV1;
  onChange: (next: OtherDispositionV1) => void;
  disabled: boolean;
}) {
  const { t } = useI18n();
  const patch = (p: Partial<OtherDispositionV1>) => onChange({ ...value, ...p, source: "CURRENT" });
  return (
    <BoardShell
      title={t("emergencyDisposition.d25.otherBoardTitle")}
      subtitle={t("emergencyDisposition.d25.otherBoardSubtitle")}
    >
      <Field label={t("emergencyDisposition.d25.other.codedReason")}>
        <select
          value={value.codedReason}
          disabled={disabled}
          onChange={(e) => patch({ codedReason: e.target.value })}
          style={{ ...inputBase, background: disabled ? "#f8fafc" : "#fff" }}
        >
          <option value="">—</option>
          <option value="ADMINISTRATIVE">{t("emergencyDisposition.d25.other.reason.ADMINISTRATIVE")}</option>
          <option value="DOCUMENTATION_ONLY">{t("emergencyDisposition.d25.other.reason.DOCUMENTATION_ONLY")}</option>
          <option value="SYSTEM_CORRECTION">{t("emergencyDisposition.d25.other.reason.SYSTEM_CORRECTION")}</option>
          <option value="OTHER_GOVERNED">{t("emergencyDisposition.d25.other.reason.OTHER_GOVERNED")}</option>
        </select>
      </Field>
      <Field label={t("emergencyDisposition.d25.other.explanation")}>
        <textarea
          rows={3}
          value={value.explanation}
          disabled={disabled}
          onChange={(e) => patch({ explanation: e.target.value })}
          style={{ ...inputBase, background: disabled ? "#f8fafc" : "#fff", resize: "vertical" }}
        />
      </Field>
      <label style={{ ...labelStyle, display: "flex", gap: 8, alignItems: "center" }}>
        <input
          type="checkbox"
          checked={value.supervisorReviewComplete}
          disabled={disabled}
          onChange={(e) => patch({ supervisorReviewComplete: e.target.checked })}
        />
        {t("emergencyDisposition.d25.other.supervisorReview")}
      </label>
      <Field label={t("emergencyDisposition.d25.other.departureType")}>
        <input
          type="text"
          value={value.departureType}
          disabled={disabled}
          onChange={(e) => patch({ departureType: e.target.value })}
          style={{ ...inputBase, background: disabled ? "#f8fafc" : "#fff" }}
        />
      </Field>
      <Field label={t("emergencyDisposition.d25.other.destination")}>
        <input
          type="text"
          value={value.destination}
          disabled={disabled}
          onChange={(e) => patch({ destination: e.target.value })}
          style={{ ...inputBase, background: disabled ? "#f8fafc" : "#fff" }}
        />
      </Field>
    </BoardShell>
  );
}
