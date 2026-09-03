"use client";

/**
 * MEDUI.D5A.4 / D5A.5 — Enterprise interactive odontogram mounted in Dental workspace.
 */

import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";
import {
  D5A4_CERTIFICATION_ID,
  D5A4_CLINICAL_STATES,
  D5A4_FINDING_CATALOG,
  formatToothDisplayLabel,
  getCanonicalTooth,
  listTeethForDentition,
  normalizeSurfaceCodes,
  pickDominantFindingForTooth,
  type D5a4Arch,
  type D5a4CanonicalTooth,
  type D5a4DentitionType,
  type D5a4ToothNumberingSystem,
  type D5a4ToothSurface,
} from "@medora/shared";
import { apiFetch } from "@/lib/apiClient";
import { useI18n } from "@/lib/i18n";
import { resolveProductUiLanguageOrDefault } from "@/i18n/config";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import { DentalToothSvg } from "./DentalToothSvg";
import { DentalOdontogramLegend } from "./DentalOdontogramLegend";
import { DentalFindingPanel, type OdontogramFindingRow } from "./DentalFindingPanel";

type OdontogramPayload = {
  certificationId?: string;
  patientId: string;
  encounterStatus?: string;
  readOnly: boolean;
  canEdit: boolean;
  dentitionType: D5a4DentitionType;
  numberingSystem: D5a4ToothNumberingSystem;
  currentFindings: OdontogramFindingRow[];
  encounterFindings: OdontogramFindingRow[];
  history: OdontogramFindingRow[];
};

type Props = {
  encounterId: string;
  facilityId: string;
  locked: boolean;
};

