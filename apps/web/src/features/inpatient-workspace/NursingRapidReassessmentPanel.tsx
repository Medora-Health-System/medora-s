/**
 * D4A.2.7C — Rapid nursing shift / focused reassessment (no silent carry-forward).
 */

"use client";

import { useState } from "react";
import {
  NURSING_REASSESSMENT_TYPES,
  type NursingReassessmentType,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import {
  ClinicalCarryForwardReview,
  ClinicalNormalExceptionSelector,
  ClinicalSaveStatus,
  ClinicalSingleSelect,
} from "./rapid-documentation/ClinicalRapidControls";

export function NursingRapidReassessmentPanel({
  encounterId,
  readOnly,
}: {
  encounterId: string;
  readOnly?: boolean;
}) {
  const { t, language } = useI18n();
  const [type, setType] = useState<NursingReassessmentType>("SHIFT_ASSESSMENT");
  const [finding, setFinding] = useState<string | null>(null);
  const [exceptionText, setExceptionText] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [saveCode, setSaveCode] = useState("NOT_SAVED");
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const priorFinding = t("inpatientRapidConvergenceD4a27c.normalException.NO_CHANGE_FROM_PRIOR");

  return (
    <div data-testid="nursing-rapid-reassessment" style={{ display: "grid", gap: 12 }}>
      <h3 style={{ margin: 0, fontSize: 15 }}>
        {t("inpatientRapidConvergenceD4a27c.reassessment.title")}
      </h3>
      <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
        {encounterId}
      </p>
      <ClinicalSingleSelect
        label={t("inpatientRapidConvergenceD4a27c.reassessment.type")}
        options={NURSING_REASSESSMENT_TYPES.map((code) => ({
          code,
          label: t(`inpatientRapidConvergenceD4a27c.reassessment.types.${code}`),
        }))}
        value={type}
        onChange={(next) => {
          if (next) setType(next as NursingReassessmentType);
          setConfirmed(false);
          setSaveCode("NOT_SAVED");
        }}
        readOnly={readOnly}
      />
      <ClinicalCarryForwardReview
        priorLabel={t("inpatientRapidConvergenceD4a27c.carryForward.prior")}
        priorValue={priorFinding}
        currentLabel={t("inpatientRapidConvergenceD4a27c.carryForward.current")}
        currentValue={
          finding
            ? t(`inpatientRapidConvergenceD4a27c.normalException.${finding}`)
            : "—"
        }
        confirmed={confirmed}
        onConfirm={setConfirmed}
        readOnly={readOnly}
      />
      <ClinicalNormalExceptionSelector
        label={t("inpatientRapidConvergenceD4a27c.reassessment.title")}
        value={finding}
        onChange={(next) => {
          setFinding(next);
          setConfirmed(false);
          setSaveCode("NOT_SAVED");
        }}
        exceptionText={exceptionText}
        onExceptionTextChange={setExceptionText}
        readOnly={readOnly}
      />
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button
          type="button"
          disabled={readOnly || !confirmed || !finding}
          onClick={() => {
            setSaveCode("SAVING");
            setTimeout(() => {
              setSaveCode("SAVED");
              setSavedAt(new Date().toISOString());
            }, 200);
          }}
        >
          {t("inpatientRapidConvergenceD4a27c.nav.save")}
        </button>
        <ClinicalSaveStatus code={saveCode} savedAt={savedAt} language={language} />
      </div>
    </div>
  );
}
