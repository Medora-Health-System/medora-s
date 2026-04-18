"use client";

import React, { useCallback, useEffect, useState } from "react";
import { apiFetch, parseApiResponse } from "@/lib/apiClient";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { useI18n } from "@/lib/i18n";
import {
  MedoraCard,
  MedoraCardIdentity,
  MedoraCardInner,
  MedoraCardTitle,
} from "@/components/medora-card";
import {
  EMTALA_DISPOSITION_CATEGORY_VALUES,
  EMTALA_STATUS_VALUES,
  erEmtalaV1FormFromEncounter,
  mergeErEmtalaV1IntoNursingAssessment,
  type ErEmtalaV1Form,
} from "./erEmtalaV1";

type EncounterLite = {
  id: string;
  status?: string | null;
  nursingAssessment?: unknown;
  updatedAt?: string | null;
};

const inputBase: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 10px",
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  fontSize: 14,
  color: "#0f172a",
  backgroundColor: "#fff",
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 4,
  fontWeight: 600,
  fontSize: 12,
  color: "#475569",
};

const grid2: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: 10,
};

const sectionHead: React.CSSProperties = {
  margin: "12px 0 6px 0",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#64748b",
};

const btnSave: React.CSSProperties = {
  marginTop: 12,
  padding: "10px 16px",
  fontSize: 14,
  fontWeight: 600,
  color: "#fff",
  backgroundColor: "#0f172a",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
};

const btnSaveDisabled: React.CSSProperties = {
  ...btnSave,
  opacity: 0.55,
  cursor: "not-allowed",
};

function TriSelect(props: {
  value: "" | "true" | "false";
  onChange: (v: "" | "true" | "false") => void;
  disabled: boolean;
  t: (k: string) => string;
  labelKey: string;
}) {
  return (
    <label style={labelStyle}>
      {props.t(`erEmtalaPanel.${props.labelKey}`)}
      <select
        value={props.value}
        disabled={props.disabled}
        onChange={(e) => props.onChange((e.target.value || "") as "" | "true" | "false")}
        style={{ ...inputBase, marginTop: 4, backgroundColor: props.disabled ? "#f8fafc" : "#fff" }}
      >
        <option value="">{props.t("erEmtalaPanel.triUnset")}</option>
        <option value="true">{props.t("erEmtalaPanel.triYes")}</option>
        <option value="false">{props.t("erEmtalaPanel.triNo")}</option>
      </select>
    </label>
  );
}

function DtField(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  return (
    <label style={labelStyle}>
      {props.label}
      <input
        type="datetime-local"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        disabled={props.disabled}
        style={{ ...inputBase, marginTop: 4, backgroundColor: props.disabled ? "#f8fafc" : "#fff" }}
      />
    </label>
  );
}

function TextField(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  maxLength?: number;
  rows?: number;
}) {
  if (props.rows && props.rows > 1) {
    return (
      <label style={labelStyle}>
        {props.label}
        <textarea
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          disabled={props.disabled}
          rows={props.rows}
          maxLength={props.maxLength}
          style={{
            ...inputBase,
            marginTop: 4,
            resize: "vertical",
            minHeight: 56,
            backgroundColor: props.disabled ? "#f8fafc" : "#fff",
          }}
        />
      </label>
    );
  }
  return (
    <label style={labelStyle}>
      {props.label}
      <input
        type="text"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        disabled={props.disabled}
        maxLength={props.maxLength}
        style={{ ...inputBase, marginTop: 4, backgroundColor: props.disabled ? "#f8fafc" : "#fff" }}
      />
    </label>
  );
}

