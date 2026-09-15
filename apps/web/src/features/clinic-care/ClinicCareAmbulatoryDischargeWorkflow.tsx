/**
 * MEDUI.D4C.7 — Clinic ambulatory Suivi/sortie mounts the shared ED diagnosis-driven
 * discharge architecture (parameterized by careSetting + facilityDisplayName).
 * No ClinicDischarge / ClinicDischargeInstruction fork.
 */

"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CLINIC_AMBULATORY_CHECKOUT_I18N_KEYS,
  CLINIC_AMBULATORY_CHECKOUT_STATES,
  buildClinicCarePublicHealthDeepLink,
  buildClinicPharmacyEntryHref,
  clinicDischargePrintBlockedReason,
  dischargeNarrativeContainsEdOnlyWording,
  type ClinicAmbulatoryCheckoutState,
  type DischargeInstructionCareSettingContext,
} from "@medora/shared";
import { apiFetch } from "@/lib/apiClient";
import { createFollowUp, fetchPatientFollowUps } from "@/lib/followUpsApi";
import { useI18n } from "@/lib/i18n";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { printDischarge } from "@/components/encounters/DischargePrintLayout";
import { printFacilityInfoFromEnterpriseSource } from "@/lib/printFacilityHeader";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import {
  ProviderDischargeDocumentationSection,
  buildProviderDischargeJsonForSave,
} from "@/features/emergency/ProviderDischargeDocumentationSection";
import {
  emptyProviderDischargeDocumentationForm,
  hydrateProviderDischargeDocumentationForm,
  validateProviderDischargeDocumentation,
  type ProviderDischargeDocumentationForm,
} from "@/features/emergency/providerDischargeDocumentationModel";
import {
  ClinicCareCheckoutDetailsPanel,
  buildClinicCheckoutDiagnosisSuggestions,
  markClinicCheckoutActionConfirmed,
  readClinicAmbulatoryCheckoutDetails,
  validateClinicAmbulatoryCheckoutDetails,
  type ClinicAmbulatoryCheckoutDetails,
} from "./ClinicCareCheckoutDetailsPanel";
import { localizeClinicDischargeFormForPresentation } from "./clinicDischargeLocalization";

const sectionShell: React.CSSProperties = { ...MEDORA_CARD_SHELL, padding: "14px 16px" };

function readCheckoutState(raw: unknown): ClinicAmbulatoryCheckoutState {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return "HOME";
  const value = (raw as Record<string, unknown>).clinicAmbulatoryCheckoutState;
  return typeof value === "string" && (CLINIC_AMBULATORY_CHECKOUT_STATES as readonly string[]).includes(value)
    ? value as ClinicAmbulatoryCheckoutState
    : "HOME";
}

function readPersistedClinicFollowUpId(raw: unknown): string | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const value = (raw as Record<string, unknown>).clinicAmbulatoryFollowUpId;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function narrativeBlobFromForm(form: ProviderDischargeDocumentationForm): string {
  return [
    form.returnPrecautions,
    form.returnWorkSchool,
    ...form.diagnosisDocs.flatMap((d) => [d.description, d.diagnosisInstructions, d.medicationTreatment, d.returnPrecautions]),
  ].filter(Boolean).join("\n");
}

function clinicFacilityFallback(language: string): string {
  if (language === "fr") return "cet établissement";
  if (language === "es") return "esta clínica";
  return "this facility";
}

export function clinicCheckoutActionLabel(language: string, state: ClinicAmbulatoryCheckoutState): string {
  const es = language === "es";
  const fr = language === "fr";
  switch (state) {
    case "HOME": return es ? "Confirmar alta a domicilio" : fr ? "Confirmer le retour à domicile" : "Confirm discharge home";
    case "CLINIC_FOLLOW_UP": return es ? "Confirmar seguimiento de clínica" : fr ? "Confirmer le suivi en clinique" : "Confirm clinic follow-up";
    case "REFERRAL": return es ? "Confirmar plan de referencia" : fr ? "Confirmer le plan d’orientation" : "Confirm referral plan";
    case "TRANSFER_ED": return es ? "Confirmar traslado a urgencias" : fr ? "Confirmer le transfert vers les urgences" : "Confirm transfer to ED";
    case "AMA": return es ? "Confirmar salida contra consejo médico" : fr ? "Confirmer le départ contre avis médical" : "Confirm AMA departure";
    case "OTHER": return es ? "Confirmar otro resultado" : fr ? "Confirmer l’autre issue" : "Confirm other outcome";
  }
}

