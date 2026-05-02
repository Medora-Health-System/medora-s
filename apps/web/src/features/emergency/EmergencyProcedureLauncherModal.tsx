"use client";

import React, { useEffect, useState } from "react";
import {
  LACERATION_ANESTHESIA_VALUES,
  LACERATION_CLOSURE_VALUES,
  LACERATION_IRRIGATION_VALUES,
  LACERATION_SITE_VALUES,
  LACERATION_SUTURES_VALUES,
  LACERATION_WOUND_LENGTH_VALUES,
} from "@medora/shared";
import { apiFetch } from "@/lib/apiClient";
import { useI18n } from "@/lib/i18n";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import {
  NonLacerationProcedureForm,
  NON_LACERATION_FORM_TITLE_I18N_KEYS,
  type NonLacerationProcedureType,
} from "@/features/emergency/ProcedureDocumentBatch2Forms";

type LauncherStep = "menu" | "laceration" | NonLacerationProcedureType;

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

function enumSelect<T extends string>(opts: {
  value: T | "";
  onChange: (v: T | "") => void;
  values: readonly T[];
  labelKey: (v: T) => string;
  t: (k: string) => string;
  required?: boolean;
  placeholderKey: string;
}): React.ReactElement {
  const { value, onChange, values, labelKey, t, required, placeholderKey } = opts;
  return (
    <select
      value={value}
      required={required}
      onChange={(e) => onChange((e.target.value || "") as T | "")}
      style={{ ...inputStyle, marginBottom: 8 }}
    >
      <option value="">{t(placeholderKey)}</option>
      {values.map((v) => (
        <option key={v} value={v}>
          {t(labelKey(v))}
        </option>
      ))}
    </select>
  );
}

