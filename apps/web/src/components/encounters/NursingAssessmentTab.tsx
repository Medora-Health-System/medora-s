"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch, parseApiResponse } from "@/lib/apiClient";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { useI18n } from "@/lib/i18n";
import { NURSING_ASSESSMENT_SECTION_LABELS_FR } from "@/components/patient-chart/patientChartHelpers";
import {
  IV_SITE_OPTIONS_FR,
  parseIvInsertionFromNursing,
  type IvInsertionProcedureV1,
} from "@/lib/nursingProcedures";
import { MEDORA_CARD_SHELL } from "@/components/medora-card";
import { ErHandoffV1NursingSection } from "@/components/encounters/ErHandoffV1Panel";
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

type SectionDef = { id: string; label: string; chips: string[] };

/** Section order matches persisted `nursingEvalV1.sections` keys. */
const SECTION_IDS = [
  "etatGeneral",
  "neurologique",
  "respiratoire",
  "cardiaque",
  "digestif",
  "genito",
  "musculo",
  "peau",
  "douleur",
  "securite",
  "interventionsInfirmieres",
  "notesInfirmieresLibres",
] as const;

/** Maps persisted IV site values (French canonical) to i18n sub-keys under `nursingAssessmentTab.ivSites`. */
const IV_SITE_OPTION_TO_I18N_KEY: Record<string, string> = {
  RAC: "RAC",
  RAS: "RAS",
  LAC: "LAC",
  LAS: "LAS",
  "Main droite": "handRight",
  "Main gauche": "handLeft",
  "Pied droit": "footRight",
  "Pied gauche": "footLeft",
  Autre: "other",
};

function parseChipLines(raw: string): string[] {
  return raw.split("\n").map((s) => s.trim()).filter(Boolean);
}

function buildSectionDefs(t: (k: string) => string): SectionDef[] {
  return SECTION_IDS.map((id) => ({
    id,
    label: t(`nursingAssessmentTab.labels.${id}`),
    chips: parseChipLines(t(`nursingAssessmentTab.chips.${id}`)),
  }));
}

function ivSiteOptionLabel(opt: string, t: (k: string) => string): string {
  const sub = IV_SITE_OPTION_TO_I18N_KEY[opt];
  return sub ? t(`nursingAssessmentTab.ivSites.${sub}`) : opt;
}

type AssessmentState = Record<string, { text: string }>;
type NursingAssessmentLocalDraftPayload = {
  state: AssessmentState;
  ivState: IvInsertionProcedureV1;
};

const NURSING_ASSESSMENT_DRAFT_VERSION = "nursing-assessment-v1";
const UNKNOWN_CLINICAL_DRAFT_USER_ID = "unknown-user";

function sectionTextFromUnknown(v: unknown): string | null {
  if (!v || typeof v !== "object") return null;
  const t = (v as { text?: unknown }).text;
  return typeof t === "string" ? t : null;
}

/** Compatibilité : anciennes clés `cardiovasculaire`, `gastro`, `notesInfirmieres`, `observationsInfirmieres`. */
function parseAssessment(raw: unknown): AssessmentState {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const inner = o.nursingEvalV1;
  if (!inner || typeof inner !== "object") return {};
  const sections = (inner as Record<string, unknown>).sections;
  if (!sections || typeof sections !== "object") return {};
  const out: AssessmentState = {};
  for (const [k, v] of Object.entries(sections)) {
    const text = sectionTextFromUnknown(v)?.trim();
    if (text) out[k] = { text };
  }
  if (!out.cardiaque?.text && out.cardiovasculaire?.text) {
    out.cardiaque = { text: out.cardiovasculaire.text };
  }
  if (!out.digestif?.text && out.gastro?.text) {
    out.digestif = { text: out.gastro.text };
  }
  if (!out.notesInfirmieresLibres?.text && out.notesInfirmieres?.text) {
    out.notesInfirmieresLibres = { text: out.notesInfirmieres.text };
  }
  if (!out.notesInfirmieresLibres?.text && out.observationsInfirmieres?.text) {
    out.notesInfirmieresLibres = { text: out.observationsInfirmieres.text };
  }
  return out;
}

