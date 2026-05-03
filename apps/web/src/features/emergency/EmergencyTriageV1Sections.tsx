"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import type { ErAbcOption, ErTraumaActivationCriterionId, ErTraumaLevel, ErTriageV1Form, ErYesNoUnknown } from "./medoraErTriageV1";
import {
  ER_TRAUMA_ACTIVATION_CRITERIA_IDS,
  appendIfNotPresent,
  emptyErTraumaActivationForm,
  erTriageV1FormHasAnyContent,
  nextGcsStateAfterComponentChange,
} from "./medoraErTriageV1";
import { MedoraCardBadge } from "@/components/medora-card";

const TRAUMA_CRITERION_I18N_KEY: Record<ErTraumaActivationCriterionId, string> = {
  hypotension: "erTriage.v1.traumaCriteriaHypotension",
  respiratory_distress: "erTriage.v1.traumaCriteriaRespiratory",
  neuro_alteration: "erTriage.v1.traumaCriteriaNeuro",
  major_fall: "erTriage.v1.traumaCriteriaFall",
  high_energy_mechanism: "erTriage.v1.traumaCriteriaHighEnergy",
  penetrating_wound: "erTriage.v1.traumaCriteriaPenetrating",
  amputation_crush: "erTriage.v1.traumaCriteriaAmputation",
  other_major: "erTriage.v1.traumaCriteriaOther",
};

const detailsShell: React.CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  padding: "10px 12px",
  backgroundColor: "#fff",
};

const summaryRow: React.CSSProperties = {
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 13,
  color: "#334155",
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 8,
  listStyle: "none",
};

const help: React.CSSProperties = {
  margin: "8px 0 0 0",
  fontSize: 12,
  color: "#64748b",
  lineHeight: 1.45,
};

const chipHintStyle: React.CSSProperties = {
  margin: "4px 0 0 0",
  fontSize: 11,
  color: "#94a3b8",
  fontWeight: 500,
};

type ErTriageDocChipProps = {
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
};

function ErTriageDocChip({ label, onClick, active, disabled }: ErTriageDocChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 10px",
        borderRadius: 9999,
        border: active ? "1px solid #3b82f6" : "1px solid #e2e8f0",
        background: active ? "#eff6ff" : "#f8fafc",
        color: "#334155",
        fontSize: 12,
        cursor: disabled ? "not-allowed" : "pointer",
        lineHeight: 1.3,
        opacity: disabled ? 0.55 : 1,
        WebkitTapHighlightColor: "transparent",
        userSelect: "none",
      }}
    >
      {label}
    </button>
  );
}

function ErTriageDocChipRow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6, alignItems: "center" }}>{children}</div>
  );
}

const ROUTING_CHIP_KEYS = [
  "chipsRoutingSelf",
  "chipsRoutingAmbulance",
  "chipsRoutingWalkIn",
  "chipsRoutingTransfer",
  "chipsRoutingOther",
] as const;

const PPE_CHIP_KEYS = [
  "chipsPpeMask",
  "chipsPpeGloves",
  "chipsPpeIsolation",
  "chipsPpeContact",
  "chipsPpeAirborne",
] as const;

const SOCIAL_CHIP_KEYS = [
  "chipsSocialSmoker",
  "chipsSocialFormerSmoker",
  "chipsSocialAlcohol",
  "chipsSocialCannabis",
  "chipsSocialOpioid",
  "chipsSocialStimulant",
] as const;

const MEDS_CHIP_KEYS = ["chipsMedsNone", "chipsMedsUnknown", "chipsMedsPolypharmacy"] as const;

const ALLERGY_CHIP_KEYS = ["chipsAllergyNkda", "chipsAllergyFood", "chipsAllergyDrug", "chipsAllergyLatex"] as const;

const NURSING_CHIP_KEYS = [
  "chipsNursingContinuousMonitor",
  "chipsNursingCardiacMonitor",
  "chipsNursingOxygen",
  "chipsNursingIvAccess",
] as const;

function painOptions(dash: string): { value: string; label: string }[] {
  const o: { value: string; label: string }[] = [{ value: "", label: dash }];
  for (let i = 0; i <= 10; i += 1) o.push({ value: String(i), label: `${i}/10` });
  return o;
}

