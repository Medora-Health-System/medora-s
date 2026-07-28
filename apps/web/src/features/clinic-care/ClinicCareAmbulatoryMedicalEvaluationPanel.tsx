/**
 * MEDUI.D4C.5B — Ambulatory Medical Evaluation tile.
 * Reuses `ProviderDocumentationWorkspace` (encounterMode AMBULATORY) + the shared
 * hydrate/save/sign helpers already used by `ClinicVisitTab` — no parallel HPI/ROS/
 * exam/MDM engine, no ED quality-review rail, no trauma, no ED disposition.
 */

"use client";

import React, { useCallback, useEffect, useState } from "react";
import { apiFetch, parseApiResponse } from "@/lib/apiClient";
import { useI18n } from "@/lib/i18n";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { canAuthorAmbulatoryProviderDocumentation } from "@medora/shared";
import { isEncounterLocked } from "@/lib/encounterLock";
import { tEncounterStatus, tEncounterType } from "@/lib/encounterChromeI18n";
import { ProviderDocumentationWorkspace } from "@/components/encounters/ProviderDocumentationWorkspace";
import {
  buildProviderDocumentationMetadata,
  buildProviderDocumentationSavePayload,
  emptyProviderDocumentationWorkspaceState,
  hydrateProviderDocumentationWorkspaceState,
  readProviderDocumentationWorkspaceMetadata,
  type ProviderDocumentationWorkspaceState,
} from "@/lib/providerDocumentationModel";

export type ClinicCareAmbulatoryMedicalEvaluationEncounter = {
  id: string;
  status?: string | null;
  type?: string | null;
  visitReason?: string | null;
  chiefComplaint?: string | null;
  clinicianImpression?: string | null;
  providerNote?: string | null;
  treatmentPlan?: string | null;
  nursingAssessment?: unknown;
  providerDocumentationStatus?: string | null;
  providerDocumentationSignedAt?: string | null;
  providerDocumentationSignedByDisplayFr?: string | null;
};

