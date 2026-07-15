"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/apiClient";
import { useI18n } from "@/lib/i18n";
import {
  hasVitalsJson,
  MEDORA_PATIENT_VITALS_UPDATED,
  type PatientTriageVitalsSnapshot,
} from "@/lib/patientVitals";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import {
  MedoraCard,
  MedoraCardActions,
  MedoraCardIdentity,
  MedoraCardInner,
  MedoraCardTitle,
} from "@/components/medora-card";
import {
  buildTriageDocumentationPreviewModel,
  emptySepsisScreenForm,
  emptyStrokeScreenForm,
  gcsEvmTriadForTriagePreview,
  type ErSepsisScreenForm,
  type ErScreeningYnu,
  type ErStrokeScreenForm,
  sepsisScreenFormToJson,
  sepsisScreenFromUnknown,
  strokeScreenFormToJson,
  strokeScreenFromUnknown,
  type TriageDocPreviewFormSlice,
  triagePreviewSliceFromTriageGet,
} from "./emergencyTriageDocPreview";
import { EmergencyTriageV1Sections } from "./EmergencyTriageV1Sections";
import { TriageCarryForwardBanner } from "./TriageCarryForwardBanner";
import { PatientHistoryReconciliationBanner } from "./PatientHistoryReconciliationBanner";
import {
  compareEncounterDraftWithProfile,
  patientClinicalHistoryProfileFromJson,
  type PatientHistoryProfileDiff,
  type PatientHistoryReconciliationResult,
} from "./patientClinicalHistoryProfile";
import {
  clearCarryForwardSectionFromForm,
  confirmCarryForwardSectionFromForm,
  mergeCarryForwardApiPayloadIntoTriageForm,
  normalizeCarryForwardMetaFromForm,
  refreshCarryForwardReviewStatusFromForm,
  triagePanelFormToCarryForwardDraft,
  triageCarryForwardMetaFromVitalsJson,
  type TriageCarryForwardApiPayload,
  type TriageCarryForwardMeta,
  type TriageCarryForwardSectionKey,
} from "./triageCarryForward";
import { mergeVitalsJsonForSave } from "./emergencyTriageVitalsMerge";
import { isTriageStaleConflictError } from "./triageConcurrency";
import {
  EmergencyTriageVitalsCompactSection,
  type TriageVitalsCompactValues,
} from "./EmergencyTriageVitalsCompactSection";
import {
  measuredAtIsoFromLocalInputs,
  splitMeasuredAtLocal,
} from "@/lib/vitalsMeasurementContextDisplay";
import { fetchAuthMeSession } from "@/lib/authSessionMe";
import { vitalSummaryInitials } from "@/components/patients/VitalSummaryPanel";
import {
  emptyErTriageV1Form,
  erTriageV1FormFromVitalsJson,
  normalizeErTriageV1Form,
  safeTrim,
  type ErTriageV1Form,
} from "./medoraErTriageV1";
import {
  getErChiefComplaintQuickPicks,
  searchErChiefComplaintTemplates,
  ER_CHIEF_COMPLAINT_SEARCH_MIN_CHARS,
  pickChiefComplaintLocale,
  type ErChiefComplaintBilingual,
  type ErChiefComplaintTemplate,
} from "./erChiefComplaintTemplates";
import {
  chiefComplaintSuggestsChestPain,
  draftTriageHasAllergyDocumentation,
  erTriageV1HasHighAcuityArrivalSource,
  triageCoreVitalsDocumented,
} from "./erTriageSafetyPrompts";
import type { VitalsJsonMergeFormInput } from "./emergencyTriageVitalsMerge";
import type { SupportedLanguage } from "@/i18n/config";
import {
  buildClinicalDraftKey,
  clinicalDraftPayloadSignature,
  createClinicalDraft,
  readClinicalDraft,
  removeClinicalDraft,
  shouldRestoreClinicalDraft,
  writeClinicalDraft,
  type ClinicalDraftScope,
} from "@/lib/clinicalDraftStorage";
import { useClinicalBeforeUnloadWarning } from "@/lib/useClinicalBeforeUnloadWarning";

function applyTemplateBilingualIfFieldEmpty(
  current: string,
  bilingual: ErChiefComplaintBilingual | undefined,
  language: SupportedLanguage
): string {
  if (!bilingual) return current;
  if (current.trim()) return current;
  return pickChiefComplaintLocale(bilingual, language);
}

type EncounterLite = {
  id: string;
  status?: string | null;
  type?: string | null;
  patient?: { id?: string; firstName?: string | null; lastName?: string | null } | null;
};

/** Form state aligned with `TriageVitalsTab` in `encounters/[id]/page.tsx` (same PUT body). */
type TriageFormState = {
  chiefComplaint: string;
  onsetAt: string;
  esi: string;
  tempC: string;
  hr: string;
  rr: string;
  bpSys: string;
  bpDia: string;
  spo2: string;
  weightKg: string;
  heightCm: string;
  painScore: string;
  tempInputUnit: "C" | "F";
  weightInputUnit: "kg" | "lb";
  heightInputMode: "cm" | "ftin";
  heightFeet: string;
  heightInches: string;
  allergyNote: string;
  temperatureSite: string;
  oxygenDevice: string;
  oxygenFlowLpm: string;
  oxygenFiO2Percent: string;
  oxygenDeviceNotes: string;
  measuredDate: string;
  measuredTime: string;
  strokeScreen: ErStrokeScreenForm;
  sepsisScreen: ErSepsisScreenForm;
  triageCompleteAt: string;
  erV1: ErTriageV1Form;
};

type TriageLocalDraftPayload = {
  formData: TriageFormState;
};

const ED_TRIAGE_DRAFT_VERSION = "ed-triage-v1";
const UNKNOWN_CLINICAL_DRAFT_USER_ID = "unknown-user";

const emptyForm = (): TriageFormState => ({
  chiefComplaint: "",
  onsetAt: "",
  esi: "",
  tempC: "",
  hr: "",
  rr: "",
  bpSys: "",
  bpDia: "",
  spo2: "",
  weightKg: "",
  heightCm: "",
  painScore: "",
  tempInputUnit: "C",
  weightInputUnit: "kg",
  heightInputMode: "cm",
  heightFeet: "",
  heightInches: "",
  allergyNote: "",
  temperatureSite: "",
  oxygenDevice: "ROOM_AIR",
  oxygenFlowLpm: "",
  oxygenFiO2Percent: "",
  oxygenDeviceNotes: "",
  ...(() => {
    const m = splitMeasuredAtLocal(new Date().toISOString());
    return { measuredDate: m.date, measuredTime: m.time };
  })(),
  strokeScreen: emptyStrokeScreenForm(),
  sepsisScreen: emptySepsisScreenForm(),
  triageCompleteAt: "",
  erV1: emptyErTriageV1Form(),
});

function triageFormSignature(formData: TriageFormState): string {
  return clinicalDraftPayloadSignature(formData);
}

function triageFormHasContent(formData: TriageFormState): boolean {
  return triageFormSignature(formData) !== triageFormSignature(emptyForm());
}

function triageDraftPayloadHasContent(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const formData = (payload as Partial<TriageLocalDraftPayload>).formData;
  return Boolean(formData && triageFormHasContent(formData));
}

const inputBase: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 12px",
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  fontSize: 14,
  color: "#0f172a",
  backgroundColor: "#fff",
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 6,
  fontWeight: 600,
  fontSize: 13,
  color: "#475569",
};

const grid2: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: 12,
};

const grid3: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 12,
};

const sectionHeading: React.CSSProperties = {
  margin: 0,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#64748b",
};

const PREVIEW_SECTION_ACCENTS: Record<string, string> = {
  presentation: "#6366f1",
  etat_initial: "#b91c1c",
  signes_vitaux: "#059669",
  securite: "#7c3aed",
  meds: "#d97706",
  histoire: "#64748b",
  empty: "#cbd5e1",
};