export function EmergencyProcedureLauncherModal({
  open,
  onClose,
  encounterId,
  facilityId,
  onRecorded,
  /** When opening, jump directly to this procedure form (e.g. EKG from order-set shortcut). */
  initialNonLacerationStep = null,
}: {
  open: boolean;
  onClose: () => void;
  encounterId: string;
  facilityId: string;
  onRecorded: () => void;
  initialNonLacerationStep?: NonLacerationProcedureType | null;
}) {
  const { t } = useI18n();
  const [step, setStep] = useState<LauncherStep>("menu");
  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [site, setSite] = useState<(typeof LACERATION_SITE_VALUES)[number] | "">("");
  const [siteOther, setSiteOther] = useState("");
  const [performedAtLocal, setPerformedAtLocal] = useState(() => toDatetimeLocalValue(new Date()));
  const [woundLength, setWoundLength] = useState<(typeof LACERATION_WOUND_LENGTH_VALUES)[number] | "">("");
  const [woundLengthOther, setWoundLengthOther] = useState("");
  const [anesthesia, setAnesthesia] = useState<(typeof LACERATION_ANESTHESIA_VALUES)[number] | "">("");
  const [anesthesiaOther, setAnesthesiaOther] = useState("");
  const [irrigation, setIrrigation] = useState<(typeof LACERATION_IRRIGATION_VALUES)[number] | "">("");
  const [irrigationOther, setIrrigationOther] = useState("");
  const [closureMethod, setClosureMethod] = useState<(typeof LACERATION_CLOSURE_VALUES)[number] | "">("");
  const [closureMethodOther, setClosureMethodOther] = useState("");
  const [suturesOrStaples, setSuturesOrStaples] = useState<(typeof LACERATION_SUTURES_VALUES)[number] | "">("");
  const [suturesOrStaplesOther, setSuturesOrStaplesOther] = useState("");
  const [asepticTechnique, setAsepticTechnique] = useState<boolean>(true);
  const [dressingApplied, setDressingApplied] = useState<boolean>(true);
  const [toleratedWell, setToleratedWell] = useState<boolean>(true);
  const [complications, setComplications] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setStep(initialNonLacerationStep ?? "menu");
    setSubmitErr(null);
    setSite("");
    setSiteOther("");
    setPerformedAtLocal(toDatetimeLocalValue(new Date()));
    setWoundLength("");
    setWoundLengthOther("");
    setAnesthesia("");
    setAnesthesiaOther("");
    setIrrigation("");
    setIrrigationOther("");
    setClosureMethod("");
    setClosureMethodOther("");
    setSuturesOrStaples("");
    setSuturesOrStaplesOther("");
    setAsepticTechnique(true);
    setDressingApplied(true);
    setToleratedWell(true);
    setComplications("");
    setNotes("");
  }, [open, initialNonLacerationStep]);

  const resetLacerationForm = () => {
    setSite("");
    setSiteOther("");
    setPerformedAtLocal(toDatetimeLocalValue(new Date()));
    setWoundLength("");
    setWoundLengthOther("");
    setAnesthesia("");
    setAnesthesiaOther("");
    setIrrigation("");
    setIrrigationOther("");
    setClosureMethod("");
    setClosureMethodOther("");
    setSuturesOrStaples("");
    setSuturesOrStaplesOther("");
    setAsepticTechnique(true);
    setDressingApplied(true);
    setToleratedWell(true);
    setComplications("");
    setNotes("");
    setSubmitErr(null);
  };

  const onSaveLaceration = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitErr(null);
    if (site === "OTHER" && !siteOther.trim()) {
      setSubmitErr(t("erProcedureLauncher.validationOtherRequired"));
      return;
    }
    if (woundLength === "OTHER" && !woundLengthOther.trim()) {
      setSubmitErr(t("erProcedureLauncher.validationOtherRequired"));
      return;
    }
    if (anesthesia === "OTHER" && !anesthesiaOther.trim()) {
      setSubmitErr(t("erProcedureLauncher.validationOtherRequired"));
      return;
    }
    if (irrigation === "OTHER" && !irrigationOther.trim()) {
      setSubmitErr(t("erProcedureLauncher.validationOtherRequired"));
      return;
    }
    if (closureMethod === "OTHER" && !closureMethodOther.trim()) {
      setSubmitErr(t("erProcedureLauncher.validationOtherRequired"));
      return;
    }
    if (suturesOrStaples === "OTHER" && !suturesOrStaplesOther.trim()) {
      setSubmitErr(t("erProcedureLauncher.validationOtherRequired"));
      return;
    }
    if (!site || !woundLength || !anesthesia || !irrigation || !closureMethod || !suturesOrStaples) {
      setSubmitErr(t("erProcedureLauncher.validationIncomplete"));
      return;
    }

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        procedureType: "LACERATION_REPAIR",
        site,
        woundLength,
        anesthesia,
        irrigation,
        closureMethod,
        suturesOrStaples,
        asepticTechnique,
        dressingApplied,
        toleratedWell,
      };
      if (performedAtLocal.trim()) {
        const d = new Date(performedAtLocal);
        if (!Number.isNaN(d.getTime())) body.performedAt = d.toISOString();
      }
      if (siteOther.trim()) body.siteOther = siteOther.trim();
      if (woundLengthOther.trim()) body.woundLengthOther = woundLengthOther.trim();
      if (anesthesiaOther.trim()) body.anesthesiaOther = anesthesiaOther.trim();
      if (irrigationOther.trim()) body.irrigationOther = irrigationOther.trim();
      if (closureMethodOther.trim()) body.closureMethodOther = closureMethodOther.trim();
      if (suturesOrStaplesOther.trim()) body.suturesOrStaplesOther = suturesOrStaplesOther.trim();
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
      setSubmitErr(
        normalizeUserFacingError(err instanceof Error ? err.message : null) || t("erProcedureLauncher.saveError")
      );
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

  const boolSelect = (value: boolean, onChange: (v: boolean) => void) => (
    <select
      value={value ? "true" : "false"}
      required
      onChange={(e) => onChange(e.target.value === "true")}
      style={{ ...inputStyle, marginBottom: 8 }}
    >
      <option value="true">{t("erProcedureLauncher.boolYes")}</option>
      <option value="false">{t("erProcedureLauncher.boolNo")}</option>
    </select>
  );

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
            {step === "menu"
              ? t("erProcedureLauncher.modalTitle")
              : step === "laceration"
                ? t("erProcedureLauncher.lacerationTitle")
                : t(NON_LACERATION_FORM_TITLE_I18N_KEYS[step])}
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
          {step === "laceration" && submitErr ? (
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
                {(
                  [
                    ["WOUND_CARE", "erProcedureLauncher.tileWoundCare"],
                    ["INCISION_AND_DRAINAGE", "erProcedureLauncher.tileIAndD"],
                    ["SPLINT_APPLICATION", "erProcedureLauncher.tileSplint"],
                    ["FOLEY_CATHETER", "erProcedureLauncher.tileFoley"],
                    ["EKG", "erProcedureLauncher.tileEkg"],
                    ["GLUCOSE_CHECK", "erProcedureLauncher.tileGlucose"],
                    ["URINE_COLLECTION", "erProcedureLauncher.tileUrine"],
                    ["PREGNANCY_TEST", "erProcedureLauncher.tilePregnancy"],
                  ] as const
                ).map(([proc, labelKey]) => (
                  <button
                    key={proc}
                    type="button"
                    onClick={() => {
                      setStep(proc);
                      setSubmitErr(null);
                    }}
                    style={{
                      ...tileBase,
                      background: "#eff6ff",
                      borderColor: "#93c5fd",
                      color: "#1e40af",
                    }}
                  >
                    {t(labelKey)}
                  </button>
                ))}
                <div style={comingSoonTile}>
                  <span>{t("erProcedureLauncher.tileChestTube")}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", marginTop: 4 }}>
                    {t("erProcedureLauncher.comingSoon")}
                  </span>
                </div>
                <div style={comingSoonTile}>
                  <span>{t("erProcedureLauncher.tileIntubation")}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", marginTop: 4 }}>
                    {t("erProcedureLauncher.comingSoon")}
                  </span>
                </div>
                <div style={comingSoonTile}>
                  <span>{t("erProcedureLauncher.tileCentralLine")}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", marginTop: 4 }}>
                    {t("erProcedureLauncher.comingSoon")}
                  </span>
                </div>
                <div style={comingSoonTile}>
                  <span>{t("erProcedureLauncher.tileProceduralSedation")}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", marginTop: 4 }}>
                    {t("erProcedureLauncher.comingSoon")}
                  </span>
                </div>
                <div style={comingSoonTile}>
                  <span>{t("erProcedureLauncher.tileReduction")}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", marginTop: 4 }}>
                    {t("erProcedureLauncher.comingSoon")}
                  </span>
                </div>
                <div style={comingSoonTile}>
                  <span>{t("erProcedureLauncher.tileThoracentesis")}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", marginTop: 4 }}>
                    {t("erProcedureLauncher.comingSoon")}
                  </span>
                </div>
                <div style={comingSoonTile}>
                  <span>{t("erProcedureLauncher.tilePelvicExam")}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", marginTop: 4 }}>
                    {t("erProcedureLauncher.comingSoon")}
                  </span>
                </div>
                <div style={comingSoonTile}>
                  <span>{t("erProcedureLauncher.tileLumbarPuncture")}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", marginTop: 4 }}>
                    {t("erProcedureLauncher.comingSoon")}
                  </span>
                </div>
              </div>
            </>
          ) : step === "laceration" ? (
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
              {enumSelect({
                value: site,
                onChange: setSite,
                values: LACERATION_SITE_VALUES,
                labelKey: (v) => `erProcedureLauncher.site.${v}`,
                t,
                required: true,
                placeholderKey: "erProcedureLauncher.selectPlaceholder",
              })}
              {site === "OTHER" ? (
                <>
                  <label style={labelStyle}>{t("erProcedureLauncher.fieldSiteOther")}</label>
                  <input
                    type="text"
                    value={siteOther}
                    onChange={(e) => setSiteOther(e.target.value)}
                    style={{ ...inputStyle, marginBottom: 10 }}
                  />
                </>
              ) : null}

              <label style={labelStyle}>{t("erProcedureLauncher.fieldPerformedAt")}</label>
              <input
                type="datetime-local"
                value={performedAtLocal}
                onChange={(e) => setPerformedAtLocal(e.target.value)}
                style={{ ...inputStyle, marginBottom: 10 }}
              />

              <label style={labelStyle}>{t("erProcedureLauncher.fieldWoundLength")}</label>
              {enumSelect({
                value: woundLength,
                onChange: setWoundLength,
                values: LACERATION_WOUND_LENGTH_VALUES,
                labelKey: (v) => `erProcedureLauncher.woundLength.${v}`,
                t,
                required: true,
                placeholderKey: "erProcedureLauncher.selectPlaceholder",
              })}
              {woundLength === "OTHER" ? (
                <>
                  <label style={labelStyle}>{t("erProcedureLauncher.fieldWoundLengthOther")}</label>
                  <input
                    type="text"
                    value={woundLengthOther}
                    onChange={(e) => setWoundLengthOther(e.target.value)}
                    style={{ ...inputStyle, marginBottom: 10 }}
                  />
                </>
              ) : null}

              <label style={labelStyle}>{t("erProcedureLauncher.fieldAnesthesia")}</label>
              {enumSelect({
                value: anesthesia,
                onChange: setAnesthesia,
                values: LACERATION_ANESTHESIA_VALUES,
                labelKey: (v) => `erProcedureLauncher.anesthesia.${v}`,
                t,
                required: true,
                placeholderKey: "erProcedureLauncher.selectPlaceholder",
              })}
              {anesthesia === "OTHER" ? (
                <>
                  <label style={labelStyle}>{t("erProcedureLauncher.fieldAnesthesiaOther")}</label>
                  <input
                    type="text"
                    value={anesthesiaOther}
                    onChange={(e) => setAnesthesiaOther(e.target.value)}
                    style={{ ...inputStyle, marginBottom: 10 }}
                  />
                </>
              ) : null}

              <label style={labelStyle}>{t("erProcedureLauncher.fieldIrrigation")}</label>
              {enumSelect({
                value: irrigation,
                onChange: setIrrigation,
                values: LACERATION_IRRIGATION_VALUES,
                labelKey: (v) => `erProcedureLauncher.irrigation.${v}`,
                t,
                required: true,
                placeholderKey: "erProcedureLauncher.selectPlaceholder",
              })}
              {irrigation === "OTHER" ? (
                <>
                  <label style={labelStyle}>{t("erProcedureLauncher.fieldIrrigationOther")}</label>
                  <input
                    type="text"
                    value={irrigationOther}
                    onChange={(e) => setIrrigationOther(e.target.value)}
                    style={{ ...inputStyle, marginBottom: 10 }}
                  />
                </>
              ) : null}

              <label style={labelStyle}>{t("erProcedureLauncher.fieldAsepticTechnique")}</label>
              {boolSelect(asepticTechnique, setAsepticTechnique)}

              <label style={labelStyle}>{t("erProcedureLauncher.fieldClosure")}</label>
              {enumSelect({
                value: closureMethod,
                onChange: setClosureMethod,
                values: LACERATION_CLOSURE_VALUES,
                labelKey: (v) => `erProcedureLauncher.closureMethod.${v}`,
                t,
                required: true,
                placeholderKey: "erProcedureLauncher.selectPlaceholder",
              })}
              {closureMethod === "OTHER" ? (
                <>
                  <label style={labelStyle}>{t("erProcedureLauncher.fieldClosureOther")}</label>
                  <input
                    type="text"
                    value={closureMethodOther}
                    onChange={(e) => setClosureMethodOther(e.target.value)}
                    style={{ ...inputStyle, marginBottom: 10 }}
                  />
                </>
              ) : null}

              <label style={labelStyle}>{t("erProcedureLauncher.fieldSutures")}</label>
              {enumSelect({
                value: suturesOrStaples,
                onChange: setSuturesOrStaples,
                values: LACERATION_SUTURES_VALUES,
                labelKey: (v) => `erProcedureLauncher.suturesOrStaples.${v}`,
                t,
                required: true,
                placeholderKey: "erProcedureLauncher.selectPlaceholder",
              })}
              {suturesOrStaples === "OTHER" ? (
                <>
                  <label style={labelStyle}>{t("erProcedureLauncher.fieldSuturesOther")}</label>
                  <input
                    type="text"
                    value={suturesOrStaplesOther}
                    onChange={(e) => setSuturesOrStaplesOther(e.target.value)}
                    style={{ ...inputStyle, marginBottom: 10 }}
                  />
                </>
              ) : null}

              <label style={labelStyle}>{t("erProcedureLauncher.fieldDressing")}</label>
              {boolSelect(dressingApplied, setDressingApplied)}

              <label style={labelStyle}>{t("erProcedureLauncher.fieldTolerated")}</label>
              {boolSelect(toleratedWell, setToleratedWell)}

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
          ) : (
            <NonLacerationProcedureForm
              procedureType={step}
              encounterId={encounterId}
              facilityId={facilityId}
              onRecorded={onRecorded}
              onBack={() => {
                setStep("menu");
                setSubmitErr(null);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
