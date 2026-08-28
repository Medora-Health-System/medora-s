"use client";

import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import {
  INPATIENT_NURSING_EDUCATION_RECIPIENTS,
  INPATIENT_NURSING_TRANSPORT_MODES,
  INPATIENT_NURSING_UNDERSTANDING,
  emptyInpatientNursingDischarge,
  hydrateInpatientNursingDischarge,
  instantToLocalDateTimeInput,
  localDateTimeInputToIso,
  type InpatientNursingDischargeV1D,
  type NursingDischargeReadinessChip,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import {
  fetchInpatientNursingDischarge,
  saveInpatientNursingDischarge,
} from "@/features/hospital-care/inpatientOperationsApi";

const fieldStyle: CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  fontSize: 13,
};

const sectionStyle: CSSProperties = {
  ...MEDORA_CARD_SHELL,
  padding: 12,
  display: "grid",
  gap: 10,
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={sectionStyle}>
      <h4 style={{ margin: 0, fontSize: 14 }}>{title}</h4>
      {children}
    </div>
  );
}

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

export function InpatientNursingDischargeSection({
  encounterId,
  canAuthor,
}: {
  encounterId: string;
  canAuthor: boolean;
}) {
  const { t, language } = useI18n();
  const prefix = "inpatientNursingDischargeInpDis1d";
  const dateLocale = language === "en" ? "en-US" : "fr-FR";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [revision, setRevision] = useState(0);
  const [doc, setDoc] = useState<InpatientNursingDischargeV1D>(emptyInpatientNursingDischarge());
  const [readiness, setReadiness] = useState<NursingDischargeReadinessChip[]>([]);
  const [providerLabel, setProviderLabel] = useState<string | null>(null);
  const [providerFinalized, setProviderFinalized] = useState(false);
  const [providerCode, setProviderCode] = useState<string>("");
  const [canComplete, setCanComplete] = useState(false);
  const [mismatch, setMismatch] = useState(false);
  const [medStatus, setMedStatus] = useState<string>("UNKNOWN");
  const [readOnlyReason, setReadOnlyReason] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchInpatientNursingDischarge(encounterId);
      const hydrated =
        hydrateInpatientNursingDischarge(res.documentation) ?? emptyInpatientNursingDischarge();
      setDoc(hydrated);
      setRevision(res.revision ?? hydrated.revision ?? 0);
      setReadiness((res.readiness as NursingDischargeReadinessChip[]) ?? []);
      const fd = res.providerFinalDisposition as { code?: string; labelSnapshot?: string } | null;
      setProviderCode(fd?.code ?? "");
      setProviderLabel(fd?.labelSnapshot || fd?.code || null);
      setProviderFinalized(res.providerFinalized === true);
      setCanComplete(res.canComplete === true);
      setMismatch(res.dispositionMismatch?.detected === true || hydrated.dispositionMismatch?.detected === true);
      setMedStatus(res.medicationReconciliationStatus ?? "UNKNOWN");
      setReadOnlyReason(res.canAuthor === false && canAuthor ? t(`${prefix}.metadata.readOnly`) : null);
    } catch {
      setError(t(`${prefix}.errors.load`));
    } finally {
      setLoading(false);
    }
  }, [canAuthor, encounterId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const editable = canAuthor && !readOnlyReason;
  const code = providerCode.toUpperCase();
  const isEloped = code === "ELOPED";
  const isDeceased = code === "DECEASED";
  const isTransferFamily =
    code === "TRANSFER_ACUTE_CARE" ||
    code === "SKILLED_NURSING_FACILITY" ||
    code === "ACUTE_REHAB" ||
    code === "LONG_TERM_ACUTE_CARE" ||
    code === "BEHAVIORAL_HEALTH_FACILITY" ||
    code === "ASSISTED_LIVING";
  const isCorrectional = code === "CORRECTIONAL_FACILITY";
  const isHomeHealth = code === "HOME_WITH_HOME_HEALTH";
  const isAma = code === "AGAINST_MEDICAL_ADVICE";
  const showEducation = !isEloped && !isDeceased;

  const patchEducation = (patch: Partial<NonNullable<InpatientNursingDischargeV1D["education"]>>) => {
    setDoc((prev) => ({
      ...prev,
      education: {
        instructionsReviewed: prev.education?.instructionsReviewed ?? false,
        medicationInstructionsReviewed: prev.education?.medicationInstructionsReviewed ?? false,
        followUpReviewed: prev.education?.followUpReviewed ?? false,
        returnPrecautionsReviewed: prev.education?.returnPrecautionsReviewed ?? false,
        ...prev.education,
        ...patch,
      },
    }));
  };

  const save = async (saveMode: "draft" | "complete") => {
    if (!editable) return;
    setSaving(true);
    setError(null);
    setValidationErrors([]);
    try {
      const res = await saveInpatientNursingDischarge(encounterId, {
        documentation: doc as unknown as Record<string, unknown>,
        expectedRevision: revision,
        saveMode,
      });
      const hydrated =
        hydrateInpatientNursingDischarge(res.documentation) ?? emptyInpatientNursingDischarge();
      setDoc(hydrated);
      setRevision(res.revision ?? hydrated.revision ?? 0);
      if (Array.isArray(res.readiness)) setReadiness(res.readiness as NursingDischargeReadinessChip[]);
      if (res.encounterClosed === true) {
        // Should never happen in 1D — surface if regression appears
        setError(t(`${prefix}.errors.save`));
      }
    } catch (e: unknown) {
      const err = e as { status?: number; body?: { errors?: string[] } };
      if (err.status === 409) setError(t(`${prefix}.errors.conflict`));
      else if (err.status === 403) setError(t(`${prefix}.errors.forbidden`));
      else if (Array.isArray(err.body?.errors)) setValidationErrors(err.body.errors);
      else setError(t(`${prefix}.errors.save`));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div data-testid="inpatient-nursing-discharge-loading" style={sectionStyle}>
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div data-testid="inpatient-nursing-discharge-section" style={{ display: "grid", gap: 12 }}>
      <Section title={t(`${prefix}.title`)}>
        {t(`${prefix}.readinessHint`) ? (
          <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>{t(`${prefix}.readinessHint`)}</p>
        ) : null}
        <div data-testid="inpatient-nursing-discharge-readiness" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {readiness.map((chip) => (
            <span
              key={chip.id}
              style={{
                fontSize: 12,
                padding: "4px 10px",
                borderRadius: 9999,
                border: "1px solid #cbd5e1",
                color:
                  chip.status === "complete"
                    ? "#047857"
                    : chip.status === "blocked" || chip.status === "attention"
                      ? "#b45309"
                      : "#64748b",
                fontWeight: 600,
              }}
            >
              {chip.status === "complete" ? "✓" : chip.status === "blocked" ? "✕" : "○"}{" "}
              {t(`${prefix}.readiness.${chip.id}`)}
            </span>
          ))}
        </div>
        {error ? <p style={{ margin: 0, color: "#b91c1c", fontSize: 12 }}>{error}</p> : null}
        {validationErrors.length ? (
          <ul style={{ margin: 0, paddingLeft: 18, color: "#b91c1c", fontSize: 12 }}>
            {validationErrors.map((codeKey) => (
              <li key={codeKey}>{t(`${prefix}.validation.${codeKey}`)}</li>
            ))}
          </ul>
        ) : null}
      </Section>

      <div
        data-testid="inpatient-nursing-provider-disposition"
        style={{ ...sectionStyle, borderStyle: "dashed" }}
      >
        <strong>{t(`${prefix}.providerDisposition`)}</strong>
        <p style={{ margin: 0, fontSize: 13 }}>
          {providerLabel || t(`${prefix}.none`)}
          {providerFinalized ? ` — ${t(`${prefix}.finalizedBy`)}` : ""}
        </p>
        {!providerFinalized && !isEloped && !isDeceased ? (
          <p style={{ margin: 0, color: "#b45309", fontSize: 12 }}>{t(`${prefix}.providerNotFinalized`)}</p>
        ) : null}
        {mismatch ? (
          <p data-testid="inpatient-nursing-disposition-mismatch" style={{ margin: 0, color: "#b91c1c", fontSize: 12 }}>
            {t(`${prefix}.dispositionMismatch`)}
          </p>
        ) : null}
        <p style={{ margin: 0, fontSize: 12 }}>
          {t(`${prefix}.medRecon`)}:{" "}
          {medStatus === "COMPLETE"
            ? t(`${prefix}.medReconComplete`)
            : medStatus === "INCOMPLETE"
              ? t(`${prefix}.medReconIncomplete`)
              : t(`${prefix}.none`)}
        </p>
      </div>

      {showEducation ? (
        <Section title={t(`${prefix}.education.title`)}>
          <Check
            label={t(`${prefix}.education.instructionsReviewed`)}
            checked={doc.education?.instructionsReviewed === true}
            disabled={!editable}
            onChange={(v) => patchEducation({ instructionsReviewed: v })}
          />
          <Check
            label={t(`${prefix}.education.medicationInstructionsReviewed`)}
            checked={doc.education?.medicationInstructionsReviewed === true}
            disabled={!editable}
            onChange={(v) => patchEducation({ medicationInstructionsReviewed: v })}
          />
          <Check
            label={t(`${prefix}.education.followUpReviewed`)}
            checked={doc.education?.followUpReviewed === true}
            disabled={!editable}
            onChange={(v) => patchEducation({ followUpReviewed: v })}
          />
          <Check
            label={t(`${prefix}.education.returnPrecautionsReviewed`)}
            checked={doc.education?.returnPrecautionsReviewed === true}
            disabled={!editable}
            onChange={(v) => patchEducation({ returnPrecautionsReviewed: v })}
          />
          {isAma ? (
            <>
              <Check
                label={t(`${prefix}.education.declined`)}
                checked={doc.education?.patientDeclinedInstructions === true}
                disabled={!editable}
                onChange={(v) => patchEducation({ patientDeclinedInstructions: v })}
              />
              <Check
                label={t(`${prefix}.education.leftBefore`)}
                checked={doc.education?.leftBeforeInstructionsComplete === true}
                disabled={!editable}
                onChange={(v) => patchEducation({ leftBeforeInstructionsComplete: v })}
              />
            </>
          ) : null}
          <select
            style={fieldStyle}
            disabled={!editable}
            value={doc.education?.patientUnderstanding ?? ""}
            onChange={(e) =>
              patchEducation({
                patientUnderstanding: (e.target.value || null) as
                  | (typeof INPATIENT_NURSING_UNDERSTANDING)[number]
                  | null,
              })
            }
          >
            <option value="">— {t(`${prefix}.education.understanding`)}</option>
            {INPATIENT_NURSING_UNDERSTANDING.map((u) => (
              <option key={u} value={u}>
                {t(`${prefix}.education.${u}`)}
              </option>
            ))}
          </select>
          <select
            style={fieldStyle}
            disabled={!editable}
            value={doc.education?.recipient ?? ""}
            onChange={(e) =>
              patchEducation({
                recipient: (e.target.value || null) as
                  | (typeof INPATIENT_NURSING_EDUCATION_RECIPIENTS)[number]
                  | null,
              })
            }
          >
            <option value="">— {t(`${prefix}.education.recipient`)}</option>
            {INPATIENT_NURSING_EDUCATION_RECIPIENTS.map((u) => (
              <option key={u} value={u}>
                {t(`${prefix}.education.${u}`)}
              </option>
            ))}
          </select>
        </Section>
      ) : null}

      {!isEloped && !isDeceased ? (
        <Section title={t(`${prefix}.devices.title`)}>
          <Check
            label={t(`${prefix}.devices.ivRemoved`)}
            checked={doc.devices?.ivRemoved === true}
            disabled={!editable}
            onChange={(v) => setDoc((prev) => ({ ...prev, devices: { ...prev.devices, ivRemoved: v } }))}
          />
          {isTransferFamily ? (
            <Check
              label={t(`${prefix}.devices.ivLeftInPlace`)}
              checked={doc.devices?.ivLeftInPlaceForTransfer === true}
              disabled={!editable}
              onChange={(v) =>
                setDoc((prev) => ({
                  ...prev,
                  devices: { ...prev.devices, ivLeftInPlaceForTransfer: v },
                }))
              }
            />
          ) : null}
        </Section>
      ) : null}

      {!isEloped ? (
        <Section title={t(`${prefix}.belongings.title`)}>
          <Check
            label={t(`${prefix}.belongings.returned`)}
            checked={doc.belongings?.returned === true}
            disabled={!editable}
            onChange={(v) =>
              setDoc((prev) => ({
                ...prev,
                belongings: { ...(prev.belongings ?? { returned: false }), returned: v },
              }))
            }
          />
          <Check
            label={t(`${prefix}.belongings.unknown`)}
            checked={doc.belongings?.unknown === true}
            disabled={!editable}
            onChange={(v) =>
              setDoc((prev) => ({
                ...prev,
                belongings: { ...(prev.belongings ?? { returned: false }), unknown: v },
              }))
            }
          />
        </Section>
      ) : null}

      {isTransferFamily ? (
        <Section title={t(`${prefix}.handoff.title`)}>
          <Check
            label={t(`${prefix}.handoff.reportCalled`)}
            checked={doc.handoff?.reportCalled === true}
            disabled={!editable}
            onChange={(v) => setDoc((prev) => ({ ...prev, handoff: { ...prev.handoff, reportCalled: v } }))}
          />
          <input
            style={fieldStyle}
            disabled={!editable}
            placeholder={t(`${prefix}.handoff.reportGivenTo`)}
            value={doc.handoff?.reportGivenTo ?? ""}
            onChange={(e) =>
              setDoc((prev) => ({ ...prev, handoff: { ...prev.handoff, reportGivenTo: e.target.value } }))
            }
          />
          <input
            style={fieldStyle}
            disabled={!editable}
            type="datetime-local"
            value={instantToLocalDateTimeInput(doc.handoff?.reportAt)}
            onChange={(e) =>
              setDoc((prev) => ({
                ...prev,
                handoff: { ...prev.handoff, reportAt: localDateTimeInputToIso(e.target.value) },
              }))
            }
          />
        </Section>
      ) : null}

      {isHomeHealth ? (
        <Section title={t(`${prefix}.homeHealth.title`)}>
          <Check
            label={t(`${prefix}.homeHealth.agencyConfirmed`)}
            checked={doc.homeHealth?.agencyConfirmed === true}
            disabled={!editable}
            onChange={(v) =>
              setDoc((prev) => ({ ...prev, homeHealth: { ...prev.homeHealth, agencyConfirmed: v } }))
            }
          />
          <Check
            label={t(`${prefix}.homeHealth.familyKnows`)}
            checked={doc.homeHealth?.familyKnowsAgency === true}
            disabled={!editable}
            onChange={(v) =>
              setDoc((prev) => ({ ...prev, homeHealth: { ...prev.homeHealth, familyKnowsAgency: v } }))
            }
          />
        </Section>
      ) : null}

      {isCorrectional ? (
        <Section title={t(`${prefix}.correctional.title`)}>
          <input
            style={fieldStyle}
            disabled={!editable}
            placeholder={t(`${prefix}.correctional.facility`)}
            value={doc.correctional?.facilityName ?? ""}
            onChange={(e) =>
              setDoc((prev) => ({
                ...prev,
                correctional: { ...prev.correctional, facilityName: e.target.value },
              }))
            }
          />
          <input
            style={fieldStyle}
            disabled={!editable}
            placeholder={t(`${prefix}.correctional.agency`)}
            value={doc.correctional?.agencyName ?? ""}
            onChange={(e) =>
              setDoc((prev) => ({
                ...prev,
                correctional: { ...prev.correctional, agencyName: e.target.value },
              }))
            }
          />
          <input
            style={fieldStyle}
            disabled={!editable}
            placeholder={t(`${prefix}.correctional.officer`)}
            value={doc.correctional?.officerName ?? ""}
            onChange={(e) =>
              setDoc((prev) => ({
                ...prev,
                correctional: { ...prev.correctional, officerName: e.target.value },
              }))
            }
          />
          <input
            style={fieldStyle}
            disabled={!editable}
            type="datetime-local"
            value={instantToLocalDateTimeInput(doc.correctional?.custodyTransferredAt)}
            onChange={(e) =>
              setDoc((prev) => ({
                ...prev,
                correctional: {
                  ...prev.correctional,
                  custodyTransferredAt: localDateTimeInputToIso(e.target.value),
                },
              }))
            }
          />
        </Section>
      ) : null}

      {isEloped ? (
        <Section title={t(`${prefix}.eloped.title`)}>
          <input
            style={fieldStyle}
            disabled={!editable}
            type="datetime-local"
            value={instantToLocalDateTimeInput(doc.eloped?.discoveredAt)}
            onChange={(e) =>
              setDoc((prev) => ({
                ...prev,
                eloped: { ...prev.eloped, discoveredAt: localDateTimeInputToIso(e.target.value) },
              }))
            }
          />
          <input
            style={fieldStyle}
            disabled={!editable}
            type="datetime-local"
            value={instantToLocalDateTimeInput(doc.eloped?.lastKnownAt)}
            onChange={(e) =>
              setDoc((prev) => ({
                ...prev,
                eloped: { ...prev.eloped, lastKnownAt: localDateTimeInputToIso(e.target.value) },
              }))
            }
          />
          <input
            style={fieldStyle}
            disabled={!editable}
            placeholder={t(`${prefix}.eloped.lastKnownLocation`)}
            value={doc.eloped?.lastKnownLocation ?? ""}
            onChange={(e) =>
              setDoc((prev) => ({
                ...prev,
                eloped: { ...prev.eloped, lastKnownLocation: e.target.value },
              }))
            }
          />
          <Check
            label={t(`${prefix}.eloped.providerNotified`)}
            checked={doc.eloped?.providerNotified === true}
            disabled={!editable}
            onChange={(v) => setDoc((prev) => ({ ...prev, eloped: { ...prev.eloped, providerNotified: v } }))}
          />
          <Check
            label={t(`${prefix}.eloped.securityNotified`)}
            checked={doc.eloped?.securityNotified === true}
            disabled={!editable}
            onChange={(v) => setDoc((prev) => ({ ...prev, eloped: { ...prev.eloped, securityNotified: v } }))}
          />
        </Section>
      ) : null}

      {isDeceased ? (
        <Section title={t(`${prefix}.deceased.title`)}>
          <select
            style={fieldStyle}
            disabled={!editable}
            value={doc.deceased?.bodyDestination ?? ""}
            onChange={(e) =>
              setDoc((prev) => ({
                ...prev,
                deceased: { ...prev.deceased, bodyDestination: (e.target.value || null) as never },
              }))
            }
          >
            <option value="">— {t(`${prefix}.deceased.bodyDestination`)}</option>
            {(["MORGUE", "FUNERAL_HOME", "MEDICAL_EXAMINER", "OTHER"] as const).map((d) => (
              <option key={d} value={d}>
                {t(`${prefix}.deceased.${d}`)}
              </option>
            ))}
          </select>
          <Check
            label={t(`${prefix}.deceased.identification`)}
            checked={doc.deceased?.identificationCompleted === true}
            disabled={!editable}
            onChange={(v) =>
              setDoc((prev) => ({ ...prev, deceased: { ...prev.deceased, identificationCompleted: v } }))
            }
          />
          <input
            style={fieldStyle}
            disabled={!editable}
            type="datetime-local"
            value={instantToLocalDateTimeInput(doc.deceased?.transferredAt)}
            onChange={(e) =>
              setDoc((prev) => ({
                ...prev,
                deceased: { ...prev.deceased, transferredAt: localDateTimeInputToIso(e.target.value) },
              }))
            }
          />
        </Section>
      ) : null}

      {!isEloped && !isDeceased ? (
        <>
          <Section title={t(`${prefix}.transport.title`)}>
            <select
              style={fieldStyle}
              disabled={!editable}
              value={doc.transport?.mode ?? ""}
              onChange={(e) =>
                setDoc((prev) => ({
                  ...prev,
                  transport: { ...prev.transport, mode: e.target.value || null },
                  departure: { ...prev.departure, mode: e.target.value || null },
                }))
              }
            >
              <option value="">— {t(`${prefix}.transport.mode`)}</option>
              {INPATIENT_NURSING_TRANSPORT_MODES.map((m) => (
                <option key={m} value={m}>
                  {m.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </Section>
          <Section title={t(`${prefix}.departure.title`)}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <input
                style={{ ...fieldStyle, flex: 1 }}
                disabled={!editable}
                type="datetime-local"
                data-testid="inpatient-nursing-departure-at"
                value={instantToLocalDateTimeInput(doc.departure?.departedAt)}
                onChange={(e) =>
                  setDoc((prev) => ({
                    ...prev,
                    departure: {
                      ...prev.departure,
                      departedAt: localDateTimeInputToIso(e.target.value),
                    },
                  }))
                }
              />
              {editable ? (
                <button
                  type="button"
                  data-testid="inpatient-nursing-departure-now"
                  onClick={() =>
                    setDoc((prev) => ({
                      ...prev,
                      departure: { ...prev.departure, departedAt: new Date().toISOString() },
                    }))
                  }
                >
                  {t(`${prefix}.setDepartureNow`)}
                </button>
              ) : null}
            </div>
            <input
              style={fieldStyle}
              disabled={!editable}
              placeholder={t(`${prefix}.departure.condition`)}
              value={doc.departure?.conditionAtDeparture ?? ""}
              onChange={(e) =>
                setDoc((prev) => ({
                  ...prev,
                  departure: { ...prev.departure, conditionAtDeparture: e.target.value },
                }))
              }
            />
          </Section>
        </>
      ) : null}

      {doc.completedByDisplayNameSnapshot ? (
        <Section title={t(`${prefix}.metadata.completedBy`)}>
          <p style={{ margin: 0, fontSize: 12 }}>
            {doc.completedByDisplayNameSnapshot}
            {doc.completedByProfessionalTitleSnapshot
              ? ` (${doc.completedByProfessionalTitleSnapshot})`
              : ""}
          </p>
          {doc.completedAt ? (
            <p style={{ margin: 0, fontSize: 12 }}>
              {t(`${prefix}.metadata.completedAt`)}:{" "}
              {new Date(doc.completedAt).toLocaleString(dateLocale)}
            </p>
          ) : null}
        </Section>
      ) : null}

      {editable ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {t(`${prefix}.completeHint`) ? (
            <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>{t(`${prefix}.completeHint`)}</p>
          ) : null}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {!isEloped && !isDeceased && !isTransferFamily ? (
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  setDoc((prev) => ({
                    ...prev,
                    education: {
                      ...prev.education,
                      instructionsReviewed: true,
                      medicationInstructionsReviewed: true,
                      followUpReviewed: true,
                      returnPrecautionsReviewed: true,
                    },
                    devices: { ...prev.devices, ivRemoved: true },
                    belongings: { ...(prev.belongings ?? { returned: false }), returned: true },
                  }))
                }
              >
                {t(`${prefix}.markRoutine`)}
              </button>
            ) : null}
            <button
              type="button"
              data-testid="inpatient-nursing-discharge-save-draft"
              disabled={saving}
              onClick={() => void save("draft")}
            >
              {saving ? t(`${prefix}.saving`) : t(`${prefix}.saveDraft`)}
            </button>
            <button
              type="button"
              data-testid="inpatient-nursing-discharge-complete"
              disabled={saving || !canComplete || mismatch}
              onClick={() => void save("complete")}
            >
              {saving ? t(`${prefix}.saving`) : t(`${prefix}.complete`)}
            </button>
            <button type="button" disabled={saving} onClick={() => void load()}>
              {t(`${prefix}.reload`)}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
