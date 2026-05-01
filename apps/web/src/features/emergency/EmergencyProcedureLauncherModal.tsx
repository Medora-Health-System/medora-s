"use client";

import React, { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { useI18n } from "@/lib/i18n";
import { normalizeUserFacingError } from "@/lib/userFacingError";

type LauncherStep = "menu" | "laceration";

function toDatetimeLocalValue(d: Date): string {
  const x = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return x.toISOString().slice(0, 16);
}

const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 80,
  backgroundColor: "rgba(15, 23, 42, 0.45)",
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  padding: "24px 12px",
  overflowY: "auto",
};

const panel: React.CSSProperties = {
  width: "min(520px, 100%)",
  backgroundColor: "#fff",
  borderRadius: 14,
  border: "1px solid #e2e8f0",
  boxShadow: "0 18px 40px rgba(15, 23, 42, 0.18)",
  maxHeight: "calc(100vh - 48px)",
  overflowY: "auto",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  color: "#475569",
  marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  fontSize: 14,
};

const tileBase: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  textAlign: "left" as const,
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  minHeight: 72,
  display: "flex",
  flexDirection: "column" as const,
  justifyContent: "center",
};

function triStateSelect(
  value: boolean | undefined,
  onChange: (v: boolean | undefined) => void,
  t: (k: string) => string
): React.ReactElement {
  const v = value === true ? "true" : value === false ? "false" : "";
  return (
    <select
      value={v}
      onChange={(e) => {
        const s = e.target.value;
        if (s === "") onChange(undefined);
        else onChange(s === "true");
      }}
      style={{ ...inputStyle, marginBottom: 8 }}
    >
      <option value="">{t("erProcedureLauncher.triUnset")}</option>
      <option value="true">{t("common.yes")}</option>
      <option value="false">{t("common.no")}</option>
    </select>
  );
}

