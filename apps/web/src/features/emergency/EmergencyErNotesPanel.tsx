"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { EncounterNoteType, EncounterNoteVoidReasonCode } from "@medora/shared";
import {
  canAmendEncounterNote,
  canCosignEncounterNote,
  canVoidEncounterNote,
  defaultEncounterNoteTypeForRole,
  encounterNotePendingCosign,
  encounterNotePreview,
  ENCOUNTER_NOTE_VOID_REASON_CODES,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { formatEncounterChromeDateTime } from "@/lib/encounterChromeI18n";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import {
  amendEncounterNote,
  cosignEncounterNote,
  createEncounterNote,
  fetchEncounterNotes,
  voidEncounterNote,
  type EncounterNoteRow,
} from "@/lib/encounterNotesApi";
import {
  MedoraCard,
  MedoraCardIdentity,
  MedoraCardInner,
  MedoraCardTitle,
} from "@/components/medora-card";

const NOTE_TYPES: EncounterNoteType[] = ["PROVIDER", "NURSING", "TECHNICIAN", "OTHER"];
const REGISTRY_FILTERS = ["ALL", ...NOTE_TYPES] as const;
type RegistryFilter = (typeof REGISTRY_FILTERS)[number];

const layoutGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(280px, 340px)",
  gap: 16,
  alignItems: "start",
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
};

const stackedLayout: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 16,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
};

function useNarrowLayout(): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const apply = () => setNarrow(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return narrow;
}