export function ClinicCareAmbulatoryMedicalEvaluationPanel({
  encounter,
  facilityId,
  facilityCountry,
  roles,
  onUpdate,
}: {
  encounter: ClinicCareAmbulatoryMedicalEvaluationEncounter;
  facilityId: string;
  facilityCountry?: string | null;
  roles: readonly string[];
  onUpdate: () => void | Promise<void>;
}) {
  const { t, language } = useI18n();
  const dateLocale = language === "en" ? "en-US" : "fr-FR";

  const canAuthor = canAuthorAmbulatoryProviderDocumentation(roles);
  const readOnlyEncounter = (encounter.status ?? "").trim() !== "OPEN";
  const docSigned = isEncounterLocked(encounter);
  const fieldsLocked = readOnlyEncounter || docSigned || !canAuthor;

  const [value, setValue] = useState<ProviderDocumentationWorkspaceState>(() =>
    hydrateProviderDocumentationWorkspaceState({ encounter })
  );
  const [saving, setSaving] = useState(false);
  const [signing, setSigning] = useState(false);
  const [message, setMessage] = useState<{ variant: "success" | "error" | "queued"; text: string } | null>(
    null
  );

  useEffect(() => {
    setValue(hydrateProviderDocumentationWorkspaceState({ encounter }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    encounter.id,
    encounter.nursingAssessment,
    encounter.providerDocumentationStatus,
    encounter.providerDocumentationSignedAt,
  ]);

  const save = useCallback(async () => {
    if (!canAuthor) return;
    setMessage(null);
    setSaving(true);
    try {
      let savedByDisplayName = t("erMseProviderPanel.defaultSignerFallback");
      try {
        const meRes = await fetch("/api/auth/me");
        const me = await parseApiResponse(meRes);
        if (me && typeof me === "object" && !Array.isArray(me)) {
          const fn = (me as { fullName?: string }).fullName?.trim();
          if (fn) savedByDisplayName = fn;
        }
      } catch {
        /* fallback only */
      }
      const payload = buildProviderDocumentationSavePayload({
        previousNursingAssessment: encounter.nursingAssessment,
        state: value,
        metadata: buildProviderDocumentationMetadata({
          encounterMode: "AMBULATORY",
          savedAt: new Date().toISOString(),
          savedBy: savedByDisplayName,
          activeTemplateId: value.activeTemplateId,
        }),
      });
      const res = await apiFetch(`/encounters/${encounter.id}`, {
        method: "PATCH",
        facilityId,
        body: JSON.stringify(payload),
      });
      const queued =
        res && typeof res === "object" && !Array.isArray(res) && (res as { queued?: boolean }).queued === true;
      setMessage({
        variant: queued ? "queued" : "success",
        text: queued ? t("encounterClinicTab.toastSavedQueued") : t("encounterClinicTab.toastSaved"),
      });
      await onUpdate();
    } catch (e) {
      setMessage({
        variant: "error",
        text:
          normalizeUserFacingError(e instanceof Error ? e.message : null, language) ||
          t("encounterClinicTab.errSave"),
      });
      throw e;
    } finally {
      setSaving(false);
    }
  }, [canAuthor, value, encounter, facilityId, language, onUpdate, t]);

  const sign = useCallback(async () => {
    setMessage(null);
    setSigning(true);
    try {
      await apiFetch(`/encounters/${encounter.id}/sign-provider-documentation`, {
        method: "POST",
        facilityId,
        body: JSON.stringify({ attestationAccepted: true }),
      });
      setMessage({ variant: "success", text: t("encounterClinicTab.toastSigned") });
      await onUpdate();
    } catch (e) {
      setMessage({
        variant: "error",
        text:
          normalizeUserFacingError(e instanceof Error ? e.message : null, language) ||
          t("encounterClinicTab.errSign"),
      });
    } finally {
      setSigning(false);
    }
  }, [encounter.id, facilityId, language, onUpdate, t]);

  return (
    <div data-testid="clinic-care-ambulatory-medical-evaluation">
      {!canAuthor ? (
        <p
          role="status"
          style={{
            margin: "0 0 10px",
            padding: "10px 12px",
            borderRadius: 10,
            background: "#fff7ed",
            border: "1px solid #fed7aa",
            color: "#9a3412",
            fontSize: 13,
          }}
        >
          {t("clinicCareD4c5b.medicalEvaluation.readOnly")}
        </p>
      ) : null}
      <ProviderDocumentationWorkspace
        encounterId={encounter.id}
        encounterMode="AMBULATORY"
        facilityCountry={facilityCountry}
        value={value}
        onChange={setValue}
        onSave={save}
        onSign={canAuthor && !readOnlyEncounter ? sign : undefined}
        onClear={
          canAuthor && !fieldsLocked ? () => setValue(emptyProviderDocumentationWorkspaceState()) : undefined
        }
        saving={saving}
        signing={signing}
        readOnly={fieldsLocked}
        lockedMessage={
          docSigned
            ? t("erMseProviderPanel.lockedDocumentation")
            : readOnlyEncounter
              ? t("erMseProviderPanel.readOnlyEncounter")
              : !canAuthor
                ? t("clinicCareD4c5b.medicalEvaluation.readOnly")
                : null
        }
        saveMessage={message}
        keyInformation={[t("clinicCareD4c5b.medicalEvaluation.title")]}
        encounterSummary={[
          encounter.type ? tEncounterType(t, encounter.type) : t("common.dash"),
          encounter.status ? tEncounterStatus(t, encounter.status) : t("common.dash"),
        ]}
        savedMetadata={readProviderDocumentationWorkspaceMetadata(encounter.nursingAssessment)}
        signedMetadata={
          docSigned && encounter.providerDocumentationSignedByDisplayFr && encounter.providerDocumentationSignedAt
            ? {
                signedBy: encounter.providerDocumentationSignedByDisplayFr,
                signedAt: new Date(encounter.providerDocumentationSignedAt).toLocaleString(dateLocale),
              }
            : null
        }
        signedOrFinalized={docSigned}
        t={t}
      />
    </div>
  );
}