export function EmergencyTriagePanel({
  encounterId: _encounterId,
  facilityId,
  encounter,
  isLocked,
  encounterTriageTabHref,
  patientChartHref,
  onSaved,
  /** When set, shows a non-blocking control to open procedure documentation (e.g. ECG). */
  onRequestDocumentEcg,
}: {
  encounterId: string;
  facilityId: string;
  encounter: EncounterLite;
  isLocked: boolean;
  encounterTriageTabHref: string;
  /** Lien vers le dossier patient pour antécédents structurés (optionnel). */
  patientChartHref?: string;
  onSaved: () => void | Promise<void>;
  onRequestDocumentEcg?: () => void;
}) {
  const { t, language } = useI18n();
  const [triage, setTriage] = useState<Record<string, unknown> | null>(null);
  const [formData, setFormData] = useState<TriageFormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingVitals, setSavingVitals] = useState(false);
  const [vitalsSaveInfo, setVitalsSaveInfo] = useState<string | null>(null);
  const [vitalsSaveTone, setVitalsSaveTone] = useState<"error" | "success" | "info">("info");
  const [vitalsAttributionLine, setVitalsAttributionLine] = useState<string | null>(null);
  const [saveInfo, setSaveInfo] = useState<string | null>(null);
  const [complaintTemplateQuery, setComplaintTemplateQuery] = useState("");
  const [templateAppliedHint, setTemplateAppliedHint] = useState<string | null>(null);
  const [docPreviewOpen, setDocPreviewOpen] = useState(false);
  const [draftRestoredAt, setDraftRestoredAt] = useState<string | null>(null);
  const [draftSavedLocallyAt, setDraftSavedLocallyAt] = useState<string | null>(null);
  const [carryForwardMeta, setCarryForwardMeta] = useState<TriageCarryForwardMeta | null>(null);
  const [profileDiffs, setProfileDiffs] = useState<PatientHistoryProfileDiff[] | null>(null);
  const [historyReconciliation, setHistoryReconciliation] = useState<PatientHistoryReconciliationResult | null>(
    null
  );
  const [profileHydrationHint, setProfileHydrationHint] = useState(false);
  const serverFormSignatureRef = useRef(triageFormSignature(emptyForm()));
  const restoredDraftKeyRef = useRef<string | null>(null);

  const isReadOnly = encounter.status !== "OPEN";
  const formDisabled = isReadOnly || isLocked;
  const draftScope = useMemo<ClinicalDraftScope>(
    () => ({
      workflowType: "ED_TRIAGE",
      encounterId: encounter.id,
      patientId: encounter.patient?.id ?? null,
      facilityId,
      userId: UNKNOWN_CLINICAL_DRAFT_USER_ID,
      version: ED_TRIAGE_DRAFT_VERSION,
    }),
    [encounter.id, encounter.patient?.id, facilityId]
  );
  const draftKey = useMemo(() => buildClinicalDraftKey(draftScope), [draftScope]);
  const currentFormSignature = useMemo(() => triageFormSignature(formData), [formData]);
  const triageDraftDirty = currentFormSignature !== serverFormSignatureRef.current;

  const screeningYnuOptions: { value: ErScreeningYnu; label: string }[] = useMemo(
    () => [
      { value: "", label: t("erTriage.preview.emptyOption") },
      { value: "yes", label: t("erTriage.preview.ynuYes") },
      { value: "no", label: t("erTriage.preview.ynuNo") },
      { value: "unknown", label: t("erTriage.preview.ynuUnknown") },
    ],
    [t]
  );

  const screeningYnOptions: { value: "" | "yes" | "no"; label: string }[] = useMemo(
    () => [
      { value: "", label: t("erTriage.preview.emptyOption") },
      { value: "yes", label: t("erTriage.preview.ynuYes") },
      { value: "no", label: t("erTriage.preview.ynuNo") },
    ],
    [t]
  );

  const complaintQuickPicks = useMemo(() => getErChiefComplaintQuickPicks(language), [language]);

  const complaintTemplateMatches = useMemo(
    () => searchErChiefComplaintTemplates(complaintTemplateQuery, language),
    [complaintTemplateQuery, language]
  );

  const applyChiefComplaintTemplate = useCallback(
    (tpl: ErChiefComplaintTemplate) => {
      setTemplateAppliedHint(t("erTriage.panel.templateAppliedHint"));
      setFormData((f) => {
        const er = f.erV1;
        const nextEr: ErTriageV1Form = {
          ...er,
          triageNarrative: applyTemplateBilingualIfFieldEmpty(er.triageNarrative, tpl.triageNarrativeStarter, language),
          ppeNote: applyTemplateBilingualIfFieldEmpty(er.ppeNote, tpl.ppePrecautions, language),
          referralSource: applyTemplateBilingualIfFieldEmpty(er.referralSource, tpl.sourceRouting, language),
          triageExceptionsNote: applyTemplateBilingualIfFieldEmpty(
            er.triageExceptionsNote,
            tpl.exceptionsToExpectedProfile,
            language
          ),
          nursingCareNote: applyTemplateBilingualIfFieldEmpty(er.nursingCareNote, tpl.careMonitoringSummary, language),
          medicationsSummary: applyTemplateBilingualIfFieldEmpty(er.medicationsSummary, tpl.medicationSummary, language),
          additionalAllergyInfo: applyTemplateBilingualIfFieldEmpty(
            er.additionalAllergyInfo,
            tpl.additionalAllergyInfo,
            language
          ),
          historySocialComments: applyTemplateBilingualIfFieldEmpty(
            er.historySocialComments,
            tpl.historySocialComments,
            language
          ),
        };
        return {
          ...f,
          chiefComplaint: pickChiefComplaintLocale(tpl.chiefComplaint, language),
          erV1: nextEr,
        };
      });
    },
    [language, t]
  );

  const patchErV1 = useCallback((patch: Partial<ErTriageV1Form>) => {
    setFormData((f) => ({ ...f, erV1: { ...f.erV1, ...patch } }));
  }, []);

  const hydrateCarryForwardIfNeeded = useCallback(
    async (baseForm: TriageFormState): Promise<TriageFormState> => {
      if (encounter.type !== "EMERGENCY") return baseForm;
      if (triageFormHasContent(baseForm)) return baseForm;
      try {
        const cf = (await apiFetch(`/encounters/${encounter.id}/triage/carry-forward`, {
          facilityId,
        })) as TriageCarryForwardApiPayload;
        if (cf?.available && cf.meta) {
          setProfileHydrationHint(cf.hydrationSource === "patient_profile");
          const merged = mergeCarryForwardApiPayloadIntoTriageForm(baseForm, {
            allergyNote: cf.allergyNote,
            fields: cf.fields,
            meta: cf.meta,
          });
          setCarryForwardMeta(merged.meta);
          return { ...baseForm, ...merged.form };
        }
      } catch {
        /* non-blocking — triage remains empty */
      }
      setCarryForwardMeta(null);
      return baseForm;
    },
    [encounter.id, encounter.type, facilityId]
  );

  const loadTriage = useCallback(async () => {
    setLoading(true);
    setSaveInfo(null);
    setTemplateAppliedHint(null);
    try {
      const data = await apiFetch(`/encounters/${encounter.id}/triage`, { facilityId });
      setTriage(data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : null);
      if (data && typeof data === "object" && !Array.isArray(data)) {
        const d = data as Record<string, unknown>;
        const parsed = triagePreviewSliceFromTriageGet(d, language);
        const s = parsed?.slice;
        const v = (d.vitalsJson || {}) as Record<string, number | string | null>;
        const erV1Loaded = normalizeErTriageV1Form(erTriageV1FormFromVitalsJson(d.vitalsJson));
        const painFromVitals =
          v.painScore != null && v.painScore !== ""
            ? String(v.painScore)
            : v.pain != null && v.pain !== ""
              ? String(v.pain)
              : erV1Loaded.painScale0to10;
        const nextForm = {
          chiefComplaint: String(d.chiefComplaint ?? ""),
          onsetAt: d.onsetAt ? new Date(d.onsetAt as string).toISOString().slice(0, 16) : "",
          esi: d.esi != null ? String(d.esi) : "",
          tempC: s?.tempC ?? v.tempC?.toString() ?? "",
          hr: v.hr?.toString() ?? "",
          rr: v.rr?.toString() ?? "",
          bpSys: v.bpSys?.toString() ?? "",
          bpDia: v.bpDia?.toString() ?? "",
          spo2: v.spo2?.toString() ?? "",
          weightKg: s?.weightKg ?? v.weightKg?.toString() ?? "",
          heightCm: s?.heightCm ?? v.heightCm?.toString() ?? "",
          painScore: painFromVitals,
          tempInputUnit: s?.tempInputUnit ?? "C",
          weightInputUnit: s?.weightInputUnit ?? "kg",
          heightInputMode: s?.heightInputMode ?? "cm",
          heightFeet: s?.heightFeet ?? "",
          heightInches: s?.heightInches ?? "",
          allergyNote: (v as { allergyNote?: string | null }).allergyNote ?? "",
          temperatureSite: typeof v.temperatureSite === "string" ? v.temperatureSite : "",
          oxygenDevice: typeof v.oxygenDevice === "string" ? v.oxygenDevice : "ROOM_AIR",
          oxygenFlowLpm: v.oxygenFlowLpm != null && v.oxygenFlowLpm !== "" ? String(v.oxygenFlowLpm) : "",
          oxygenFiO2Percent:
            v.oxygenFiO2Percent != null && v.oxygenFiO2Percent !== "" ? String(v.oxygenFiO2Percent) : "",
          oxygenDeviceNotes: typeof v.oxygenDeviceNotes === "string" ? v.oxygenDeviceNotes : "",
          ...(() => {
            const m = splitMeasuredAtLocal(new Date().toISOString());
            return { measuredDate: m.date, measuredTime: m.time };
          })(),
          strokeScreen: strokeScreenFromUnknown(d.strokeScreen),
          sepsisScreen: sepsisScreenFromUnknown(d.sepsisScreen),
          triageCompleteAt: d.triageCompleteAt
            ? new Date(d.triageCompleteAt as string).toISOString().slice(0, 16)
            : "",
          erV1: { ...erV1Loaded, painScale0to10: painFromVitals },
        };
        serverFormSignatureRef.current = triageFormSignature(nextForm);
        setFormData(nextForm);
        setCarryForwardMeta(
          normalizeCarryForwardMetaFromForm(triageCarryForwardMetaFromVitalsJson(d.vitalsJson), nextForm)
        );
        setDraftRestoredAt(null);
        setDraftSavedLocallyAt(null);
        if (typeof window !== "undefined" && restoredDraftKeyRef.current !== draftKey) {
          const draft = readClinicalDraft<TriageLocalDraftPayload>(window.localStorage, draftKey);
          const serverSavedAt =
            typeof d.updatedAt === "string"
              ? d.updatedAt
              : d.updatedAt
                ? new Date(d.updatedAt as string).toISOString()
                : null;
          const canRestore = shouldRestoreClinicalDraft({
            draft,
            scope: draftScope,
            serverSavedAt,
            workflowEditable: !formDisabled,
            signedOrFinalized: Boolean(d.triageCompleteAt),
            encounterStatus: encounter.status,
            hasPayloadContent: triageDraftPayloadHasContent,
          });
          restoredDraftKeyRef.current = draftKey;
          if (canRestore && draft?.payload.formData) {
            setFormData({
              ...draft.payload.formData,
              chiefComplaint: String(draft.payload.formData.chiefComplaint ?? nextForm.chiefComplaint ?? ""),
              triageCompleteAt: nextForm.triageCompleteAt,
              erV1: normalizeErTriageV1Form(draft.payload.formData.erV1 ?? nextForm.erV1),
            });
            setDraftRestoredAt(draft.metadata.savedLocallyAt);
            setDraftSavedLocallyAt(draft.metadata.savedLocallyAt);
          } else if (draft && !canRestore) {
            removeClinicalDraft(window.localStorage, draftKey);
          }
        }
      } else {
        let nextForm = emptyForm();
        serverFormSignatureRef.current = triageFormSignature(nextForm);
        setDraftRestoredAt(null);
        setDraftSavedLocallyAt(null);
        if (typeof window !== "undefined" && restoredDraftKeyRef.current !== draftKey) {
          const draft = readClinicalDraft<TriageLocalDraftPayload>(window.localStorage, draftKey);
          const canRestore = shouldRestoreClinicalDraft({
            draft,
            scope: draftScope,
            serverSavedAt: null,
            workflowEditable: !formDisabled,
            signedOrFinalized: false,
            encounterStatus: encounter.status,
            hasPayloadContent: triageDraftPayloadHasContent,
          });
          restoredDraftKeyRef.current = draftKey;
          if (canRestore && draft?.payload.formData) {
            nextForm = { ...draft.payload.formData, triageCompleteAt: "" };
            setDraftRestoredAt(draft.metadata.savedLocallyAt);
            setDraftSavedLocallyAt(draft.metadata.savedLocallyAt);
          } else if (draft && !canRestore) {
            removeClinicalDraft(window.localStorage, draftKey);
          }
        }
        nextForm = await hydrateCarryForwardIfNeeded(nextForm);
        serverFormSignatureRef.current = triageFormSignature(nextForm);
        setFormData(nextForm);
      }
    } catch (e) {
      console.error(e);
      setTriage(null);
      setFormData(emptyForm());
      setSaveInfo(
        normalizeUserFacingError(e instanceof Error ? e.message : null, language) || t("erTriage.panel.loadError")
      );
    } finally {
      setLoading(false);
    }
  }, [draftKey, draftScope, encounter.id, encounter.status, facilityId, formDisabled, hydrateCarryForwardIfNeeded, language, t]);

  useEffect(() => {
    const patientId = encounter.patient?.id as string | undefined;
    if (!patientId || encounter.type !== "EMERGENCY") {
      setProfileDiffs(null);
      return;
    }
    void (async () => {
      try {
        const profileRaw = await apiFetch(`/patients/${patientId}/clinical-history-profile`, { facilityId });
        const profile = patientClinicalHistoryProfileFromJson(profileRaw);
        if (!profile) {
          setProfileDiffs(null);
          return;
        }
        setProfileDiffs(
          compareEncounterDraftWithProfile(profile, triagePanelFormToCarryForwardDraft(formData))
        );
      } catch {
        setProfileDiffs(null);
      }
    })();
  }, [encounter.patient?.id, encounter.type, facilityId, formData]);

  useEffect(() => {
    if (!carryForwardMeta) return;
    const next = refreshCarryForwardReviewStatusFromForm(carryForwardMeta, formData);
    if (!next) return;
    const prevSig = JSON.stringify({
      rs: carryForwardMeta.reviewStatus,
      ss: carryForwardMeta.sectionStatus,
    });
    const nextSig = JSON.stringify({ rs: next.reviewStatus, ss: next.sectionStatus });
    if (prevSig !== nextSig) setCarryForwardMeta(next);
  }, [formData, carryForwardMeta]);

  const handleConfirmAllCarryForward = useCallback(() => {
    setCarryForwardMeta((meta) =>
      meta ? refreshCarryForwardReviewStatusFromForm(meta, formData, { markReviewed: true }) : meta
    );
  }, [formData]);

  const handleConfirmCarryForwardSection = useCallback(
    (section: TriageCarryForwardSectionKey) => {
      if (!carryForwardMeta) return;
      setCarryForwardMeta(confirmCarryForwardSectionFromForm(carryForwardMeta, formData, section));
    },
    [carryForwardMeta, formData]
  );

  const handleClearCarryForwardSection = useCallback(
    (section: TriageCarryForwardSectionKey) => {
      if (!carryForwardMeta) return;
      const { form, meta } = clearCarryForwardSectionFromForm(carryForwardMeta, formData, section);
      setFormData((f) => ({ ...f, ...form }));
      setCarryForwardMeta(meta);
    },
    [carryForwardMeta, formData]
  );

  useEffect(() => {
    void loadTriage();
  }, [loadTriage]);

  const handleSave = async () => {
    if (formDisabled) return;
    setSaving(true);
    setSaveInfo(null);
    setTemplateAppliedHint(null);

    const strokeJson = strokeScreenFormToJson(formData.strokeScreen, triage?.strokeScreen);
    const sepsisJson = sepsisScreenFormToJson(formData.sepsisScreen, triage?.sepsisScreen);
    const strokeScreenParsed = Object.keys(strokeJson).length > 0 ? strokeJson : null;
    const sepsisScreenParsed = Object.keys(sepsisJson).length > 0 ? sepsisJson : null;

    try {
      const vitalsMerged = mergeVitalsJsonForSave(
        triage?.vitalsJson,
        formData,
        normalizeCarryForwardMetaFromForm(carryForwardMeta, formData)
      );

      const lastKnownTriageUpdatedAt =
        triage?.updatedAt && typeof triage.updatedAt === "string"
          ? triage.updatedAt
          : triage?.updatedAt
            ? new Date(triage.updatedAt as string).toISOString()
            : null;

      const measuredAt =
        measuredAtIsoFromLocalInputs(formData.measuredDate, formData.measuredTime) ?? undefined;

      const payload: Record<string, unknown> = {
        chiefComplaint: safeTrim(formData.chiefComplaint) || null,
        onsetAt: formData.onsetAt ? new Date(formData.onsetAt).toISOString() : null,
        esi: formData.esi ? parseInt(formData.esi, 10) : null,
        vitalsJson: vitalsMerged,
        strokeScreen: strokeScreenParsed,
        sepsisScreen: sepsisScreenParsed,
        triageCompleteAt: formData.triageCompleteAt ? new Date(formData.triageCompleteAt).toISOString() : null,
        lastKnownTriageUpdatedAt,
        ...(measuredAt ? { measuredAt } : {}),
      };

      const res = await apiFetch(`/encounters/${encounter.id}/triage`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        facilityId,
      });

      const patientIdForEvent = encounter.patient?.id as string | undefined;
      let supersededSnapshot: PatientTriageVitalsSnapshot | null = null;
      if (
        patientIdForEvent &&
        triage &&
        hasVitalsJson(triage.vitalsJson) &&
        triage.id
      ) {
        const u = triage.updatedAt;
        supersededSnapshot = {
          encounterId: encounter.id,
          encounterType: encounter.type ?? "—",
          triageId: triage.id as string,
          updatedAt: typeof u === "string" ? u : new Date(u as string).toISOString(),
          triageCompleteAt: triage.triageCompleteAt
            ? new Date(triage.triageCompleteAt as string).toISOString()
            : null,
          vitalsJson: { ...(triage.vitalsJson as object) } as Record<string, unknown>,
        };
      }
      if (patientIdForEvent && typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(MEDORA_PATIENT_VITALS_UPDATED, {
            detail: { patientId: patientIdForEvent, supersededSnapshot },
          })
        );
      }

      await loadTriage();
      await onSaved();
      const reconciliation = (
        res as { clinicalHistoryReconciliation?: PatientHistoryReconciliationResult }
      )?.clinicalHistoryReconciliation;
      if (reconciliation) setHistoryReconciliation(reconciliation);
      if (typeof window !== "undefined") {
        removeClinicalDraft(window.localStorage, draftKey);
      }
      setDraftRestoredAt(null);
      setDraftSavedLocallyAt(null);
      const baseMsg =
        res && typeof res === "object" && (res as { queued?: boolean }).queued === true
          ? t("erTriage.panel.saveQueued")
          : t("erTriage.panel.saveOk");
      setSaveInfo(baseMsg);
    } catch (e) {
      console.error(e);
      if (isTriageStaleConflictError(e)) {
        /**
         * Stale-token 409: another user saved triage between our load and save. The local form
         * state is intentionally NOT reset — the clinician keeps their draft. They reload to
         * fetch the latest server state, then re-apply their changes if still relevant.
         */
        setSaveInfo(t("erTriage.panel.staleConflict"));
      } else {
        setSaveInfo(
          normalizeUserFacingError(e instanceof Error ? e.message : null, language) || t("erTriage.panel.saveError")
        );
      }
    } finally {
      setSaving(false);
    }
  };

  /**
   * Dedicated vitals save: refreshes latest triage non-vitals from server, merges current vitals
   * draft + measuredAt, and does not require saving the full triage assessment.
   */
  const handleSaveVitals = async () => {
    if (formDisabled || savingVitals || saving) return;
    setSavingVitals(true);
    setVitalsSaveInfo(null);
    try {
      const measuredAt = measuredAtIsoFromLocalInputs(formData.measuredDate, formData.measuredTime);
      if (!measuredAt) {
        setVitalsSaveTone("error");
        setVitalsSaveInfo(t("vitalsContext.errors.invalidMeasuredAt"));
        return;
      }

      const latestRaw = await apiFetch(`/encounters/${encounter.id}/triage`, { facilityId });
      const latest =
        latestRaw && typeof latestRaw === "object" && !Array.isArray(latestRaw)
          ? (latestRaw as Record<string, unknown>)
          : null;
      if (!latest) {
        setVitalsSaveTone("error");
        setVitalsSaveInfo(t("erQuickVitals.saveError"));
        return;
      }

      const erV1 = erTriageV1FormFromVitalsJson(latest.vitalsJson);
      const vitalsMerged = mergeVitalsJsonForSave(latest.vitalsJson, {
        tempC: formData.tempC,
        hr: formData.hr,
        rr: formData.rr,
        bpSys: formData.bpSys,
        bpDia: formData.bpDia,
        spo2: formData.spo2,
        weightKg: formData.weightKg,
        heightCm: formData.heightCm,
        painScore: formData.painScore,
        allergyNote: formData.allergyNote,
        erV1: {
          ...normalizeErTriageV1Form(erV1),
          painScale0to10: formData.painScore.trim() || erV1.painScale0to10,
        },
        tempInputUnit: formData.tempInputUnit,
        weightInputUnit: formData.weightInputUnit,
        heightInputMode: formData.heightInputMode,
        heightFeet: formData.heightFeet,
        heightInches: formData.heightInches,
        temperatureSite: formData.temperatureSite,
        oxygenDevice: formData.oxygenDevice,
        oxygenFlowLpm: formData.oxygenFlowLpm,
        oxygenFiO2Percent: formData.oxygenFiO2Percent,
        oxygenDeviceNotes: formData.oxygenDeviceNotes,
      });

      const strokeJson = strokeScreenFormToJson(
        strokeScreenFromUnknown(latest.strokeScreen),
        latest.strokeScreen
      );
      const sepsisJson = sepsisScreenFormToJson(
        sepsisScreenFromUnknown(latest.sepsisScreen),
        latest.sepsisScreen
      );

      const lastKnownTriageUpdatedAt =
        typeof latest.updatedAt === "string"
          ? latest.updatedAt
          : latest.updatedAt
            ? new Date(latest.updatedAt as string).toISOString()
            : null;

      await apiFetch(`/encounters/${encounter.id}/triage`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chiefComplaint: (latest.chiefComplaint as string | undefined)?.trim() || null,
          onsetAt: latest.onsetAt ? new Date(latest.onsetAt as string).toISOString() : null,
          esi: latest.esi != null ? parseInt(String(latest.esi), 10) : null,
          vitalsJson: vitalsMerged,
          strokeScreen: Object.keys(strokeJson).length > 0 ? strokeJson : null,
          sepsisScreen: Object.keys(sepsisJson).length > 0 ? sepsisJson : null,
          triageCompleteAt: latest.triageCompleteAt
            ? new Date(latest.triageCompleteAt as string).toISOString()
            : null,
          lastKnownTriageUpdatedAt,
          measuredAt,
        }),
        facilityId,
      });

      const patientIdForEvent = encounter.patient?.id as string | undefined;
      if (patientIdForEvent && typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(MEDORA_PATIENT_VITALS_UPDATED, {
            detail: { patientId: patientIdForEvent, supersededSnapshot: null },
          })
        );
      }

      const me = await fetchAuthMeSession();
      const meData = me.ok && me.data ? me.data : null;
      const firstName = typeof meData?.firstName === "string" ? meData.firstName : "";
      const lastName = typeof meData?.lastName === "string" ? meData.lastName : "";
      const displayName = `${firstName} ${lastName}`.trim();
      const initials = vitalSummaryInitials({ firstName, lastName, displayName });
      const recordedAtLabel = new Date().toLocaleString(language === "en" ? "en-US" : "fr-FR", {
        dateStyle: "short",
        timeStyle: "short",
      });
      setVitalsAttributionLine(
        t("vitalsContext.recordedByLine")
          .replace("{initials}", initials)
          .replace("{name}", displayName || "—")
          .replace("{role}", "")
          .replace("{datetime}", recordedAtLabel)
      );

      await loadTriage();
      await onSaved();
      setVitalsSaveTone("success");
      setVitalsSaveInfo(t("vitalsContext.saveSuccess"));
    } catch (e) {
      console.error(e);
      const raw = e instanceof Error ? e.message : null;
      setVitalsSaveTone("error");
      if (raw && /measuredAt cannot be in the future/i.test(raw)) {
        setVitalsSaveInfo(t("vitalsContext.errors.futureMeasuredAt"));
      } else if (isTriageStaleConflictError(e)) {
        setVitalsSaveInfo(t("erTriage.panel.staleConflict"));
      } else {
        setVitalsSaveInfo(normalizeUserFacingError(raw, language) || t("erQuickVitals.saveError"));
      }
    } finally {
      setSavingVitals(false);
    }
  };

  const handleClearVitalsFields = () => {
    if (formDisabled || savingVitals) return;
    const measured = splitMeasuredAtLocal(new Date().toISOString());
    setFormData((f) => ({
      ...f,
      tempC: "",
      hr: "",
      rr: "",
      bpSys: "",
      bpDia: "",
      spo2: "",
      weightKg: "",
      heightCm: "",
      heightFeet: "",
      heightInches: "",
      painScore: "",
      temperatureSite: "",
      oxygenDevice: "ROOM_AIR",
      oxygenFlowLpm: "",
      oxygenFiO2Percent: "",
      oxygenDeviceNotes: "",
      measuredDate: measured.date,
      measuredTime: measured.time,
      erV1: { ...f.erV1, painScale0to10: "" },
    }));
    setVitalsSaveInfo(null);
  };

  const patchVitalsCompact = (patch: Partial<TriageVitalsCompactValues>) => {
    setFormData((f) => {
      const next = { ...f, ...patch };
      if (patch.painScore !== undefined) {
        next.erV1 = { ...f.erV1, painScale0to10: patch.painScore };
      }
      return next;
    });
  };

  useEffect(() => {
    if (loading || formDisabled) return;
    if (!triageDraftDirty || !triageFormHasContent(formData)) {
      if (typeof window !== "undefined") removeClinicalDraft(window.localStorage, draftKey);
      setDraftSavedLocallyAt(null);
      return;
    }
    if (typeof window === "undefined") return;
    const savedLocallyAt = new Date().toISOString();
    writeClinicalDraft(
      window.localStorage,
      draftKey,
      createClinicalDraft({
        scope: draftScope,
        payload: { formData },
        savedLocallyAt,
        lastServerSavedAt:
          triage?.updatedAt && typeof triage.updatedAt === "string"
            ? triage.updatedAt
            : triage?.updatedAt
              ? new Date(triage.updatedAt as string).toISOString()
              : null,
      })
    );
    setDraftSavedLocallyAt(savedLocallyAt);
  }, [draftKey, draftScope, formData, formDisabled, loading, triage?.updatedAt, triageDraftDirty]);

  useClinicalBeforeUnloadWarning({
    dirty: triageDraftDirty && Boolean(draftSavedLocallyAt),
    workflowEditable: !formDisabled,
  });

  const updatedLine =
    triage?.updatedByDisplayFr && triage?.updatedAt
      ? t("erTriage.panel.updatedLine")
          .replace("{user}", String(triage.updatedByDisplayFr).trim())
          .replace(
            "{datetime}",
            new Date(triage.updatedAt as string).toLocaleString(language === "en" ? "en-US" : "fr-FR")
          )
      : null;

  const previewModel = useMemo(() => {
    const slice: TriageDocPreviewFormSlice = {
      chiefComplaint: formData.chiefComplaint,
      onsetAt: formData.onsetAt,
      esi: formData.esi,
      tempC: formData.tempC,
      hr: formData.hr,
      rr: formData.rr,
      bpSys: formData.bpSys,
      bpDia: formData.bpDia,
      spo2: formData.spo2,
      weightKg: formData.weightKg,
      heightCm: formData.heightCm,
      painScore: formData.painScore,
      allergyNote: formData.allergyNote,
      triageCompleteAt: formData.triageCompleteAt,
      tempInputUnit: formData.tempInputUnit,
      weightInputUnit: formData.weightInputUnit,
      heightInputMode: formData.heightInputMode,
      heightFeet: formData.heightFeet,
      heightInches: formData.heightInches,
    };
    return buildTriageDocumentationPreviewModel(slice, {
      strokeScreen: formData.strokeScreen,
      sepsisScreen: formData.sepsisScreen,
      erV1: formData.erV1,
      locale: language,
    });
  }, [formData, language]);

  const triageDraftMergeInput: VitalsJsonMergeFormInput = useMemo(
    () => ({
      tempC: formData.tempC,
      hr: formData.hr,
      rr: formData.rr,
      bpSys: formData.bpSys,
      bpDia: formData.bpDia,
      spo2: formData.spo2,
      weightKg: formData.weightKg,
      heightCm: formData.heightCm,
      painScore: formData.painScore,
      allergyNote: formData.allergyNote,
      erV1: formData.erV1,
      tempInputUnit: formData.tempInputUnit,
      weightInputUnit: formData.weightInputUnit,
      heightInputMode: formData.heightInputMode,
      heightFeet: formData.heightFeet,
      heightInches: formData.heightInches,
      temperatureSite: formData.temperatureSite,
      oxygenDevice: formData.oxygenDevice,
      oxygenFlowLpm: formData.oxygenFlowLpm,
      oxygenFiO2Percent: formData.oxygenFiO2Percent,
      oxygenDeviceNotes: formData.oxygenDeviceNotes,
    }),
    [formData]
  );

  const safetyPromptFlags = useMemo(
    () => ({
      chestPainEcg: chiefComplaintSuggestsChestPain(formData.chiefComplaint),
      allergyMissing: !draftTriageHasAllergyDocumentation(triage?.vitalsJson, triageDraftMergeInput),
      highAcuityArrival: erTriageV1HasHighAcuityArrivalSource(formData.erV1),
    }),
    [formData.chiefComplaint, formData.erV1, triage?.vitalsJson, triageDraftMergeInput]
  );

  const documentationReviewMissing = useMemo(() => {
    const er = normalizeErTriageV1Form(formData.erV1);
    const anyGcs = Boolean(safeTrim(er.gcsEye) || safeTrim(er.gcsVerbal) || safeTrim(er.gcsMotor));
    const gcsTriad = gcsEvmTriadForTriagePreview(er);
    return {
      chiefComplaint: !safeTrim(formData.chiefComplaint),
      triageCompleteAt: !safeTrim(formData.triageCompleteAt),
      allergies: !draftTriageHasAllergyDocumentation(triage?.vitalsJson, triageDraftMergeInput),
      gcsIncomplete: anyGcs && gcsTriad == null,
    };
  }, [formData.chiefComplaint, formData.triageCompleteAt, formData.erV1, triage?.vitalsJson, triageDraftMergeInput]);

  const documentationReviewMissingAny =
    documentationReviewMissing.chiefComplaint ||
    documentationReviewMissing.triageCompleteAt ||
    documentationReviewMissing.allergies ||
    documentationReviewMissing.gcsIncomplete;

  const showSafetyPrompts =
    safetyPromptFlags.chestPainEcg ||
    safetyPromptFlags.allergyMissing ||
    safetyPromptFlags.highAcuityArrival;

  const [wideLayout, setWideLayout] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 960px)");
    const apply = () => setWideLayout(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const workspaceStyle: React.CSSProperties = wideLayout
    ? {
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) minmax(280px, 400px)",
        gap: 20,
        alignItems: "start",
        width: "100%",
      }
    : {
        display: "flex",
        flexDirection: "column",
        gap: 20,
        width: "100%",
      };

  const resumeColumnStyle: React.CSSProperties = wideLayout
    ? {
        position: "sticky",
        top: 12,
        alignSelf: "start",
        maxHeight: "calc(100vh - 100px)",
        overflowY: "auto",
        minWidth: 0,
      }
    : { minWidth: 0 };

  return (
    <MedoraCard leftAccentColor="#b91c1c" variant="default">
      <MedoraCardInner>
        <MedoraCardTitle title={t("erTriage.panel.title")} />

        {loading ? (
          <p style={{ margin: "12px 0 0 0", fontSize: 14, color: "#64748b" }}>{t("common.loading")}</p>
        ) : (
          <>
            {saveInfo ? (
              <p
                style={{
                  margin: "10px 0 0 0",
                  fontSize: 13,
                  color:
                    saveInfo === t("erTriage.panel.saveError") || saveInfo === t("erTriage.panel.loadError")
                      ? "#b91c1c"
                      : "#15803d",
                  lineHeight: 1.45,
                }}
              >
                {saveInfo}
              </p>
            ) : null}
            {draftRestoredAt ? (
              <p
                role="status"
                style={{
                  margin: "10px 0 0 0",
                  fontSize: 13,
                  color: "#0f766e",
                  lineHeight: 1.45,
                  fontWeight: 600,
                }}
              >
                {t("erTriage.panel.localDraftRestored")}
              </p>
            ) : null}
            {draftSavedLocallyAt && triageDraftDirty ? (
              <p style={{ margin: "6px 0 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
                {t("erTriage.panel.localDraftSaved")}
              </p>
            ) : null}

            <PatientHistoryReconciliationBanner diffs={profileDiffs ?? undefined} saveResult={historyReconciliation} />
            {profileHydrationHint ? (
              <div
                style={{
                  marginBottom: 12,
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: "1px solid #bfdbfe",
                  background: "#eff6ff",
                  color: "#1e3a8a",
                  fontSize: 12,
                }}
              >
                {t("erTriage.longitudinalHistory.hydratedFromProfile")}
              </div>
            ) : null}
            <TriageCarryForwardBanner
              meta={carryForwardMeta}
              formDisabled={formDisabled}
              onConfirmAll={handleConfirmAllCarryForward}
            />

            {showSafetyPrompts ? (
              <aside
                aria-label={t("erTriage.panel.safetyPromptsTitle")}
                style={{
                  marginTop: saveInfo ? 10 : 12,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #fde68a",
                  backgroundColor: "#fffbeb",
                }}
              >
                <p style={{ ...sectionHeading, color: "#92400e", letterSpacing: "0.04em" }}>
                  {t("erTriage.panel.safetyPromptsTitle")}
                </p>
                <ul
                  style={{
                    margin: "10px 0 0",
                    paddingLeft: 18,
                    fontSize: 13,
                    color: "#78350f",
                    lineHeight: 1.5,
                  }}
                >
                  {safetyPromptFlags.chestPainEcg ? (
                    <li style={{ marginBottom: 8 }}>
                      <span>{t("erTriage.panel.safetyChestPainEcg")}</span>
                      {onRequestDocumentEcg ? (
                        <button
                          type="button"
                          onClick={onRequestDocumentEcg}
                          disabled={formDisabled}
                          style={{
                            display: "inline-block",
                            marginTop: 6,
                            marginLeft: 0,
                            padding: "6px 12px",
                            borderRadius: 8,
                            border: "1px solid #d97706",
                            backgroundColor: formDisabled ? "#f8fafc" : "#fff",
                            color: "#92400e",
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: formDisabled ? "not-allowed" : "pointer",
                          }}
                        >
                          {t("erTriage.panel.safetyDocumentEcgButton")}
                        </button>
                      ) : null}
                    </li>
                  ) : null}
                  {safetyPromptFlags.allergyMissing ? (
                    <li style={{ marginBottom: safetyPromptFlags.highAcuityArrival ? 8 : 0 }}>
                      {t("erTriage.panel.safetyAllergiesMissing")}
                    </li>
                  ) : null}
                  {safetyPromptFlags.highAcuityArrival ? (
                    <li style={{ margin: 0 }}>{t("erTriage.panel.safetyHighAcuityArrival")}</li>
                  ) : null}
                </ul>
              </aside>
            ) : null}

            <div style={{ ...workspaceStyle, marginTop: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
                <div>
                <p style={sectionHeading}>{t("erTriage.panel.sectionPlainteGravite")}</p>
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <label style={labelStyle}>{t("erTriage.panel.motifPrincipal")}</label>
                    <input
                      type="text"
                      value={formData.chiefComplaint}
                      onChange={(e) => setFormData((f) => ({ ...f, chiefComplaint: e.target.value }))}
                      disabled={formDisabled}
                      style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                      placeholder={t("erTriage.panel.placeholderMotif")}
                    />
                    {!formDisabled ? (
                      <div style={{ marginTop: 8 }}>
                        <p style={{ margin: "0 0 6px 0", fontSize: 12, color: "#64748b", lineHeight: 1.4 }}>
                          {t("erTriageComplaintTemplates.helper")}
                        </p>
                        <input
                          type="search"
                          value={complaintTemplateQuery}
                          onChange={(e) => setComplaintTemplateQuery(e.target.value)}
                          placeholder={t("erTriageComplaintTemplates.searchPlaceholder")}
                          style={{
                            ...inputBase,
                            fontSize: 13,
                            padding: "8px 10px",
                            marginBottom: 8,
                            backgroundColor: "#fff",
                          }}
                          autoComplete="off"
                        />
                        {complaintTemplateQuery.trim().length > 0 &&
                        complaintTemplateQuery.trim().length < ER_CHIEF_COMPLAINT_SEARCH_MIN_CHARS ? (
                          <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>
                            {t("erTriageComplaintTemplates.minCharsHint")}
                          </p>
                        ) : null}
                        {complaintTemplateQuery.trim().length >= ER_CHIEF_COMPLAINT_SEARCH_MIN_CHARS &&
                        complaintTemplateMatches.length === 0 ? (
                          <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>
                            {t("erTriageComplaintTemplates.noResults")}
                          </p>
                        ) : null}
                        {complaintTemplateQuery.trim().length < ER_CHIEF_COMPLAINT_SEARCH_MIN_CHARS ? (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {complaintQuickPicks.map((tpl) => (
                              <button
                                key={tpl.id}
                                type="button"
                                onClick={() => applyChiefComplaintTemplate(tpl)}
                                style={{
                                  border: "1px solid #e2e8f0",
                                  background: "#f8fafc",
                                  borderRadius: 9999,
                                  padding: "4px 10px",
                                  fontSize: 12,
                                  color: "#334155",
                                  cursor: "pointer",
                                  lineHeight: 1.3,
                                }}
                              >
                                {pickChiefComplaintLocale(tpl.label, language)}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 132, overflowY: "auto" }}>
                            {complaintTemplateMatches.map((tpl) => (
                              <button
                                key={tpl.id}
                                type="button"
                                onClick={() => applyChiefComplaintTemplate(tpl)}
                                style={{
                                  border: "1px solid #e2e8f0",
                                  background: "#f8fafc",
                                  borderRadius: 9999,
                                  padding: "4px 10px",
                                  fontSize: 12,
                                  color: "#334155",
                                  cursor: "pointer",
                                  lineHeight: 1.3,
                                }}
                              >
                                {pickChiefComplaintLocale(tpl.label, language)}
                              </button>
                            ))}
                          </div>
                        )}
                        {templateAppliedHint ? (
                          <p
                            role="status"
                            style={{
                              margin: "8px 0 0",
                              fontSize: 12,
                              color: "#64748b",
                              lineHeight: 1.35,
                            }}
                          >
                            {templateAppliedHint}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <div style={grid2}>
                    <div>
                      <label style={labelStyle}>{t("erTriage.panel.esiLabel")}</label>
                      <select
                        value={formData.esi}
                        onChange={(e) => setFormData((f) => ({ ...f, esi: e.target.value }))}
                        disabled={formDisabled}
                        style={{ ...inputBase, cursor: formDisabled ? "not-allowed" : "pointer" }}
                      >
                        <option value="">{t("erTriage.preview.emptyOption")}</option>
                        <option value="1">{t("erTriage.panel.esi1")}</option>
                        <option value="2">{t("erTriage.panel.esi2")}</option>
                        <option value="3">{t("erTriage.panel.esi3")}</option>
                        <option value="4">{t("erTriage.panel.esi4")}</option>
                        <option value="5">{t("erTriage.panel.esi5")}</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>{t("erTriage.panel.onsetAt")}</label>
                      <input
                        type="datetime-local"
                        value={formData.onsetAt}
                        onChange={(e) => setFormData((f) => ({ ...f, onsetAt: e.target.value }))}
                        disabled={formDisabled}
                        style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>{t("erTriage.panel.triageCompleteAt")}</label>
                      <input
                        type="datetime-local"
                        value={formData.triageCompleteAt}
                        onChange={(e) => setFormData((f) => ({ ...f, triageCompleteAt: e.target.value }))}
                        disabled={formDisabled}
                        style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <EmergencyTriageVitalsCompactSection
                values={{
                  tempC: formData.tempC,
                  hr: formData.hr,
                  rr: formData.rr,
                  bpSys: formData.bpSys,
                  bpDia: formData.bpDia,
                  spo2: formData.spo2,
                  weightKg: formData.weightKg,
                  heightCm: formData.heightCm,
                  painScore: formData.painScore,
                  tempInputUnit: formData.tempInputUnit,
                  weightInputUnit: formData.weightInputUnit,
                  heightInputMode: formData.heightInputMode,
                  heightFeet: formData.heightFeet,
                  heightInches: formData.heightInches,
                  temperatureSite: formData.temperatureSite,
                  oxygenDevice: formData.oxygenDevice,
                  oxygenFlowLpm: formData.oxygenFlowLpm,
                  oxygenFiO2Percent: formData.oxygenFiO2Percent,
                  oxygenDeviceNotes: formData.oxygenDeviceNotes,
                  measuredDate: formData.measuredDate,
                  measuredTime: formData.measuredTime,
                }}
                onChange={patchVitalsCompact}
                disabled={formDisabled}
                saving={savingVitals || saving}
                onSaveVitals={() => void handleSaveVitals()}
                onClearVitals={handleClearVitalsFields}
                statusMessage={vitalsSaveInfo}
                statusTone={vitalsSaveTone}
                attributionLine={vitalsAttributionLine}
              />

              <div>
                <div>
                  <EmergencyTriageV1Sections
                    er={formData.erV1}
                    patchErV1={patchErV1}
                    formDisabled={formDisabled}
                    inputBase={inputBase}
                    labelStyle={labelStyle}
                    grid2={grid2}
                    grid3={grid3}
                    sectionHeading={sectionHeading}
                    patientChartHref={patientChartHref}
                    facilityId={facilityId}
                    carryForwardMeta={carryForwardMeta}
                    onConfirmCarryForwardSection={handleConfirmCarryForwardSection}
                    onClearCarryForwardSection={handleClearCarryForwardSection}
                  />
                </div>
              </div>

              <details style={{ border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 12px", backgroundColor: "#fff" }}>
                <summary style={{ cursor: formDisabled ? "default" : "pointer", fontWeight: 600, fontSize: 13, color: "#334155" }}>
                  {t("erTriage.panel.sectionScreenings")}
                </summary>
                <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 10 }}>
                  <div>
                    <p style={{ ...sectionHeading, marginBottom: 8 }}>{t("erTriage.panel.strokeTitle")}</p>
                    <div style={{ ...grid2 }}>
                      <div>
                        <label style={labelStyle}>{t("erTriage.panel.strokeFace")}</label>
                        <select
                          value={formData.strokeScreen.faceDroop}
                          onChange={(e) =>
                            setFormData((f) => ({
                              ...f,
                              strokeScreen: { ...f.strokeScreen, faceDroop: e.target.value as ErScreeningYnu },
                            }))
                          }
                          disabled={formDisabled}
                          style={{ ...inputBase, cursor: formDisabled ? "not-allowed" : "pointer" }}
                        >
                          {screeningYnuOptions.map((o) => (
                            <option key={o.value === "" ? "e" : o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>{t("erTriage.panel.strokeArm")}</label>
                        <select
                          value={formData.strokeScreen.armWeakness}
                          onChange={(e) =>
                            setFormData((f) => ({
                              ...f,
                              strokeScreen: { ...f.strokeScreen, armWeakness: e.target.value as ErScreeningYnu },
                            }))
                          }
                          disabled={formDisabled}
                          style={{ ...inputBase, cursor: formDisabled ? "not-allowed" : "pointer" }}
                        >
                          {screeningYnuOptions.map((o) => (
                            <option key={o.value === "" ? "e" : o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>{t("erTriage.panel.strokeSpeech")}</label>
                        <select
                          value={formData.strokeScreen.speechDifficulty}
                          onChange={(e) =>
                            setFormData((f) => ({
                              ...f,
                              strokeScreen: { ...f.strokeScreen, speechDifficulty: e.target.value as ErScreeningYnu },
                            }))
                          }
                          disabled={formDisabled}
                          style={{ ...inputBase, cursor: formDisabled ? "not-allowed" : "pointer" }}
                        >
                          {screeningYnuOptions.map((o) => (
                            <option key={o.value === "" ? "e" : o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>{t("erTriage.panel.strokeLkw")}</label>
                        <input
                          type="datetime-local"
                          value={formData.strokeScreen.lastKnownWell}
                          onChange={(e) =>
                            setFormData((f) => ({
                              ...f,
                              strokeScreen: { ...f.strokeScreen, lastKnownWell: e.target.value },
                            }))
                          }
                          disabled={formDisabled}
                          style={{ ...inputBase, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>{t("erTriage.panel.strokeAlert")}</label>
                        <select
                          value={formData.strokeScreen.strokeAlertActivated}
                          onChange={(e) =>
                            setFormData((f) => ({
                              ...f,
                              strokeScreen: {
                                ...f.strokeScreen,
                                strokeAlertActivated: e.target.value as "" | "yes" | "no",
                              },
                            }))
                          }
                          disabled={formDisabled}
                          style={{ ...inputBase, cursor: formDisabled ? "not-allowed" : "pointer" }}
                        >
                          {screeningYnOptions.map((o) => (
                            <option key={o.value === "" ? "e" : o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <label style={labelStyle}>{t("erTriage.panel.strokeComments")}</label>
                      <textarea
                        value={formData.strokeScreen.comments}
                        onChange={(e) =>
                          setFormData((f) => ({
                            ...f,
                            strokeScreen: { ...f.strokeScreen, comments: e.target.value },
                          }))
                        }
                        disabled={formDisabled}
                        rows={2}
                        style={{ ...inputBase, resize: "vertical", minHeight: 56, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                      />
                    </div>
                  </div>

                  <div>
                    <p style={{ ...sectionHeading, marginBottom: 8 }}>{t("erTriage.panel.sepsisTitle")}</p>
                    <div style={{ ...grid2 }}>
                      <div>
                        <label style={labelStyle}>{t("erTriage.panel.sepsisSuspected")}</label>
                        <select
                          value={formData.sepsisScreen.suspectedInfection}
                          onChange={(e) =>
                            setFormData((f) => ({
                              ...f,
                              sepsisScreen: { ...f.sepsisScreen, suspectedInfection: e.target.value as ErScreeningYnu },
                            }))
                          }
                          disabled={formDisabled}
                          style={{ ...inputBase, cursor: formDisabled ? "not-allowed" : "pointer" }}
                        >
                          {screeningYnuOptions.map((o) => (
                            <option key={o.value === "" ? "e" : o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>{t("erTriage.panel.sepsisRr")}</label>
                        <select
                          value={formData.sepsisScreen.rrGte22}
                          onChange={(e) =>
                            setFormData((f) => ({
                              ...f,
                              sepsisScreen: { ...f.sepsisScreen, rrGte22: e.target.value as ErScreeningYnu },
                            }))
                          }
                          disabled={formDisabled}
                          style={{ ...inputBase, cursor: formDisabled ? "not-allowed" : "pointer" }}
                        >
                          {screeningYnuOptions.map((o) => (
                            <option key={o.value === "" ? "e" : o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>{t("erTriage.panel.sepsisSbp")}</label>
                        <select
                          value={formData.sepsisScreen.sbpLte100}
                          onChange={(e) =>
                            setFormData((f) => ({
                              ...f,
                              sepsisScreen: { ...f.sepsisScreen, sbpLte100: e.target.value as ErScreeningYnu },
                            }))
                          }
                          disabled={formDisabled}
                          style={{ ...inputBase, cursor: formDisabled ? "not-allowed" : "pointer" }}
                        >
                          {screeningYnuOptions.map((o) => (
                            <option key={o.value === "" ? "e" : o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>{t("erTriage.panel.sepsisAms")}</label>
                        <select
                          value={formData.sepsisScreen.alteredMentalStatus}
                          onChange={(e) =>
                            setFormData((f) => ({
                              ...f,
                              sepsisScreen: { ...f.sepsisScreen, alteredMentalStatus: e.target.value as ErScreeningYnu },
                            }))
                          }
                          disabled={formDisabled}
                          style={{ ...inputBase, cursor: formDisabled ? "not-allowed" : "pointer" }}
                        >
                          {screeningYnuOptions.map((o) => (
                            <option key={o.value === "" ? "e" : o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>{t("erTriage.panel.sepsisLactate")}</label>
                        <select
                          value={formData.sepsisScreen.lactateOrdered}
                          onChange={(e) =>
                            setFormData((f) => ({
                              ...f,
                              sepsisScreen: { ...f.sepsisScreen, lactateOrdered: e.target.value as ErScreeningYnu },
                            }))
                          }
                          disabled={formDisabled}
                          style={{ ...inputBase, cursor: formDisabled ? "not-allowed" : "pointer" }}
                        >
                          {screeningYnuOptions.map((o) => (
                            <option key={o.value === "" ? "e" : o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>{t("erTriage.panel.sepsisAlert")}</label>
                        <select
                          value={formData.sepsisScreen.sepsisAlertActivated}
                          onChange={(e) =>
                            setFormData((f) => ({
                              ...f,
                              sepsisScreen: {
                                ...f.sepsisScreen,
                                sepsisAlertActivated: e.target.value as "" | "yes" | "no",
                              },
                            }))
                          }
                          disabled={formDisabled}
                          style={{ ...inputBase, cursor: formDisabled ? "not-allowed" : "pointer" }}
                        >
                          {screeningYnOptions.map((o) => (
                            <option key={o.value === "" ? "e" : o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <label style={labelStyle}>{t("erTriage.panel.sepsisComments")}</label>
                      <textarea
                        value={formData.sepsisScreen.comments}
                        onChange={(e) =>
                          setFormData((f) => ({
                            ...f,
                            sepsisScreen: { ...f.sepsisScreen, comments: e.target.value },
                          }))
                        }
                        disabled={formDisabled}
                        rows={2}
                        style={{ ...inputBase, resize: "vertical", minHeight: 56, backgroundColor: formDisabled ? "#f8fafc" : "#fff" }}
                      />
                    </div>
                  </div>
                </div>
              </details>
              </div>

              <div style={resumeColumnStyle}>
                <p style={sectionHeading}>{t("erTriage.panel.sectionResume")}</p>
                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }} aria-live="polite">
                  {previewModel.sections.map((sec) => (
                    <MedoraCard
                      key={sec.id}
                      leftAccentColor={PREVIEW_SECTION_ACCENTS[sec.id] ?? "#94a3b8"}
                      variant="default"
                    >
                      <MedoraCardInner>
                        <MedoraCardIdentity initials={sec.title.charAt(0)}>
                          <MedoraCardTitle title={sec.title} />
                        </MedoraCardIdentity>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
                          {sec.lines.map((line, i) => (
                            <p
                              key={`${sec.id}-${i}`}
                              style={{
                                margin: 0,
                                fontSize: 13,
                                color: "#334155",
                                lineHeight: 1.6,
                                wordBreak: "break-word",
                              }}
                            >
                              {line}
                            </p>
                          ))}
                        </div>
                      </MedoraCardInner>
                    </MedoraCard>
                  ))}
                  {previewModel.narrative.trim() ? (
                    <MedoraCard leftAccentColor="#0f172a" variant="default">
                      <MedoraCardInner>
                        <MedoraCardIdentity initials="R">
                          <MedoraCardTitle title={t("erTriage.panel.synthTitle")} />
                        </MedoraCardIdentity>
                        <p style={{ margin: "10px 0 0 0", fontSize: 14, color: "#0f172a", lineHeight: 1.55 }}>
                          {previewModel.narrative}
                        </p>
                      </MedoraCardInner>
                    </MedoraCard>
                  ) : null}

                  <MedoraCard leftAccentColor="#475569" variant="default">
                    <MedoraCardInner>
                      <MedoraCardIdentity initials="S">
                        <MedoraCardTitle title={t("erTriage.panel.signatureTitle")} />
                      </MedoraCardIdentity>
                      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                        <p style={{ margin: 0, fontSize: 13, color: "#334155", lineHeight: 1.55 }}>
                          {updatedLine ?? t("erTriage.panel.noServerUpdate")}
                        </p>
                        {formData.triageCompleteAt ? (
                          <p style={{ margin: 0, fontSize: 13, color: "#64748b", lineHeight: 1.45 }}>
                            {t("erTriage.panel.triageCompleteEntered").replace(
                              "{datetime}",
                              new Date(formData.triageCompleteAt).toLocaleString(
                                language === "en" ? "en-US" : "fr-FR",
                                {
                                  dateStyle: "short",
                                  timeStyle: "short",
                                }
                              )
                            )}
                          </p>
                        ) : null}
                      </div>
                    </MedoraCardInner>
                  </MedoraCard>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, rowGap: 8 }}>
                <p style={{ ...sectionHeading, margin: 0 }}>{t("erTriage.panel.docPreviewTitle")}</p>
                <button
                  type="button"
                  onClick={() => setDocPreviewOpen((o) => !o)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: 10,
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#fff",
                    color: "#334155",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    lineHeight: 1.3,
                  }}
                >
                  {docPreviewOpen ? t("erTriage.panel.docPreviewHideButton") : t("erTriage.panel.docPreviewReviewButton")}
                </button>
              </div>
              {docPreviewOpen ? (
                <div style={{ marginTop: 12 }}>
                  {documentationReviewMissingAny ? (
                    <div
                      style={{
                        marginBottom: 12,
                        padding: "8px 10px",
                        borderRadius: 8,
                        border: "1px solid #e2e8f0",
                        backgroundColor: "#f8fafc",
                      }}
                    >
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#475569", lineHeight: 1.5 }}>
                        {documentationReviewMissing.chiefComplaint ? (
                          <li>{t("erTriage.panel.docPreviewMissingChief")}</li>
                        ) : null}
                        {documentationReviewMissing.triageCompleteAt ? (
                          <li>{t("erTriage.panel.docPreviewMissingCompleteAt")}</li>
                        ) : null}
                        {documentationReviewMissing.allergies ? (
                          <li>{t("erTriage.panel.docPreviewMissingAllergies")}</li>
                        ) : null}
                        {documentationReviewMissing.gcsIncomplete ? (
                          <li>{t("erTriage.panel.docPreviewMissingGcs")}</li>
                        ) : null}
                      </ul>
                    </div>
                  ) : null}
                  <div
                    style={{
                      maxHeight: 320,
                      overflowY: "auto",
                      border: "1px solid #e2e8f0",
                      borderRadius: 10,
                      padding: "10px 12px",
                      backgroundColor: "#fff",
                    }}
                    aria-live="polite"
                  >
                    {previewModel.sections.map((sec) => (
                      <div
                        key={sec.id}
                        style={{
                          marginBottom: 12,
                          paddingLeft: 8,
                          borderLeft: `3px solid ${PREVIEW_SECTION_ACCENTS[sec.id] ?? "#94a3b8"}`,
                        }}
                      >
                        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#64748b", letterSpacing: "0.04em" }}>
                          {sec.title}
                        </p>
                        {sec.lines.map((line, i) => (
                          <p
                            key={`${sec.id}-l-${i}`}
                            style={{ margin: "6px 0 0", fontSize: 12, color: "#334155", lineHeight: 1.55, wordBreak: "break-word" }}
                          >
                            {line}
                          </p>
                        ))}
                      </div>
                    ))}
                    {previewModel.narrative.trim() ? (
                      <p
                        style={{
                          margin: previewModel.sections.length ? "12px 0 0" : 0,
                          paddingTop: previewModel.sections.length ? 10 : 0,
                          borderTop: previewModel.sections.length ? "1px solid #f1f5f9" : undefined,
                          fontSize: 12,
                          color: "#0f172a",
                          lineHeight: 1.55,
                          fontStyle: "italic",
                          wordBreak: "break-word",
                        }}
                      >
                        {previewModel.narrative}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            <MedoraCardActions railBorderTopColor="#e2e8f0" gap={10} minWidth={0} alignItems="flex-start">
              {!formDisabled ? (
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving}
                  style={{
                    padding: "10px 18px",
                    borderRadius: 10,
                    border: "none",
                    backgroundColor: "#0f172a",
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: saving ? "wait" : "pointer",
                    opacity: saving ? 0.85 : 1,
                  }}
                >
                  {saving ? t("erTriage.panel.saveSaving") : t("erTriage.panel.saveButton")}
                </button>
              ) : (
                <p style={{ margin: 0, fontSize: 13, color: "#92400e", lineHeight: 1.45 }}>
                  {isReadOnly ? t("erTriage.panel.readonlyEncounter") : t("erTriage.panel.readonlyLocked")}
                </p>
              )}
              <Link href={encounterTriageTabHref} style={{ ...linkPillStyle, alignSelf: "center" }}>
                {t("erTriage.panel.linkFullTriageTab")}
              </Link>
            </MedoraCardActions>
          </>
        )}
      </MedoraCardInner>
    </MedoraCard>
  );
}

const linkPillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "8px 14px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  backgroundColor: "#f8fafc",
  color: "#334155",
  fontSize: 13,
  fontWeight: 600,
  textDecoration: "none",
};