function buildSummaryLines(
  state: AssessmentState,
  sectionDefs: SectionDef[],
  t: (k: string) => string
): string[] {
  const lines: string[] = [];
  const used = new Set<string>();
  for (const sec of sectionDefs) {
    const text = state[sec.id]?.text?.trim();
    if (!text) continue;
    const short = text.length > 140 ? `${text.slice(0, 140)}…` : text;
    lines.push(`${sec.label} : ${short}`);
    used.add(sec.id);
  }
  for (const [k, v] of Object.entries(state)) {
    if (used.has(k)) continue;
    const text = v?.text?.trim();
    if (!text) continue;
    const label =
      NURSING_ASSESSMENT_SECTION_LABELS_FR[k] ?? t("nursingAssessmentTab.fallbackLegacySection");
    const short = text.length > 140 ? `${text.slice(0, 140)}…` : text;
    lines.push(`${label} : ${short}`);
  }
  return lines.slice(0, 24);
}

function buildPayload(
  state: AssessmentState,
  savedByDisplayName: string,
  iv: IvInsertionProcedureV1,
  summaryLinesFr: string[]
) {
  const sections: AssessmentState = {};
  for (const [k, v] of Object.entries(state)) {
    const tx = v?.text?.trim();
    if (tx) sections[k] = { text: tx };
  }
  const name = savedByDisplayName.trim();
  const nursingEvalV1: Record<string, unknown> = {
    sections,
    summaryLinesFr,
    templateVersion: "mvp2025b",
    signature: {
      savedAt: new Date().toISOString(),
      savedByDisplayName: name,
    },
  };
  if (iv.performed) {
    nursingEvalV1.proceduresV1 = {
      ivInsertion: {
        performed: true,
        site: iv.site?.trim() || undefined,
        siteOther: iv.site === "Autre" ? iv.siteOther?.trim() || undefined : undefined,
        gauge: iv.gauge?.trim() || undefined,
        performedAt: iv.performedAt || undefined,
        note: iv.note?.trim() || undefined,
      },
    };
  }
  return {
    nursingAssessment: {
      nursingEvalV1,
    },
  };
}

function nursingAssessmentSignature(state: AssessmentState, ivState: IvInsertionProcedureV1): string {
  return clinicalDraftPayloadSignature({ state, ivState });
}

function nursingAssessmentDraftHasContent(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as Partial<NursingAssessmentLocalDraftPayload>;
  const hasSectionText = Object.values(p.state ?? {}).some((section) => Boolean(section?.text?.trim()));
  const iv = p.ivState;
  return Boolean(
    hasSectionText ||
      iv?.performed ||
      iv?.site?.trim() ||
      iv?.siteOther?.trim() ||
      iv?.gauge?.trim() ||
      iv?.note?.trim()
  );
}

