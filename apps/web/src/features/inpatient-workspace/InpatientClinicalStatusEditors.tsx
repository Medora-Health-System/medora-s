"use client";

/**
 * MEDUI.D4A.3.3A — Header clinical status editors (enterprise allergy / code / isolation).
 */

import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import {
  ALLERGY_SEVERITIES,
  ALLERGY_VERIFICATION_STATUSES,
  INPATIENT_CODE_STATUSES,
  type AllergySeverity,
  type AllergyVerificationStatus,
  type EnterpriseAllergyEntry,
  type EnterpriseAllergiesSection,
  type InpatientCodeStatus,
  type InpatientIsolationPrecaution,
  sanitizeEnterpriseAllergiesSection,
  syncLegacyAllergyTextFields,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { apiFetch, asApiObject } from "@/lib/apiClient";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import { DrugAllergySearchPanel } from "@/features/emergency/DrugAllergySearchPanel";
import { patchInpatientClinicalOps } from "@/features/hospital-care/inpatientOperationsApi";

const CODE_SELECTABLE = [
  "FULL_CODE",
  "DNR",
  "DNI",
  "DNR_DNI",
  "COMFORT_MEASURES_ONLY",
  "LIMITED_INTERVENTIONS",
] as const satisfies readonly InpatientCodeStatus[];

const CODE_ICONS: Record<(typeof CODE_SELECTABLE)[number], string> = {
  FULL_CODE: "💚",
  DNR: "🚫",
  DNI: "🫁",
  DNR_DNI: "⛔",
  COMFORT_MEASURES_ONLY: "🕊️",
  LIMITED_INTERVENTIONS: "⚙️",
};

/** Hospital isolation selector — first-class backend enums. */
const ISOLATION_UI: Array<{
  key: InpatientIsolationPrecaution;
  emoji: string;
}> = [
  { key: "STANDARD", emoji: "🟢" },
  { key: "CONTACT", emoji: "🟦" },
  { key: "DROPLET", emoji: "🟨" },
  { key: "AIRBORNE", emoji: "🟥" },
  { key: "PROTECTIVE", emoji: "🟪" },
  { key: "ENHANCED_CONTACT", emoji: "🟫" },
  { key: "COVID", emoji: "⚫" },
];

function ModalShell({
  title,
  subtitle,
  onClose,
  children,
  testId,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  testId: string;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      data-testid={testId}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "rgba(15, 23, 42, 0.35)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "48px 16px 24px",
        overflowY: "auto",
      }}
    >
      <div style={{ ...MEDORA_CARD_SHELL, width: "100%", maxWidth: 560, padding: "14px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{title}</h2>
            {subtitle ? (
              <p style={{ margin: "6px 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.4 }}>{subtitle}</p>
            ) : null}
          </div>
          <button type="button" onClick={onClose} style={btnSecondary} aria-label="Close">
            ×
          </button>
        </div>
        <div style={{ marginTop: 12 }}>{children}</div>
      </div>
    </div>
  );
}

function newAllergyId() {
  return `alg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function InpatientAllergyEditorModal({
  open,
  onClose,
  encounterId,
  facilityId,
  patientId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  encounterId: string;
  facilityId: string;
  patientId: string;
  onSaved: () => void | Promise<void>;
}) {
  const { t } = useI18n();
  const [section, setSection] = useState<EnterpriseAllergiesSection>({ entries: [] });
  const [draftSubstance, setDraftSubstance] = useState("");
  const [draftReaction, setDraftReaction] = useState("");
  const [draftSeverity, setDraftSeverity] = useState<AllergySeverity>("UNKNOWN");
  const [draftVerification, setDraftVerification] =
    useState<AllergyVerificationStatus>("UNVERIFIED");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const profileRaw = await apiFetch(`/patients/${patientId}/clinical-history-profile`, {
        facilityId,
      }).catch(() => null);
      const profile = asApiObject<{ allergies?: EnterpriseAllergiesSection }>(profileRaw);
      const allergies = sanitizeEnterpriseAllergiesSection(profile?.allergies ?? {});
      // Hydrate entries from legacy text when structured rows missing
      if (!allergies.entries?.length && allergies.medicationAllergiesDetail?.trim()) {
        allergies.entries = allergies.medicationAllergiesDetail
          .split(/[;\n]/)
          .map((part) => part.trim())
          .filter(Boolean)
          .slice(0, 20)
          .map((substance) => ({
            id: newAllergyId(),
            substance: substance.split("—")[0]?.trim() || substance,
            reaction: substance.includes("—") ? substance.split("—").slice(1).join("—").trim() : undefined,
            status: "ACTIVE" as const,
            verificationStatus: "UNVERIFIED" as const,
            severity: "UNKNOWN" as const,
          }));
      }
      setSection(allergies);
    } catch {
      setError(t("inpatientHeaderNursingD4a33.allergyEditor.loadError"));
    } finally {
      setLoading(false);
    }
  }, [facilityId, patientId, t]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  if (!open) return null;

  const persist = async (next: EnterpriseAllergiesSection) => {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const allergies = syncLegacyAllergyTextFields(sanitizeEnterpriseAllergiesSection(next));
      await apiFetch(`/patients/${patientId}/clinical-history-profile/allergies`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        facilityId,
        body: JSON.stringify({
          allergies,
          encounterId,
          originModule: "inpatientHeaderAllergyEditor",
        }),
      });
      setSection(allergies);
      setInfo(t("inpatientHeaderNursingD4a33.allergyEditor.saveOk"));
      await onSaved();
    } catch {
      setError(t("inpatientHeaderNursingD4a33.allergyEditor.saveError"));
    } finally {
      setBusy(false);
    }
  };

  const upsertEntry = () => {
    const substance = draftSubstance.trim();
    if (!substance) return;
    const entries = [...(section.entries ?? [])];
    const row: EnterpriseAllergyEntry = {
      id: editingId ?? newAllergyId(),
      substance,
      reaction: draftReaction.trim() || undefined,
      severity: draftSeverity,
      verificationStatus: draftVerification,
      status: "ACTIVE",
      updatedAt: new Date().toISOString(),
    };
    const idx = entries.findIndex((e) => e.id === row.id);
    if (idx >= 0) entries[idx] = { ...entries[idx], ...row, status: entries[idx].status };
    else entries.push(row);
    setDraftSubstance("");
    setDraftReaction("");
    setEditingId(null);
    void persist({ ...section, nkda: false, entries });
  };

  const setStatus = (id: string, status: "ACTIVE" | "INACTIVE") => {
    const entries = (section.entries ?? []).map((e) =>
      e.id === id ? { ...e, status, updatedAt: new Date().toISOString() } : e
    );
    void persist({ ...section, nkda: false, entries });
  };

  const removeEntry = (id: string) => {
    const entries = (section.entries ?? []).filter((e) => e.id !== id);
    void persist({ ...section, entries });
  };

  const active = (section.entries ?? []).filter((e) => e.status === "ACTIVE");
  const inactive = (section.entries ?? []).filter((e) => e.status === "INACTIVE");

  return (
    <ModalShell
      testId="inpatient-allergy-editor"
      title={t("inpatientHeaderNursingD4a33.allergyEditor.title")}
      subtitle={t("inpatientHeaderNursingD4a33.allergyEditor.subtitle")}
      onClose={onClose}
    >
      {loading ? (
        <p style={{ fontSize: 13, color: "#64748b" }}>{t("common.loading")}</p>
      ) : (
        <>
          <button
            type="button"
            disabled={busy}
            data-testid="inpatient-allergy-nkda"
            style={{
              ...btnSecondary,
              marginBottom: 10,
              borderColor: section.nkda ? "#166534" : "#cbd5e1",
              background: section.nkda ? "#dcfce7" : "#fff",
            }}
            onClick={() =>
              void persist({
                nkda: !section.nkda,
                entries: section.nkda ? section.entries : [],
                allergyDetailSelections: !section.nkda ? ["NKDA"] : [],
              })
            }
          >
            {t("inpatientHeaderNursingD4a33.allergyEditor.nkda")}
          </button>

          <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700, color: "#334155" }}>
            {t("inpatientHeaderNursingD4a33.allergyEditor.activeList")}
          </p>
          <ul style={{ margin: "0 0 10px", paddingLeft: 18, fontSize: 12, color: "#334155" }}>
            {active.length === 0 ? (
              <li>{t("inpatientCompactHeaderD4a32.notDocumented")}</li>
            ) : (
              active.map((e) => (
                <li key={e.id} style={{ marginBottom: 6 }}>
                  <strong>{e.substance}</strong>
                  {e.reaction ? ` — ${e.reaction}` : ""}
                  {e.severity ? ` · ${e.severity}` : ""}
                  {e.verificationStatus ? ` · ${e.verificationStatus}` : ""}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                    <button type="button" style={miniBtn} disabled={busy} onClick={() => {
                      setEditingId(e.id);
                      setDraftSubstance(e.substance);
                      setDraftReaction(e.reaction ?? "");
                      setDraftSeverity(e.severity ?? "UNKNOWN");
                      setDraftVerification(e.verificationStatus ?? "UNVERIFIED");
                    }}>
                      {t("inpatientHeaderNursingD4a33.allergyEditor.edit")}
                    </button>
                    <button type="button" style={miniBtn} disabled={busy} onClick={() => setStatus(e.id, "INACTIVE")}>
                      {t("inpatientHeaderNursingD4a33.allergyEditor.markInactive")}
                    </button>
                    <button type="button" style={miniBtn} disabled={busy} onClick={() => removeEntry(e.id)}>
                      {t("inpatientHeaderNursingD4a33.allergyEditor.delete")}
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>

          {inactive.length ? (
            <>
              <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700, color: "#64748b" }}>
                {t("inpatientHeaderNursingD4a33.allergyEditor.inactiveList")}
              </p>
              <ul style={{ margin: "0 0 10px", paddingLeft: 18, fontSize: 12, color: "#64748b" }}>
                {inactive.map((e) => (
                  <li key={e.id} style={{ marginBottom: 4 }}>
                    {e.substance}{" "}
                    <button type="button" style={miniBtn} disabled={busy} onClick={() => setStatus(e.id, "ACTIVE")}>
                      {t("inpatientHeaderNursingD4a33.allergyEditor.reactivate")}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          <div style={{ display: "grid", gap: 8, marginBottom: 10 }}>
            <input
              value={draftSubstance}
              onChange={(e) => setDraftSubstance(e.target.value)}
              placeholder={t("inpatientHeaderNursingD4a33.allergyEditor.substancePlaceholder")}
              style={inputStyle}
              disabled={busy || section.nkda}
            />
            <input
              value={draftReaction}
              onChange={(e) => setDraftReaction(e.target.value)}
              placeholder={t("inpatientHeaderNursingD4a33.allergyEditor.reactionPlaceholder")}
              style={inputStyle}
              disabled={busy || section.nkda}
            />
            <label style={labelStyle}>
              {t("inpatientHeaderNursingD4a33.allergyEditor.severity")}
              <select
                value={draftSeverity}
                onChange={(e) => setDraftSeverity(e.target.value as AllergySeverity)}
                style={inputStyle}
                disabled={busy || section.nkda}
              >
                {ALLERGY_SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {t(`inpatientHeaderNursingD4a33.allergyEditor.severities.${s}`)}
                  </option>
                ))}
              </select>
            </label>
            <label style={labelStyle}>
              {t("inpatientHeaderNursingD4a33.allergyEditor.verification")}
              <select
                value={draftVerification}
                onChange={(e) => setDraftVerification(e.target.value as AllergyVerificationStatus)}
                style={inputStyle}
                disabled={busy || section.nkda}
              >
                {ALLERGY_VERIFICATION_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t(`inpatientHeaderNursingD4a33.allergyEditor.verifications.${s}`)}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" style={btnPrimary} disabled={busy || section.nkda || !draftSubstance.trim()} onClick={upsertEntry}>
              {editingId
                ? t("inpatientHeaderNursingD4a33.allergyEditor.saveEdit")
                : t("inpatientHeaderNursingD4a33.allergyEditor.add")}
            </button>
          </div>

          {!section.nkda ? (
            <DrugAllergySearchPanel
              facilityId={facilityId}
              disabled={busy}
              medicationAllergiesDetail=""
              additionalAllergyInfo=""
              allergyDetailSelections={[]}
              onSaveAllergies={(patch) => {
                const lines = String(patch.medicationAllergiesDetail ?? "")
                  .split(/[;\n]/)
                  .map((x) => x.trim())
                  .filter(Boolean);
                const latest = lines[lines.length - 1];
                if (!latest) return;
                const substance = latest.split("—")[0]?.trim() || latest;
                const reaction = latest.includes("—")
                  ? latest.split("—").slice(1).join("—").trim()
                  : undefined;
                const entries = [
                  ...(section.entries ?? []),
                  {
                    id: newAllergyId(),
                    substance,
                    reaction,
                    status: "ACTIVE" as const,
                    verificationStatus: "PATIENT_REPORTED" as const,
                    severity: "UNKNOWN" as const,
                    updatedAt: new Date().toISOString(),
                  },
                ];
                void persist({ ...section, nkda: false, entries });
              }}
            />
          ) : null}

          {error ? (
            <p role="alert" style={{ margin: "8px 0 0", fontSize: 12, color: "#b91c1c" }}>
              {error}
            </p>
          ) : null}
          {info ? <p style={{ margin: "8px 0 0", fontSize: 12, color: "#15803d" }}>{info}</p> : null}
          <div style={{ marginTop: 12 }}>
            <button type="button" onClick={onClose} style={btnSecondary}>
              {t("inpatientHeaderNursingD4a33.allergyEditor.close")}
            </button>
          </div>
        </>
      )}
    </ModalShell>
  );
}

export function InpatientCodeStatusEditorModal({
  open,
  onClose,
  encounterId,
  currentStatus,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  encounterId: string;
  currentStatus?: string | null;
  onSaved: () => void | Promise<void>;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const select = async (status: InpatientCodeStatus) => {
    if (!(INPATIENT_CODE_STATUSES as readonly string[]).includes(status)) return;
    setBusy(true);
    setError(null);
    try {
      await patchInpatientClinicalOps(encounterId, { setCodeStatus: { status } });
      await onSaved();
      onClose();
    } catch {
      setError(t("inpatientHeaderNursingD4a33.codeStatusEditor.saveError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      testId="inpatient-code-status-editor"
      title={t("inpatientHeaderNursingD4a33.codeStatusEditor.title")}
      subtitle={t("inpatientHeaderNursingD4a33.codeStatusEditor.subtitle")}
      onClose={onClose}
    >
      <div style={{ display: "grid", gap: 8 }}>
        {CODE_SELECTABLE.map((status) => {
          const active = (currentStatus ?? "").toUpperCase() === status;
          return (
            <button
              key={status}
              type="button"
              disabled={busy}
              data-testid={`inpatient-code-option-${status}`}
              onClick={() => void select(status)}
              style={{
                ...optionBtn,
                borderColor: active ? "#0f766e" : "#cbd5e1",
                background: active ? "#ccfbf1" : "#fff",
              }}
            >
              <span aria-hidden style={{ marginRight: 8 }}>
                {CODE_ICONS[status]}
              </span>
              {t(`inpatientHeaderNursingD4a33.codeStatusEditor.options.${status}`)}
            </button>
          );
        })}
      </div>
      {error ? (
        <p role="alert" style={{ margin: "10px 0 0", fontSize: 12, color: "#b91c1c" }}>
          {error}
        </p>
      ) : null}
      <div style={{ marginTop: 12 }}>
        <button type="button" onClick={onClose} style={btnSecondary}>
          {t("inpatientHeaderNursingD4a33.codeStatusEditor.close")}
        </button>
      </div>
    </ModalShell>
  );
}

export function InpatientIsolationEditorModal({
  open,
  onClose,
  encounterId,
  currentPrecautions,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  encounterId: string;
  currentPrecautions?: string[] | null;
  onSaved: () => void | Promise<void>;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = (currentPrecautions ?? []).map((p) => p.toUpperCase());

  if (!open) return null;

  const select = async (precaution: InpatientIsolationPrecaution) => {
    setBusy(true);
    setError(null);
    try {
      await patchInpatientClinicalOps(encounterId, {
        setIsolation: { precautions: [precaution], reason: null },
      });
      await onSaved();
      onClose();
    } catch {
      setError(t("inpatientHeaderNursingD4a33.isolationEditor.saveError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      testId="inpatient-isolation-editor"
      title={t("inpatientHeaderNursingD4a33.isolationEditor.title")}
      subtitle={t("inpatientHeaderNursingD4a33.isolationEditor.subtitle")}
      onClose={onClose}
    >
      <div style={{ display: "grid", gap: 8 }}>
        {ISOLATION_UI.map((opt) => {
          const active = current.includes(opt.key);
          return (
            <button
              key={opt.key}
              type="button"
              disabled={busy}
              data-testid={`inpatient-isolation-option-${opt.key}`}
              onClick={() => void select(opt.key)}
              style={{
                ...optionBtn,
                borderColor: active ? "#9f1239" : "#cbd5e1",
                background: active ? "#fff1f2" : "#fff",
              }}
            >
              <span aria-hidden style={{ marginRight: 8 }}>
                {opt.emoji}
              </span>
              {t(`inpatientHeaderNursingD4a33.isolationEditor.options.${opt.key}`)}
            </button>
          );
        })}
      </div>
      {error ? (
        <p role="alert" style={{ margin: "10px 0 0", fontSize: 12, color: "#b91c1c" }}>
          {error}
        </p>
      ) : null}
      <div style={{ marginTop: 12 }}>
        <button type="button" onClick={onClose} style={btnSecondary}>
          {t("inpatientHeaderNursingD4a33.isolationEditor.close")}
        </button>
      </div>
    </ModalShell>
  );
}

const btnSecondary: CSSProperties = {
  padding: "6px 10px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "#fff",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  color: "#334155",
};

const btnPrimary: CSSProperties = {
  ...btnSecondary,
  borderColor: "#0f766e",
  background: "#f0fdfa",
  color: "#115e59",
};

const miniBtn: CSSProperties = {
  ...btnSecondary,
  padding: "3px 8px",
  fontSize: 11,
};

const optionBtn: CSSProperties = {
  ...btnSecondary,
  textAlign: "left",
  padding: "10px 12px",
  fontSize: 13,
};

const inputStyle: CSSProperties = {
  display: "block",
  width: "100%",
  maxWidth: 480,
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  fontSize: 13,
  boxSizing: "border-box",
};

const labelStyle: CSSProperties = {
  display: "grid",
  gap: 4,
  fontSize: 12,
  fontWeight: 600,
  color: "#475569",
};