export function EmergencyProcedureLauncherModal({
  open,
  onClose,
  encounterId,
  facilityId,
  onRecorded,
}: {
  open: boolean;
  onClose: () => void;
  encounterId: string;
  facilityId: string;
  onRecorded: () => void;
}) {
  const { t } = useI18n();
  const [step, setStep] = useState<LauncherStep>("menu");
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [site, setSite] = useState("");
  const [performedAtLocal, setPerformedAtLocal] = useState(() => toDatetimeLocalValue(new Date()));
  const [woundLengthCm, setWoundLengthCm] = useState("");
  const [anesthesia, setAnesthesia] = useState("");
  const [irrigation, setIrrigation] = useState("");
  const [asepticTechnique, setAsepticTechnique] = useState<boolean | undefined>(undefined);
  const [closureMethod, setClosureMethod] = useState("");
  const [suturesOrStaples, setSuturesOrStaples] = useState("");
  const [dressingApplied, setDressingApplied] = useState<boolean | undefined>(undefined);
  const [toleratedWell, setToleratedWell] = useState<boolean | undefined>(undefined);
  const [complications, setComplications] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setStep("menu");
    setSubmitErr(null);
    setSite("");
    setPerformedAtLocal(toDatetimeLocalValue(new Date()));
    setWoundLengthCm("");
    setAnesthesia("");
    setIrrigation("");
    setAsepticTechnique(undefined);
    setClosureMethod("");
    setSuturesOrStaples("");
    setDressingApplied(undefined);
    setToleratedWell(undefined);
    setComplications("");
    setNotes("");
  }, [open]);

  const resetLacerationForm = () => {
    setSite("");
    setPerformedAtLocal(toDatetimeLocalValue(new Date()));
    setWoundLengthCm("");
    setAnesthesia("");
    setIrrigation("");
    setAsepticTechnique(undefined);
    setClosureMethod("");
    setSuturesOrStaples("");
    setDressingApplied(undefined);
    setToleratedWell(undefined);
    setComplications("");
    setNotes("");
    setSubmitErr(null);
  };

  const onSaveLaceration = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitErr(null);
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        procedureType: "LACERATION_REPAIR",
        site: site.trim(),
      };
      if (performedAtLocal.trim()) {
        const d = new Date(performedAtLocal);
        if (!Number.isNaN(d.getTime())) body.performedAt = d.toISOString();
      }
      if (woundLengthCm.trim()) body.woundLengthCm = woundLengthCm.trim();
      if (anesthesia.trim()) body.anesthesia = anesthesia.trim();
      if (irrigation.trim()) body.irrigation = irrigation.trim();
      if (asepticTechnique === true || asepticTechnique === false) body.asepticTechnique = asepticTechnique;
      if (closureMethod.trim()) body.closureMethod = closureMethod.trim();
      if (suturesOrStaples.trim()) body.suturesOrStaples = suturesOrStaples.trim();
      if (dressingApplied === true || dressingApplied === false) body.dressingApplied = dressingApplied;
      if (toleratedWell === true || toleratedWell === false) body.toleratedWell = toleratedWell;
      if (complications.trim()) body.complications = complications.trim();
      if (notes.trim()) body.notes = notes.trim();

      await apiFetch(`/encounters/${encounterId}/procedures/document`, {
        method: "POST",
        facilityId,
        body: JSON.stringify(body),
      });
      onRecorded();
      resetLacerationForm();
      setStep("menu");
    } catch (err) {
      setSubmitErr(normalizeUserFacingError(err instanceof Error ? err.message : null) || t("erProcedureLauncher.saveError"));
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const sectionTitle: React.CSSProperties = {
    margin: "0 0 8px 0",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.07em",
    textTransform: "uppercase",
    color: "#64748b",
  };

  const comingSoonTile: React.CSSProperties = {
    ...tileBase,
    background: "#f8fafc",
    color: "#94a3b8",
    cursor: "not-allowed",
    opacity: 0.75,
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="er-procedure-launcher-title"
      style={overlay}
      onMouseDown={(ev) => {
        if (ev.target === ev.currentTarget) onClose();
      }}
    >
      <div style={panel} onMouseDown={(e) => e.stopPropagation()}>
        <div
          style={{
            padding: "14px 16px",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
          }}
        >
          <h2 id="er-procedure-launcher-title" style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0f172a" }}>
            {step === "menu" ? t("erProcedureLauncher.modalTitle") : t("erProcedureLauncher.lacerationTitle")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "1px solid #e2e8f0",
              background: "#fff",
              borderRadius: 8,
              padding: "6px 12px",
              fontSize: 13,
              cursor: "pointer",
              fontWeight: 600,
              color: "#475569",
            }}
          >
            {t("erProcedureLauncher.close")}
          </button>
        </div>

        <div style={{ padding: "14px 16px 18px" }}>
          {submitErr ? (
            <p style={{ margin: "0 0 12px 0", fontSize: 13, color: "#b45309", fontWeight: 600 }}>{submitErr}</p>
          ) : null}

          {step === "menu" ? (
            <>
              <p style={{ ...sectionTitle, marginBottom: 10 }}>{t("erProcedureLauncher.pickProcedure")}</p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                  gap: 10,
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setStep("laceration");
                    setSubmitErr(null);
                  }}
                  style={{
                    ...tileBase,
                    background: "#eff6ff",
                    borderColor: "#93c5fd",
                    color: "#1e40af",
                  }}
                >
                  {t("erProcedureLauncher.tileLaceration")}
                </button>
                <div style={comingSoonTile}>
                  <span>{t("erProcedureLauncher.tileIAndD")}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", marginTop: 4 }}>
                    {t("erProcedureLauncher.comingSoon")}
                  </span>
                </div>
                <div style={comingSoonTile}>
                  <span>{t("erProcedureLauncher.tileSplint")}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", marginTop: 4 }}>
                    {t("erProcedureLauncher.comingSoon")}
                  </span>
                </div>
                <div style={comingSoonTile}>
                  <span>{t("erProcedureLauncher.tileWoundCare")}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", marginTop: 4 }}>
                    {t("erProcedureLauncher.comingSoon")}
                  </span>
                </div>
                <div style={comingSoonTile}>
                  <span>{t("erProcedureLauncher.tileEkg")}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", marginTop: 4 }}>
                    {t("erProcedureLauncher.comingSoon")}
                  </span>
                </div>
                <div style={comingSoonTile}>
                  <span>{t("erProcedureLauncher.tileGlucose")}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", marginTop: 4 }}>
                    {t("erProcedureLauncher.comingSoon")}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <form onSubmit={onSaveLaceration}>
              <button
                type="button"
                onClick={() => {
                  setStep("menu");
                  resetLacerationForm();
                }}
                style={{
                  marginBottom: 12,
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  background: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {t("erProcedureLauncher.backToGrid")}
              </button>

              <label style={labelStyle}>{t("erProcedureLauncher.fieldSite")}</label>
              <input
                required
                type="text"
                value={site}
                onChange={(e) => setSite(e.target.value)}
                style={{ ...inputStyle, marginBottom: 10 }}
              />

              <label style={labelStyle}>{t("erProcedureLauncher.fieldPerformedAt")}</label>
              <input
                type="datetime-local"
                value={performedAtLocal}
                onChange={(e) => setPerformedAtLocal(e.target.value)}
                style={{ ...inputStyle, marginBottom: 10 }}
              />

              <label style={labelStyle}>{t("erProcedureLauncher.fieldWoundLength")}</label>
              <input
                type="text"
                value={woundLengthCm}
                onChange={(e) => setWoundLengthCm(e.target.value)}
                placeholder={t("erProcedureLauncher.placeholderWoundLength")}
                style={{ ...inputStyle, marginBottom: 10 }}
              />

              <label style={labelStyle}>{t("erProcedureLauncher.fieldAnesthesia")}</label>
              <input
                type="text"
                value={anesthesia}
                onChange={(e) => setAnesthesia(e.target.value)}
                style={{ ...inputStyle, marginBottom: 10 }}
              />

              <label style={labelStyle}>{t("erProcedureLauncher.fieldIrrigation")}</label>
              <input
                type="text"
                value={irrigation}
                onChange={(e) => setIrrigation(e.target.value)}
                style={{ ...inputStyle, marginBottom: 10 }}
              />

              <label style={labelStyle}>{t("erProcedureLauncher.fieldAsepticTechnique")}</label>
              {triStateSelect(asepticTechnique, setAsepticTechnique, t)}

              <label style={labelStyle}>{t("erProcedureLauncher.fieldClosure")}</label>
              <input
                type="text"
                value={closureMethod}
                onChange={(e) => setClosureMethod(e.target.value)}
                style={{ ...inputStyle, marginBottom: 10 }}
              />

              <label style={labelStyle}>{t("erProcedureLauncher.fieldSutures")}</label>
              <input
                type="text"
                value={suturesOrStaples}
                onChange={(e) => setSuturesOrStaples(e.target.value)}
                style={{ ...inputStyle, marginBottom: 10 }}
              />

              <label style={labelStyle}>{t("erProcedureLauncher.fieldDressing")}</label>
              {triStateSelect(dressingApplied, setDressingApplied, t)}

              <label style={labelStyle}>{t("erProcedureLauncher.fieldTolerated")}</label>
              {triStateSelect(toleratedWell, setToleratedWell, t)}

              <label style={labelStyle}>{t("erProcedureLauncher.fieldComplications")}</label>
              <textarea
                value={complications}
                onChange={(e) => setComplications(e.target.value)}
                rows={2}
                style={{ ...inputStyle, marginBottom: 10, resize: "vertical" }}
              />

              <label style={labelStyle}>{t("erProcedureLauncher.fieldNotes")}</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                style={{ ...inputStyle, marginBottom: 14, resize: "vertical" }}
              />

              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: "10px 16px",
                  borderRadius: 8,
                  border: "none",
                  background: "#1d4ed8",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: submitting ? "not-allowed" : "pointer",
                }}
              >
                {t("erProcedureLauncher.save")}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