export function NursingAssessmentTab({
  encounterId,
  facilityId,
  encounter,
  onUpdate,
  isLocked = false,
  canEditErInpatientHandoff = false,
  onHandoffSaved,
}: {
  encounterId: string;
  facilityId: string;
  encounter: any;
  onUpdate: () => void;
  /** Dossier médical signé — saisie verrouillée. */
  isLocked?: boolean;
  /** RN/ADMIN sur consultation ouverte — édition transmission urgences. */
  canEditErInpatientHandoff?: boolean;
  onHandoffSaved?: (patch: Record<string, unknown>) => void;
}) {
  const { t } = useI18n();
  const sectionDefs = useMemo(() => buildSectionDefs(t), [t]);
  const formLocked = isLocked;
  const initial = useMemo(() => parseAssessment(encounter?.nursingAssessment), [encounter?.nursingAssessment]);
  const [state, setState] = useState<AssessmentState>(initial);
  const [ivState, setIvState] = useState<IvInsertionProcedureV1>(() =>
    parseIvInsertionFromNursing(encounter?.nursingAssessment)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  /** true si le PATCH est seulement mis en file (pas encore confirmé serveur). */
  const [queuedLocalSave, setQueuedLocalSave] = useState(false);
  const [draftRestoredAt, setDraftRestoredAt] = useState<string | null>(null);
  const [draftSavedLocallyAt, setDraftSavedLocallyAt] = useState<string | null>(null);
  const serverSignatureRef = useRef(nursingAssessmentSignature(initial, parseIvInsertionFromNursing(encounter?.nursingAssessment)));
  const restoredDraftKeyRef = useRef<string | null>(null);
  const workflowEditable = !formLocked && (encounter?.status == null || encounter.status === "OPEN");
  const draftScope = useMemo<ClinicalDraftScope>(
    () => ({
      workflowType: "NURSING_ASSESSMENT",
      encounterId,
      patientId: encounter?.patient?.id ?? null,
      facilityId,
      userId: UNKNOWN_CLINICAL_DRAFT_USER_ID,
      version: NURSING_ASSESSMENT_DRAFT_VERSION,
    }),
    [encounter?.patient?.id, encounterId, facilityId]
  );
  const draftKey = useMemo(() => buildClinicalDraftKey(draftScope), [draftScope]);
  const currentSignature = useMemo(() => nursingAssessmentSignature(state, ivState), [ivState, state]);
  const draftDirty = currentSignature !== serverSignatureRef.current;

  useEffect(() => {
    const serverState = parseAssessment(encounter?.nursingAssessment);
    const serverIvState = parseIvInsertionFromNursing(encounter?.nursingAssessment);
    serverSignatureRef.current = nursingAssessmentSignature(serverState, serverIvState);
    setState(serverState);
    setIvState(serverIvState);
    setDraftRestoredAt(null);
    setDraftSavedLocallyAt(null);

    if (typeof window === "undefined" || restoredDraftKeyRef.current === draftKey) return;
    const draft = readClinicalDraft<NursingAssessmentLocalDraftPayload>(window.localStorage, draftKey);
    const canRestore = shouldRestoreClinicalDraft({
      draft,
      scope: draftScope,
      serverSavedAt:
        typeof encounter?.updatedAt === "string"
          ? encounter.updatedAt
          : encounter?.updatedAt
            ? new Date(encounter.updatedAt).toISOString()
            : null,
      workflowEditable,
      signedOrFinalized: formLocked,
      encounterStatus: encounter?.status ?? null,
      hasPayloadContent: nursingAssessmentDraftHasContent,
    });
    restoredDraftKeyRef.current = draftKey;
    if (canRestore && draft) {
      setState(draft.payload.state);
      setIvState(draft.payload.ivState);
      setDraftRestoredAt(draft.metadata.savedLocallyAt);
      setDraftSavedLocallyAt(draft.metadata.savedLocallyAt);
    } else if (draft && !canRestore) {
      removeClinicalDraft(window.localStorage, draftKey);
    }
  }, [draftKey, draftScope, encounter?.nursingAssessment, encounter?.status, encounter?.updatedAt, formLocked, workflowEditable]);

  const setSectionText = (id: string, text: string) => {
    setState((s) => ({ ...s, [id]: { text } }));
  };

  const appendChip = (id: string, chip: string) => {
    setState((s) => {
      const prev = s[id]?.text?.trim() ?? "";
      const add = prev && !prev.endsWith(".") ? `. ${chip}` : prev ? `${prev}. ${chip}` : chip;
      return { ...s, [id]: { text: add } };
    });
  };

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    setOk(false);
    setQueuedLocalSave(false);
    try {
      let savedByDisplayName = t("nursingAssessmentTab.signerFallback");
      try {
        const meRes = await fetch("/api/auth/me", { credentials: "include" });
        const me = await parseApiResponse(meRes);
        if (me && typeof me === "object" && !Array.isArray(me)) {
          const fn = (me as { fullName?: string }).fullName?.trim();
          if (fn) savedByDisplayName = fn;
        }
      } catch {
        /* repli */
      }
      const displayName = savedByDisplayName.trim() || t("nursingAssessmentTab.signerFallback");
      const summaryLines = buildSummaryLines(state, sectionDefs, t);
      const body = buildPayload(state, displayName, ivState, summaryLines);
      const prevNav = encounter?.nursingAssessment;
      const prevObj =
        prevNav && typeof prevNav === "object" && !Array.isArray(prevNav)
          ? { ...(prevNav as Record<string, unknown>) }
          : {};
      const inner = body.nursingAssessment;
      const mergedNav =
        inner && typeof inner === "object" && !Array.isArray(inner)
          ? { ...prevObj, ...inner }
          : prevObj;
      const res = await apiFetch(`/encounters/${encounterId}`, {
        method: "PATCH",
        facilityId,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nursingAssessment: mergedNav }),
      });
      const queued =
        res && typeof res === "object" && !Array.isArray(res) && (res as { queued?: boolean }).queued === true;
      if (queued) {
        setQueuedLocalSave(true);
        setOk(false);
      } else {
        setOk(true);
        setQueuedLocalSave(false);
        serverSignatureRef.current = nursingAssessmentSignature(state, ivState);
        if (typeof window !== "undefined") {
          removeClinicalDraft(window.localStorage, draftKey);
        }
        setDraftRestoredAt(null);
        setDraftSavedLocallyAt(null);
      }
      onUpdate();
    } catch (e) {
      setError(
        normalizeUserFacingError(e instanceof Error ? e.message : null) || t("nursingAssessmentTab.errSave")
      );
    } finally {
      setSaving(false);
    }
  }, [draftKey, encounterId, facilityId, encounter?.nursingAssessment, onUpdate, state, ivState, sectionDefs, t]);

  useEffect(() => {
    if (!workflowEditable) return;
    const payload: NursingAssessmentLocalDraftPayload = { state, ivState };
    if (!draftDirty || !nursingAssessmentDraftHasContent(payload)) {
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
        payload,
        savedLocallyAt,
        lastServerSavedAt:
          typeof encounter?.updatedAt === "string"
            ? encounter.updatedAt
            : encounter?.updatedAt
              ? new Date(encounter.updatedAt).toISOString()
              : null,
      })
    );
    setDraftSavedLocallyAt(savedLocallyAt);
  }, [draftDirty, draftKey, draftScope, encounter?.updatedAt, ivState, state, workflowEditable]);

  useClinicalBeforeUnloadWarning({
    dirty: draftDirty && Boolean(draftSavedLocallyAt),
    workflowEditable,
    signedOrFinalized: formLocked,
  });

  const shell: React.CSSProperties = {
    backgroundColor: MEDORA_CARD_SHELL.background,
    border: MEDORA_CARD_SHELL.border,
    borderRadius: MEDORA_CARD_SHELL.radius,
    boxShadow: MEDORA_CARD_SHELL.boxShadow,
  };

  const controlBase: React.CSSProperties = {
    padding: "8px 12px",
    borderRadius: 10,
    border: "1px solid #e2e8f0",
    fontSize: 14,
    color: "#0f172a",
    backgroundColor: "#fff",
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ ...shell, padding: "16px 18px" }}>
        <p style={{ margin: 0, fontSize: 14, color: "#334155", lineHeight: 1.55 }}>
          <strong style={{ color: "#0f172a" }}>{t("nursingAssessmentTab.introBold")}</strong>
          {t("nursingAssessmentTab.introRest")}
        </p>
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
            {t("nursingAssessmentTab.localDraftRestored")}
          </p>
        ) : null}
        {draftSavedLocallyAt && draftDirty ? (
          <p style={{ margin: "6px 0 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
            {t("nursingAssessmentTab.localDraftSaved")}
          </p>
        ) : null}
      </div>

      <fieldset
        style={{
          ...shell,
          border: "1px solid #bbf7d0",
          padding: "16px 18px",
          margin: 0,
          backgroundColor: "#f0fdf4",
        }}
      >
        <legend style={{ fontWeight: 700, padding: "0 10px", fontSize: 14, color: "#0f172a" }}>
          {t("nursingAssessmentTab.proceduresLegend")}
        </legend>
        <p style={{ fontSize: 13, color: "#475569", marginTop: 0, lineHeight: 1.45 }}>
          {t("nursingAssessmentTab.proceduresHelp1")}
        </p>
        <p style={{ fontSize: 12, color: "#64748b", margin: "8px 0 0 0", lineHeight: 1.45 }}>
          {t("nursingAssessmentTab.proceduresHelp2")}
        </p>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 12,
            cursor: formLocked ? "not-allowed" : "pointer",
          }}
        >
          <input
            type="checkbox"
            disabled={formLocked}
            checked={ivState.performed}
            onChange={(e) => {
              const checked = e.target.checked;
              setIvState((prev) => ({
                ...prev,
                performed: checked,
                performedAt:
                  checked && !prev.performedAt ? new Date().toISOString() : prev.performedAt,
              }));
            }}
          />
          <span style={{ fontWeight: 600 }}>{t("nursingAssessmentTab.ivPerformed")}</span>
        </label>
        {ivState.performed ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
              <span style={{ fontWeight: 600 }}>{t("nursingAssessmentTab.ivSite")}</span>
              <select
                disabled={formLocked}
                value={ivState.site ?? ""}
                onChange={(e) => setIvState((s) => ({ ...s, site: e.target.value || undefined }))}
                style={{ ...controlBase, maxWidth: 360 }}
              >
                <option value="">{t("nursingAssessmentTab.selectPlaceholder")}</option>
                {IV_SITE_OPTIONS_FR.map((opt) => (
                  <option key={opt} value={opt}>
                    {ivSiteOptionLabel(opt, t)}
                  </option>
                ))}
              </select>
            </label>
            {ivState.site === "Autre" ? (
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
                <span style={{ fontWeight: 600 }}>{t("nursingAssessmentTab.ivSpecifySite")}</span>
                <input
                  type="text"
                  disabled={formLocked}
                  value={ivState.siteOther ?? ""}
                  onChange={(e) => setIvState((s) => ({ ...s, siteOther: e.target.value }))}
                  style={{ ...controlBase, maxWidth: 420 }}
                />
              </label>
            ) : null}
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
              <span style={{ fontWeight: 600 }}>{t("nursingAssessmentTab.ivGauge")}</span>
              <input
                type="text"
                disabled={formLocked}
                placeholder={t("nursingAssessmentTab.ivGaugePlaceholder")}
                value={ivState.gauge ?? ""}
                onChange={(e) => setIvState((s) => ({ ...s, gauge: e.target.value }))}
                style={{ ...controlBase, maxWidth: 200 }}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
              <span style={{ fontWeight: 600 }}>{t("nursingAssessmentTab.ivDatetime")}</span>
              <input
                type="datetime-local"
                disabled={formLocked}
                value={ivState.performedAt ? ivState.performedAt.slice(0, 16) : ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setIvState((s) => ({
                    ...s,
                    performedAt: v ? new Date(v).toISOString() : undefined,
                  }));
                }}
                style={{ ...controlBase, maxWidth: 280 }}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
              <span style={{ fontWeight: 600 }}>{t("nursingAssessmentTab.ivShortNote")}</span>
              <textarea
                value={ivState.note ?? ""}
                onChange={(e) => setIvState((s) => ({ ...s, note: e.target.value }))}
                rows={2}
                readOnly={formLocked}
                placeholder={t("nursingAssessmentTab.ivNotePlaceholder")}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  ...controlBase,
                  background: formLocked ? "#f8fafc" : "#fff",
                  cursor: formLocked ? "not-allowed" : "text",
                }}
              />
            </label>
          </div>
        ) : null}
      </fieldset>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {sectionDefs.map((sec) => (
          <section
            key={sec.id}
            style={{
              ...shell,
              padding: "16px 18px",
              backgroundColor: "#fafafa",
            }}
          >
            <h4 style={{ margin: "0 0 10px 0", fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{sec.label}</h4>
            {sec.chips.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                {sec.chips.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    disabled={formLocked}
                    onClick={() => appendChip(sec.id, chip)}
                    style={{
                      fontSize: 12,
                      padding: "6px 12px",
                      borderRadius: 9999,
                      border: "1px solid #e2e8f0",
                      background: "#fff",
                      color: "#334155",
                      boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
                      cursor: formLocked ? "not-allowed" : "pointer",
                      opacity: formLocked ? 0.65 : 1,
                    }}
                  >
                    + {chip}
                  </button>
                ))}
              </div>
            ) : null}
            <textarea
              value={state[sec.id]?.text ?? ""}
              onChange={(e) => setSectionText(sec.id, e.target.value)}
              readOnly={formLocked}
              placeholder={
                sec.id === "notesInfirmieresLibres"
                  ? t("nursingAssessmentTab.placeholderTransmission")
                  : t("nursingAssessmentTab.placeholderComplement")
              }
              rows={sec.id === "notesInfirmieresLibres" ? 5 : 3}
              style={{
                width: "100%",
                boxSizing: "border-box",
                ...controlBase,
                padding: "10px 12px",
                background: formLocked ? "#f8fafc" : "#fff",
                cursor: formLocked ? "not-allowed" : "text",
              }}
            />
          </section>
        ))}
      </div>
      <div
        style={{
          ...shell,
          padding: "14px 18px",
          display: "flex",
          gap: 14,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          disabled={saving || formLocked}
          onClick={() => void save()}
          style={{
            padding: "10px 20px",
            backgroundColor: "#15803d",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            fontWeight: 600,
            fontSize: 14,
            cursor: saving || formLocked ? "not-allowed" : "pointer",
            opacity: formLocked ? 0.65 : 1,
            boxShadow: "0 1px 2px rgba(15, 23, 42, 0.08)",
          }}
        >
          {saving ? t("nursingAssessmentTab.saving") : t("nursingAssessmentTab.save")}
        </button>
        {ok && !error && (
          <span style={{ color: "#15803d", fontSize: 14 }}>{t("nursingAssessmentTab.savedOk")}</span>
        )}
      </div>
      {queuedLocalSave && !error ? (
        <div
          role="alert"
          style={{
            padding: "14px 16px",
            borderRadius: 12,
            border: "1px solid #fecaca",
            backgroundColor: "#fef2f2",
            fontSize: 13,
            fontWeight: 600,
            color: "#b91c1c",
            lineHeight: 1.5,
            maxWidth: 560,
          }}
        >
          {t("nursingAssessmentTab.queuedBanner")}
        </div>
      ) : null}
      {error && (
        <p style={{ color: "#b91c1c", margin: 0, fontSize: 14, lineHeight: 1.45 }} role="alert">
          {error}
        </p>
      )}

      <ErHandoffV1NursingSection
        encounter={encounter}
        encounterId={encounterId}
        facilityId={facilityId}
        isLocked={formLocked}
        canEditErHandoff={canEditErInpatientHandoff}
        onUpdated={onUpdate}
        onSaved={onHandoffSaved}
      />
    </div>
  );
}