export function EmergencyErNotesPanel({
  encounterId,
  facilityId,
  status,
  isLocked,
  roleCodes,
  onSaved,
}: {
  encounterId: string;
  facilityId: string;
  status: string | null | undefined;
  isLocked: boolean;
  roleCodes?: readonly string[];
  onSaved: () => void | Promise<void>;
}) {
  const { t, language } = useI18n();
  const { userId } = useFacilityAndRoles();
  const narrow = useNarrowLayout();
  const readOnly = (status ?? "").trim() !== "OPEN" || isLocked;

  const defaultNoteType = useMemo(
    () => defaultEncounterNoteTypeForRole(roleCodes?.[0]),
    [roleCodes]
  );

  const [noteType, setNoteType] = useState<EncounterNoteType>(defaultNoteType);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [registryFilter, setRegistryFilter] = useState<RegistryFilter>("ALL");
  const [notes, setNotes] = useState<EncounterNoteRow[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [actionNoteId, setActionNoteId] = useState<string | null>(null);
  const [actionKind, setActionKind] = useState<"amend" | "void" | null>(null);
  const [amendBody, setAmendBody] = useState("");
  const [amendReason, setAmendReason] = useState("");
  const [voidReasonCode, setVoidReasonCode] = useState<EncounterNoteVoidReasonCode>("ENTERED_IN_ERROR");
  const [actionSaving, setActionSaving] = useState(false);

  useEffect(() => {
    setNoteType(defaultNoteType);
  }, [defaultNoteType]);

  const loadNotes = useCallback(async () => {
    setLoadingNotes(true);
    try {
      const payload = await fetchEncounterNotes(encounterId, facilityId);
      setNotes(payload.notes);
    } catch {
      setNotes([]);
    } finally {
      setLoadingNotes(false);
    }
  }, [encounterId, facilityId]);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  const filteredNotes = useMemo(() => {
    if (registryFilter === "ALL") return notes;
    return notes.filter((n) => n.noteType === registryFilter);
  }, [notes, registryFilter]);

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const resetAction = () => {
    setActionNoteId(null);
    setActionKind(null);
    setAmendBody("");
    setAmendReason("");
    setVoidReasonCode("ENTERED_IN_ERROR");
  };

  const handleAmend = async (noteId: string) => {
    if (!amendBody.trim() || !amendReason.trim()) return;
    setActionSaving(true);
    try {
      await amendEncounterNote(encounterId, noteId, facilityId, {
        body: amendBody.trim(),
        amendmentReason: amendReason.trim(),
      });
      resetAction();
      await loadNotes();
      await Promise.resolve(onSaved());
      alert(t("encounterNotes.amendOk"));
    } catch (e) {
      alert(
        normalizeUserFacingError(e instanceof Error ? e.message : null, language) ||
          t("encounterNotes.amendFailed")
      );
    } finally {
      setActionSaving(false);
    }
  };

  const handleVoid = async (noteId: string) => {
    setActionSaving(true);
    try {
      await voidEncounterNote(encounterId, noteId, facilityId, { voidReasonCode });
      resetAction();
      await loadNotes();
      await Promise.resolve(onSaved());
      alert(t("encounterNotes.voidOk"));
    } catch (e) {
      alert(
        normalizeUserFacingError(e instanceof Error ? e.message : null, language) ||
          t("encounterNotes.voidFailed")
      );
    } finally {
      setActionSaving(false);
    }
  };

  const handleCosign = async (noteId: string) => {
    if (!window.confirm(t("encounterNotes.cosignConfirm"))) return;
    setActionSaving(true);
    try {
      await cosignEncounterNote(encounterId, noteId, facilityId);
      await loadNotes();
      await Promise.resolve(onSaved());
      alert(t("encounterNotes.cosignOk"));
    } catch (e) {
      alert(
        normalizeUserFacingError(e instanceof Error ? e.message : null, language) ||
          t("encounterNotes.cosignFailed")
      );
    } finally {
      setActionSaving(false);
    }
  };

  const badgeStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    padding: "2px 8px",
    borderRadius: 9999,
  };

  const handleSave = async () => {
    if (readOnly || !draft.trim()) return;
    setSaving(true);
    try {
      await createEncounterNote(encounterId, facilityId, {
        noteType,
        body: draft.trim(),
      });
      setDraft("");
      await loadNotes();
      await Promise.resolve(onSaved());
      alert(t("encounterNotes.saveOk"));
    } catch (e) {
      alert(
        normalizeUserFacingError(e instanceof Error ? e.message : null, language) ||
          t("encounterNotes.saveFailed")
      );
    } finally {
      setSaving(false);
    }
  };

  const editor = (
    <div data-testid="encounter-notes-editor">
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#334155" }}>
        {t("encounterNotes.noteTypeLabel")}
      </label>
      <select
        value={noteType}
        disabled={readOnly}
        onChange={(e) => setNoteType(e.target.value as EncounterNoteType)}
        style={{
          width: "100%",
          boxSizing: "border-box",
          marginBottom: 10,
          padding: "8px 10px",
          borderRadius: 10,
          border: "1px solid #e2e8f0",
          fontSize: 14,
        }}
      >
        {NOTE_TYPES.map((type) => (
          <option key={type} value={type}>
            {t(`encounterNotes.noteType.${type}`)}
          </option>
        ))}
      </select>

      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={10}
        readOnly={readOnly}
        placeholder={t("encounterNotes.placeholder")}
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: "12px 14px",
          border: "1px solid #e2e8f0",
          borderRadius: 10,
          marginBottom: 12,
          fontSize: 14,
          color: "#0f172a",
          background: readOnly ? "#f8fafc" : "#fff",
        }}
      />

      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={saving || readOnly || !draft.trim()}
        style={{
          padding: "10px 20px",
          backgroundColor: "#0f172a",
          color: "white",
          border: "none",
          borderRadius: 10,
          fontSize: 14,
          fontWeight: 600,
          cursor: saving || readOnly || !draft.trim() ? "not-allowed" : "pointer",
          opacity: saving || readOnly || !draft.trim() ? 0.6 : 1,
        }}
      >
        {saving ? t("encounterNotes.saving") : t("encounterNotes.save")}
      </button>
    </div>
  );

  const registry = (
    <div
      data-testid="encounter-notes-registry"
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        background: "#f8fafc",
        padding: 12,
        minHeight: 200,
        maxHeight: narrow ? "none" : "70vh",
        overflowY: "auto",
        overflowX: "hidden",
        minWidth: 0,
      }}
    >
      <p style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 600, color: "#0f172a" }}>
        {t("encounterNotes.registryTitle")}
      </p>
      <div
        role="tablist"
        aria-label={t("encounterNotes.registryFilterAria")}
        style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}
      >
        {REGISTRY_FILTERS.map((filter) => {
          const active = registryFilter === filter;
          return (
            <button
              key={filter}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setRegistryFilter(filter)}
              style={{
                padding: "6px 10px",
                fontSize: 12,
                fontWeight: active ? 600 : 500,
                borderRadius: 9999,
                border: active ? "1px solid #64748b" : "1px solid #e2e8f0",
                background: active ? "#e2e8f0" : "#fff",
                cursor: "pointer",
              }}
            >
              {t(`encounterNotes.registryFilter.${filter}`)}
            </button>
          );
        })}
      </div>

      {loadingNotes ? (
        <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{t("encounterNotes.loading")}</p>
      ) : filteredNotes.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{t("encounterNotes.registryEmpty")}</p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          {filteredNotes.map((note) => {
            const expanded = expandedIds.has(note.id);
            const preview = encounterNotePreview(note.body);
            const roles = roleCodes ?? [];
            const showAmend =
              !readOnly &&
              canAmendEncounterNote({ ...note, legacy: note.legacy }, userId || undefined);
            const showVoid = !readOnly && canVoidEncounterNote(note, roles, userId || undefined);
            const showCosign = !readOnly && canCosignEncounterNote(note, roles);
            const pendingCosign = encounterNotePendingCosign(note);
            const isActionTarget = actionNoteId === note.id;
            return (
              <li
                key={note.id}
                data-testid="encounter-note-card"
                data-legacy-readonly={note.legacy ? "true" : undefined}
                data-voided={note.voidedAt ? "true" : undefined}
                data-amendment={note.isAmendment ? "true" : undefined}
                style={{
                  background: note.voidedAt ? "#fef2f2" : "#fff",
                  border: `1px solid ${note.voidedAt ? "#fecaca" : "#e2e8f0"}`,
                  borderRadius: 10,
                  padding: "10px 12px",
                }}
              >
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginBottom: 6 }}>
                  <span style={{ ...badgeStyle, background: "#f1f5f9", color: "#475569" }}>
                    {t(`encounterNotes.noteType.${note.noteType}`)}
                  </span>
                  {note.legacy ? (
                    <span style={{ fontSize: 11, color: "#92400e" }}>{t("encounterNotes.legacyBadge")}</span>
                  ) : null}
                  {note.isAmendment ? (
                    <span style={{ ...badgeStyle, background: "#dbeafe", color: "#1d4ed8" }}>
                      {t("encounterNotes.badgeAmendment")}
                    </span>
                  ) : null}
                  {note.voidedAt ? (
                    <span style={{ ...badgeStyle, background: "#fee2e2", color: "#b91c1c" }}>
                      {t("encounterNotes.badgeVoided")}
                    </span>
                  ) : null}
                  {note.cosignedAt ? (
                    <span style={{ ...badgeStyle, background: "#dcfce7", color: "#15803d" }}>
                      {t("encounterNotes.badgeCosigned")}
                    </span>
                  ) : pendingCosign ? (
                    <span style={{ ...badgeStyle, background: "#fef9c3", color: "#a16207" }}>
                      {t("encounterNotes.badgePendingCosign")}
                    </span>
                  ) : null}
                </div>
                {note.isAmendment && note.amendmentReason ? (
                  <p style={{ margin: "0 0 4px", fontSize: 12, color: "#1d4ed8" }}>
                    {t("encounterNotes.amendmentReasonLabel")}: {note.amendmentReason}
                  </p>
                ) : null}
                {note.voidedAt && note.voidReasonCode ? (
                  <p style={{ margin: "0 0 4px", fontSize: 12, color: "#b91c1c" }}>
                    {t("encounterNotes.voidReasonLabel")}:{" "}
                    {t(`encounterNotes.voidReason.${note.voidReasonCode}`)}
                  </p>
                ) : null}
                {note.cosignedAt && note.cosignRoleSnapshot ? (
                  <p style={{ margin: "0 0 4px", fontSize: 12, color: "#15803d" }}>
                    {t("encounterNotes.cosignLine").replace("{role}", note.cosignRoleSnapshot)}
                  </p>
                ) : null}
                <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
                  {note.authorDisplayName}
                </p>
                <p style={{ margin: "0 0 4px", fontSize: 12, color: "#64748b" }}>
                  {note.authorRoleTitle}
                </p>
                <p style={{ margin: "0 0 6px", fontSize: 12, color: "#64748b" }}>
                  {formatEncounterChromeDateTime(note.createdAt, language)}
                </p>
                <p
                  data-testid={expanded ? "encounter-note-full-body" : "encounter-note-preview-body"}
                  style={{
                    margin: 0,
                    fontSize: 13,
                    color: note.voidedAt ? "#94a3b8" : "#334155",
                    lineHeight: 1.45,
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                    textDecoration: note.voidedAt ? "line-through" : "none",
                  }}
                >
                  {expanded ? note.body : preview}
                </p>
                {note.body.length > preview.length ? (
                  <button
                    type="button"
                    onClick={() => toggleExpanded(note.id)}
                    style={{
                      marginTop: 6,
                      padding: 0,
                      border: "none",
                      background: "none",
                      color: "#2563eb",
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    {expanded ? t("encounterNotes.collapse") : t("encounterNotes.expand")}
                  </button>
                ) : null}
                {(showAmend || showVoid || showCosign) && !note.legacy ? (
                  <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {showAmend ? (
                      <button
                        type="button"
                        data-testid="encounter-note-amend-btn"
                        disabled={actionSaving}
                        onClick={() => {
                          resetAction();
                          setActionNoteId(note.id);
                          setActionKind("amend");
                          setAmendBody("");
                          setAmendReason("");
                        }}
                        style={{
                          padding: "4px 10px",
                          fontSize: 12,
                          borderRadius: 8,
                          border: "1px solid #cbd5e1",
                          background: "#fff",
                          cursor: "pointer",
                        }}
                      >
                        {t("encounterNotes.actionAmend")}
                      </button>
                    ) : null}
                    {showVoid ? (
                      <button
                        type="button"
                        data-testid="encounter-note-void-btn"
                        disabled={actionSaving}
                        onClick={() => {
                          resetAction();
                          setActionNoteId(note.id);
                          setActionKind("void");
                        }}
                        style={{
                          padding: "4px 10px",
                          fontSize: 12,
                          borderRadius: 8,
                          border: "1px solid #fecaca",
                          background: "#fff",
                          color: "#b91c1c",
                          cursor: "pointer",
                        }}
                      >
                        {t("encounterNotes.actionVoid")}
                      </button>
                    ) : null}
                    {showCosign ? (
                      <button
                        type="button"
                        data-testid="encounter-note-cosign-btn"
                        disabled={actionSaving}
                        onClick={() => void handleCosign(note.id)}
                        style={{
                          padding: "4px 10px",
                          fontSize: 12,
                          borderRadius: 8,
                          border: "1px solid #bbf7d0",
                          background: "#fff",
                          color: "#15803d",
                          cursor: "pointer",
                        }}
                      >
                        {t("encounterNotes.actionCosign")}
                      </button>
                    ) : null}
                  </div>
                ) : null}
                {isActionTarget && actionKind === "amend" ? (
                  <div data-testid="encounter-note-amend-form" style={{ marginTop: 10 }}>
                    <textarea
                      value={amendBody}
                      onChange={(e) => setAmendBody(e.target.value)}
                      rows={4}
                      placeholder={t("encounterNotes.amendBodyPlaceholder")}
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        marginBottom: 6,
                        padding: 8,
                        borderRadius: 8,
                        border: "1px solid #e2e8f0",
                        fontSize: 13,
                      }}
                    />
                    <input
                      value={amendReason}
                      onChange={(e) => setAmendReason(e.target.value)}
                      placeholder={t("encounterNotes.amendReasonPlaceholder")}
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        marginBottom: 6,
                        padding: 8,
                        borderRadius: 8,
                        border: "1px solid #e2e8f0",
                        fontSize: 13,
                      }}
                    />
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        type="button"
                        disabled={actionSaving || !amendBody.trim() || !amendReason.trim()}
                        onClick={() => void handleAmend(note.id)}
                        style={{
                          padding: "6px 12px",
                          fontSize: 12,
                          borderRadius: 8,
                          border: "none",
                          background: "#0f172a",
                          color: "#fff",
                          cursor: "pointer",
                        }}
                      >
                        {t("encounterNotes.amendSubmit")}
                      </button>
                      <button type="button" onClick={resetAction} style={{ fontSize: 12 }}>
                        {t("common.cancel")}
                      </button>
                    </div>
                  </div>
                ) : null}
                {isActionTarget && actionKind === "void" ? (
                  <div data-testid="encounter-note-void-form" style={{ marginTop: 10 }}>
                    <select
                      value={voidReasonCode}
                      onChange={(e) => setVoidReasonCode(e.target.value as EncounterNoteVoidReasonCode)}
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        marginBottom: 6,
                        padding: 8,
                        borderRadius: 8,
                        border: "1px solid #e2e8f0",
                        fontSize: 13,
                      }}
                    >
                      {ENCOUNTER_NOTE_VOID_REASON_CODES.map((code) => (
                        <option key={code} value={code}>
                          {t(`encounterNotes.voidReason.${code}`)}
                        </option>
                      ))}
                    </select>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        type="button"
                        disabled={actionSaving}
                        onClick={() => void handleVoid(note.id)}
                        style={{
                          padding: "6px 12px",
                          fontSize: 12,
                          borderRadius: 8,
                          border: "none",
                          background: "#b91c1c",
                          color: "#fff",
                          cursor: "pointer",
                        }}
                      >
                        {t("encounterNotes.voidSubmit")}
                      </button>
                      <button type="button" onClick={resetAction} style={{ fontSize: 12 }}>
                        {t("common.cancel")}
                      </button>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  return (
    <MedoraCard leftAccentColor="#475569" variant="default">
      <MedoraCardInner>
        <MedoraCardIdentity initials="N">
          <MedoraCardTitle
            title={t("emergencyWorkspace.notesTitle")}
            subline={
              <p style={{ margin: 0, fontSize: 13, color: "#64748b", lineHeight: 1.45 }}>
                {t("encounterNotes.subline")}
              </p>
            }
          />
        </MedoraCardIdentity>

        <div style={{ marginTop: 12, width: "100%" }}>
          {readOnly ? (
            <div
              style={{
                marginBottom: 12,
                padding: "10px 12px",
                backgroundColor: "#fffbeb",
                borderRadius: 10,
                border: "1px solid #fde68a",
                fontSize: 13,
                color: "#92400e",
              }}
            >
              {t("encounterChrome.notesTab.readOnlyHint")}
            </div>
          ) : null}

          <div style={narrow ? stackedLayout : layoutGrid}>
            {editor}
            {registry}
          </div>
        </div>
      </MedoraCardInner>
    </MedoraCard>
  );
}
