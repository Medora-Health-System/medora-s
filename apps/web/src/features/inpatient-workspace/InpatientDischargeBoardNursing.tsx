/**
 * INP.DIS.1F — Disposition-aware nursing execution cards for the enterprise board.
 * Compact cards only; no long stacked forms. Functional parity with 1D section.
 */

"use client";

import type { CSSProperties, ReactNode } from "react";
import {
  INPATIENT_NURSING_EDUCATION_RECIPIENTS,
  INPATIENT_NURSING_TRANSPORT_MODES,
  INPATIENT_NURSING_UNDERSTANDING,
  instantToLocalDateTimeInput,
  localDateTimeInputToIso,
  type InpatientNursingDischargeV1D,
} from "@medora/shared";
import {
  boardSectionStyle,
  fieldStyle,
  labelStyle,
  secondaryBtn,
} from "./dischargeBoardStyles";

function Check({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

function ensureEducation(
  prev: InpatientNursingDischargeV1D["education"] | null | undefined
): NonNullable<InpatientNursingDischargeV1D["education"]> {
  return {
    instructionsReviewed: prev?.instructionsReviewed === true,
    medicationInstructionsReviewed: prev?.medicationInstructionsReviewed === true,
    followUpReviewed: prev?.followUpReviewed === true,
    returnPrecautionsReviewed: prev?.returnPrecautionsReviewed === true,
    patientUnderstanding: prev?.patientUnderstanding ?? null,
    recipient: prev?.recipient ?? null,
    recipientName: prev?.recipientName ?? null,
    interpreterUsed: prev?.interpreterUsed,
    interpreterDetails: prev?.interpreterDetails ?? null,
    patientDeclinedInstructions: prev?.patientDeclinedInstructions,
    leftBeforeInstructionsComplete: prev?.leftBeforeInstructionsComplete,
  };
}

function Card({
  title,
  testId,
  children,
  id,
}: {
  title: string;
  testId: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <div id={id} data-testid={testId} style={boardSectionStyle}>
      <h3 style={{ margin: 0, fontSize: 14 }}>{title}</h3>
      {children}
    </div>
  );
}

const fiveCol: CSSProperties = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
};

export function dispositionNursingFlags(code: string) {
  const c = code.toUpperCase();
  const isEloped = c === "ELOPED";
  const isDeceased = c === "DECEASED";
  const isAma = c === "AGAINST_MEDICAL_ADVICE";
  const isCorrectional = c === "CORRECTIONAL_FACILITY";
  const isHomeHealth = c === "HOME_WITH_HOME_HEALTH";
  /** Facility transfer handoff — HOSPICE uses home-style nursing per 1D (not handoff-required). */
  const isTransferFamily =
    c === "TRANSFER_ACUTE_CARE" ||
    c === "SKILLED_NURSING_FACILITY" ||
    c === "ACUTE_REHAB" ||
    c === "LONG_TERM_ACUTE_CARE" ||
    c === "BEHAVIORAL_HEALTH_FACILITY" ||
    c === "ASSISTED_LIVING";
  const isHospice = c === "HOSPICE";
  return {
    isEloped,
    isDeceased,
    isAma,
    isCorrectional,
    isHomeHealth,
    isHospice,
    isTransferFamily,
    showEducation: !isEloped && !isDeceased,
    showIv: !isEloped && !isDeceased,
    showBelongings: !isEloped,
    showTransportDeparture: !isEloped && !isDeceased,
  };
}

export function InpatientDischargeBoardNursing({
  nursingDoc,
  dispositionCode,
  readOnly,
  canNursing,
  tp,
  touchNursing,
}: {
  nursingDoc: InpatientNursingDischargeV1D;
  dispositionCode: string;
  readOnly: boolean;
  canNursing: boolean;
  tp: (key: string) => string;
  touchNursing: (
    updater: (prev: InpatientNursingDischargeV1D) => InpatientNursingDischargeV1D
  ) => void;
}) {
  const flags = dispositionNursingFlags(dispositionCode);
  const disabled = readOnly || !canNursing;
  const PREFIX = "inpatientDischargeBoardInpDis1f";

  const transportLabel = (m: string) => {
    const labeled = tp(`transportModes.${m}`);
    return labeled.startsWith(PREFIX) ? m.replace(/_/g, " ") : labeled;
  };

  return (
    <div id="inp-dis-nursing-details" style={fiveCol}>
      {flags.showEducation ? (
        <Card title={tp("nursing.education")} testId="inp-dis-1f-nursing-education">
          <Check
            label={tp("nursing.instructionsReviewed")}
            checked={nursingDoc.education?.instructionsReviewed === true}
            disabled={disabled}
            onChange={(v) =>
              touchNursing((prev) => ({
                ...prev,
                education: { ...ensureEducation(prev.education), instructionsReviewed: v },
              }))
            }
          />
          <Check
            label={tp("nursing.medicationReviewed")}
            checked={nursingDoc.education?.medicationInstructionsReviewed === true}
            disabled={disabled}
            onChange={(v) =>
              touchNursing((prev) => ({
                ...prev,
                education: {
                  ...ensureEducation(prev.education),
                  medicationInstructionsReviewed: v,
                },
              }))
            }
          />
          <Check
            label={tp("nursing.followUpReviewed")}
            checked={nursingDoc.education?.followUpReviewed === true}
            disabled={disabled}
            onChange={(v) =>
              touchNursing((prev) => ({
                ...prev,
                education: { ...ensureEducation(prev.education), followUpReviewed: v },
              }))
            }
          />
          <Check
            label={tp("nursing.returnPrecautions")}
            checked={nursingDoc.education?.returnPrecautionsReviewed === true}
            disabled={disabled}
            onChange={(v) =>
              touchNursing((prev) => ({
                ...prev,
                education: {
                  ...ensureEducation(prev.education),
                  returnPrecautionsReviewed: v,
                },
              }))
            }
          />
          {flags.isAma ? (
            <>
              <Check
                label={tp("nursing.patientDeclined")}
                checked={nursingDoc.education?.patientDeclinedInstructions === true}
                disabled={disabled}
                onChange={(v) =>
                  touchNursing((prev) => ({
                    ...prev,
                    education: {
                      ...ensureEducation(prev.education),
                      patientDeclinedInstructions: v,
                    },
                  }))
                }
              />
              <Check
                label={tp("nursing.leftBeforeComplete")}
                checked={nursingDoc.education?.leftBeforeInstructionsComplete === true}
                disabled={disabled}
                onChange={(v) =>
                  touchNursing((prev) => ({
                    ...prev,
                    education: {
                      ...ensureEducation(prev.education),
                      leftBeforeInstructionsComplete: v,
                    },
                  }))
                }
              />
            </>
          ) : null}
          <select
            style={fieldStyle}
            disabled={disabled}
            value={nursingDoc.education?.patientUnderstanding ?? ""}
            onChange={(e) =>
              touchNursing((prev) => ({
                ...prev,
                education: {
                  ...ensureEducation(prev.education),
                  patientUnderstanding: (e.target.value || null) as
                    | (typeof INPATIENT_NURSING_UNDERSTANDING)[number]
                    | null,
                },
              }))
            }
          >
            <option value="">— {tp("nursing.understanding")}</option>
            {INPATIENT_NURSING_UNDERSTANDING.map((u) => (
              <option key={u} value={u}>
                {tp(`understanding.${u}`)}
              </option>
            ))}
          </select>
          <select
            style={fieldStyle}
            disabled={disabled}
            value={nursingDoc.education?.recipient ?? ""}
            onChange={(e) =>
              touchNursing((prev) => ({
                ...prev,
                education: {
                  ...ensureEducation(prev.education),
                  recipient: (e.target.value || null) as
                    | (typeof INPATIENT_NURSING_EDUCATION_RECIPIENTS)[number]
                    | null,
                },
              }))
            }
          >
            <option value="">— {tp("nursing.reviewedWith")}</option>
            {INPATIENT_NURSING_EDUCATION_RECIPIENTS.map((u) => (
              <option key={u} value={u}>
                {tp(`recipients.${u}`)}
              </option>
            ))}
          </select>
          {nursingDoc.education?.recipient &&
          nursingDoc.education.recipient !== "PATIENT" ? (
            <input
              style={fieldStyle}
              disabled={disabled}
              placeholder={tp("nursing.recipientName")}
              value={nursingDoc.education?.recipientName ?? ""}
              onChange={(e) =>
                touchNursing((prev) => ({
                  ...prev,
                  education: {
                    ...ensureEducation(prev.education),
                    recipientName: e.target.value,
                  },
                }))
              }
            />
          ) : null}
          <Check
            label={tp("nursing.interpreterUsed")}
            checked={nursingDoc.education?.interpreterUsed === true}
            disabled={disabled}
            onChange={(v) =>
              touchNursing((prev) => ({
                ...prev,
                education: {
                  ...ensureEducation(prev.education),
                  interpreterUsed: v,
                },
              }))
            }
          />
          {nursingDoc.education?.interpreterUsed ? (
            <input
              style={fieldStyle}
              disabled={disabled}
              placeholder={tp("nursing.interpreterDetails")}
              value={nursingDoc.education?.interpreterDetails ?? ""}
              onChange={(e) =>
                touchNursing((prev) => ({
                  ...prev,
                  education: {
                    ...ensureEducation(prev.education),
                    interpreterDetails: e.target.value,
                  },
                }))
              }
            />
          ) : null}
        </Card>
      ) : null}

      {flags.showIv ? (
        <Card title={tp("nursing.ivLines")} testId="inp-dis-1f-nursing-iv">
          <Check
            label={tp("nursing.ivRemoved")}
            checked={nursingDoc.devices?.ivRemoved === true}
            disabled={disabled}
            onChange={(v) =>
              touchNursing((prev) => ({
                ...prev,
                devices: { ...prev.devices, ivRemoved: v },
              }))
            }
          />
          {flags.isTransferFamily ? (
            <Check
              label={tp("nursing.ivLeftInPlace")}
              checked={nursingDoc.devices?.ivLeftInPlaceForTransfer === true}
              disabled={disabled}
              onChange={(v) =>
                touchNursing((prev) => ({
                  ...prev,
                  devices: { ...prev.devices, ivLeftInPlaceForTransfer: v },
                }))
              }
            />
          ) : null}
        </Card>
      ) : null}

      {flags.isDeceased ? (
        <Card title={tp("nursing.decedent.linesTitle")} testId="inp-dis-1f-nursing-lines-deceased">
          <select
            style={fieldStyle}
            disabled={disabled}
            value={nursingDoc.deceased?.linesTubesDisposition ?? ""}
            onChange={(e) =>
              touchNursing((prev) => ({
                ...prev,
                deceased: {
                  ...prev.deceased,
                  linesTubesDisposition: (e.target.value || null) as
                    | "REMOVED"
                    | "RETAINED_ME"
                    | "OTHER"
                    | null,
                },
              }))
            }
          >
            <option value="">— {tp("nursing.decedent.linesTubes")}</option>
            <option value="REMOVED">{tp("nursing.decedent.REMOVED")}</option>
            <option value="RETAINED_ME">{tp("nursing.decedent.RETAINED_ME")}</option>
            <option value="OTHER">{tp("nursing.decedent.OTHER")}</option>
          </select>
        </Card>
      ) : null}

      {flags.isEloped ? (
        <Card title={tp("nursing.eloped.ivTitle")} testId="inp-dis-1f-nursing-iv-eloped">
          <select
            style={fieldStyle}
            disabled={disabled}
            value={nursingDoc.eloped?.ivOrLinesPresent ?? ""}
            onChange={(e) =>
              touchNursing((prev) => ({
                ...prev,
                eloped: {
                  ...prev.eloped,
                  ivOrLinesPresent: (e.target.value || null) as "YES" | "NO" | "UNKNOWN" | null,
                },
              }))
            }
          >
            <option value="">— {tp("nursing.eloped.ivStatus")}</option>
            <option value="YES">{tp("yes")}</option>
            <option value="NO">{tp("no")}</option>
            <option value="UNKNOWN">{tp("nursing.belongingsUnknown")}</option>
          </select>
        </Card>
      ) : null}

      {flags.showBelongings ? (
        <Card title={tp("nursing.belongings")} testId="inp-dis-1f-nursing-belongings">
          <Check
            label={tp("nursing.belongingsReturned")}
            checked={nursingDoc.belongings?.returned === true}
            disabled={disabled}
            onChange={(v) =>
              touchNursing((prev) => ({
                ...prev,
                belongings: { ...(prev.belongings ?? { returned: false }), returned: v },
              }))
            }
          />
          {flags.isTransferFamily || flags.isCorrectional ? (
            <Check
              label={tp("nursing.belongingsTransferred")}
              checked={nursingDoc.belongings?.transferredWithPatient === true}
              disabled={disabled}
              onChange={(v) =>
                touchNursing((prev) => ({
                  ...prev,
                  belongings: {
                    ...(prev.belongings ?? { returned: false }),
                    transferredWithPatient: v,
                  },
                }))
              }
            />
          ) : null}
          {flags.isCorrectional ? (
            <Check
              label={tp("nursing.belongingsLawEnforcement")}
              checked={nursingDoc.belongings?.transferredToLawEnforcement === true}
              disabled={disabled}
              onChange={(v) =>
                touchNursing((prev) => ({
                  ...prev,
                  belongings: {
                    ...(prev.belongings ?? { returned: false }),
                    transferredToLawEnforcement: v,
                  },
                }))
              }
            />
          ) : null}
          <Check
            label={tp("nursing.belongingsUnknown")}
            checked={nursingDoc.belongings?.unknown === true}
            disabled={disabled}
            onChange={(v) =>
              touchNursing((prev) => ({
                ...prev,
                belongings: { ...(prev.belongings ?? { returned: false }), unknown: v },
              }))
            }
          />
        </Card>
      ) : null}

      {flags.isEloped ? (
        <Card title={tp("nursing.eloped.belongingsTitle")} testId="inp-dis-1f-nursing-belongings-eloped">
          <select
            style={fieldStyle}
            disabled={disabled}
            value={nursingDoc.eloped?.belongingsStatus ?? ""}
            onChange={(e) =>
              touchNursing((prev) => ({
                ...prev,
                eloped: {
                  ...prev.eloped,
                  belongingsStatus: (e.target.value || null) as "KNOWN" | "UNKNOWN" | null,
                },
              }))
            }
          >
            <option value="">— {tp("nursing.belongings")}</option>
            <option value="KNOWN">{tp("nursing.eloped.belongingsKnown")}</option>
            <option value="UNKNOWN">{tp("nursing.belongingsUnknown")}</option>
          </select>
        </Card>
      ) : null}

      {flags.isTransferFamily ? (
        <Card title={tp("nursing.handoff.title")} testId="inp-dis-1f-nursing-handoff">
          <Check
            label={tp("nursing.handoff.reportCalled")}
            checked={nursingDoc.handoff?.reportCalled === true}
            disabled={disabled}
            onChange={(v) =>
              touchNursing((prev) => ({
                ...prev,
                handoff: { ...prev.handoff, reportCalled: v },
              }))
            }
          />
          <input
            style={fieldStyle}
            disabled={disabled}
            placeholder={tp("nursing.handoff.reportGivenTo")}
            value={nursingDoc.handoff?.reportGivenTo ?? ""}
            onChange={(e) =>
              touchNursing((prev) => ({
                ...prev,
                handoff: { ...prev.handoff, reportGivenTo: e.target.value },
              }))
            }
          />
          <label>
            <span style={labelStyle}>{tp("nursing.handoff.reportAt")}</span>
            <input
              style={fieldStyle}
              disabled={disabled}
              type="datetime-local"
              value={instantToLocalDateTimeInput(nursingDoc.handoff?.reportAt)}
              onChange={(e) =>
                touchNursing((prev) => ({
                  ...prev,
                  handoff: {
                    ...prev.handoff,
                    reportAt: localDateTimeInputToIso(e.target.value),
                  },
                }))
              }
            />
          </label>
          <Check
            label={tp("nursing.handoff.dischargeSummary")}
            checked={nursingDoc.handoff?.documentsSent?.dischargeSummary === true}
            disabled={disabled}
            onChange={(v) =>
              touchNursing((prev) => ({
                ...prev,
                handoff: {
                  ...prev.handoff,
                  documentsSent: {
                    ...prev.handoff?.documentsSent,
                    dischargeSummary: v,
                  },
                },
              }))
            }
          />
          <Check
            label={tp("nursing.handoff.marOrMedList")}
            checked={nursingDoc.handoff?.documentsSent?.marOrMedList === true}
            disabled={disabled}
            onChange={(v) =>
              touchNursing((prev) => ({
                ...prev,
                handoff: {
                  ...prev.handoff,
                  documentsSent: {
                    ...prev.handoff?.documentsSent,
                    marOrMedList: v,
                  },
                },
              }))
            }
          />
          <Check
            label={tp("nursing.handoff.medicationReconciliation")}
            checked={nursingDoc.handoff?.documentsSent?.medicationReconciliation === true}
            disabled={disabled}
            onChange={(v) =>
              touchNursing((prev) => ({
                ...prev,
                handoff: {
                  ...prev.handoff,
                  documentsSent: {
                    ...prev.handoff?.documentsSent,
                    medicationReconciliation: v,
                  },
                },
              }))
            }
          />
          <Check
            label={tp("nursing.handoff.relevantResults")}
            checked={nursingDoc.handoff?.documentsSent?.relevantResults === true}
            disabled={disabled}
            onChange={(v) =>
              touchNursing((prev) => ({
                ...prev,
                handoff: {
                  ...prev.handoff,
                  documentsSent: {
                    ...prev.handoff?.documentsSent,
                    relevantResults: v,
                  },
                },
              }))
            }
          />
          <Check
            label={tp("nursing.handoff.imaging")}
            checked={nursingDoc.handoff?.documentsSent?.imaging === true}
            disabled={disabled}
            onChange={(v) =>
              touchNursing((prev) => ({
                ...prev,
                handoff: {
                  ...prev.handoff,
                  documentsSent: {
                    ...prev.handoff?.documentsSent,
                    imaging: v,
                  },
                },
              }))
            }
          />
          <Check
            label={tp("nursing.handoff.pendingStudies")}
            checked={nursingDoc.handoff?.documentsSent?.pendingStudies === true}
            disabled={disabled}
            onChange={(v) =>
              touchNursing((prev) => ({
                ...prev,
                handoff: {
                  ...prev.handoff,
                  documentsSent: {
                    ...prev.handoff?.documentsSent,
                    pendingStudies: v,
                  },
                },
              }))
            }
          />
          <Check
            label={tp("nursing.handoff.other")}
            checked={nursingDoc.handoff?.documentsSent?.other === true}
            disabled={disabled}
            onChange={(v) =>
              touchNursing((prev) => ({
                ...prev,
                handoff: {
                  ...prev.handoff,
                  documentsSent: {
                    ...prev.handoff?.documentsSent,
                    other: v,
                  },
                },
              }))
            }
          />
          {nursingDoc.handoff?.documentsSent?.other ? (
            <input
              style={fieldStyle}
              disabled={disabled}
              placeholder={tp("nursing.handoff.otherDetails")}
              value={nursingDoc.handoff?.documentsSent?.otherDetails ?? ""}
              onChange={(e) =>
                touchNursing((prev) => ({
                  ...prev,
                  handoff: {
                    ...prev.handoff,
                    documentsSent: {
                      ...prev.handoff?.documentsSent,
                      otherDetails: e.target.value,
                    },
                  },
                }))
              }
            />
          ) : null}
        </Card>
      ) : null}

      {flags.isHomeHealth ? (
        <Card title={tp("nursing.homeHealth.title")} testId="inp-dis-1f-nursing-home-health">
          <Check
            label={tp("nursing.homeHealth.agencyConfirmed")}
            checked={nursingDoc.homeHealth?.agencyConfirmed === true}
            disabled={disabled}
            onChange={(v) =>
              touchNursing((prev) => ({
                ...prev,
                homeHealth: { ...prev.homeHealth, agencyConfirmed: v },
              }))
            }
          />
          <Check
            label={tp("nursing.homeHealth.familyKnows")}
            checked={nursingDoc.homeHealth?.familyKnowsAgency === true}
            disabled={disabled}
            onChange={(v) =>
              touchNursing((prev) => ({
                ...prev,
                homeHealth: { ...prev.homeHealth, familyKnowsAgency: v },
              }))
            }
          />
          <Check
            label={tp("nursing.homeHealth.contactProvided")}
            checked={nursingDoc.homeHealth?.contactProvided === true}
            disabled={disabled}
            onChange={(v) =>
              touchNursing((prev) => ({
                ...prev,
                homeHealth: { ...prev.homeHealth, contactProvided: v },
              }))
            }
          />
          <Check
            label={tp("nursing.homeHealth.documentsSent")}
            checked={nursingDoc.homeHealth?.documentsSent === true}
            disabled={disabled}
            onChange={(v) =>
              touchNursing((prev) => ({
                ...prev,
                homeHealth: { ...prev.homeHealth, documentsSent: v },
              }))
            }
          />
        </Card>
      ) : null}

      {flags.isCorrectional ? (
        <Card title={tp("nursing.correctional.title")} testId="inp-dis-1f-nursing-correctional">
          <input
            style={fieldStyle}
            disabled={disabled}
            placeholder={tp("nursing.correctional.facility")}
            value={nursingDoc.correctional?.facilityName ?? ""}
            onChange={(e) =>
              touchNursing((prev) => ({
                ...prev,
                correctional: { ...prev.correctional, facilityName: e.target.value },
              }))
            }
          />
          <input
            style={fieldStyle}
            disabled={disabled}
            placeholder={tp("nursing.correctional.agency")}
            value={nursingDoc.correctional?.agencyName ?? ""}
            onChange={(e) =>
              touchNursing((prev) => ({
                ...prev,
                correctional: { ...prev.correctional, agencyName: e.target.value },
              }))
            }
          />
          <input
            style={fieldStyle}
            disabled={disabled}
            placeholder={tp("nursing.correctional.officer")}
            value={nursingDoc.correctional?.officerName ?? ""}
            onChange={(e) =>
              touchNursing((prev) => ({
                ...prev,
                correctional: { ...prev.correctional, officerName: e.target.value },
              }))
            }
          />
          <input
            style={fieldStyle}
            disabled={disabled}
            placeholder={tp("nursing.correctional.badgeId")}
            value={nursingDoc.correctional?.badgeId ?? ""}
            onChange={(e) =>
              touchNursing((prev) => ({
                ...prev,
                correctional: { ...prev.correctional, badgeId: e.target.value },
              }))
            }
          />
          <label>
            <span style={labelStyle}>{tp("nursing.correctional.custodyAt")}</span>
            <input
              style={fieldStyle}
              disabled={disabled}
              type="datetime-local"
              value={instantToLocalDateTimeInput(nursingDoc.correctional?.custodyTransferredAt)}
              onChange={(e) =>
                touchNursing((prev) => ({
                  ...prev,
                  correctional: {
                    ...prev.correctional,
                    custodyTransferredAt: localDateTimeInputToIso(e.target.value),
                  },
                }))
              }
            />
          </label>
          <Check
            label={tp("nursing.correctional.instructionsProvided")}
            checked={nursingDoc.correctional?.instructionsProvided === true}
            disabled={disabled}
            onChange={(v) =>
              touchNursing((prev) => ({
                ...prev,
                correctional: { ...prev.correctional, instructionsProvided: v },
              }))
            }
          />
        </Card>
      ) : null}

      {flags.isEloped ? (
        <Card title={tp("nursing.eloped.title")} testId="inp-dis-1f-nursing-eloped">
          <label>
            <span style={labelStyle}>{tp("nursing.eloped.discoveredAt")}</span>
            <input
              style={fieldStyle}
              disabled={disabled}
              type="datetime-local"
              value={instantToLocalDateTimeInput(nursingDoc.eloped?.discoveredAt)}
              onChange={(e) =>
                touchNursing((prev) => ({
                  ...prev,
                  eloped: {
                    ...prev.eloped,
                    discoveredAt: localDateTimeInputToIso(e.target.value),
                  },
                }))
              }
            />
          </label>
          <label>
            <span style={labelStyle}>{tp("nursing.eloped.lastKnownAt")}</span>
            <input
              style={fieldStyle}
              disabled={disabled}
              type="datetime-local"
              value={instantToLocalDateTimeInput(nursingDoc.eloped?.lastKnownAt)}
              onChange={(e) =>
                touchNursing((prev) => ({
                  ...prev,
                  eloped: {
                    ...prev.eloped,
                    lastKnownAt: localDateTimeInputToIso(e.target.value),
                  },
                }))
              }
            />
          </label>
          <input
            style={fieldStyle}
            disabled={disabled}
            placeholder={tp("nursing.eloped.lastKnownLocation")}
            value={nursingDoc.eloped?.lastKnownLocation ?? ""}
            onChange={(e) =>
              touchNursing((prev) => ({
                ...prev,
                eloped: { ...prev.eloped, lastKnownLocation: e.target.value },
              }))
            }
          />
          <input
            style={fieldStyle}
            disabled={disabled}
            placeholder={tp("nursing.eloped.conditionWhenLastObserved")}
            value={nursingDoc.eloped?.conditionWhenLastObserved ?? ""}
            onChange={(e) =>
              touchNursing((prev) => ({
                ...prev,
                eloped: { ...prev.eloped, conditionWhenLastObserved: e.target.value },
              }))
            }
          />
          <Check
            label={tp("nursing.eloped.providerNotified")}
            checked={nursingDoc.eloped?.providerNotified === true}
            disabled={disabled}
            onChange={(v) =>
              touchNursing((prev) => ({
                ...prev,
                eloped: { ...prev.eloped, providerNotified: v },
              }))
            }
          />
          <Check
            label={tp("nursing.eloped.chargeNurseNotified")}
            checked={nursingDoc.eloped?.chargeNurseNotified === true}
            disabled={disabled}
            onChange={(v) =>
              touchNursing((prev) => ({
                ...prev,
                eloped: { ...prev.eloped, chargeNurseNotified: v },
              }))
            }
          />
          <Check
            label={tp("nursing.eloped.securityNotified")}
            checked={nursingDoc.eloped?.securityNotified === true}
            disabled={disabled}
            onChange={(v) =>
              touchNursing((prev) => ({
                ...prev,
                eloped: { ...prev.eloped, securityNotified: v },
              }))
            }
          />
          <Check
            label={tp("nursing.eloped.emergencyContactAttempted")}
            checked={nursingDoc.eloped?.emergencyContactAttempted === true}
            disabled={disabled}
            onChange={(v) =>
              touchNursing((prev) => ({
                ...prev,
                eloped: { ...prev.eloped, emergencyContactAttempted: v },
              }))
            }
          />
          <Check
            label={tp("nursing.eloped.lawEnforcementNotified")}
            checked={nursingDoc.eloped?.lawEnforcementNotified === true}
            disabled={disabled}
            onChange={(v) =>
              touchNursing((prev) => ({
                ...prev,
                eloped: { ...prev.eloped, lawEnforcementNotified: v },
              }))
            }
          />
          <textarea
            style={{ ...fieldStyle, minHeight: 56 }}
            disabled={disabled}
            placeholder={tp("nursing.eloped.notes")}
            value={nursingDoc.eloped?.notes ?? ""}
            onChange={(e) =>
              touchNursing((prev) => ({
                ...prev,
                eloped: { ...prev.eloped, notes: e.target.value },
              }))
            }
          />
        </Card>
      ) : null}

      {flags.isDeceased ? (
        <Card title={tp("nursing.decedent.title")} testId="inp-dis-1f-nursing-deceased">
          <Check
            label={tp("nursing.decedent.identification")}
            checked={nursingDoc.deceased?.identificationCompleted === true}
            disabled={disabled}
            onChange={(v) =>
              touchNursing((prev) => ({
                ...prev,
                deceased: { ...prev.deceased, identificationCompleted: v },
              }))
            }
          />
          <Check
            label={tp("nursing.decedent.nextOfKin")}
            checked={nursingDoc.deceased?.nextOfKinNotified === true}
            disabled={disabled}
            onChange={(v) =>
              touchNursing((prev) => ({
                ...prev,
                deceased: { ...prev.deceased, nextOfKinNotified: v },
              }))
            }
          />
          <select
            style={fieldStyle}
            disabled={disabled}
            value={nursingDoc.deceased?.postmortemCare ?? ""}
            onChange={(e) =>
              touchNursing((prev) => ({
                ...prev,
                deceased: {
                  ...prev.deceased,
                  postmortemCare: (e.target.value || null) as
                    | "PERFORMED"
                    | "NOT_APPLICABLE"
                    | "DEFERRED"
                    | null,
                },
              }))
            }
          >
            <option value="">— {tp("nursing.decedent.postmortemCare")}</option>
            <option value="PERFORMED">{tp("nursing.decedent.PERFORMED")}</option>
            <option value="NOT_APPLICABLE">{tp("nursing.decedent.NOT_APPLICABLE")}</option>
            <option value="DEFERRED">{tp("nursing.decedent.DEFERRED")}</option>
          </select>
          <select
            style={fieldStyle}
            disabled={disabled}
            value={nursingDoc.deceased?.bodyDestination ?? ""}
            onChange={(e) =>
              touchNursing((prev) => ({
                ...prev,
                deceased: {
                  ...prev.deceased,
                  bodyDestination: (e.target.value || null) as
                    | "MORGUE"
                    | "FUNERAL_HOME"
                    | "MEDICAL_EXAMINER"
                    | "OTHER"
                    | null,
                },
              }))
            }
          >
            <option value="">— {tp("nursing.decedent.bodyDestination")}</option>
            {(["MORGUE", "FUNERAL_HOME", "MEDICAL_EXAMINER", "OTHER"] as const).map((d) => (
              <option key={d} value={d}>
                {tp(`nursing.decedent.${d}`)}
              </option>
            ))}
          </select>
          <input
            style={fieldStyle}
            disabled={disabled}
            placeholder={tp("nursing.decedent.transferredTo")}
            value={nursingDoc.deceased?.transferredTo ?? ""}
            onChange={(e) =>
              touchNursing((prev) => ({
                ...prev,
                deceased: { ...prev.deceased, transferredTo: e.target.value },
              }))
            }
          />
          <label>
            <span style={labelStyle}>{tp("nursing.decedent.transferredAt")}</span>
            <input
              style={fieldStyle}
              disabled={disabled}
              type="datetime-local"
              value={instantToLocalDateTimeInput(nursingDoc.deceased?.transferredAt)}
              onChange={(e) =>
                touchNursing((prev) => ({
                  ...prev,
                  deceased: {
                    ...prev.deceased,
                    transferredAt: localDateTimeInputToIso(e.target.value),
                  },
                }))
              }
            />
          </label>
          <textarea
            style={{ ...fieldStyle, minHeight: 56 }}
            disabled={disabled}
            placeholder={tp("nursing.decedent.notes")}
            value={nursingDoc.deceased?.notes ?? ""}
            onChange={(e) =>
              touchNursing((prev) => ({
                ...prev,
                deceased: { ...prev.deceased, notes: e.target.value },
              }))
            }
          />
        </Card>
      ) : null}

      {flags.showTransportDeparture ? (
        <Card title={tp("nursing.transport")} testId="inp-dis-1f-nursing-transport">
          <select
            style={fieldStyle}
            disabled={disabled}
            value={nursingDoc.transport?.mode ?? ""}
            onChange={(e) =>
              touchNursing((prev) => ({
                ...prev,
                transport: { ...prev.transport, mode: e.target.value || null },
                departure: { ...prev.departure, mode: e.target.value || null },
              }))
            }
          >
            <option value="">— {tp("nursing.transportMode")}</option>
            {INPATIENT_NURSING_TRANSPORT_MODES.map((m) => (
              <option key={m} value={m}>
                {transportLabel(m)}
              </option>
            ))}
          </select>
          {(flags.isTransferFamily || flags.isCorrectional) && (
            <input
              style={fieldStyle}
              disabled={disabled}
              placeholder={tp("nursing.transportCompany")}
              value={nursingDoc.transport?.company ?? ""}
              onChange={(e) =>
                touchNursing((prev) => ({
                  ...prev,
                  transport: { ...prev.transport, company: e.target.value },
                }))
              }
            />
          )}
        </Card>
      ) : null}

      {flags.showTransportDeparture ? (
        <Card
          id="inp-dis-nursing-departure"
          title={tp("nursing.departure")}
          testId="inp-dis-1f-nursing-departure"
        >
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input
              style={{ ...fieldStyle, flex: 1 }}
              disabled={disabled}
              type="datetime-local"
              value={instantToLocalDateTimeInput(nursingDoc.departure?.departedAt)}
              onChange={(e) =>
                touchNursing((prev) => ({
                  ...prev,
                  departure: {
                    ...prev.departure,
                    departedAt: localDateTimeInputToIso(e.target.value),
                  },
                }))
              }
            />
            {!disabled ? (
              <button
                type="button"
                style={secondaryBtn}
                onClick={() =>
                  touchNursing((prev) => ({
                    ...prev,
                    departure: { ...prev.departure, departedAt: new Date().toISOString() },
                  }))
                }
              >
                {tp("setToNow")}
              </button>
            ) : null}
          </div>
          <input
            style={fieldStyle}
            disabled={disabled}
            placeholder={tp("nursing.conditionAtDeparture")}
            value={nursingDoc.departure?.conditionAtDeparture ?? ""}
            onChange={(e) =>
              touchNursing((prev) => ({
                ...prev,
                departure: { ...prev.departure, conditionAtDeparture: e.target.value },
              }))
            }
          />
          <input
            style={fieldStyle}
            disabled={disabled}
            placeholder={tp("nursing.accompaniedBy")}
            value={nursingDoc.departure?.accompaniedBy ?? ""}
            onChange={(e) =>
              touchNursing((prev) => ({
                ...prev,
                departure: { ...prev.departure, accompaniedBy: e.target.value },
              }))
            }
          />
        </Card>
      ) : null}
    </div>
  );
}
