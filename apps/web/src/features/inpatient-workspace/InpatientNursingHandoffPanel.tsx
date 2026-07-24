"use client";

/**
 * MEDUI.D4A.3.3A — Inpatient nursing handoff on ErHandoffV1 (extended fields + history/print).
 */

import { useEffect, useMemo, useState } from "react";
import {
  appendErHandoffHistory,
  mergeErHandoffV1IntoNursingAssessment,
  readErHandoffV1FromNursingAssessment,
  type ErHandoffV1Stored,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { apiFetch } from "@/lib/apiClient";
import { formatEncounterChromeDateTime } from "@/lib/encounterChromeI18n";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import { ClinicalUserRoleAutocomplete } from "@/components/clinical/ClinicalUserRoleAutocomplete";

function isoToLocal(iso?: string): string {
  if (!iso?.trim()) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}

function localToIso(local: string): string | undefined {
  if (!local.trim()) return undefined;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

export function InpatientNursingHandoffPanel({
  encounterId,
  facilityId,
  nursingAssessment,
  isLocked,
  canEdit,
  onUpdated,
}: {
  encounterId: string;
  facilityId: string;
  nursingAssessment: unknown;
  isLocked: boolean;
  canEdit: boolean;
  onUpdated: () => void | Promise<void>;
}) {
  const { t, language } = useI18n();
  const stored = useMemo(
    () => readErHandoffV1FromNursingAssessment(nursingAssessment),
    [nursingAssessment]
  );
  const [form, setForm] = useState<ErHandoffV1Stored>(stored);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signerName, setSignerName] = useState("Signed");

  useEffect(() => {
    void (async () => {
      try {
        const me = await apiFetch("/auth/me");
        if (me && typeof me === "object" && !Array.isArray(me)) {
          const fn = (me as { fullName?: string }).fullName?.trim();
          if (fn) setSignerName(fn);
        }
      } catch {
        /* keep fallback */
      }
    })();
  }, []);

  useEffect(() => {
    setForm(stored);
  }, [stored]);

  const allowEdit = canEdit && !isLocked;

  const save = async () => {
    if (!allowEdit) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const now = new Date().toISOString();
      const signedName = form.electronicSignatureName?.trim() || signerName;
      const nextBase: ErHandoffV1Stored = {
        ...form,
        reportGiven: form.reportGiven ?? true,
        reportGivenAt: form.reportGivenAt || now,
        handoffLastSavedAt: now,
        handoffLastSavedByDisplayName: signedName,
        electronicSignatureName: signedName,
        electronicSignatureAt: form.electronicSignatureAt || now,
      };
      const next = appendErHandoffHistory(stored, nextBase, signedName);
      const merged = mergeErHandoffV1IntoNursingAssessment(nursingAssessment, next);
      await apiFetch(`/encounters/${encodeURIComponent(encounterId)}`, {
        method: "PATCH",
        facilityId,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nursingAssessment: merged }),
      });
      setForm(next);
      setInfo(t("inpatientHeaderNursingD4a33.handoff.saveOk"));
      await onUpdated();
    } catch {
      setError(t("inpatientHeaderNursingD4a33.handoff.saveError"));
    } finally {
      setBusy(false);
    }
  };

  const printReport = (mode: "print" | "report") => {
    const title =
      mode === "report"
        ? t("inpatientHeaderNursingD4a33.handoff.generateReport")
        : t("inpatientHeaderNursingD4a33.handoff.printHandoff");
    const lines = [
      title,
      `${t("inpatientHeaderNursingD4a33.handoff.reportGivenTo")}: ${form.reportGivenTo ?? "—"}`,
      `${t("inpatientHeaderNursingD4a33.handoff.receivingUnit")}: ${form.receivingUnit ?? "—"}`,
      `${t("inpatientHeaderNursingD4a33.handoff.receivingNurse")}: ${form.receivingNurseName ?? "—"}`,
      `${t("inpatientHeaderNursingD4a33.handoff.dateTime")}: ${
        form.reportGivenAt ? formatEncounterChromeDateTime(form.reportGivenAt, language) : "—"
      }`,
      `${t("inpatientHeaderNursingD4a33.handoff.careTransferred")}: ${
        form.careTransferred ? "✓" : "—"
      }`,
      `${t("inpatientHeaderNursingD4a33.handoff.comments")}: ${form.handoffNote ?? "—"}`,
      `${t("inpatientHeaderNursingD4a33.handoff.electronicSignature")}: ${
        form.electronicSignatureName ?? form.handoffLastSavedByDisplayName ?? "—"
      }`,
    ];
    const win = window.open("", "_blank", "noopener,noreferrer,width=720,height=900");
    if (!win) return;
    win.document.write(
      `<!doctype html><html><head><title>${title}</title></head><body style="font-family:system-ui;padding:24px;line-height:1.5"><h1>${title}</h1><pre style="white-space:pre-wrap;font:inherit">${lines
        .map((l) => l.replace(/</g, "&lt;"))
        .join("\n")}</pre></body></html>`
    );
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <section
      data-testid="inpatient-nursing-handoff-panel"
      style={{ ...MEDORA_CARD_SHELL, padding: "12px 14px" }}
      aria-label={t("inpatientHeaderNursingD4a33.handoff.sectionTitle")}
    >
      <h3 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 700 }}>
        {t("inpatientHeaderNursingD4a33.handoff.sectionTitle")}
      </h3>
      <div style={{ display: "grid", gap: 8, maxWidth: 520 }}>
        <label style={labelStyle}>
          {t("inpatientHeaderNursingD4a33.handoff.reportGivenTo")}
          <input
            style={inputStyle}
            disabled={!allowEdit || busy}
            value={form.reportGivenTo ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, reportGivenTo: e.target.value }))}
          />
        </label>
        <label style={labelStyle}>
          {t("inpatientHeaderNursingD4a33.handoff.receivingUnit")}
          <input
            style={inputStyle}
            disabled={!allowEdit || busy}
            value={form.receivingUnit ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, receivingUnit: e.target.value }))}
          />
        </label>
        <label style={labelStyle}>
          {t("inpatientHeaderNursingD4a33.handoff.receivingNurse")}
          <ClinicalUserRoleAutocomplete
            facilityId={facilityId}
            role="RN"
            disabled={!allowEdit || busy}
            ariaLabel={t("inpatientHeaderNursingD4a33.handoff.receivingNurse")}
            displayValue={form.receivingNurseName ?? ""}
            onChangeDisplay={(v) =>
              setForm((f) => ({ ...f, receivingNurseName: v, receivingNurseUserId: undefined }))
            }
            selectedUserId={form.receivingNurseUserId ?? null}
            onSelectUser={(user) =>
              setForm((f) => ({
                ...f,
                receivingNurseName: user
                  ? `${user.firstName} ${user.lastName}`.trim()
                  : f.receivingNurseName,
                receivingNurseUserId: user?.id,
              }))
            }
          />
        </label>
        <label style={labelStyle}>
          {t("inpatientHeaderNursingD4a33.handoff.dateTime")}
          <input
            type="datetime-local"
            style={inputStyle}
            disabled={!allowEdit || busy}
            value={isoToLocal(form.reportGivenAt)}
            onChange={(e) =>
              setForm((f) => ({ ...f, reportGivenAt: localToIso(e.target.value) }))
            }
          />
        </label>
        <label style={labelStyle}>
          {t("inpatientHeaderNursingD4a33.handoff.comments")}
          <textarea
            style={{ ...inputStyle, minHeight: 72 }}
            disabled={!allowEdit || busy}
            value={form.handoffNote ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, handoffNote: e.target.value }))}
          />
        </label>
        <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
          <input
            type="checkbox"
            disabled={!allowEdit || busy}
            checked={Boolean(form.careTransferred)}
            onChange={(e) => setForm((f) => ({ ...f, careTransferred: e.target.checked }))}
          />
          {t("inpatientHeaderNursingD4a33.handoff.careTransferred")}
        </label>
        <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
          <input
            type="checkbox"
            disabled={!allowEdit || busy}
            checked={Boolean(form.electronicSignatureName)}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                electronicSignatureName: e.target.checked ? signerName : undefined,
                electronicSignatureAt: e.target.checked ? new Date().toISOString() : undefined,
              }))
            }
          />
          {t("inpatientHeaderNursingD4a33.handoff.signAs")}
          {form.electronicSignatureName ? (
            <span style={{ color: "#64748b" }}>
              ({form.electronicSignatureName}
              {form.electronicSignatureAt
                ? ` · ${formatEncounterChromeDateTime(form.electronicSignatureAt, language)}`
                : ""}
              )
            </span>
          ) : null}
        </label>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
        <button type="button" style={btnPrimary} disabled={!allowEdit || busy} onClick={() => void save()}>
          {t("inpatientHeaderNursingD4a33.handoff.save")}
        </button>
        <button type="button" style={btnSecondary} onClick={() => printReport("print")}>
          {t("inpatientHeaderNursingD4a33.handoff.printHandoff")}
        </button>
        <button type="button" style={btnSecondary} onClick={() => printReport("report")}>
          {t("inpatientHeaderNursingD4a33.handoff.generateReport")}
        </button>
      </div>
      {error ? (
        <p role="alert" style={{ margin: "8px 0 0", fontSize: 12, color: "#b91c1c" }}>
          {error}
        </p>
      ) : null}
      {info ? <p style={{ margin: "8px 0 0", fontSize: 12, color: "#15803d" }}>{info}</p> : null}

      <h4 style={{ margin: "16px 0 8px", fontSize: 13, fontWeight: 700 }}>
        {t("inpatientHeaderNursingD4a33.handoff.historyTitle")}
      </h4>
      {(form.history ?? []).length === 0 ? (
        <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
          {t("inpatientHeaderNursingD4a33.handoff.emptyHistory")}
        </p>
      ) : (
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "#334155" }}>
          {[...(form.history ?? [])].reverse().map((h, idx) => (
            <li key={`${h.at}-${idx}`} style={{ marginBottom: 6 }}>
              {formatEncounterChromeDateTime(h.at, language)}
              {h.byDisplayName ? ` · ${h.byDisplayName}` : ""}
              {h.receivingUnit ? ` · ${h.receivingUnit}` : ""}
              {h.receivingNurseName ? ` → ${h.receivingNurseName}` : ""}
              {h.careTransferred ? " · ✓" : ""}
              {h.notePreview ? ` — ${h.notePreview}` : ""}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const labelStyle = {
  display: "grid",
  gap: 4,
  fontSize: 12,
  fontWeight: 600,
  color: "#475569",
} as const;

const inputStyle = {
  display: "block",
  width: "100%",
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  fontSize: 13,
  boxSizing: "border-box" as const,
};

const btnSecondary = {
  padding: "7px 10px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "#fff",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
} as const;

const btnPrimary = {
  ...btnSecondary,
  borderColor: "#0f766e",
  background: "#f0fdfa",
  color: "#115e59",
};
