"use client";

/**
 * MEDUI.D5A.4 — Enterprise interactive odontogram mounted in Dental workspace.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  D5A4_CERTIFICATION_ID,
  formatToothDisplayLabel,
  getCanonicalTooth,
  listTeethForDentition,
  normalizeSurfaceCodes,
  pickDominantFindingForTooth,
  type D5a4CanonicalTooth,
  type D5a4DentitionType,
  type D5a4ToothNumberingSystem,
  type D5a4ToothSurface,
} from "@medora/shared";
import { apiFetch } from "@/lib/apiClient";
import { useI18n } from "@/lib/i18n";
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
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
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
      setError(normalizeUserFacingError(e instanceof Error ? e.message : null, language === "fr" ? "fr" : "en"));
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
  const selectedTooth: D5a4CanonicalTooth | null = selectedCode
    ? getCanonicalTooth(selectedCode)
    : null;

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
      setError(normalizeUserFacingError(e instanceof Error ? e.message : null, language === "fr" ? "fr" : "en"));
    }
  };

  const saveFinding = async () => {
    if (!selectedCode || readOnly) return;
    setSaving(true);
    setError(null);
    try {
      const scope = selectedSurfaces.length > 0 ? "SURFACE_SPECIFIC" : "WHOLE_TOOTH";
      await apiFetch(`/dental-care/encounters/${encodeURIComponent(encounterId)}/tooth-findings`, {
        method: "POST",
        facilityId,
        body: JSON.stringify({
          toothCode: selectedCode,
          scope,
          surfaces: selectedSurfaces,
          findingType,
          clinicalState,
          notes: notes.trim() || null,
        }),
      });
      setNotes("");
      await load();
    } catch (e) {
      setError(normalizeUserFacingError(e instanceof Error ? e.message : null, language === "fr" ? "fr" : "en"));
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
      setError(normalizeUserFacingError(e instanceof Error ? e.message : null, language === "fr" ? "fr" : "en"));
    } finally {
      setSaving(false);
    }
  };

  const renderArch = (teeth: D5a4CanonicalTooth[], title: string) => (
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
          return (
            <DentalToothSvg
              key={tooth.code}
              tooth={tooth}
              label={label}
              ariaLabel={aria}
              selected={selectedCode === tooth.code}
              selectedSurfaces={selectedCode === tooth.code ? selectedSurfaces : []}
              dominantFindingType={dominant?.findingType ?? null}
              surfaceFindings={surfaceFindingsFor(tooth.code)}
              disabled={false}
              onSelectTooth={() => {
                setSelectedCode(tooth.code);
                setSelectedSurfaces([]);
              }}
              onToggleSurface={(s) => {
                setSelectedCode(tooth.code);
                toggleSurface(s);
              }}
            />
          );
        })}
      </div>
    </div>
  );

  if (loading) {
    return <p style={{ margin: 0, color: "#64748b" }}>{t("common.loading")}</p>;
  }

  return (
    <div data-testid="enterprise-dental-odontogram" data-certification={D5A4_CERTIFICATION_ID}>
      <div style={{ ...MEDORA_CARD_SHELL, padding: 14 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{t("dentalCareD5a4.title")}</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
        <p style={{ margin: "8px 0 0", fontSize: 12, color: "#64748b" }}>{t("dentalCareD5a4.subtitle")}</p>
        {error ? (
          <p role="alert" style={{ margin: "8px 0 0", color: "#b91c1c", fontSize: 13 }}>
            {error}
          </p>
        ) : null}
        {renderArch(maxillary, t("dentalCareD5a4.arch.maxillary"))}
        {renderArch(mandibular, t("dentalCareD5a4.arch.mandibular"))}
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

        {selectedTooth ? (
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
            onCancel={() => {
              setSelectedCode(null);
              setSelectedSurfaces([]);
            }}
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