export function EmergencyEmtalaPanel({
  encounterId,
  facilityId,
  encounter,
  isLocked,
  onSaved,
}: {
  encounterId: string;
  facilityId: string;
  encounter: EncounterLite;
  isLocked: boolean;
  onSaved: () => void | Promise<void>;
}) {
  const { t } = useI18n();
  const [form, setForm] = useState<ErEmtalaV1Form>(() => erEmtalaV1FormFromEncounter(encounter.nursingAssessment));
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ variant: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    setForm(erEmtalaV1FormFromEncounter(encounter.nursingAssessment));
  }, [encounter.nursingAssessment, encounter.updatedAt]);

  const patch = useCallback((p: Partial<ErEmtalaV1Form>) => {
    setForm((f) => ({ ...f, ...p }));
  }, []);

  const formDisabled = isLocked || (encounter.status ?? "").toUpperCase() !== "OPEN";

  const showTransfer = form.emtalaDispositionCategory === "TRANSFER";
  const showAma = form.emtalaDispositionCategory === "AMA";
  const showLwbs = form.emtalaDispositionCategory === "LWBS";

  const handleSave = useCallback(async () => {
    if (formDisabled) return;
    setSaving(true);
    setFeedback(null);
    try {
      let savedByDisplayName = t("erEmtalaPanel.defaultSigner");
      try {
        const meRes = await fetch("/api/auth/me");
        const me = await parseApiResponse(meRes);
        if (me && typeof me === "object" && !Array.isArray(me)) {
          const fn = (me as { fullName?: string }).fullName?.trim();
          if (fn) savedByDisplayName = fn;
        }
      } catch {
        /* repli */
      }
      const signature = {
        savedAt: new Date().toISOString(),
        savedByDisplayName,
      };
      const merged = mergeErEmtalaV1IntoNursingAssessment(encounter.nursingAssessment, form, signature);
      const res = await apiFetch(`/encounters/${encounterId}`, {
        method: "PATCH",
        facilityId,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nursingAssessment: merged }),
      });
      const queued =
        res && typeof res === "object" && !Array.isArray(res) && (res as { queued?: boolean }).queued === true;
      await onSaved();
      setFeedback({
        variant: "ok",
        text: queued ? t("erEmtalaPanel.saveQueued") : t("erEmtalaPanel.saveSuccess"),
      });
    } catch (e) {
      console.error(e);
      setFeedback({
        variant: "err",
        text:
          normalizeUserFacingError(e instanceof Error ? e.message : null) ||
          t("erEmtalaPanel.saveError"),
      });
    } finally {
      setSaving(false);
    }
  }, [encounter.nursingAssessment, encounterId, facilityId, form, formDisabled, onSaved, t]);

  return (
    <MedoraCard leftAccentColor="#0e7490" variant="default">
      <MedoraCardInner>
        <MedoraCardIdentity initials="E">
          <MedoraCardTitle
            title={t("erEmtalaPanel.title")}
            subline={
              <p style={{ margin: 0, fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>{t("erEmtalaPanel.subline")}</p>
            }
          />
        </MedoraCardIdentity>

        {formDisabled ? (
          <p style={{ margin: "8px 0 0 0", fontSize: 13, color: "#b45309", fontWeight: 600 }}>{t("erEmtalaPanel.readOnly")}</p>
        ) : null}

        <p style={{ margin: "10px 0 0 0", fontSize: 12, color: "#64748b" }}>{t("erEmtalaPanel.disclaimer")}</p>

        <p style={sectionHead}>{t("erEmtalaPanel.sectionStatus")}</p>
        <div style={grid2}>
          <label style={labelStyle}>
            {t("erEmtalaPanel.labelEmtalaStatus")}
            <select
              value={form.emtalaStatus}
              disabled={formDisabled}
              onChange={(e) => patch({ emtalaStatus: e.target.value })}
              style={{ ...inputBase, marginTop: 4, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
            >
              <option value="">{t("erEmtalaPanel.selectPlaceholder")}</option>
              {EMTALA_STATUS_VALUES.map((s) => (
                <option key={s} value={s}>
                  {t(`erEmtalaPanel.status_${s}`)}
                </option>
              ))}
            </select>
          </label>
          <label style={labelStyle}>
            {t("erEmtalaPanel.labelDispositionCategory")}
            <select
              value={form.emtalaDispositionCategory}
              disabled={formDisabled}
              onChange={(e) => patch({ emtalaDispositionCategory: e.target.value })}
              style={{ ...inputBase, marginTop: 4, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
            >
              <option value="">{t("erEmtalaPanel.selectPlaceholder")}</option>
              {EMTALA_DISPOSITION_CATEGORY_VALUES.map((s) => (
                <option key={s} value={s}>
                  {t(`erEmtalaPanel.disp_${s}`)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p style={sectionHead}>{t("erEmtalaPanel.sectionTimes")}</p>
        <div style={grid2}>
          <DtField
            label={t("erEmtalaPanel.labelArrivalAt")}
            value={form.arrivalAt}
            onChange={(v) => patch({ arrivalAt: v })}
            disabled={formDisabled}
          />
          <DtField
            label={t("erEmtalaPanel.labelTriageStartedAt")}
            value={form.triageStartedAt}
            onChange={(v) => patch({ triageStartedAt: v })}
            disabled={formDisabled}
          />
          <DtField
            label={t("erEmtalaPanel.labelTriageCompletedAt")}
            value={form.triageCompletedAt}
            onChange={(v) => patch({ triageCompletedAt: v })}
            disabled={formDisabled}
          />
          <DtField
            label={t("erEmtalaPanel.labelMseStartedAt")}
            value={form.medicalScreeningExamStartedAt}
            onChange={(v) => patch({ medicalScreeningExamStartedAt: v })}
            disabled={formDisabled}
          />
          <DtField
            label={t("erEmtalaPanel.labelMseCompletedAt")}
            value={form.medicalScreeningExamCompletedAt}
            onChange={(v) => patch({ medicalScreeningExamCompletedAt: v })}
            disabled={formDisabled}
          />
          <DtField
            label={t("erEmtalaPanel.labelDispositionDecisionAt")}
            value={form.dispositionDecisionAt}
            onChange={(v) => patch({ dispositionDecisionAt: v })}
            disabled={formDisabled}
          />
          <DtField
            label={t("erEmtalaPanel.labelDepartureAt")}
            value={form.departureAt}
            onChange={(v) => patch({ departureAt: v })}
            disabled={formDisabled}
          />
        </div>

        {showTransfer ? (
          <>
            <p style={sectionHead}>{t("erEmtalaPanel.sectionTransfer")}</p>
            <div style={grid2}>
              <DtField
                label={t("erEmtalaPanel.labelTransferRequestedAt")}
                value={form.transferRequestedAt}
                onChange={(v) => patch({ transferRequestedAt: v })}
                disabled={formDisabled}
              />
              <DtField
                label={t("erEmtalaPanel.labelTransferAcceptedAt")}
                value={form.transferAcceptedAt}
                onChange={(v) => patch({ transferAcceptedAt: v })}
                disabled={formDisabled}
              />
              <TextField
                label={t("erEmtalaPanel.labelAcceptingFacility")}
                value={form.acceptingFacilityName}
                onChange={(v) => patch({ acceptingFacilityName: v })}
                disabled={formDisabled}
                maxLength={500}
              />
              <TextField
                label={t("erEmtalaPanel.labelAcceptingClinician")}
                value={form.acceptingClinicianName}
                onChange={(v) => patch({ acceptingClinicianName: v })}
                disabled={formDisabled}
                maxLength={500}
              />
              <TextField
                label={t("erEmtalaPanel.labelTransferMode")}
                value={form.transferMode}
                onChange={(v) => patch({ transferMode: v })}
                disabled={formDisabled}
                maxLength={200}
              />
            </div>
            <TextField
              label={t("erEmtalaPanel.labelTransferReason")}
              value={form.transferReason}
              onChange={(v) => patch({ transferReason: v })}
              disabled={formDisabled}
              maxLength={4000}
              rows={3}
            />
          </>
        ) : null}

        {showAma ? (
          <>
            <p style={sectionHead}>{t("erEmtalaPanel.sectionAma")}</p>
            <TriSelect
              t={t}
              labelKey="labelAmaRiskDiscussed"
              value={form.amaRiskDiscussionDocumented}
              onChange={(v) => patch({ amaRiskDiscussionDocumented: v })}
              disabled={formDisabled}
            />
          </>
        ) : null}

        {showLwbs ? (
          <>
            <p style={sectionHead}>{t("erEmtalaPanel.sectionLwbs")}</p>
            <DtField
              label={t("erEmtalaPanel.labelLwbsDocumentedAt")}
              value={form.lwbsDocumentedAt}
              onChange={(v) => patch({ lwbsDocumentedAt: v })}
              disabled={formDisabled}
            />
          </>
        ) : null}

        <p style={sectionHead}>{t("erEmtalaPanel.sectionAttestation")}</p>
        <div style={grid2}>
          <TriSelect
            t={t}
            labelKey="labelMsePerformed"
            value={form.msePerformed}
            onChange={(v) => patch({ msePerformed: v })}
            disabled={formDisabled}
          />
          <TriSelect
            t={t}
            labelKey="labelEmcConsidered"
            value={form.emergencyConditionConsidered}
            onChange={(v) => patch({ emergencyConditionConsidered: v })}
            disabled={formDisabled}
          />
          <TriSelect
            t={t}
            labelKey="labelStabilizingTreatment"
            value={form.stabilizingTreatmentProvidedOrNotApplicable}
            onChange={(v) => patch({ stabilizingTreatmentProvidedOrNotApplicable: v })}
            disabled={formDisabled}
          />
        </div>

        {feedback ? (
          <p
            style={{
              margin: "10px 0 0 0",
              fontSize: 13,
              fontWeight: 600,
              color: feedback.variant === "ok" ? "#166534" : "#b91c1c",
            }}
          >
            {feedback.text}
          </p>
        ) : null}

        <button
          type="button"
          style={formDisabled || saving ? btnSaveDisabled : btnSave}
          disabled={formDisabled || saving}
          onClick={() => void handleSave()}
        >
          {saving ? t("erEmtalaPanel.saving") : t("erEmtalaPanel.saveButton")}
        </button>
      </MedoraCardInner>
    </MedoraCard>
  );
}