function checkoutReadyMessage(language: string, state: ClinicAmbulatoryCheckoutState): string {
  if (language === "es") {
    if (state === "TRANSFER_ED") return "Plan de traslado documentado. La visita está lista para completarse; la creación de un encuentro de urgencias sigue siendo una acción separada.";
    if (state === "CLINIC_FOLLOW_UP") return "Seguimiento de clínica creado y resultado confirmado. La visita está lista para completarse.";
    return "Resultado del egreso confirmado. La visita está lista para completarse.";
  }
  if (language === "fr") {
    if (state === "TRANSFER_ED") return "Plan de transfert documenté. La consultation est prête à être clôturée; la création d’une visite aux urgences reste une action distincte.";
    if (state === "CLINIC_FOLLOW_UP") return "Suivi en clinique créé et issue confirmée. La consultation est prête à être clôturée.";
    return "Issue de consultation confirmée. La consultation est prête à être clôturée.";
  }
  if (state === "TRANSFER_ED") return "Transfer plan documented. The visit is ready for completion; creating an ED encounter remains a separate action.";
  if (state === "CLINIC_FOLLOW_UP") return "Clinic follow-up created and outcome confirmed. The visit is ready for completion.";
  return "Checkout outcome confirmed. The visit is ready for completion.";
}

function checkoutValidationMessage(language: string): string {
  return language === "es"
    ? "Complete la documentación de alta obligatoria antes de confirmar este resultado."
    : language === "fr"
      ? "Complétez la documentation de sortie obligatoire avant de confirmer cette issue."
      : "Complete the required discharge documentation before confirming this outcome.";
}

function clinicFollowUpRequiredMessage(language: string): string {
  return language === "es"
    ? "Establezca una fecha de seguimiento de clínica antes de confirmar este resultado."
    : language === "fr"
      ? "Définissez une date de suivi en clinique avant de confirmer cette issue."
      : "Set a clinic follow-up date before confirming this outcome.";
}

function clinicFollowUpPatientRequiredMessage(language: string): string {
  return language === "es"
    ? "No se puede crear el seguimiento porque falta el paciente del encuentro."
    : language === "fr"
      ? "Le suivi ne peut pas être créé car le patient de la consultation est absent."
      : "The follow-up cannot be created because the encounter patient is missing.";
}

function clinicFollowUpReason(form: ProviderDischargeDocumentationForm, language: string): string {
  const row = form.followUps.find((item) => Boolean(item.specialty?.trim() || item.providerOrFacility?.trim() || item.comments?.trim()));
  const detail = row
    ? [row.specialty?.trim(), row.providerOrFacility?.trim(), row.comments?.trim()].filter((value): value is string => Boolean(value)).join(" — ")
    : "";
  if (detail) return detail.slice(0, 2000);
  if (language === "es") return "Seguimiento de clínica posterior al alta";
  if (language === "fr") return "Suivi en clinique après la sortie";
  return "Clinic follow-up after discharge";
}