export function EnterpriseDentalOdontogramPanel({ encounterId, facilityId, locked }: Props) {
  const { t, language } = useI18n();
  const [data, setData] = useState<OdontogramPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [lastClickedCode, setLastClickedCode] = useState<string | null>(null);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedSurfaces, setSelectedSurfaces] = useState<D5a4ToothSurface[]>([]);
  const [findingType, setFindingType] = useState("CARIES");
  const [clinicalState, setClinicalState] = useState("OBSERVED");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [dentitionType, setDentitionType] = useState<D5a4DentitionType>("PERMANENT");
  const [numberingSystem, setNumberingSystem] = useState<D5a4ToothNumberingSystem>("FDI");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = (await apiFetch(
        `/dental-care/encounters/${encodeURIComponent(encounterId)}/odontogram`,
        { facilityId }
      )) as OdontogramPayload;
      setData(res);
      setDentitionType(res.dentitionType ?? "PERMANENT");
      setNumberingSystem(res.numberingSystem ?? "FDI");
    } catch (e) {
      setError(normalizeUserFacingError(e instanceof Error ? e.message : null, resolveProductUiLanguageOrDefault(language)));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [encounterId, facilityId, language]);

  useEffect(() => {
    void load();
  }, [load]);

  const readOnly = locked || !data?.canEdit || Boolean(data?.readOnly);

  const maxillary = useMemo(
    () => listTeethForDentition(dentitionType, "MAXILLARY"),
    [dentitionType]
  );
  const mandibular = useMemo(
    () => listTeethForDentition(dentitionType, "MANDIBULAR"),
    [dentitionType]
  );

  const current = data?.currentFindings ?? [];
  const primarySelectedCode = selectedCodes.length === 1 ? selectedCodes[0]! : null;
  const selectedTooth: D5a4CanonicalTooth | null = primarySelectedCode
    ? getCanonicalTooth(primarySelectedCode)
    : null;

  const selectedLabels = selectedCodes
    .map((code) => {
      const tooth = getCanonicalTooth(code);
      return tooth ? formatToothDisplayLabel(tooth, numberingSystem) : code;
    })
    .join(", ");

  const surfaceFindingsFor = (code: string) => {
    const map: Partial<Record<D5a4ToothSurface, string>> = {};
    for (const f of current.filter((x) => x.toothCode === code && x.scope === "SURFACE_SPECIFIC")) {
      for (const s of normalizeSurfaceCodes(f.surfaces)) {
        map[s] = f.findingType;
      }
    }
    return map;
  };

  const toggleSurface = (s: D5a4ToothSurface) => {
    setSelectedSurfaces((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const handleToothClick = (code: string, arch: D5a4Arch, event: MouseEvent<HTMLButtonElement>) => {
    const archTeeth = arch === "MAXILLARY" ? maxillary : mandibular;

    if (multiSelectMode || event.metaKey || event.ctrlKey) {
      setSelectedCodes((prev) =>
        prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
      );
      setLastClickedCode(code);
      if (selectedCodes.length <= 1) setSelectedSurfaces([]);
      return;
    }

    if (event.shiftKey && lastClickedCode) {
      const anchor = getCanonicalTooth(lastClickedCode);
      const target = getCanonicalTooth(code);
      if (anchor && target && anchor.arch === target.arch) {
        const idx1 = archTeeth.findIndex((t) => t.code === lastClickedCode);
        const idx2 = archTeeth.findIndex((t) => t.code === code);
        if (idx1 >= 0 && idx2 >= 0) {
          const [start, end] = idx1 < idx2 ? [idx1, idx2] : [idx2, idx1];
          const range = archTeeth.slice(start, end + 1).map((t) => t.code);
          setSelectedCodes((prev) => Array.from(new Set([...prev, ...range])));
          setSelectedSurfaces([]);
          return;
        }
      }
    }

    setSelectedCodes([code]);
    setLastClickedCode(code);
    setSelectedSurfaces([]);
  };

  const selectArch = (arch: D5a4Arch) => {
    const teeth = arch === "MAXILLARY" ? maxillary : mandibular;
    setSelectedCodes(teeth.map((t) => t.code));
    setSelectedSurfaces([]);
  };

  const clearSelection = () => {
    setSelectedCodes([]);
    setLastClickedCode(null);
    setSelectedSurfaces([]);
  };

  const persistDentitionPrefs = async (nextD: D5a4DentitionType, nextN: D5a4ToothNumberingSystem) => {
    if (!data?.patientId || readOnly) {
      setDentitionType(nextD);
      setNumberingSystem(nextN);
      return;
    }
    try {
      await apiFetch(`/dental-care/patients/${encodeURIComponent(data.patientId)}/dentition`, {
        method: "PUT",
        facilityId,
        body: JSON.stringify({ dentitionType: nextD, numberingSystem: nextN }),
      });
      setDentitionType(nextD);
      setNumberingSystem(nextN);
    } catch (e) {
      setError(normalizeUserFacingError(e instanceof Error ? e.message : null, resolveProductUiLanguageOrDefault(language)));
    }
  };

  const saveFinding = async () => {
    if (selectedCodes.length === 0 || readOnly) return;
    setSaving(true);
    setError(null);
    try {
      const scope = selectedSurfaces.length > 0 ? "SURFACE_SPECIFIC" : "WHOLE_TOOTH";
      if (selectedCodes.length > 1) {
        await apiFetch(`/dental-care/encounters/${encodeURIComponent(encounterId)}/tooth-findings/bulk`, {
          method: "POST",
          facilityId,
          body: JSON.stringify({
            toothCodes: selectedCodes,
            scope,
            surfaces: selectedSurfaces,
            findingType,
            clinicalState,
            notes: notes.trim() || null,
          }),
        });
      } else {
        await apiFetch(`/dental-care/encounters/${encodeURIComponent(encounterId)}/tooth-findings`, {
          method: "POST",
          facilityId,
          body: JSON.stringify({
            toothCode: selectedCodes[0],
            scope,
            surfaces: selectedSurfaces,
            findingType,
            clinicalState,
            notes: notes.trim() || null,
          }),
        });
      }
      setNotes("");
      await load();
    } catch (e) {
      setError(normalizeUserFacingError(e instanceof Error ? e.message : null, resolveProductUiLanguageOrDefault(language)));
    } finally {
      setSaving(false);
    }
  };

  const voidFinding = async (id: string) => {
    if (readOnly) return;
    setSaving(true);
    try {
      await apiFetch(`/dental-care/tooth-findings/${encodeURIComponent(id)}`, {
        method: "PATCH",
        facilityId,
        body: JSON.stringify({ action: "VOID", reason: "CORRECTION" }),
      });
      await load();
    } catch (e) {
      setError(normalizeUserFacingError(e instanceof Error ? e.message : null, resolveProductUiLanguageOrDefault(language)));
    } finally {
      setSaving(false);
    }
  };

  const renderArch = (teeth: D5a4CanonicalTooth[], title: string, arch: D5a4Arch) => (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 8 }}>{title}</div>
      <div
        style={{
          display: "flex",
          flexWrap: "nowrap",
          gap: 4,
          overflowX: "auto",
          paddingBottom: 6,
        }}
      >
        {teeth.map((tooth) => {
          const dominant = pickDominantFindingForTooth(current, tooth.code);
          const label = formatToothDisplayLabel(tooth, numberingSystem);
          const aria = t("dentalCareD5a4.toothAria")
            .replace("{label}", label)
            .replace(
              "{name}",
              `${t(`dentalCareD5a4.arches.${tooth.arch}`)} ${t(`dentalCareD5a4.sides.${tooth.side}`)} ${t(`dentalCareD5a4.morphology.${tooth.morphology}`)}`
            );
          const isSelected = selectedCodes.includes(tooth.code);
          return (
            <DentalToothSvg
              key={tooth.code}
              tooth={tooth}
              label={label}
              ariaLabel={aria}
              selected={isSelected}
              selectedSurfaces={isSelected && selectedCodes.length === 1 ? selectedSurfaces : []}
              dominantFindingType={dominant?.findingType ?? null}
              surfaceFindings={surfaceFindingsFor(tooth.code)}
              disabled={false}
              onSelectTooth={(event) => handleToothClick(tooth.code, arch, event)}
              onToggleSurface={(s) => {
                if (!selectedCodes.includes(tooth.code)) {
                  setSelectedCodes([tooth.code]);
                  setLastClickedCode(tooth.code);
                }
                toggleSurface(s);
              }}
            />
          );
        })}
      </div>
    </div>
  );

  const createStates = D5A4_CLINICAL_STATES.filter((s) => !["AMENDED", "VOIDED"].includes(s));

  if (loading) {
    return <p style={{ margin: 0, color: "#64748b" }}>{t("common.loading")}</p>;
  }

  return (
    <div data-testid="enterprise-dental-odontogram" data-certification={D5A4_CERTIFICATION_ID}>
      <div style={{ ...MEDORA_CARD_SHELL, padding: 14 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{t("dentalCareD5a4.title")}</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="checkbox"
                checked={multiSelectMode}
                onChange={(e) => setMultiSelectMode(e.target.checked)}
              />
              {t("dentalCareD5a5.odontogram.multiSelect")}
            </label>
            <label style={{ fontSize: 12 }}>
              {t("dentalCareD5a4.dentition")}
              <select
                value={dentitionType}
                disabled={readOnly}
                onChange={(e) => void persistDentitionPrefs(e.target.value as D5a4DentitionType, numberingSystem)}
                style={{ marginLeft: 6, padding: 4, borderRadius: 6, border: "1px solid #e2e8f0" }}
              >
                <option value="PERMANENT">{t("dentalCareD5a4.dentitionTypes.PERMANENT")}</option>
                <option value="PRIMARY">{t("dentalCareD5a4.dentitionTypes.PRIMARY")}</option>
                <option value="MIXED">{t("dentalCareD5a4.dentitionTypes.MIXED")}</option>
              </select>
            </label>
            <label style={{ fontSize: 12 }}>
              {t("dentalCareD5a4.numbering")}
              <select
                value={numberingSystem}
                disabled={readOnly}
                onChange={(e) =>
                  void persistDentitionPrefs(dentitionType, e.target.value as D5a4ToothNumberingSystem)
                }
                style={{ marginLeft: 6, padding: 4, borderRadius: 6, border: "1px solid #e2e8f0" }}
              >
                <option value="FDI">FDI</option>
                <option value="UNIVERSAL">Universal</option>
                <option value="PALMER">Palmer</option>
              </select>
            </label>
            <button
              type="button"
              onClick={() => void load()}
              style={{
                fontSize: 12,
                border: "1px solid #e2e8f0",
                borderRadius: 6,
                padding: "4px 10px",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              {t("dentalCareD5a4.refresh")}
            </button>
          </div>
        </div>
        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
          <button
            type="button"
            onClick={clearSelection}
            style={{ fontSize: 11, padding: "4px 8px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer" }}
          >
            {t("dentalCareD5a5.odontogram.clearSelection")}
          </button>
          <button
            type="button"
            onClick={() => selectArch("MAXILLARY")}
            style={{ fontSize: 11, padding: "4px 8px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer" }}
          >
            {t("dentalCareD5a5.odontogram.selectArchMaxillary")}
          </button>
          <button
            type="button"
            onClick={() => selectArch("MANDIBULAR")}
            style={{ fontSize: 11, padding: "4px 8px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer" }}
          >
            {t("dentalCareD5a5.odontogram.selectArchMandibular")}
          </button>
          {selectedCodes.length > 0 ? (
            <strong style={{ fontSize: 12, color: "#1d4ed8" }}>
              {t("dentalCareD5a5.odontogram.selected")}: {selectedLabels}
            </strong>
          ) : null}
        </div>
        <p style={{ margin: "8px 0 0", fontSize: 12, color: "#64748b" }}>{t("dentalCareD5a4.subtitle")}</p>
        {error ? (
          <p role="alert" style={{ margin: "8px 0 0", color: "#b91c1c", fontSize: 13 }}>
            {error}
          </p>
        ) : null}
        {renderArch(maxillary, t("dentalCareD5a4.arch.maxillary"), "MAXILLARY")}
        {renderArch(mandibular, t("dentalCareD5a4.arch.mandibular"), "MANDIBULAR")}
      </div>

      <div style={{ marginTop: 12 }}>
        <DentalOdontogramLegend />
      </div>

      <div
        style={{
          marginTop: 12,
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(280px, 360px)",
          gap: 12,
          alignItems: "start",
        }}
      >
        <div style={{ ...MEDORA_CARD_SHELL, padding: 14 }}>
          <h4 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700 }}>{t("dentalCareD5a4.encounterFindings")}</h4>
          {(data?.encounterFindings ?? []).filter((f) => !f.voidedAt && f.clinicalState !== "VOIDED").length ===
          0 ? (
            <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>{t("dentalCareD5a4.noEncounterFindings")}</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
              {(data?.encounterFindings ?? [])
                .filter((f) => !f.voidedAt && f.clinicalState !== "VOIDED")
                .map((f) => {
                  const tooth = getCanonicalTooth(f.toothCode);
                  const lbl = tooth ? formatToothDisplayLabel(tooth, numberingSystem) : f.toothCode;
                  return (
                    <li key={f.id}>
                      #{lbl} — {t(`dentalCareD5a4.findings.${f.findingType}`)}
                      {f.surfaces?.length ? ` (${f.surfaces.join("+")})` : ""} ·{" "}
                      {t(`dentalCareD5a4.states.${f.clinicalState}`)}
                    </li>
                  );
                })}
            </ul>
          )}
        </div>

        {selectedCodes.length > 1 ? (
          <aside style={{ ...MEDORA_CARD_SHELL, padding: 14, minWidth: 280, maxWidth: 380 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
              {t("dentalCareD5a5.odontogram.bulkSave")} ({selectedCodes.length})
            </h3>
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "#64748b" }}>{selectedLabels}</p>
            {!readOnly ? (
              <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 600 }}>
                  {t("dentalCareD5a4.panel.findingType")}
                  <select
                    value={findingType}
                    onChange={(e) => setFindingType(e.target.value)}
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
                    value={clinicalState}
                    onChange={(e) => setClinicalState(e.target.value)}
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
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    style={{ display: "block", width: "100%", marginTop: 4, padding: 8, borderRadius: 8, border: "1px solid #e2e8f0" }}
                  />
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void saveFinding()}
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
                    {saving ? t("common.loading") : t("dentalCareD5a5.odontogram.bulkSave")}
                  </button>
                  <button
                    type="button"
                    onClick={clearSelection}
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
          </aside>
        ) : selectedTooth ? (
          <DentalFindingPanel
            tooth={selectedTooth}
            numberingSystem={numberingSystem}
            selectedSurfaces={selectedSurfaces}
            onToggleSurface={toggleSurface}
            onClearSurfaces={() => setSelectedSurfaces([])}
            existingFindings={current.filter((f) => f.toothCode === selectedTooth.code)}
            history={(data?.history ?? []).filter((f) => f.toothCode === selectedTooth.code)}
            readOnly={readOnly}
            saving={saving}
            findingType={findingType}
            clinicalState={clinicalState}
            notes={notes}
            onFindingTypeChange={setFindingType}
            onClinicalStateChange={setClinicalState}
            onNotesChange={setNotes}
            onSave={() => void saveFinding()}
            onCancel={clearSelection}
            onVoid={(id) => void voidFinding(id)}
          />
        ) : (
          <div style={{ ...MEDORA_CARD_SHELL, padding: 14, fontSize: 13, color: "#64748b" }}>
            {t("dentalCareD5a4.selectToothHint")}
          </div>
        )}
      </div>
    </div>
  );
}
