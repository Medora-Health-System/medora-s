"use client";

/**
 * ED.HOSP.1F — Nursing documentation composer + handoff completion.
 * Signed notes persist as EncounterNote (NURSING). Drafts are unsigned JSON.
 */

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  ED_NURSING_CHIP_STATEMENTS,
  ED_NURSING_HANDOFF_METHODS,
  ED_NURSING_STATEMENTS_FOR_TEMPLATE,
  applyEdNursingTemplateToDraft,
  appendEdNursingSignedMeta,
  canAmendEncounterNote,
  canCompleteEdNursingHandoff,
  canVoidEncounterNote,
  composeEdNursingNarrative,
  composeEdNursingSignedBody,
  edNursingDefaultTemplates,
  edNursingHandoffApplies,
  edNursingHandoffStatusFromErHandoff,
  edNursingStatementBody,
  emptyEdNursingDraft,
  encodeReceivingNurse,
  decodeReceivingNurse,
  findEdNursingDraft,
  findEdNursingSignedMeta,
  insertEdNursingStatement,
  isEdNursingLateEntry,
  mergeAdaptiveEdNursingIntoNursingAssessment,
  mergeEdNursingDocumentationV1,
  mergeErHandoffV1IntoNursingAssessment,
  patchEdNursingSignedMeta,
  projectEdHandoffChartFacts,
  readAdaptiveEdNursingExecution,
  readEdNursingDocumentationV1,
  readErHandoffV1FromNursingAssessment,
  removeEdNursingDraft,
  removeEdNursingStatement,
  upsertEdNursingDraft,
  type EdNursingDraft,
  type EdNursingHandoffMethod,
  type EdNursingLocale,
  type EdNursingNoteKind,
  type EdNursingPathway,
  type EdNursingStatementId,
  type EdNursingTemplateId,
  type EncounterNoteVoidReasonCode,
} from "@medora/shared";
import {
  ClinicalUserRoleAutocomplete,
  formatClinicalUserRoleLabel,
} from "@/components/clinical/ClinicalUserRoleAutocomplete";
import { MEDORA_CARD_SHELL } from "@/components/medora-card";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { apiFetch } from "@/lib/apiClient";
import {
  amendEncounterNote,
  createEncounterNote,
  fetchEncounterNotes,
  voidEncounterNote,
  type EncounterNoteRow,
} from "@/lib/encounterNotesApi";
import { formatEncounterChromeDateTime } from "@/lib/encounterChromeI18n";
import { useI18n } from "@/lib/i18n";
import { normalizeUserFacingError } from "@/lib/userFacingError";

const inputBase: CSSProperties = {
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  fontSize: 13,
  boxSizing: "border-box",
};

const labelStyle: CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "#475569",
  marginBottom: 4,
};

const btn: CSSProperties = {
  padding: "7px 12px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "#fff",
  fontWeight: 600,
  fontSize: 12,
  cursor: "pointer",
};