async function ensureEnterpriseClinicFollowUp(input: {
  facilityId: string;
  encounterId: string;
  patientId: string;
  form: ProviderDischargeDocumentationForm;
  language: string;
  dischargeSummaryJson: unknown;
}): Promise<string> {
  const persistedId = readPersistedClinicFollowUpId(input.dischargeSummaryJson);
  if (persistedId) return persistedId;

  const existing = await fetchPatientFollowUps(input.facilityId, input.patientId, { limit: 100 });
  const linked = existing.items.find((item) => item.encounterId === input.encounterId && item.status !== "CANCELLED");
  if (linked) return linked.id;

  const encounter = await apiFetch(`/encounters/${input.encounterId}`, { facilityId: input.facilityId }) as Record<string, unknown>;
  const dueDate = typeof encounter.followUpDate === "string" ? encounter.followUpDate : "";
  if (!dueDate || Number.isNaN(Date.parse(dueDate))) throw new Error(clinicFollowUpRequiredMessage(input.language));

  const created = await createFollowUp(input.facilityId, {
    patientId: input.patientId,
    encounterId: input.encounterId,
    dueDate,
    reason: clinicFollowUpReason(input.form, input.language),
    notes: input.form.returnPrecautions?.trim() || null,
  });
  return created.id;
}

function requiresStrictDischargeDocumentation(state: ClinicAmbulatoryCheckoutState): boolean {
  return state === "HOME" || state === "CLINIC_FOLLOW_UP" || state === "REFERRAL" || state === "OTHER";
}