function gcsScoreOptions(dash: string, max: number): { value: string; label: string }[] {
  const o: { value: string; label: string }[] = [{ value: "", label: dash }];
  for (let i = 1; i <= max; i += 1) o.push({ value: String(i), label: String(i) });
  return o;
}

function gcsTriadCompleteWithTotal(er: ErTriageV1Form): { total: number } | null {
  const e = er.gcsEye.trim();
  const v = er.gcsVerbal.trim();
  const m = er.gcsMotor.trim();
  const ne = parseInt(e, 10);
  const nv = parseInt(v, 10);
  const nm = parseInt(m, 10);
  if (Number.isNaN(ne) || Number.isNaN(nv) || Number.isNaN(nm)) return null;
  if (ne < 1 || ne > 4 || nv < 1 || nv > 5 || nm < 1 || nm > 6) return null;
  const sum = ne + nv + nm;
  if (sum < 3 || sum > 15) return null;
  return { total: sum };
}

export type EmergencyTriageV1SectionsProps = {
  er: ErTriageV1Form;
  patchErV1: (p: Partial<ErTriageV1Form>) => void;
  formDisabled: boolean;
  inputBase: React.CSSProperties;
  labelStyle: React.CSSProperties;
  grid2: React.CSSProperties;
  grid3: React.CSSProperties;
  sectionHeading: React.CSSProperties;
  patientChartHref?: string;
};