function isoToDatetimeLocal(iso: string): string {
  if (!iso.trim()) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function hydrateHandoffReceiverFromCanonical(
  draft: EdNursingDraft,
  nursingAssessment: unknown
): EdNursingDraft {
  if (draft.kind !== "HANDOFF") return draft;
  const existing = draft.handoff;
  if (existing?.receivingKind === "EXTERNAL" && existing.receivingNurseName?.trim()) return draft;
  if (existing?.receivingNurseUserId || existing?.receivingNurseName?.trim()) return draft;
  const erHandoff = readErHandoffV1FromNursingAssessment(nursingAssessment);
  if (erHandoff.receivingKind === "EXTERNAL" && erHandoff.receivingNurseName) {
    return {
      ...draft,
      handoff: {
        receivingKind: "EXTERNAL",
        receivingNurseName: erHandoff.receivingNurseName,
        receivingFacilityName: erHandoff.receivingFacilityName,
        receivingUnit: erHandoff.receivingUnit,
        receivingPhone: erHandoff.receivingPhone,
        receivingRole: erHandoff.receivingRole,
        method: erHandoff.handoffMethod as EdNursingHandoffMethod | undefined,
        methodOther: erHandoff.handoffMethodOther,
      },
    };
  }
  if (erHandoff.receivingNurseName || erHandoff.receivingNurseUserId) {
    return {
      ...draft,
      handoff: {
        receivingKind: "INTERNAL",
        receivingNurseName: erHandoff.receivingNurseName ?? "",
        receivingNurseUserId: erHandoff.receivingNurseUserId,
        receivingRole: erHandoff.receivingRole,
        receivingUnit: erHandoff.receivingUnit,
        method: erHandoff.handoffMethod as EdNursingHandoffMethod | undefined,
        methodOther: erHandoff.handoffMethodOther,
      },
    };
  }
  const adaptive = readAdaptiveEdNursingExecution(nursingAssessment);
  const decoded = decodeReceivingNurse(String(adaptive?.sections?.receivingNurse ?? ""));
  if (!decoded?.displayName && !decoded?.userId) return draft;
  return {
    ...draft,
    handoff: {
      receivingKind: "INTERNAL",
      receivingNurseName: decoded.displayName,
      receivingNurseUserId: decoded.userId || undefined,
    },
  };
}

async function fetchActorDisplayName(fallback: string): Promise<string> {
  try {
    const me = await apiFetch("/auth/me");
    if (me && typeof me === "object" && !Array.isArray(me)) {
      const fn = (me as { fullName?: string }).fullName?.trim();
      if (fn) return fn;
    }
  } catch {
    /* fallback */
  }
  return fallback;
}

export function EdNursingDocumentationComposer({
  encounterId,
  facilityId,
  encounter,
  pathway,
  canEdit,
  onSaved,
  startKind = null,
}: {
  encounterId: string;
  facilityId: string;
  encounter: {
    nursingAssessment?: unknown;
    status?: string | null;
    chiefComplaint?: string | null;
    visitReason?: string | null;
    patient?: { firstName?: string | null; lastName?: string | null; mrn?: string | null } | null;
    physicianAssigned?: { firstName?: string | null; lastName?: string | null } | null;
  };
  pathway?: string | null;
  canEdit: boolean;
  onSaved: () => void | Promise<void>;
  startKind?: EdNursingNoteKind | null;
}) {
  const { t, language } = useI18n();
  const { userId, roles } = useFacilityAndRoles();
  const locale: EdNursingLocale = language === "en" ? "en" : "fr";
  const isRn = roles.includes("RN");
  const canAuthor = canEdit && isRn && (encounter.status ?? "").trim() === "OPEN";
  const nursingPath = (String(pathway ?? "GENERAL").toUpperCase() || "GENERAL") as EdNursingPathway;
  const handoffApplies = edNursingHandoffApplies(nursingPath);

  const store = useMemo(
    () => readEdNursingDocumentationV1(encounter.nursingAssessment),
    [encounter.nursingAssessment]
  );
  const erHandoff = useMemo(
    () => readErHandoffV1FromNursingAssessment(encounter.nursingAssessment),
    [encounter.nursingAssessment]
  );
  const handoffStatus = edNursingHandoffStatusFromErHandoff(erHandoff);

  const [draft, setDraft] = useState<EdNursingDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [notes, setNotes] = useState<EncounterNoteRow[]>([]);
  const [voidTarget, setVoidTarget] = useState<EncounterNoteRow | null>(null);
  const [voidReason, setVoidReason] = useState<EncounterNoteVoidReasonCode>("ENTERED_IN_ERROR");
  const [voidOther, setVoidOther] = useState("");
  const [amendTarget, setAmendTarget] = useState<EncounterNoteRow | null>(null);
  const [amendBody, setAmendBody] = useState("");
  const [amendReason, setAmendReason] = useState("");

  const loadNotes = useCallback(async () => {
    try {
      const payload = await fetchEncounterNotes(encounterId, facilityId, "NURSING");
      setNotes(payload.notes);
    } catch {
      setNotes([]);
    }
  }, [encounterId, facilityId]);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  useEffect(() => {
    if (!startKind || !canAuthor || !userId) return;
    const existing = findEdNursingDraft(store, startKind === "HANDOFF" ? "handoff" : "nursing");
    const next =
      existing ??
      emptyEdNursingDraft({
        kind: startKind,
        authorUserId: userId,
      });
    setDraft(hydrateHandoffReceiverFromCanonical(next, encounter.nursingAssessment));
  }, [startKind, canAuthor, userId, store, encounter.nursingAssessment]);

  const openDraft = (kind: EdNursingNoteKind) => {
    if (!canAuthor || !userId) return;
    const existing = findEdNursingDraft(store, kind === "HANDOFF" ? "handoff" : "nursing");
    const next = existing ?? emptyEdNursingDraft({ kind, authorUserId: userId });
    setDraft(hydrateHandoffReceiverFromCanonical(next, encounter.nursingAssessment));
    setInfo(null);
  };

  const templates = draft
    ? edNursingDefaultTemplates(draft.kind, nursingPath)
    : edNursingDefaultTemplates("NURSING", nursingPath);

  const statementPool: EdNursingStatementId[] = useMemo(() => {
    if (!draft) return ED_NURSING_CHIP_STATEMENTS;
    const fromTemplate = draft.templateId ? ED_NURSING_STATEMENTS_FOR_TEMPLATE[draft.templateId] : [];
    const merged = [...fromTemplate];
    for (const id of ED_NURSING_CHIP_STATEMENTS) {
      if (!merged.includes(id)) merged.push(id);
    }
    return merged;
  }, [draft]);

  const chartFacts = useMemo(() => {
    const patientName = [encounter.patient?.lastName, encounter.patient?.firstName]
      .filter(Boolean)
      .join(" ");
    const providerName = [encounter.physicianAssigned?.firstName, encounter.physicianAssigned?.lastName]
      .filter(Boolean)
      .join(" ");
    const adaptive = readAdaptiveEdNursingExecution(encounter.nursingAssessment);
    return projectEdHandoffChartFacts({
      patient: patientName,
      mrn: encounter.patient?.mrn,
      disposition: nursingPath !== "GENERAL" ? nursingPath : null,
      destination: String(adaptive?.sections?.receivingUnit ?? "").trim() || erHandoff.receivingUnit,
      admittingProvider: providerName,
      chiefComplaint: encounter.chiefComplaint || encounter.visitReason,
      oxygen: String(adaptive?.sections?.oxygen ?? "").trim() || null,
      ivAccess: String(adaptive?.sections?.ivAccess ?? "").trim() || null,
      fallRisk: String(adaptive?.sections?.fallRisk ?? "").trim() || null,
      belongings: String(adaptive?.sections?.belongingsValuables ?? "").trim() || null,
      currentCondition: String(adaptive?.sections?.conditionLeavingEd ?? "").trim() || null,
      documentedInfusions: String(adaptive?.sections?.infusions ?? "").trim() || null,
    });
  }, [encounter, nursingPath, erHandoff.receivingUnit]);

  const preview = draft
    ? composeEdNursingNarrative({
        templateBody: draft.templateBody,
        statementIds: draft.statementIds,
        statementBodies: draft.statementBodies,
        freeText: draft.freeText,
        locale,
      })
    : "";

  const persistStore = async (nextStore: ReturnType<typeof readEdNursingDocumentationV1>, extraHandoff?: Parameters<typeof mergeErHandoffV1IntoNursingAssessment>[1]) => {
    let na = mergeEdNursingDocumentationV1(encounter.nursingAssessment, nextStore);
    if (extraHandoff) {
      na = mergeErHandoffV1IntoNursingAssessment(na, extraHandoff);
      if (
        extraHandoff.receivingKind !== "EXTERNAL" &&
        extraHandoff.receivingNurseName &&
        (nursingPath === "OBSERVATION" || nursingPath === "ADMISSION" || nursingPath === "TRANSFER")
      ) {
        const adaptive = readAdaptiveEdNursingExecution(na);
        if (adaptive) {
          na = mergeAdaptiveEdNursingIntoNursingAssessment(na, {
            ...adaptive,
            sections: {
              ...(adaptive.sections ?? {}),
              receivingNurse: encodeReceivingNurse({
                source: "HANDOFF",
                userId: extraHandoff.receivingNurseUserId,
                displayName: extraHandoff.receivingNurseName,
              }),
            },
          });
        }
      }
    }
    await apiFetch(`/encounters/${encounterId}`, {
      method: "PATCH",
      facilityId,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nursingAssessment: na }),
    });
  };

  const saveDraft = async () => {
    if (!draft || !canAuthor) return;
    setSaving(true);
    setInfo(null);
    try {
      const nextDraft = { ...draft, savedAt: new Date().toISOString() };
      let nextStore = upsertEdNursingDraft(store, nextDraft);
      let extraHandoff = erHandoff;
      if (draft.kind === "HANDOFF") {
        extraHandoff = {
          ...erHandoff,
          handoffStatus: "IN_PROGRESS",
          receivingNurseName: draft.handoff?.receivingNurseName,
          receivingNurseUserId: draft.handoff?.receivingKind === "INTERNAL" ? draft.handoff.receivingNurseUserId : undefined,
          receivingFacilityName: draft.handoff?.receivingFacilityName,
          receivingUnit: draft.handoff?.receivingUnit,
          receivingPhone: draft.handoff?.receivingPhone,
          receivingRole: draft.handoff?.receivingRole,
          receivingKind: draft.handoff?.receivingKind,
          handoffMethod: draft.handoff?.method,
          handoffMethodOther: draft.handoff?.methodOther,
          handoffNote: preview || undefined,
          reportGivenAt: draft.eventAt,
        };
      }
      await persistStore(nextStore, extraHandoff);
      setDraft(nextDraft);
      setInfo(t("edHosp1fNursingDocumentation.saveDraftOk"));
      await onSaved();
    } catch (e) {
      setInfo(
        normalizeUserFacingError(e instanceof Error ? e.message : null, language) ||
          t("edHosp1fNursingDocumentation.saveFailed")
      );
    } finally {
      setSaving(false);
    }
  };

  const signNote = async () => {
    if (!draft || !canAuthor || !userId) return;
    const narrative = preview.trim();
    if (!narrative) return;
    if (draft.kind === "HANDOFF") {
      const gate = canCompleteEdNursingHandoff(draft.handoff);
      if (!gate.ok) {
        setInfo(
          draft.handoff?.receivingKind === "EXTERNAL"
            ? t("edHosp1fNursingDocumentation.handoffExternalIncomplete")
            : t("edHosp1fNursingDocumentation.handoffIncomplete")
        );
        return;
      }
    }
    setSaving(true);
    setInfo(null);
    try {
      const signedAt = new Date().toISOString();
      const body = composeEdNursingSignedBody({ narrative, eventAt: draft.eventAt, locale });
      const created = await createEncounterNote(encounterId, facilityId, {
        noteType: "NURSING",
        body,
      });
      const actorName = await fetchActorDisplayName(t("emergencyAdaptiveNursing.completedByNurse"));
      let nextStore = removeEdNursingDraft(store, draft.draftId);
      nextStore = appendEdNursingSignedMeta(nextStore, {
        noteId: created.id,
        kind: draft.kind,
        templateId: draft.templateId,
        eventAt: draft.eventAt,
        enteredAt: created.createdAt,
        signedAt: created.createdAt || signedAt,
        authorUserId: userId,
      });
      let extraHandoff = erHandoff;
      if (draft.kind === "HANDOFF" && draft.handoff) {
        extraHandoff = {
          ...erHandoff,
          reportGiven: true,
          reportGivenAt: draft.eventAt,
          receivingNurseName: draft.handoff.receivingNurseName,
          receivingNurseUserId:
            draft.handoff.receivingKind === "INTERNAL" ? draft.handoff.receivingNurseUserId : undefined,
          receivingFacilityName: draft.handoff.receivingFacilityName,
          receivingUnit: draft.handoff.receivingUnit,
          receivingPhone: draft.handoff.receivingPhone,
          receivingRole: draft.handoff.receivingRole,
          receivingKind: draft.handoff.receivingKind,
          handoffMethod: draft.handoff.method,
          handoffMethodOther: draft.handoff.methodOther,
          handoffNote: narrative.slice(0, 2000),
          documentationNoteId: created.id,
          handoffStatus: "COMPLETED",
          careTransferred: true,
          electronicSignatureName: actorName,
          electronicSignatureAt: created.createdAt,
          handoffLastSavedAt: signedAt,
          handoffLastSavedByDisplayName: actorName,
        };
      }
      let na = mergeEdNursingDocumentationV1(encounter.nursingAssessment, nextStore);
      if (draft.kind === "HANDOFF") {
        na = mergeErHandoffV1IntoNursingAssessment(na, extraHandoff);
        const adaptive = readAdaptiveEdNursingExecution(na);
        if (adaptive && (nursingPath === "OBSERVATION" || nursingPath === "ADMISSION")) {
          const sections: Record<string, string | boolean | null | undefined> = {
            ...(adaptive.sections ?? {}),
            handoff: "HANDOFF_REVIEWED",
          };
          if (draft.handoff?.receivingKind === "INTERNAL" && draft.handoff.receivingNurseName) {
            sections.receivingNurse = encodeReceivingNurse({
              source: "HANDOFF",
              userId: draft.handoff.receivingNurseUserId,
              displayName: draft.handoff.receivingNurseName,
            });
          }
          na = mergeAdaptiveEdNursingIntoNursingAssessment(na, { ...adaptive, sections });
        }
      }
      await apiFetch(`/encounters/${encounterId}`, {
        method: "PATCH",
        facilityId,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nursingAssessment: na }),
      });
      setDraft(null);
      setInfo(t("edHosp1fNursingDocumentation.signOk"));
      await loadNotes();
      await onSaved();
    } catch (e) {
      setInfo(
        normalizeUserFacingError(e instanceof Error ? e.message : null, language) ||
          t("edHosp1fNursingDocumentation.signFailed")
      );
    } finally {
      setSaving(false);
    }
  };

  const confirmVoid = async () => {
    if (!voidTarget || !canAuthor) return;
    if (voidReason === "OTHER" && !voidOther.trim()) return;
    setSaving(true);
    try {
      await voidEncounterNote(encounterId, voidTarget.id, facilityId, {
        voidReasonCode: voidReason,
        voidReasonText: voidReason === "OTHER" ? voidOther.trim() : undefined,
      });
      const actorName = await fetchActorDisplayName(t("emergencyAdaptiveNursing.completedByNurse"));
      const nextStore = patchEdNursingSignedMeta(store, voidTarget.id, {
        canceledByDisplayName: actorName,
        voidReasonText: voidReason === "OTHER" ? voidOther.trim() : undefined,
      });
      await persistStore(nextStore);
      setVoidTarget(null);
      setVoidOther("");
      setInfo(t("edHosp1fNursingDocumentation.cancelOk"));
      await loadNotes();
      await onSaved();
    } catch (e) {
      setInfo(
        normalizeUserFacingError(e instanceof Error ? e.message : null, language) ||
          t("edHosp1fNursingDocumentation.saveFailed")
      );
    } finally {
      setSaving(false);
    }
  };

  const confirmAmend = async () => {
    if (!amendTarget || !amendBody.trim() || !amendReason.trim()) return;
    setSaving(true);
    try {
      await amendEncounterNote(encounterId, amendTarget.id, facilityId, {
        body: amendBody.trim(),
        amendmentReason: amendReason.trim(),
      });
      setAmendTarget(null);
      setAmendBody("");
      setAmendReason("");
      setInfo(t("edHosp1fNursingDocumentation.amendOk"));
      await loadNotes();
      await onSaved();
    } catch (e) {
      setInfo(
        normalizeUserFacingError(e instanceof Error ? e.message : null, language) ||
          t("edHosp1fNursingDocumentation.saveFailed")
      );
    } finally {
      setSaving(false);
    }
  };

  const patchHandoff = (patch: Partial<NonNullable<EdNursingDraft["handoff"]>>) => {
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            handoff: {
              receivingKind: "INTERNAL",
              receivingNurseName: "",
              ...prev.handoff,
              ...patch,
            },
          }
        : prev
    );
  };

  return (
    <div
      data-testid="ed-nursing-documentation-composer"
      style={{ ...MEDORA_CARD_SHELL, padding: 14, minWidth: 0, maxWidth: "100%", overflow: "visible" }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 10 }}>
        <strong style={{ fontSize: 14 }}>{t("edHosp1fNursingDocumentation.title")}</strong>
        {handoffApplies ? (
          <span
            data-testid="ed-nursing-handoff-status"
            style={{ fontSize: 12, fontWeight: 700, color: handoffStatus === "COMPLETED" ? "#166534" : "#334155" }}
          >
            {t(`edHosp1fNursingDocumentation.handoffStatus.${handoffStatus}`)}
          </span>
        ) : (
          <span style={{ fontSize: 12, color: "#64748b" }}>{t("edHosp1fNursingDocumentation.notApplicable")}</span>
        )}
      </div>
      {canAuthor ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          <button type="button" data-testid="ed-nursing-add-note" style={btn} onClick={() => openDraft("NURSING")}>
            {t("edHosp1fNursingDocumentation.addNursingNote")}
          </button>
          {handoffApplies ? (
            <button
              type="button"
              data-testid="ed-nursing-start-handoff"
              style={{
                ...btn,
                border: "1px solid #1d4ed8",
                background: handoffStatus === "COMPLETED" ? "#eff6ff" : "#1d4ed8",
                color: handoffStatus === "COMPLETED" ? "#1e3a8a" : "#fff",
              }}
              onClick={() => openDraft("HANDOFF")}
            >
              {handoffStatus === "NOT_STARTED"
                ? t("edHosp1fNursingDocumentation.startHandoff")
                : handoffStatus === "COMPLETED"
                  ? t("edHosp1fNursingDocumentation.addHandoffNote")
                  : t("edHosp1fNursingDocumentation.openHandoff")}
            </button>
          ) : null}
        </div>
      ) : null}

      {draft ? (
        <div data-testid="ed-nursing-composer-form" style={{ display: "grid", gap: 10, minWidth: 0 }}>
          <div>
            <label style={labelStyle}>{t("edHosp1fNursingDocumentation.template")}</label>
            <select
              data-testid="ed-nursing-template-select"
              value={draft.templateId ?? ""}
              disabled={saving}
              onChange={(e) => {
                const id = e.target.value as EdNursingTemplateId | "";
                if (!id) {
                  setDraft({ ...draft, templateId: undefined, templateBody: "" });
                  return;
                }
                setDraft(applyEdNursingTemplateToDraft(draft, id, locale));
              }}
              style={inputBase}
            >
              <option value="">{t("edHosp1fNursingDocumentation.noTemplate")}</option>
              {templates.map((id) => (
                <option key={id} value={id}>
                  {t(`edHosp1fNursingDocumentation.templates.${id}`)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>{t("edHosp1fNursingDocumentation.template")}</label>
            <textarea
              data-testid="ed-nursing-template-body"
              rows={4}
              value={draft.templateBody}
              disabled={saving}
              onChange={(e) => setDraft({ ...draft, templateBody: e.target.value })}
              style={{ ...inputBase, resize: "vertical" }}
            />
          </div>
          <div>
            <div style={labelStyle}>{t("edHosp1fNursingDocumentation.quickStatements")}</div>
            <div
              data-testid="ed-nursing-quick-statements"
              style={{ display: "flex", flexWrap: "wrap", gap: 6 }}
            >
              {statementPool.map((id) => {
                const selected = draft.statementIds.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    disabled={saving}
                    data-testid={`ed-nursing-chip-${id}`}
                    onClick={() =>
                      setDraft({
                        ...draft,
                        statementIds: selected
                          ? removeEdNursingStatement(draft.statementIds, id)
                          : insertEdNursingStatement(draft.statementIds, id),
                      })
                    }
                    style={{
                      ...btn,
                      background: selected ? "#eff6ff" : "#fff",
                      borderColor: selected ? "#1d4ed8" : "#cbd5e1",
                    }}
                  >
                    {t(`edHosp1fNursingDocumentation.chips.${id}`)}
                  </button>
                );
              })}
            </div>
            {draft.statementIds.map((id) => (
              <div key={id} style={{ marginTop: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>
                    {t(`edHosp1fNursingDocumentation.chips.${id}`)}
                  </span>
                  <button
                    type="button"
                    aria-label={t("edHosp1fNursingDocumentation.removeStatement")}
                    data-testid={`ed-nursing-remove-${id}`}
                    onClick={() =>
                      setDraft({ ...draft, statementIds: removeEdNursingStatement(draft.statementIds, id) })
                    }
                    style={{ ...btn, padding: "2px 8px" }}
                  >
                    ×
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={draft.statementBodies[id] ?? edNursingStatementBody(id, locale)}
                  disabled={saving}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      statementBodies: { ...draft.statementBodies, [id]: e.target.value },
                    })
                  }
                  style={{ ...inputBase, resize: "vertical" }}
                />
              </div>
            ))}
          </div>
          <div>
            <label style={labelStyle}>{t("edHosp1fNursingDocumentation.freeNote")}</label>
            <textarea
              data-testid="ed-nursing-free-note"
              rows={4}
              value={draft.freeText}
              disabled={saving}
              onChange={(e) => setDraft({ ...draft, freeText: e.target.value })}
              style={{ ...inputBase, resize: "vertical" }}
            />
          </div>
          <div>
            <label style={labelStyle}>{t("edHosp1fNursingDocumentation.eventTime")}</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <input
                type="datetime-local"
                data-testid="ed-nursing-event-time"
                value={isoToDatetimeLocal(draft.eventAt)}
                disabled={saving}
                onChange={(e) => {
                  const v = e.target.value;
                  setDraft({ ...draft, eventAt: v ? new Date(v).toISOString() : draft.eventAt });
                }}
                style={{ ...inputBase, maxWidth: 240 }}
              />
              <button
                type="button"
                data-testid="ed-nursing-event-now"
                disabled={saving}
                onClick={() => setDraft({ ...draft, eventAt: new Date().toISOString() })}
                style={btn}
              >
                {t("edHosp1fNursingDocumentation.useCurrentTime")}
              </button>
            </div>
          </div>

          {draft.kind === "HANDOFF" ? (
            <div data-testid="ed-nursing-handoff-fields" style={{ display: "grid", gap: 8 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <button
                  type="button"
                  data-testid="ed-nursing-receiving-internal"
                  onClick={() => patchHandoff({ receivingKind: "INTERNAL" })}
                  style={{
                    ...btn,
                    background: draft.handoff?.receivingKind !== "EXTERNAL" ? "#eff6ff" : "#fff",
                  }}
                >
                  {t("edHosp1fNursingDocumentation.internalReceivingNurse")}
                </button>
                <button
                  type="button"
                  data-testid="ed-nursing-receiving-external"
                  onClick={() =>
                    patchHandoff({ receivingKind: "EXTERNAL", receivingNurseUserId: undefined })
                  }
                  style={{
                    ...btn,
                    background: draft.handoff?.receivingKind === "EXTERNAL" ? "#eff6ff" : "#fff",
                  }}
                >
                  {t("edHosp1fNursingDocumentation.externalReceivingNurse")}
                </button>
              </div>
              {draft.handoff?.receivingKind === "EXTERNAL" ? (
                <div data-testid="ed-nursing-external-receiving" style={{ display: "grid", gap: 8 }}>
                  <div>
                    <label style={labelStyle}>{t("edHosp1fNursingDocumentation.receivingNurseName")} *</label>
                    <input
                      data-testid="ed-nursing-external-name"
                      value={draft.handoff.receivingNurseName}
                      onChange={(e) => patchHandoff({ receivingNurseName: e.target.value })}
                      style={inputBase}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>{t("edHosp1fNursingDocumentation.receivingFacility")} *</label>
                    <input
                      data-testid="ed-nursing-external-facility"
                      value={draft.handoff.receivingFacilityName ?? ""}
                      onChange={(e) => patchHandoff({ receivingFacilityName: e.target.value })}
                      style={inputBase}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>{t("edHosp1fNursingDocumentation.receivingUnit")}</label>
                    <input
                      data-testid="ed-nursing-external-unit"
                      value={draft.handoff.receivingUnit ?? ""}
                      onChange={(e) => patchHandoff({ receivingUnit: e.target.value })}
                      style={inputBase}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>{t("edHosp1fNursingDocumentation.receivingPhone")}</label>
                    <input
                      value={draft.handoff.receivingPhone ?? ""}
                      onChange={(e) => patchHandoff({ receivingPhone: e.target.value })}
                      style={inputBase}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>{t("edHosp1fNursingDocumentation.receivingRole")}</label>
                    <input
                      value={draft.handoff.receivingRole ?? ""}
                      onChange={(e) => patchHandoff({ receivingRole: e.target.value })}
                      style={inputBase}
                    />
                  </div>
                </div>
              ) : (
                <div data-testid="ed-nursing-internal-receiving-search">
                  <label style={labelStyle}>{t("edHosp1fNursingDocumentation.receivingNurse")} *</label>
                  <ClinicalUserRoleAutocomplete
                    facilityId={facilityId}
                    role="RN"
                    disabled={saving}
                    placeholder={t("edHosp1fNursingDocumentation.searchInternalStaff")}
                    ariaLabel={t("edHosp1fNursingDocumentation.searchInternalStaff")}
                    displayValue={draft.handoff?.receivingNurseName ?? ""}
                    onChangeDisplay={(value) =>
                      patchHandoff({ receivingNurseName: value, receivingNurseUserId: undefined })
                    }
                    selectedUserId={draft.handoff?.receivingNurseUserId ?? null}
                    onSelectUser={(user) =>
                      patchHandoff({
                        receivingNurseUserId: user?.id,
                        receivingNurseName: user ? formatClinicalUserRoleLabel(user) : "",
                        receivingRole: user?.credentials,
                      })
                    }
                  />
                </div>
              )}
              <div>
                <label style={labelStyle}>{t("edHosp1fNursingDocumentation.handoffMethod")} *</label>
                <select
                  data-testid="ed-nursing-handoff-method"
                  value={draft.handoff?.method ?? ""}
                  onChange={(e) =>
                    patchHandoff({ method: (e.target.value || undefined) as EdNursingHandoffMethod | undefined })
                  }
                  style={inputBase}
                >
                  <option value="">{t("edHosp1fNursingDocumentation.chooseTemplate")}</option>
                  {ED_NURSING_HANDOFF_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {t(`edHosp1fNursingDocumentation.methods.${m}`)}
                    </option>
                  ))}
                </select>
                {draft.handoff?.method === "OTHER" ? (
                  <input
                    value={draft.handoff.methodOther ?? ""}
                    onChange={(e) => patchHandoff({ methodOther: e.target.value })}
                    style={{ ...inputBase, marginTop: 6 }}
                    placeholder={t("edHosp1fNursingDocumentation.methodOther")}
                  />
                ) : null}
              </div>
              <div data-testid="ed-nursing-chart-summary" style={{ fontSize: 12, border: "1px solid #e2e8f0", borderRadius: 10, padding: 8 }}>
                <strong>{t("edHosp1fNursingDocumentation.chartSummary")}</strong>
                {Object.entries(chartFacts).map(([k, v]) => {
                  if (v == null || (Array.isArray(v) && v.length === 0)) return null;
                  const value = Array.isArray(v) ? v.join(", ") : String(v);
                  return (
                    <div key={k}>
                      <strong>{t(`edHosp1fNursingDocumentation.facts.${k}` as Parameters<typeof t>[0])}: </strong>
                      {value || t("edHosp1fNursingDocumentation.noneDocumented")}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div>
            <div style={labelStyle}>{t("edHosp1fNursingDocumentation.preview")}</div>
            <pre
              data-testid="ed-nursing-preview"
              style={{
                ...inputBase,
                whiteSpace: "pre-wrap",
                background: "#f8fafc",
                minHeight: 64,
                fontFamily: "inherit",
              }}
            >
              {preview || "—"}
            </pre>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button type="button" disabled={saving} onClick={() => void saveDraft()} style={btn} data-testid="ed-nursing-save-draft">
              {t("edHosp1fNursingDocumentation.saveDraft")}
            </button>
            <button
              type="button"
              disabled={saving || !preview.trim()}
              onClick={() => void signNote()}
              data-testid="ed-nursing-sign"
              style={{ ...btn, background: "#1d4ed8", color: "#fff", borderColor: "#1d4ed8" }}
            >
              {draft.kind === "HANDOFF"
                ? t("edHosp1fNursingDocumentation.completeHandoff")
                : t("edHosp1fNursingDocumentation.signNote")}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                if (typeof window !== "undefined" && !window.confirm(t("edHosp1fNursingDocumentation.discardDraftConfirm"))) {
                  return;
                }
                setDraft(null);
              }}
              style={btn}
            >
              {t("edHosp1fNursingDocumentation.cancelDraft")}
            </button>
          </div>
        </div>
      ) : null}

      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>{t("edHosp1fNursingDocumentation.signedNotes")}</div>
        {notes.length === 0 ? (
          <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>{t("edHosp1fNursingDocumentation.emptyNotes")}</p>
        ) : (
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
            {notes.map((note) => {
              const meta = findEdNursingSignedMeta(store, note.id);
              const canceled = Boolean(note.voidedAt);
              const late = isEdNursingLateEntry(meta?.eventAt, note.createdAt);
              const showVoid = canAuthor && canVoidEncounterNote(note, roles, userId || undefined);
              const showAmend = canAuthor && canAmendEncounterNote(note, userId || undefined);
              return (
                <li
                  key={note.id}
                  data-testid="ed-nursing-note-card"
                  data-voided={canceled ? "true" : undefined}
                  style={{
                    border: `1px solid ${canceled ? "#fecaca" : "#e2e8f0"}`,
                    borderRadius: 10,
                    padding: 10,
                    background: canceled ? "#fef2f2" : "#fff",
                    minWidth: 0,
                  }}
                >
                  {canceled ? (
                    <div
                      data-testid="ed-nursing-canceled-bar"
                      style={{
                        background: "#991b1b",
                        color: "#fff",
                        borderRadius: 8,
                        padding: "6px 8px",
                        fontSize: 12,
                        fontWeight: 700,
                        marginBottom: 8,
                      }}
                    >
                      {note.voidReasonCode === "ENTERED_IN_ERROR"
                        ? `${t("edHosp1fNursingDocumentation.canceledBar")} — ${t("edHosp1fNursingDocumentation.enteredInError")}`
                        : t("edHosp1fNursingDocumentation.canceledBar")}
                      <div style={{ fontWeight: 500, marginTop: 4 }}>
                        {t("edHosp1fNursingDocumentation.canceledBy").replace(
                          "{name}",
                          meta?.canceledByDisplayName || note.authorDisplayName
                        )}
                        {note.voidedAt ? ` · ${formatEncounterChromeDateTime(note.voidedAt, language)}` : ""}
                      </div>
                      <div style={{ fontWeight: 500 }}>
                        {t("edHosp1fNursingDocumentation.cancelReason")}:{" "}
                        {t(`edHosp1fNursingDocumentation.voidReasons.${note.voidReasonCode ?? "OTHER"}`)}
                        {meta?.voidReasonText ? ` — ${meta.voidReasonText}` : ""}
                      </div>
                    </div>
                  ) : null}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, fontSize: 11, marginBottom: 6 }}>
                    <strong>
                      {meta?.kind === "HANDOFF"
                        ? t("edHosp1fNursingDocumentation.noteTypeHandoff")
                        : t("edHosp1fNursingDocumentation.noteTypeNursing")}
                    </strong>
                    <span>
                      {canceled
                        ? t("edHosp1fNursingDocumentation.statusCanceled")
                        : note.isAmendment
                          ? t("edHosp1fNursingDocumentation.statusAddendum")
                          : t("edHosp1fNursingDocumentation.statusSigned")}
                    </span>
                    {late ? <span>{t("edHosp1fNursingDocumentation.lateEntry")}</span> : null}
                  </div>
                  <div style={{ fontSize: 12, color: "#475569" }}>
                    {t("edHosp1fNursingDocumentation.eventTime")}:{" "}
                    {formatEncounterChromeDateTime(meta?.eventAt ?? note.createdAt, language)}
                  </div>
                  <div style={{ fontSize: 12, color: "#475569" }}>
                    {note.authorDisplayName} · {note.authorRoleTitle}
                  </div>
                  <div style={{ fontSize: 12, color: "#475569" }}>
                    {t("edHosp1fNursingDocumentation.enteredTime")}:{" "}
                    {formatEncounterChromeDateTime(meta?.enteredAt ?? note.createdAt, language)}
                  </div>
                  <div style={{ fontSize: 12, color: "#475569" }}>
                    {t("edHosp1fNursingDocumentation.signedTime")}:{" "}
                    {formatEncounterChromeDateTime(meta?.signedAt ?? note.createdAt, language)}
                  </div>
                  <p style={{ margin: "8px 0 0", fontSize: 13, whiteSpace: "pre-wrap" }}>{note.body}</p>
                  {showVoid || showAmend ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                      {showVoid ? (
                        <button
                          type="button"
                          data-testid="ed-nursing-cancel-note"
                          style={btn}
                          onClick={() => setVoidTarget(note)}
                        >
                          {t("edHosp1fNursingDocumentation.cancelNote")}
                        </button>
                      ) : null}
                      {showAmend ? (
                        <button type="button" style={btn} onClick={() => setAmendTarget(note)}>
                          {t("edHosp1fNursingDocumentation.addAddendum")}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {voidTarget ? (
        <div data-testid="ed-nursing-cancel-dialog" style={{ marginTop: 12, border: "1px solid #fecaca", borderRadius: 10, padding: 10 }}>
          <p style={{ margin: "0 0 8px", fontSize: 13 }}>{t("edHosp1fNursingDocumentation.cancelConfirm")}</p>
          <select
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value as EncounterNoteVoidReasonCode)}
            style={inputBase}
          >
            {(["WRONG_PATIENT", "DUPLICATE_ENTRY", "ENTERED_IN_ERROR", "TRAINING_RECORD", "OTHER"] as const).map(
              (code) => (
                <option key={code} value={code}>
                  {t(`edHosp1fNursingDocumentation.voidReasons.${code}`)}
                </option>
              )
            )}
          </select>
          {voidReason === "OTHER" ? (
            <input
              value={voidOther}
              onChange={(e) => setVoidOther(e.target.value)}
              placeholder={t("edHosp1fNursingDocumentation.cancelOther")}
              style={{ ...inputBase, marginTop: 8 }}
            />
          ) : null}
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button type="button" disabled={saving} onClick={() => void confirmVoid()} style={btn}>
              {t("edHosp1fNursingDocumentation.cancelNote")}
            </button>
            <button type="button" onClick={() => setVoidTarget(null)} style={btn}>
              {t("common.cancel")}
            </button>
          </div>
        </div>
      ) : null}

      {amendTarget ? (
        <div style={{ marginTop: 12, border: "1px solid #bfdbfe", borderRadius: 10, padding: 10 }}>
          <textarea
            rows={3}
            value={amendBody}
            onChange={(e) => setAmendBody(e.target.value)}
            placeholder={t("edHosp1fNursingDocumentation.amendmentBody")}
            style={{ ...inputBase, resize: "vertical" }}
          />
          <input
            value={amendReason}
            onChange={(e) => setAmendReason(e.target.value)}
            placeholder={t("edHosp1fNursingDocumentation.amendmentReason")}
            style={{ ...inputBase, marginTop: 8 }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button type="button" disabled={saving} onClick={() => void confirmAmend()} style={btn}>
              {t("edHosp1fNursingDocumentation.addAddendum")}
            </button>
            <button type="button" onClick={() => setAmendTarget(null)} style={btn}>
              {t("common.cancel")}
            </button>
          </div>
        </div>
      ) : null}

      {info ? (
        <p style={{ margin: "10px 0 0", fontSize: 12 }} role="alert">
          {info}
        </p>
      ) : null}
    </div>
  );
}