export function ClinicCareAmbulatoryDischargeWorkflow({
  encounterId,
  facilityId,
  facilityDisplayName,
  facilityCountry,
  facilityCareProfileJson = null,
  patientId,
  patient,
  encounterCreatedAt,
  dischargeSummaryJson,
  encounterStatus,
  roles,
  isLocked,
  documentedByDisplayName,
  onSaved,
}: {
  encounterId: string;
  facilityId: string;
  facilityDisplayName: string;
  facilityCountry?: string | null;
  facilityCareProfileJson?: unknown;
  patientId?: string | null;
  patient?: { id?: string; firstName?: string | null; lastName?: string | null; mrn?: string | null } | null;
  encounterCreatedAt?: string | null;
  dischargeSummaryJson?: unknown;
  encounterStatus?: string | null;
  roles: string[];
  isLocked: boolean;
  documentedByDisplayName?: string | null;
  onSaved: () => void | Promise<void>;
}) {
  const { t, language } = useI18n();
  const canEditMedical = roles.includes("PROVIDER") || roles.includes("ADMIN");
  const canEditNursing = roles.includes("RN") || roles.includes("ADMIN");
  const formDisabled = isLocked || encounterStatus !== "OPEN" || (!canEditMedical && !canEditNursing);

  const careSettingContext = useMemo<DischargeInstructionCareSettingContext>(() => ({
    careSetting: "CLINIC",
    facilityDisplayName: facilityDisplayName.trim() || clinicFacilityFallback(language),
    locale: language,
    jurisdictionCountry: facilityCountry ?? null,
  }), [facilityCountry, facilityDisplayName, language]);

  const [providerForm, setProviderForm] = useState<ProviderDischargeDocumentationForm>(() =>
    localizeClinicDischargeFormForPresentation(hydrateProviderDischargeDocumentationForm(dischargeSummaryJson), language, facilityDisplayName)
  );
  const [checkoutState, setCheckoutState] = useState<ClinicAmbulatoryCheckoutState>(() => readCheckoutState(dischargeSummaryJson));
  const [checkoutDetails, setCheckoutDetails] = useState<ClinicAmbulatoryCheckoutDetails>(() => readClinicAmbulatoryCheckoutDetails(dischargeSummaryJson));
  const [saving, setSaving] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);

  useEffect(() => {
    setProviderForm(localizeClinicDischargeFormForPresentation(hydrateProviderDischargeDocumentationForm(dischargeSummaryJson), language, facilityDisplayName));
    setCheckoutState(readCheckoutState(dischargeSummaryJson));
    setCheckoutDetails(readClinicAmbulatoryCheckoutDetails(dischargeSummaryJson));
  }, [encounterId, dischargeSummaryJson]);

  useEffect(() => {
    setProviderForm((current) => localizeClinicDischargeFormForPresentation(current, language, facilityDisplayName));
  }, [facilityDisplayName, language]);

  const updateProviderForm = useCallback((next: ProviderDischargeDocumentationForm) => {
    setProviderForm(localizeClinicDischargeFormForPresentation(next, language, facilityDisplayName));
  }, [facilityDisplayName, language]);

  const checkoutSuggestions = useMemo(
    () => buildClinicCheckoutDiagnosisSuggestions(providerForm, language),
    [providerForm, language]
  );

  const saveProviderDischarge = useCallback(async (confirmCheckoutAction = false) => {
    if (!canEditMedical) return;
    setMessage(null);

    const checkoutError = validateClinicAmbulatoryCheckoutDetails(checkoutState, checkoutDetails, language);
    if (checkoutError) {
      setMessage({ error: true, text: checkoutError });
      return;
    }

    const localizedForm = localizeClinicDischargeFormForPresentation(providerForm, language, careSettingContext.facilityDisplayName);

    if (confirmCheckoutAction && requiresStrictDischargeDocumentation(checkoutState)) {
      const validationErrors = validateProviderDischargeDocumentation(
        localizedForm,
        {
          requiredDescription: t("providerDischargeDocumentation19Y.validation.requiredDescription"),
          requiredInstructions: t("providerDischargeDocumentation19Y.validation.requiredInstructions"),
          requiredMedication: t("providerDischargeDocumentation19Y.validation.requiredMedication"),
          requiredReturnPrecautions: t("providerDischargeDocumentation19Y.validation.requiredReturnPrecautions"),
          requiredFollowUp: t("providerDischargeDocumentation19Y.validation.requiredFollowUp"),
        },
        {
          requireFinalDiagnosis: true,
          requireInstructionsCommunicated: true,
          messages: {
            requiredFinalDiagnosis: t("emergencyDisposition.homeValidation.requiredFinalDiagnosis"),
            requiredInstructionsCommunicated: t("emergencyDisposition.homeValidation.requiredInstructionsCommunicated"),
          },
        }
      );
      if (validationErrors) {
        setMessage({ error: true, text: checkoutValidationMessage(language) });
        return;
      }
    }

    setSaving(true);
    try {
      const nowIso = new Date().toISOString();
      const actor = documentedByDisplayName?.trim() || "Provider";
      let enterpriseFollowUpId: string | null = null;

      if (confirmCheckoutAction && checkoutState === "CLINIC_FOLLOW_UP") {
        if (!patientId) throw new Error(clinicFollowUpPatientRequiredMessage(language));
        enterpriseFollowUpId = await ensureEnterpriseClinicFollowUp({
          facilityId,
          encounterId,
          patientId,
          form: localizedForm,
          language,
          dischargeSummaryJson,
        });
      }

      const detailsForSave = confirmCheckoutAction
        ? markClinicCheckoutActionConfirmed(checkoutState, checkoutDetails, actor, nowIso)
        : checkoutDetails;

      const merged = {
        ...buildProviderDischargeJsonForSave(dischargeSummaryJson, localizedForm, {
          documentedAt: nowIso,
          documentedByDisplayName: actor,
        }),
        clinicAmbulatoryCheckoutState: checkoutState,
        clinicAmbulatoryCheckoutDetails: detailsForSave,
        clinicAmbulatoryCheckoutUpdatedAt: nowIso,
        clinicAmbulatoryCheckoutUpdatedByDisplayName: actor,
        ...(enterpriseFollowUpId ? { clinicAmbulatoryFollowUpId: enterpriseFollowUpId } : {}),
        ...(confirmCheckoutAction ? {
          clinicAmbulatoryCheckoutConfirmation: { state: checkoutState, confirmedAt: nowIso, confirmedByDisplayName: actor },
        } : {}),
        careSetting: "CLINIC",
        facilityDisplayName: careSettingContext.facilityDisplayName,
      };

      await apiFetch(`/encounters/${encounterId}`, {
        method: "PATCH",
        facilityId,
        body: JSON.stringify({
          dischargeSummaryJson: merged,
          ...(confirmCheckoutAction ? { workflowState: "DISCHARGE_READY" } : {}),
        }),
      });

      setCheckoutDetails(detailsForSave);
      setProviderForm(localizedForm);
      setMessage({ error: false, text: confirmCheckoutAction ? checkoutReadyMessage(language, checkoutState) : t("clinicCareD4c7.discharge.saved") });
      await onSaved();
    } catch (e) {
      const directMessage = e instanceof Error ? e.message : null;
      setMessage({
        error: true,
        text: directMessage || normalizeUserFacingError(directMessage, language) || t("clinicCareD4c7.discharge.saveFailed"),
      });
    } finally {
      setSaving(false);
    }
  }, [
    canEditMedical,
    careSettingContext.facilityDisplayName,
    checkoutDetails,
    checkoutState,
    dischargeSummaryJson,
    documentedByDisplayName,
    encounterId,
    facilityId,
    language,
    onSaved,
    patientId,
    providerForm,
    t,
  ]);

  const handlePrint = useCallback(() => {
    setPrintError(null);
    const localizedForm = localizeClinicDischargeFormForPresentation(providerForm, language, careSettingContext.facilityDisplayName);
    const blob = narrativeBlobFromForm(localizedForm);
    const hasContent = blob.trim().length > 0;
    const signed = Boolean(
      dischargeSummaryJson && typeof dischargeSummaryJson === "object" && !Array.isArray(dischargeSummaryJson) &&
      ((dischargeSummaryJson as Record<string, unknown>).providerDischargeDocumentedAt || (dischargeSummaryJson as Record<string, unknown>).patientInstructionsGiven === true)
    ) || localizedForm.patientInstructionsGiven === true;

    const blocked = clinicDischargePrintBlockedReason({
      hasSignedFinal: signed,
      hasInstructionContent: hasContent,
      containsEdOnlyWording: dischargeNarrativeContainsEdOnlyWording(blob, "CLINIC"),
      careSetting: "CLINIC",
    });
    if (blocked) {
      setPrintError(t(blocked));
      return;
    }
    if (!patient || !encounterCreatedAt) {
      setPrintError(t("clinicCareD4c7.print.blockedEmpty"));
      return;
    }

    const merged = {
      ...buildProviderDischargeJsonForSave(dischargeSummaryJson, localizedForm, {
        documentedAt: new Date().toISOString(),
        documentedByDisplayName: documentedByDisplayName?.trim() || "Provider",
      }),
      clinicAmbulatoryCheckoutState: checkoutState,
      clinicAmbulatoryCheckoutDetails: checkoutDetails,
      careSetting: "CLINIC",
    };

    printDischarge({
      patient,
      encounter: { createdAt: encounterCreatedAt, dischargeSummaryJson: merged, physicianAssigned: null },
      facilityName: careSettingContext.facilityDisplayName,
      facility: printFacilityInfoFromEnterpriseSource({
        facilityName: careSettingContext.facilityDisplayName,
        facilityCountry,
        careProfileJson: facilityCareProfileJson,
      }),
      primaryDiagnosis: null,
      language,
    });
  }, [
    careSettingContext.facilityDisplayName,
    checkoutDetails,
    facilityCountry,
    facilityCareProfileJson,
    checkoutState,
    dischargeSummaryJson,
    documentedByDisplayName,
    encounterCreatedAt,
    language,
    patient,
    providerForm,
    t,
  ]);

  const vaccinationsHref = buildClinicCarePublicHealthDeepLink({ target: "vaccinations", encounterId, patientId });
  const diseaseReportsHref = buildClinicCarePublicHealthDeepLink({ target: "diseaseReports", encounterId, patientId });
  const contextualActionLabel = clinicCheckoutActionLabel(language, checkoutState);

  return (
    <div data-testid="clinic-care-d4c7-discharge-workflow" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={sectionShell}>
        <h3 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{t("clinicCareD4c7.checkout.title")}</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }} role="radiogroup" aria-label={t("clinicCareD4c7.checkout.title")}>
          {CLINIC_AMBULATORY_CHECKOUT_STATES.map((state) => (
            <label key={state} style={{ display: "flex", gap: 8, fontSize: 13, color: "#0f172a", cursor: formDisabled ? "not-allowed" : "pointer" }}>
              <input
                type="radio"
                name="clinic-ambulatory-checkout"
                checked={checkoutState === state}
                disabled={formDisabled || !canEditMedical}
                onChange={() => { setCheckoutState(state); setMessage(null); }}
              />
              {t(CLINIC_AMBULATORY_CHECKOUT_I18N_KEYS[state])}
            </label>
          ))}
        </div>
        <ClinicCareCheckoutDetailsPanel
          state={checkoutState}
          details={checkoutDetails}
          language={language}
          disabled={formDisabled || !canEditMedical}
          suggestions={checkoutSuggestions}
          onChange={setCheckoutDetails}
        />
      </div>

      <div data-testid="clinic-care-ambulatory-provider-discharge" style={sectionShell}>
        <h3 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{t("clinicCareD4c5b2.followUp.dischargeTitle")}</h3>
        <ProviderDischargeDocumentationSection
          facilityId={facilityId}
          patientId={patientId}
          encounterId={encounterId}
          providerForm={providerForm}
          onProviderFormChange={updateProviderForm}
          disabled={formDisabled || !canEditMedical}
          careSettingContext={careSettingContext}
        />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12, alignItems: "center" }}>
          {canEditMedical ? <button
            type="button"
            onClick={() => void saveProviderDischarge(false)}
            disabled={saving || formDisabled}
            style={{ padding: "8px 14px", borderRadius: 10, border: "none", background: "#1e3a5f", color: "#fff", fontSize: 13, fontWeight: 600, cursor: saving ? "wait" : "pointer" }}
          >{saving ? t("common.saving") : t("clinicCareD4c7.discharge.saveProvider")}</button> : null}
          {canEditMedical ? <button
            type="button"
            data-testid={`clinic-checkout-confirm-${checkoutState.toLowerCase()}`}
            onClick={() => void saveProviderDischarge(true)}
            disabled={saving || formDisabled}
            style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid #0f766e", background: "#f0fdfa", color: "#115e59", fontSize: 13, fontWeight: 700, cursor: saving ? "wait" : "pointer" }}
          >{contextualActionLabel}</button> : null}
          <button
            type="button"
            onClick={handlePrint}
            style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", color: "#0f172a", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >{t("clinicCareD4c7.discharge.print")}</button>
          {message ? <span style={{ fontSize: 12, color: message.error ? "#b91c1c" : "#166534" }}>{message.text}</span> : null}
          {printError ? <span style={{ fontSize: 12, color: "#b91c1c" }}>{printError}</span> : null}
        </div>
      </div>

      {language === "fr" ? (
        <div style={sectionShell} data-testid="clinic-care-d4c7-public-health-links">
          <h3 style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{t("clinicCareD4c7.publicHealth.title")}</h3>
          <p style={{ margin: "0 0 8px", fontSize: 12, color: "#64748b" }}>{t("clinicCareD4c7.publicHealth.hint")}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, fontSize: 13 }}>
            <Link href={vaccinationsHref} style={{ color: "#0d9488", fontWeight: 600 }}>{t("clinicCareD4c7.publicHealth.vaccinations")}</Link>
            <Link href={diseaseReportsHref} style={{ color: "#0d9488", fontWeight: 600 }}>{t("clinicCareD4c7.publicHealth.diseaseReports")}</Link>
            <Link href={buildClinicPharmacyEntryHref()} style={{ color: "#0d9488", fontWeight: 600 }}>{t("clinicCareD4c7.pharmacy.openEnterprise")}</Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function emptyClinicAmbulatoryProviderDischargeForm(): ProviderDischargeDocumentationForm {
  return emptyProviderDischargeDocumentationForm();
}