export function EmergencyTriageV1Sections({
  er,
  patchErV1,
  formDisabled,
  inputBase,
  labelStyle,
  grid2,
  grid3,
  sectionHeading,
  patientChartHref,
}: EmergencyTriageV1SectionsProps) {
  const { t } = useI18n();
  const v1Any = erTriageV1FormHasAnyContent(er);

  const dash = t("erTriage.preview.emptyOption");
  const abcOptions: { value: ErAbcOption; label: string }[] = useMemo(
    () => [
      { value: "", label: dash },
      { value: "wnl", label: t("erTriage.preview.abcWnl") },
      { value: "yes", label: t("erTriage.preview.ynuYes") },
      { value: "no", label: t("erTriage.preview.ynuNo") },
      { value: "unknown", label: t("erTriage.preview.ynuUnknown") },
    ],
    [t, dash]
  );
  const ynuOptions: { value: ErYesNoUnknown; label: string }[] = useMemo(
    () => [
      { value: "", label: dash },
      { value: "yes", label: t("erTriage.preview.ynuYes") },
      { value: "no", label: t("erTriage.preview.ynuNo") },
      { value: "unknown", label: t("erTriage.preview.ynuUnknown") },
    ],
    [t, dash]
  );
  const gcsEyeOpts = useMemo(() => gcsScoreOptions(dash, 4), [dash]);
  const gcsVerbalOpts = useMemo(() => gcsScoreOptions(dash, 5), [dash]);
  const gcsMotorOpts = useMemo(() => gcsScoreOptions(dash, 6), [dash]);
  const gcsTriad = useMemo(() => gcsTriadCompleteWithTotal(er), [er.gcsEye, er.gcsVerbal, er.gcsMotor]);
  const gcsAbnormal = gcsTriad != null && gcsTriad.total < 15;

  const traumaLevelOptions: { value: ErTraumaLevel; label: string }[] = useMemo(
    () => [
      { value: "", label: dash },
      { value: "LEVEL_1", label: t("erTriage.v1.traumaLevelN1") },
      { value: "LEVEL_2", label: t("erTriage.v1.traumaLevelN2") },
      { value: "LEVEL_3", label: t("erTriage.v1.traumaLevelN3") },
      { value: "LEVEL_4", label: t("erTriage.v1.traumaLevelN4") },
    ],
    [t, dash]
  );

  const sel = (key: keyof ErTriageV1Form, options: { value: string; label: string }[]) => (
    <select
      value={String(er[key] ?? "")}
      onChange={(e) => patchErV1({ [key]: e.target.value } as Partial<ErTriageV1Form>)}
      disabled={formDisabled}
      style={{ ...inputBase, cursor: formDisabled ? "not-allowed" : "pointer" }}
    >
      {options.map((o) => (
        <option key={o.value === "" ? "empty" : o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {v1Any ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <MedoraCardBadge soft={{ bg: "#fef2f2", text: "#991b1b", border: "#fecaca" }}>{t("erTriage.v1.badge")}</MedoraCardBadge>
          <span style={{ fontSize: 12, color: "#64748b" }}>{t("erTriage.v1.extendedHint")}</span>
        </div>
      ) : null}

      <details open style={detailsShell}>
        <summary style={summaryRow}>
          <span>{t("erTriage.v1.s1Title")}</span>
        </summary>
        <p style={help}>{t("erTriage.v1.s1Help")}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 10 }}>
          <div>
            <p style={sectionHeading}>{t("erTriage.v1.narrativeHeading")}</p>
            <textarea
              value={er.triageNarrative}
              onChange={(e) => patchErV1({ triageNarrative: e.target.value })}
              disabled={formDisabled}
              rows={3}
              maxLength={8000}
              style={{ ...inputBase, minHeight: 72, resize: "vertical", marginTop: 8, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
              placeholder={t("erTriage.v1.narrativePlaceholder")}
            />
          </div>
          <div>
            <label style={labelStyle}>{t("erTriage.v1.ppe")}</label>
            <input
              type="text"
              value={er.ppeNote}
              onChange={(e) => patchErV1({ ppeNote: e.target.value })}
              disabled={formDisabled}
              style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
              placeholder={t("erTriage.v1.ppePlaceholder")}
            />
            <p style={chipHintStyle}>{t("erTriage.v1.chipsHint")}</p>
            <ErTriageDocChipRow>
              {PPE_CHIP_KEYS.map((k) => {
                const label = t(`erTriage.v1.${k}`);
                return (
                  <ErTriageDocChip
                    key={k}
                    label={label}
                    disabled={formDisabled}
                    onClick={() => patchErV1({ ppeNote: appendIfNotPresent(er.ppeNote, label) })}
                  />
                );
              })}
            </ErTriageDocChipRow>
          </div>
          <div style={grid2}>
            <div>
              <label style={labelStyle}>{t("erTriage.v1.airway")}</label>
              {sel("airway", abcOptions)}
            </div>
            <div>
              <label style={labelStyle}>{t("erTriage.v1.breathing")}</label>
              {sel("breathing", abcOptions)}
            </div>
            <div>
              <label style={labelStyle}>{t("erTriage.v1.circulation")}</label>
              {sel("circulation", abcOptions)}
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <p style={sectionHeading}>{t("erTriage.v1.gcsSection")}</p>
              <div style={{ ...grid3, marginTop: 8 }}>
                <div>
                  <label style={labelStyle}>{t("erTriage.v1.gcsEye")}</label>
                  <select
                    value={er.gcsEye}
                    onChange={(e) => patchErV1(nextGcsStateAfterComponentChange(er, "gcsEye", e.target.value))}
                    disabled={formDisabled}
                    style={{ ...inputBase, cursor: formDisabled ? "not-allowed" : "pointer" }}
                  >
                    {gcsEyeOpts.map((o) => (
                      <option key={o.value === "" ? "empty" : o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>{t("erTriage.v1.gcsVerbal")}</label>
                  <select
                    value={er.gcsVerbal}
                    onChange={(e) => patchErV1(nextGcsStateAfterComponentChange(er, "gcsVerbal", e.target.value))}
                    disabled={formDisabled}
                    style={{ ...inputBase, cursor: formDisabled ? "not-allowed" : "pointer" }}
                  >
                    {gcsVerbalOpts.map((o) => (
                      <option key={o.value === "" ? "empty" : o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>{t("erTriage.v1.gcsMotor")}</label>
                  <select
                    value={er.gcsMotor}
                    onChange={(e) => patchErV1(nextGcsStateAfterComponentChange(er, "gcsMotor", e.target.value))}
                    disabled={formDisabled}
                    style={{ ...inputBase, cursor: formDisabled ? "not-allowed" : "pointer" }}
                  >
                    {gcsMotorOpts.map((o) => (
                      <option key={o.value === "" ? "empty" : o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>{t("erTriage.v1.gcsTotal")}</label>
                  <div
                    style={{
                      ...inputBase,
                      display: "flex",
                      alignItems: "center",
                      minHeight: 38,
                      backgroundColor: formDisabled ? "#f8fafc" : "#f1f5f9",
                      fontVariantNumeric: "tabular-nums",
                      fontWeight: 600,
                      color: "#334155",
                    }}
                    aria-live="polite"
                  >
                    {gcsTriad ? String(gcsTriad.total) : dash}
                  </div>
                </div>
              </div>
              {gcsAbnormal ? (
                <p
                  role="status"
                  style={{
                    margin: "10px 0 0",
                    fontSize: 12,
                    color: "#b45309",
                    lineHeight: 1.45,
                    fontWeight: 600,
                  }}
                >
                  {t("erTriage.v1.gcsAbnormalWarning")}
                </p>
              ) : null}
            </div>
            <div>
              <label style={labelStyle}>{t("erTriage.v1.pain010")}</label>
              {sel("painScale0to10", painOptions(dash))}
            </div>
            <div>
              <label style={labelStyle}>{t("erTriage.v1.referral")}</label>
              <input
                type="text"
                value={er.referralSource}
                onChange={(e) => patchErV1({ referralSource: e.target.value })}
                disabled={formDisabled}
                style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                placeholder={t("erTriage.v1.referralPlaceholder")}
              />
              <p style={chipHintStyle}>{t("erTriage.v1.chipsHint")}</p>
              <ErTriageDocChipRow>
                {ROUTING_CHIP_KEYS.map((k) => {
                  const label = t(`erTriage.v1.${k}`);
                  return (
                    <ErTriageDocChip
                      key={k}
                      label={label}
                      disabled={formDisabled}
                      onClick={() =>
                        patchErV1({ referralSource: appendIfNotPresent(er.referralSource, label) })
                      }
                    />
                  );
                })}
              </ErTriageDocChipRow>
            </div>
          </div>
          <div
            style={{
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid #fecaca",
              backgroundColor: "#fffafa",
            }}
          >
            <p style={{ ...sectionHeading, marginBottom: 8 }}>{t("erTriage.v1.traumaBlockTitle")}</p>
            {!er.traumaActivation.activated ? (
              <button
                type="button"
                onClick={() =>
                  patchErV1({
                    traumaActivation: { ...er.traumaActivation, activated: true },
                  })
                }
                disabled={formDisabled}
                style={{
                  padding: "10px 16px",
                  borderRadius: 10,
                  border: "1px solid #b91c1c",
                  backgroundColor: formDisabled ? "#f1f5f9" : "#b91c1c",
                  color: formDisabled ? "#94a3b8" : "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: formDisabled ? "not-allowed" : "pointer",
                }}
              >
                {t("erTriage.v1.traumaActivate")}
              </button>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#991b1b" }}>{t("erTriage.v1.traumaActive")}</span>
                  <button
                    type="button"
                    onClick={() => patchErV1({ traumaActivation: emptyErTraumaActivationForm() })}
                    disabled={formDisabled}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 8,
                      border: "1px solid #cbd5e1",
                      backgroundColor: "#fff",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#64748b",
                      cursor: formDisabled ? "not-allowed" : "pointer",
                    }}
                  >
                    {t("erTriage.v1.traumaDeactivate")}
                  </button>
                </div>
                <div style={grid2}>
                  <div>
                    <label style={labelStyle}>{t("erTriage.v1.traumaLevel")}</label>
                    <select
                      value={er.traumaActivation.level}
                      onChange={(e) =>
                        patchErV1({
                          traumaActivation: {
                            ...er.traumaActivation,
                            level: e.target.value as ErTraumaLevel,
                          },
                        })
                      }
                      disabled={formDisabled}
                      style={{ ...inputBase, cursor: formDisabled ? "not-allowed" : "pointer" }}
                    >
                      {traumaLevelOptions.map((o) => (
                        <option key={o.value === "" ? "empty" : o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>{t("erTriage.v1.traumaActivatedAt")}</label>
                    <input
                      type="datetime-local"
                      value={er.traumaActivation.activatedAt}
                      onChange={(e) =>
                        patchErV1({
                          traumaActivation: { ...er.traumaActivation, activatedAt: e.target.value },
                        })
                      }
                      disabled={formDisabled}
                      style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                    />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>{t("erTriage.v1.traumaCriteria")}</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                    {ER_TRAUMA_ACTIVATION_CRITERIA_IDS.map((id) => {
                      const on = er.traumaActivation.criteria.includes(id);
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => {
                            const cur = er.traumaActivation.criteria;
                            const next = on ? cur.filter((x) => x !== id) : [...cur, id];
                            patchErV1({
                              traumaActivation: { ...er.traumaActivation, criteria: next },
                            });
                          }}
                          disabled={formDisabled}
                          style={{
                            padding: "6px 10px",
                            fontSize: 12,
                            borderRadius: 9999,
                            border: `1px solid ${on ? "#93c5fd" : "#e2e8f0"}`,
                            backgroundColor: on ? "#eff6ff" : "#fff",
                            color: "#0f172a",
                            cursor: formDisabled ? "not-allowed" : "pointer",
                          }}
                        >
                          {t(TRAUMA_CRITERION_I18N_KEY[id as ErTraumaActivationCriterionId])}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>{t("erTriage.v1.traumaNotes")}</label>
                  <textarea
                    value={er.traumaActivation.notes}
                    onChange={(e) =>
                      patchErV1({
                        traumaActivation: { ...er.traumaActivation, notes: e.target.value },
                      })
                    }
                    disabled={formDisabled}
                    rows={2}
                    maxLength={4000}
                    style={{ ...inputBase, resize: "vertical", minHeight: 52, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                  />
                </div>
              </div>
            )}
          </div>
          <div>
            <label style={labelStyle}>{t("erTriage.v1.exceptions")}</label>
            <textarea
              value={er.triageExceptionsNote}
              onChange={(e) => patchErV1({ triageExceptionsNote: e.target.value })}
              disabled={formDisabled}
              rows={2}
              maxLength={4000}
              style={{ ...inputBase, minHeight: 56, resize: "vertical", backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
              placeholder={t("erTriage.v1.exceptionsPlaceholder")}
            />
          </div>
        </div>
      </details>

      <details style={detailsShell}>
        <summary style={summaryRow}>
          <span>{t("erTriage.v1.s2Title")}</span>
        </summary>
        <p style={help}>{t("erTriage.v1.s2Help")}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 10 }}>
          <div>
            <label style={labelStyle}>{t("erTriage.v1.nursingSummary")}</label>
            <textarea
              value={er.nursingCareNote}
              onChange={(e) => patchErV1({ nursingCareNote: e.target.value })}
              disabled={formDisabled}
              rows={2}
              maxLength={8000}
              style={{ ...inputBase, minHeight: 56, resize: "vertical", backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
            />
            <p style={chipHintStyle}>{t("erTriage.v1.chipsHint")}</p>
            <ErTriageDocChipRow>
              {NURSING_CHIP_KEYS.map((k) => {
                const label = t(`erTriage.v1.${k}`);
                return (
                  <ErTriageDocChip
                    key={k}
                    label={label}
                    disabled={formDisabled}
                    onClick={() =>
                      patchErV1({ nursingCareNote: appendIfNotPresent(er.nursingCareNote, label) })
                    }
                  />
                );
              })}
            </ErTriageDocChipRow>
          </div>
          <div style={grid3}>
            <div>
              <label style={labelStyle}>{t("erTriage.v1.callLight")}</label>
              {sel("callLightInReach", ynuOptions)}
            </div>
            <div>
              <label style={labelStyle}>{t("erTriage.v1.bedLow")}</label>
              {sel("bedLockedLow", ynuOptions)}
            </div>
            <div>
              <label style={labelStyle}>{t("erTriage.v1.familyBedside")}</label>
              {sel("familyAtBedside", ynuOptions)}
            </div>
            <div>
              <label style={labelStyle}>{t("erTriage.v1.inView")}</label>
              {sel("inViewOfNursingStation", ynuOptions)}
            </div>
            <div>
              <label style={labelStyle}>{t("erTriage.v1.planExplained")}</label>
              {sel("patientUpdatedOnPlan", ynuOptions)}
            </div>
            <div>
              <label style={labelStyle}>{t("erTriage.v1.comfort")}</label>
              {sel("comfortMeasuresProvided", ynuOptions)}
            </div>
            <div>
              <label style={labelStyle}>{t("erTriage.v1.safeHome")}</label>
              {sel("feelsSafeAtHome", ynuOptions)}
            </div>
            <div>
              <label style={labelStyle}>{t("erTriage.v1.travel14")}</label>
              {sel("travelOutsideCountry14d", ynuOptions)}
            </div>
          </div>
          <div>
            <label style={labelStyle}>{t("erTriage.v1.edPpe")}</label>
            <input
              type="text"
              value={er.edCoursePpeNote}
              onChange={(e) => patchErV1({ edCoursePpeNote: e.target.value })}
              disabled={formDisabled}
              style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
            />
          </div>
          <div>
            <label style={labelStyle}>{t("erTriage.v1.nursingAddendum")}</label>
            <textarea
              value={er.nursingNotesAddendum}
              onChange={(e) => patchErV1({ nursingNotesAddendum: e.target.value })}
              disabled={formDisabled}
              rows={3}
              maxLength={8000}
              style={{ ...inputBase, minHeight: 72, resize: "vertical", backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
            />
          </div>
        </div>
      </details>

      <details style={detailsShell}>
        <summary style={summaryRow}>
          <span>{t("erTriage.v1.s3Title")}</span>
        </summary>
        <p style={help}>{t("erTriage.v1.s3Help")}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 10 }}>
          <div>
            <label style={labelStyle}>{t("erTriage.v1.medsSummary")}</label>
            <textarea
              value={er.medicationsSummary}
              onChange={(e) => patchErV1({ medicationsSummary: e.target.value })}
              disabled={formDisabled}
              rows={3}
              maxLength={8000}
              style={{ ...inputBase, minHeight: 72, resize: "vertical", backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
            />
            <p style={chipHintStyle}>{t("erTriage.v1.chipsHint")}</p>
            <ErTriageDocChipRow>
              {MEDS_CHIP_KEYS.map((k) => {
                const label = t(`erTriage.v1.${k}`);
                return (
                  <ErTriageDocChip
                    key={k}
                    label={label}
                    disabled={formDisabled}
                    onClick={() =>
                      patchErV1({ medicationsSummary: appendIfNotPresent(er.medicationsSummary, label) })
                    }
                  />
                );
              })}
            </ErTriageDocChipRow>
          </div>
          <div>
            <label style={labelStyle}>{t("erTriage.v1.allergyExtra")}</label>
            <textarea
              value={er.additionalAllergyInfo}
              onChange={(e) => patchErV1({ additionalAllergyInfo: e.target.value })}
              disabled={formDisabled}
              rows={3}
              maxLength={4000}
              style={{ ...inputBase, minHeight: 72, resize: "vertical", backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
              placeholder={t("erTriage.v1.allergyExtraPlaceholder")}
            />
            <p style={chipHintStyle}>{t("erTriage.v1.chipsHint")}</p>
            <ErTriageDocChipRow>
              {ALLERGY_CHIP_KEYS.map((k) => {
                const label = t(`erTriage.v1.${k}`);
                return (
                  <ErTriageDocChip
                    key={k}
                    label={label}
                    disabled={formDisabled}
                    onClick={() =>
                      patchErV1({
                        additionalAllergyInfo: appendIfNotPresent(er.additionalAllergyInfo, label),
                      })
                    }
                  />
                );
              })}
            </ErTriageDocChipRow>
          </div>
          <div style={grid2}>
            <div>
              <label style={labelStyle}>{t("erTriage.v1.preferredPharmacy")}</label>
              <input
                type="text"
                value={er.preferredPharmacy}
                onChange={(e) => patchErV1({ preferredPharmacy: e.target.value })}
                disabled={formDisabled}
                style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
              />
            </div>
            <div>
              <label style={labelStyle}>{t("erTriage.v1.immuStatus")}</label>
              <input
                type="text"
                value={er.immunizationStatusNote}
                onChange={(e) => patchErV1({ immunizationStatusNote: e.target.value })}
                disabled={formDisabled}
                style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                placeholder={t("erTriage.v1.immuPlaceholder")}
              />
            </div>
          </div>
        </div>
      </details>

      <details style={detailsShell}>
        <summary style={summaryRow}>
          <span>{t("erTriage.v1.s4Title")}</span>
        </summary>
        <p style={help}>
          {patientChartHref ? (
            <>
              {t("erTriage.v1.s4HelpChart")}{" "}
              <Link href={patientChartHref} style={{ color: "#1d4ed8", fontWeight: 600 }}>
                {t("erTriage.v1.s4HelpChartLink")}
              </Link>
              .
            </>
          ) : (
            t("erTriage.v1.s4HelpNoChart")
          )}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 10 }}>
          <div style={grid2}>
            <div>
              <label style={labelStyle}>{t("erTriage.v1.pmh")}</label>
              <textarea
                value={er.pastMedicalHistory}
                onChange={(e) => patchErV1({ pastMedicalHistory: e.target.value })}
                disabled={formDisabled}
                rows={3}
                maxLength={8000}
                style={{ ...inputBase, minHeight: 72, resize: "vertical", backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
              />
            </div>
            <div>
              <label style={labelStyle}>{t("erTriage.v1.psh")}</label>
              <textarea
                value={er.pastSurgicalHistory}
                onChange={(e) => patchErV1({ pastSurgicalHistory: e.target.value })}
                disabled={formDisabled}
                rows={3}
                maxLength={8000}
                style={{ ...inputBase, minHeight: 72, resize: "vertical", backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
              />
            </div>
          </div>
          <div>
            <label style={labelStyle}>{t("erTriage.v1.fh")}</label>
            <textarea
              value={er.familyHistory}
              onChange={(e) => patchErV1({ familyHistory: e.target.value })}
              disabled={formDisabled}
              rows={2}
              maxLength={4000}
              style={{ ...inputBase, minHeight: 52, resize: "vertical", backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
            />
          </div>
          <div style={grid3}>
            <div>
              <label style={labelStyle}>{t("erTriage.v1.smoking")}</label>
              <input
                type="text"
                value={er.smokingStatus}
                onChange={(e) => patchErV1({ smokingStatus: e.target.value })}
                disabled={formDisabled}
                style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                placeholder={t("erTriage.v1.smokingPlaceholder")}
              />
            </div>
            <div>
              <label style={labelStyle}>{t("erTriage.v1.alcohol")}</label>
              <input
                type="text"
                value={er.alcoholUse}
                onChange={(e) => patchErV1({ alcoholUse: e.target.value })}
                disabled={formDisabled}
                style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
              />
            </div>
            <div>
              <label style={labelStyle}>{t("erTriage.v1.cannabis")}</label>
              <input
                type="text"
                value={er.marijuanaUse}
                onChange={(e) => patchErV1({ marijuanaUse: e.target.value })}
                disabled={formDisabled}
                style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
              />
            </div>
            <div>
              <label style={labelStyle}>{t("erTriage.v1.stimulants")}</label>
              <input
                type="text"
                value={er.stimulantUse}
                onChange={(e) => patchErV1({ stimulantUse: e.target.value })}
                disabled={formDisabled}
                style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
              />
            </div>
            <div>
              <label style={labelStyle}>{t("erTriage.v1.opioids")}</label>
              <input
                type="text"
                value={er.opioidHeroinUse}
                onChange={(e) => patchErV1({ opioidHeroinUse: e.target.value })}
                disabled={formDisabled}
                style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
              />
            </div>
          </div>
          <div>
            <label style={labelStyle}>{t("erTriage.v1.socialComments")}</label>
            <textarea
              value={er.historySocialComments}
              onChange={(e) => patchErV1({ historySocialComments: e.target.value })}
              disabled={formDisabled}
              rows={3}
              maxLength={8000}
              style={{ ...inputBase, minHeight: 72, resize: "vertical", backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
            />
            <p style={chipHintStyle}>{t("erTriage.v1.chipsHint")}</p>
            <ErTriageDocChipRow>
              {SOCIAL_CHIP_KEYS.map((k) => {
                const label = t(`erTriage.v1.${k}`);
                return (
                  <ErTriageDocChip
                    key={k}
                    label={label}
                    disabled={formDisabled}
                    onClick={() =>
                      patchErV1({
                        historySocialComments: appendIfNotPresent(er.historySocialComments, label),
                      })
                    }
                  />
                );
              })}
            </ErTriageDocChipRow>
          </div>
        </div>
      </details>
    </div>
  );
}
