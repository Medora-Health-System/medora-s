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
  type ProviderDischargeDocumentationForm,
} from "@/features/emergency/providerDischargeDocumentationModel";

const sectionShell: React.CSSProperties = {
  ...MEDORA_CARD_SHELL,
  padding: "14px 16px",
};

function readCheckoutState(raw: unknown): ClinicAmbulatoryCheckoutState {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return "HOME";
  const v = (raw as Record<string, unknown>).clinicAmbulatoryCheckoutState;
  if (typeof v === "string" && (CLINIC_AMBULATORY_CHECKOUT_STATES as readonly string[]).includes(v)) {
    return v as ClinicAmbulatoryCheckoutState;
  }
  return "HOME";
}

function narrativeBlobFromForm(form: ProviderDischargeDocumentationForm): string {
  return [
    form.returnPrecautions,
    form.returnWorkSchool,
    ...form.diagnosisDocs.flatMap((d) => [
      d.description,
      d.diagnosisInstructions,
      d.medicationTreatment,
      d.returnPrecautions,
    ]),
  ]
    .filter(Boolean)
    .join("\n");
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
  patient?: {
    id?: string;
    firstName?: string | null;
    lastName?: string | null;
    mrn?: string | null;
  } | null;
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

  const careSettingContext = useMemo<DischargeInstructionCareSettingContext>(
    () => ({
      careSetting: "CLINIC",
      facilityDisplayName: facilityDisplayName.trim() || (language === "fr" ? "cet établissement" : "this facility"),
      locale: language,
      jurisdictionCountry: facilityCountry ?? null,
    }),
    [facilityCountry, facilityDisplayName, language]
  );

  const [providerForm, setProviderForm] = useState<ProviderDischargeDocumentationForm>(() =>
    hydrateProviderDischargeDocumentationForm(dischargeSummaryJson)
  );
  const [checkoutState, setCheckoutState] = useState<ClinicAmbulatoryCheckoutState>(() =>
    readCheckoutState(dischargeSummaryJson)
  );
  const [saving, setSaving] = useState(false);
  const [printError, setPrintError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);

  useEffect(() => {
    setProviderForm(hydrateProviderDischargeDocumentationForm(dischargeSummaryJson));
    setCheckoutState(readCheckoutState(dischargeSummaryJson));
  }, [encounterId, dischargeSummaryJson]);

  const saveProviderDischarge = useCallback(async () => {
    if (!canEditMedical) return;
    setMessage(null);
    setSaving(true);
    try {
      const merged = {
        ...buildProviderDischargeJsonForSave(dischargeSummaryJson, providerForm, {
          documentedAt: new Date().toISOString(),
          documentedByDisplayName: documentedByDisplayName?.trim() || "Provider",
        }),
        clinicAmbulatoryCheckoutState: checkoutState,
        careSetting: "CLINIC",
        facilityDisplayName: careSettingContext.facilityDisplayName,
      };
      await apiFetch(`/encounters/${encounterId}`, {
        method: "PATCH",
        facilityId,
        body: JSON.stringify({ dischargeSummaryJson: merged }),
      });
      setMessage({ error: false, text: t("clinicCareD4c7.discharge.saved") });
      await onSaved();
    } catch (e) {
      setMessage({
        error: true,
        text:
          normalizeUserFacingError(e instanceof Error ? e.message : null, language) ||
          t("clinicCareD4c7.discharge.saveFailed"),
      });
    } finally {
      setSaving(false);
    }
  }, [
    canEditMedical,
    careSettingContext.facilityDisplayName,
    checkoutState,
    dischargeSummaryJson,
    documentedByDisplayName,
    encounterId,
    facilityId,
    language,
    onSaved,
    providerForm,
    t,
  ]);

  const handlePrint = useCallback(() => {
    setPrintError(null);
    const blob = narrativeBlobFromForm(providerForm);
    const hasContent = blob.trim().length > 0;
    const signed =
      Boolean(
        dischargeSummaryJson &&
          typeof dischargeSummaryJson === "object" &&
          !Array.isArray(dischargeSummaryJson) &&
          ((dischargeSummaryJson as Record<string, unknown>).providerDischargeDocumentedAt ||
            (dischargeSummaryJson as Record<string, unknown>).patientInstructionsGiven === true)
      ) || providerForm.patientInstructionsGiven === true;
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
      ...buildProviderDischargeJsonForSave(dischargeSummaryJson, providerForm, {
        documentedAt: new Date().toISOString(),
        documentedByDisplayName: documentedByDisplayName?.trim() || "Provider",
      }),
      clinicAmbulatoryCheckoutState: checkoutState,
      careSetting: "CLINIC",
    };
    printDischarge({
      patient,
      encounter: {
        createdAt: encounterCreatedAt,
        dischargeSummaryJson: merged,
        physicianAssigned: null,
      },
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

  const vaccinationsHref = buildClinicCarePublicHealthDeepLink({
    target: "vaccinations",
    encounterId,
    patientId,
  });
  const diseaseReportsHref = buildClinicCarePublicHealthDeepLink({
    target: "diseaseReports",
    encounterId,
    patientId,
  });

  return (
    <div data-testid="clinic-care-d4c7-discharge-workflow" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={sectionShell}>
        <h3 style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
          {t("clinicCareD4c7.checkout.title")}
        </h3>
        <p style={{ margin: "0 0 10px", fontSize: 12, color: "#64748b" }}>{t("clinicCareD4c7.checkout.subtitle")}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }} role="radiogroup" aria-label={t("clinicCareD4c7.checkout.title")}>
          {CLINIC_AMBULATORY_CHECKOUT_STATES.map((state) => (
            <label key={state} style={{ display: "flex", gap: 8, fontSize: 13, color: "#0f172a", cursor: formDisabled ? "not-allowed" : "pointer" }}>
              <input
                type="radio"
                name="clinic-ambulatory-checkout"
                checked={checkoutState === state}
                disabled={formDisabled || !canEditMedical}
                onChange={() => setCheckoutState(state)}
              />
              {t(CLINIC_AMBULATORY_CHECKOUT_I18N_KEYS[state])}
            </label>
          ))}
        </div>
      </div>

      <div data-testid="clinic-care-ambulatory-provider-discharge" style={sectionShell}>
        <h3 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
          {t("clinicCareD4c5b2.followUp.dischargeTitle")}
        </h3>
        <p style={{ margin: "0 0 12px", fontSize: 12, color: "#64748b" }}>
          {t("clinicCareD4c7.discharge.sharedEngineHint")}
        </p>
        <p style={{ margin: "0 0 12px", fontSize: 11, color: "#94a3b8" }}>
          {t("clinicCareD4c7a.discharge.singleEngineHint")}
        </p>
        <ProviderDischargeDocumentationSection
          facilityId={facilityId}
          patientId={patientId}
          encounterId={encounterId}
          providerForm={providerForm}
          onProviderFormChange={setProviderForm}
          disabled={formDisabled || !canEditMedical}
          careSettingContext={careSettingContext}
        />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12, alignItems: "center" }}>
          {canEditMedical ? (
            <button
              type="button"
              onClick={() => void saveProviderDischarge()}
              disabled={saving || formDisabled}
              style={{
                padding: "8px 14px",
                borderRadius: 10,
                border: "none",
                background: "#1e3a5f",
                color: "#fff",
                fontSize: 13,
                fontWeight: 600,
                cursor: saving ? "wait" : "pointer",
              }}
            >
              {saving ? t("common.saving") : t("clinicCareD4c7.discharge.saveProvider")}
            </button>
          ) : null}
          <button
            type="button"
            onClick={handlePrint}
            style={{
              padding: "8px 14px",
              borderRadius: 10,
              border: "1px solid #cbd5e1",
              background: "#fff",
              color: "#0f172a",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {t("clinicCareD4c7.discharge.print")}
          </button>
          {message ? (
            <span style={{ fontSize: 12, color: message.error ? "#b91c1c" : "#166534" }}>{message.text}</span>
          ) : null}
          {printError ? <span style={{ fontSize: 12, color: "#b91c1c" }}>{printError}</span> : null}
        </div>
      </div>

      <div style={sectionShell} data-testid="clinic-care-d4c7-public-health-links">
        <h3 style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
          {t("clinicCareD4c7.publicHealth.title")}
        </h3>
        <p style={{ margin: "0 0 8px", fontSize: 12, color: "#64748b" }}>{t("clinicCareD4c7.publicHealth.hint")}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, fontSize: 13 }}>
          <Link href={vaccinationsHref} style={{ color: "#0d9488", fontWeight: 600 }}>
            {t("clinicCareD4c7.publicHealth.vaccinations")}
          </Link>
          <Link href={diseaseReportsHref} style={{ color: "#0d9488", fontWeight: 600 }}>
            {t("clinicCareD4c7.publicHealth.diseaseReports")}
          </Link>
          <Link href={buildClinicPharmacyEntryHref()} style={{ color: "#0d9488", fontWeight: 600 }}>
            {t("clinicCareD4c7.pharmacy.openEnterprise")}
          </Link>
        </div>
      </div>
    </div>
  );
}

/** Hydrate empty form when JSON missing — exported for tests. */
export function emptyClinicAmbulatoryProviderDischargeForm(): ProviderDischargeDocumentationForm {
  return emptyProviderDischargeDocumentationForm();
}
