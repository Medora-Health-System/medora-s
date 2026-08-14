"use client";

import {
  D5A4_CLINICAL_STATES,
  D5A4_FINDING_CATALOG,
  D5A4_TOOTH_SURFACES,
  type D5a4CanonicalTooth,
  type D5a4ToothNumberingSystem,
  type D5a4ToothSurface,
  formatToothDisplayLabel,
} from "@medora/shared";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import { useI18n } from "@/lib/i18n";

export type OdontogramFindingRow = {
  id: string;
  toothCode: string;
  scope: string;
  surfaces: string[];
  findingType: string;
  clinicalState: string;
  notes?: string | null;
  documentedAt: string;
  encounterId: string;
  documentedByDisplay?: string | null;
  voidedAt?: string | null;
};

type Props = {
  tooth: D5a4CanonicalTooth;
  numberingSystem: D5a4ToothNumberingSystem;
  selectedSurfaces: D5a4ToothSurface[];
  onToggleSurface: (s: D5a4ToothSurface) => void;
  onClearSurfaces: () => void;
  existingFindings: OdontogramFindingRow[];
  history: OdontogramFindingRow[];
  readOnly: boolean;
  saving: boolean;
  findingType: string;
  clinicalState: string;
  notes: string;
  onFindingTypeChange: (v: string) => void;
  onClinicalStateChange: (v: string) => void;
  onNotesChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onVoid: (id: string) => void;
};

export function DentalFindingPanel(props: Props) {
  const { t } = useI18n();
  const label = formatToothDisplayLabel(props.tooth, props.numberingSystem);
  const createStates = D5A4_CLINICAL_STATES.filter(
    (s) => !["AMENDED", "VOIDED"].includes(s)
  );

  return (
    <aside
      data-testid="dental-finding-panel"
      style={{ ...MEDORA_CARD_SHELL, padding: 14, minWidth: 280, maxWidth: 380 }}
    >
      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
        {t("dentalCareD5a4.panel.title").replace("{tooth}", label)}
      </h3>
      <p style={{ margin: "6px 0 0", fontSize: 12, color: "#64748b" }}>
        {t(`dentalCareD5a4.arches.${props.tooth.arch}`)} · {t(`dentalCareD5a4.sides.${props.tooth.side}`)} ·{" "}
        {t(`dentalCareD5a4.morphology.${props.tooth.morphology}`)} · {props.tooth.code}
      </p>

      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>{t("dentalCareD5a4.panel.surfaces")}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {D5A4_TOOTH_SURFACES.map((s) => {
            const on = props.selectedSurfaces.includes(s);
            return (
              <button
                key={s}
                type="button"
                disabled={props.readOnly}
                aria-pressed={on}
                onClick={() => props.onToggleSurface(s)}
                style={{
                  fontSize: 11,
                  padding: "4px 8px",
                  borderRadius: 999,
                  border: on ? "1px solid #1d4ed8" : "1px solid #e2e8f0",
                  background: on ? "#dbeafe" : "#fff",
                  cursor: props.readOnly ? "default" : "pointer",
                }}
              >
                {t(`dentalCareD5a4.surfaces.${s}`)}
              </button>
            );
          })}
        </div>
        {props.selectedSurfaces.length > 0 ? (
          <p style={{ margin: "8px 0 0", fontSize: 12 }}>
            {t("dentalCareD5a4.panel.selectedSurfaces")}:{" "}
            {props.selectedSurfaces.map((s) => t(`dentalCareD5a4.surfaces.${s}`)).join(" · ")}
            {!props.readOnly ? (
              <button
                type="button"
                onClick={props.onClearSurfaces}
                style={{ marginLeft: 8, fontSize: 11, border: "none", background: "transparent", color: "#2563eb", cursor: "pointer" }}
              >
                {t("dentalCareD5a4.panel.clearSurfaces")}
              </button>
            ) : null}
          </p>
        ) : (
          <p style={{ margin: "8px 0 0", fontSize: 12, color: "#64748b" }}>{t("dentalCareD5a4.panel.wholeToothHint")}</p>
        )}
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>{t("dentalCareD5a4.panel.existing")}</div>
        {props.existingFindings.length === 0 ? (
          <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>{t("dentalCareD5a4.panel.noExisting")}</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12 }}>
            {props.existingFindings.map((f) => (
              <li key={f.id} style={{ marginBottom: 4 }}>
                {t(`dentalCareD5a4.findings.${f.findingType}`)} · {t(`dentalCareD5a4.states.${f.clinicalState}`)}
                {f.surfaces?.length ? ` · ${f.surfaces.join("+")}` : ""}
                {!props.readOnly ? (
                  <button
                    type="button"
                    onClick={() => props.onVoid(f.id)}
                    style={{ marginLeft: 6, fontSize: 11, border: "none", background: "transparent", color: "#b91c1c", cursor: "pointer" }}
                  >
                    {t("dentalCareD5a4.panel.void")}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      {!props.readOnly ? (
        <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>
            {t("dentalCareD5a4.panel.findingType")}
            <select
              value={props.findingType}
              onChange={(e) => props.onFindingTypeChange(e.target.value)}
              style={{ display: "block", width: "100%", marginTop: 4, padding: 8, borderRadius: 8, border: "1px solid #e2e8f0" }}
            >
              {D5A4_FINDING_CATALOG.map((code) => (
                <option key={code} value={code}>
                  {t(`dentalCareD5a4.findings.${code}`)}
                </option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: 12, fontWeight: 600 }}>
            {t("dentalCareD5a4.panel.status")}
            <select
              value={props.clinicalState}
              onChange={(e) => props.onClinicalStateChange(e.target.value)}
              style={{ display: "block", width: "100%", marginTop: 4, padding: 8, borderRadius: 8, border: "1px solid #e2e8f0" }}
            >
              {createStates.map((code) => (
                <option key={code} value={code}>
                  {t(`dentalCareD5a4.states.${code}`)}
                </option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: 12, fontWeight: 600 }}>
            {t("dentalCareD5a4.panel.notes")}
            <textarea
              value={props.notes}
              onChange={(e) => props.onNotesChange(e.target.value)}
              rows={3}
              style={{ display: "block", width: "100%", marginTop: 4, padding: 8, borderRadius: 8, border: "1px solid #e2e8f0" }}
            />
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              disabled={props.saving}
              onClick={props.onSave}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: 8,
                border: "none",
                background: "#0f172a",
                color: "#fff",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {props.saving ? t("common.loading") : t("dentalCareD5a4.panel.save")}
            </button>
            <button
              type="button"
              onClick={props.onCancel}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      ) : (
        <p style={{ marginTop: 12, fontSize: 12, color: "#64748b" }}>{t("dentalCareD5a4.panel.readOnly")}</p>
      )}

      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>{t("dentalCareD5a4.panel.history")}</div>
        {props.history.length === 0 ? (
          <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>{t("dentalCareD5a4.panel.noHistory")}</p>
        ) : (
          <ol style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: "#334155" }}>
            {props.history.map((h) => (
              <li key={h.id} style={{ marginBottom: 4 }}>
                {new Date(h.documentedAt).toLocaleString()} — {t(`dentalCareD5a4.findings.${h.findingType}`)} (
                {t(`dentalCareD5a4.states.${h.clinicalState}`)})
                {h.documentedByDisplay ? ` · ${h.documentedByDisplay}` : ""}
              </li>
            ))}
          </ol>
        )}
      </div>
    </aside>
  );
}
