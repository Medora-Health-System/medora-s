"use client";

/**
 * MEDUI.INP.2B.2A / INP.2B.2D — Reuses enterprise clinical-history-profile authority.
 * Home medications reuse GET /catalog/medications/search (SharedCatalogAutocomplete).
 * Does not create orders or MAR doses.
 */

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import {
  nursingAdmissionHomeMedSearchMinChars,
  nursingAdmissionHomeMedUpdateCreatesOrderOrMar,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { apiFetch, asApiObject } from "@/lib/apiClient";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import { SharedCatalogAutocomplete } from "@/components/catalog/SharedCatalogAutocomplete";
import type { CatalogSearchItem } from "@/lib/catalogSearchTypes";

export type NursingAdmissionHistoryEditorDomain =
  | "MEDICAL_HISTORY"
  | "SURGICAL_HISTORY"
  | "HOME_MEDICATIONS"
  | "SOCIAL_HISTORY";

type HomeMedLine = {
  code: string;
  name: string;
  strength: string;
  route: string;
  frequency: string;
};

function formatHomeMedLine(line: HomeMedLine): string {
  return [line.name, line.strength, line.route, line.frequency].filter(Boolean).join(" · ");
}

function parseHomeMedLines(summary: string): HomeMedLine[] {
  return String(summary ?? "")
    .split("\n")
    .map((row) => row.trim())
    .filter(Boolean)
    .map((row) => {
      const parts = row.split(" · ").map((p) => p.trim());
      return {
        code: "",
        name: parts[0] ?? row,
        strength: parts[1] ?? "",
        route: parts[2] ?? "",
        frequency: parts[3] ?? "",
      };
    });
}

export function NursingAdmissionEnterpriseHistoryEditor({
  open,
  domain,
  patientId,
  encounterId,
  socialFocus,
  onClose,
  onSaved,
}: {
  open: boolean;
  domain: NursingAdmissionHistoryEditorDomain;
  patientId: string;
  encounterId: string;
  socialFocus?: "smoking" | "alcohol" | "substances";
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const { t } = useI18n();
  const { facilityId } = useFacilityAndRoles();
  const [value, setValue] = useState("");
  const [smoking, setSmoking] = useState("");
  const [alcohol, setAlcohol] = useState("");
  const [marijuana, setMarijuana] = useState("");
  const [stimulant, setStimulant] = useState("");
  const [opioid, setOpioid] = useState("");
  const [homeLines, setHomeLines] = useState<HomeMedLine[]>([]);
  const [frequencyDraft, setFrequencyDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!patientId || !facilityId) return;
    setError(null);
    try {
      const raw = await apiFetch(`/patients/${encodeURIComponent(patientId)}/clinical-history-profile`, {
        facilityId,
      });
      const profile = asApiObject<{
        medicalHistory?: { pastMedicalHistory?: string };
        surgicalHistory?: { pastSurgicalHistory?: string };
        homeMedications?: { medicationsSummary?: string };
        socialHistory?: {
          smokingStatus?: string;
          alcoholUse?: string;
          marijuanaUse?: string;
          stimulantUse?: string;
          opioidHeroinUse?: string;
        };
      }>(raw);
      if (domain === "MEDICAL_HISTORY") setValue(profile?.medicalHistory?.pastMedicalHistory ?? "");
      else if (domain === "SURGICAL_HISTORY") setValue(profile?.surgicalHistory?.pastSurgicalHistory ?? "");
      else if (domain === "HOME_MEDICATIONS") {
        setHomeLines(parseHomeMedLines(profile?.homeMedications?.medicationsSummary ?? ""));
      } else {
        setSmoking(profile?.socialHistory?.smokingStatus ?? "");
        setAlcohol(profile?.socialHistory?.alcoholUse ?? "");
        setMarijuana(profile?.socialHistory?.marijuanaUse ?? "");
        setStimulant(profile?.socialHistory?.stimulantUse ?? "");
        setOpioid(profile?.socialHistory?.opioidHeroinUse ?? "");
      }
    } catch {
      setError(t("inpatientAdmissionInp2b2a.historyEditor.loadError"));
    }
  }, [domain, facilityId, patientId, t]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  if (!open) return null;

  const addCatalogMed = (item: CatalogSearchItem) => {
    const name = item.displayNameFr || item.displayNameEn || item.name || item.code;
    setHomeLines((prev) => [
      ...prev,
      {
        code: item.code,
        name,
        strength: String(item.metadata?.strength ?? ""),
        route: String(item.metadata?.route ?? ""),
        frequency: frequencyDraft.trim(),
      },
    ]);
    setFrequencyDraft("");
  };

  const persist = async () => {
    if (!facilityId) return;
    setBusy(true);
    setError(null);
    try {
      const patch = async (section: string, valueBody: Record<string, unknown>) => {
        await apiFetch(
          `/patients/${encodeURIComponent(patientId)}/clinical-history-profile/sections/${section}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            facilityId,
            body: JSON.stringify({ value: valueBody, encounterId }),
          }
        );
      };
      if (domain === "MEDICAL_HISTORY") {
        await patch("medicalHistory", { pastMedicalHistory: value });
      } else if (domain === "SURGICAL_HISTORY") {
        await patch("surgicalHistory", { pastSurgicalHistory: value });
      } else if (domain === "HOME_MEDICATIONS") {
        void nursingAdmissionHomeMedUpdateCreatesOrderOrMar();
        await patch("homeMedications", {
          medicationsSummary: homeLines.map(formatHomeMedLine).join("\n"),
          medicationSummarySelections: homeLines.map((l) => l.code).filter(Boolean),
        });
      } else {
        if (!socialFocus || socialFocus === "smoking") {
          await patch("tobacco", { smokingStatus: smoking });
        }
        if (!socialFocus || socialFocus === "alcohol") {
          await patch("alcohol", { alcoholUse: alcohol });
        }
        if (!socialFocus || socialFocus === "substances") {
          await patch("substances", {
            marijuanaUse: marijuana,
            stimulantUse: stimulant,
            opioidHeroinUse: opioid,
          });
        }
      }
      await onSaved();
      onClose();
    } catch {
      setError(t("inpatientAdmissionInp2b2a.historyEditor.saveError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-testid="nursing-admission-enterprise-history-editor"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "rgba(15,23,42,0.35)",
        display: "grid",
        placeItems: "center",
        padding: 16,
      }}
    >
      <div style={{ ...MEDORA_CARD_SHELL, width: "min(640px, 100%)", padding: 16, background: "#fff" }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>
          {t(`inpatientAdmissionInp2b2a.historyEditor.title.${domain}`)}
        </h3>
        <p style={{ margin: "0 0 10px", fontSize: 12, color: "#64748b" }}>
          {t("inpatientAdmissionInp2b2a.historyEditor.reuseHint")}
        </p>
        {domain === "HOME_MEDICATIONS" ? (
          <div data-testid="nursing-admission-home-med-catalog">
            <p style={{ fontSize: 12, color: "#334155" }}>{t("inpatientAdmissionInp2b2d.homeMedNoOrder")}</p>
            <label style={{ display: "block", fontSize: 12, margin: "8px 0 4px" }}>
              {t("inpatientAdmissionInp2b2d.homeMedFrequency")}
            </label>
            <input
              value={frequencyDraft}
              onChange={(e) => setFrequencyDraft(e.target.value)}
              data-testid="nursing-admission-home-med-frequency"
              style={inputStyle}
            />
            <div style={{ marginTop: 8 }}>
              <SharedCatalogAutocomplete
                catalogType="MEDICATION"
                label={t("inpatientAdmissionInp2b2d.homeMedSearch")}
                placeholder={t("inpatientAdmissionInp2b2d.homeMedSearch")}
                facilityId={facilityId}
                minChars={nursingAdmissionHomeMedSearchMinChars()}
                onSelect={addCatalogMed}
              />
            </div>
            <ul data-testid="nursing-admission-home-med-lines" style={{ paddingLeft: 18, fontSize: 13 }}>
              {homeLines.map((line, idx) => (
                <li key={`${line.code}-${idx}`}>
                  {formatHomeMedLine(line)}{" "}
                  <button
                    type="button"
                    onClick={() => setHomeLines((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    {t("inpatientAdmissionInp2b2d.homeMedRemove")}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : domain === "SOCIAL_HISTORY" ? (
          <div data-testid="nursing-admission-social-editor" style={{ display: "grid", gap: 8 }}>
            {(!socialFocus || socialFocus === "smoking") ? (
              <label>
                {t("inpatientAdmissionInp2b2d.preload.smoking")}
                <input value={smoking} onChange={(e) => setSmoking(e.target.value)} style={inputStyle} />
              </label>
            ) : null}
            {(!socialFocus || socialFocus === "alcohol") ? (
              <label>
                {t("inpatientAdmissionInp2b2d.preload.alcohol")}
                <input value={alcohol} onChange={(e) => setAlcohol(e.target.value)} style={inputStyle} />
              </label>
            ) : null}
            {(!socialFocus || socialFocus === "substances") ? (
              <>
                <label>
                  {t("inpatientAdmissionInp2b2d.preload.recreational")}
                  <input value={marijuana} onChange={(e) => setMarijuana(e.target.value)} style={inputStyle} />
                </label>
                <input value={stimulant} onChange={(e) => setStimulant(e.target.value)} style={inputStyle} />
                <input value={opioid} onChange={(e) => setOpioid(e.target.value)} style={inputStyle} />
              </>
            ) : null}
          </div>
        ) : (
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={8}
            data-testid="nursing-admission-history-editor-text"
            style={textareaStyle}
          />
        )}
        {error ? (
          <p role="alert" style={{ color: "#b91c1c", fontSize: 12 }}>
            {error}
          </p>
        ) : null}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
          <button type="button" onClick={onClose} disabled={busy}>
            {t("common.cancel")}
          </button>
          <button type="button" onClick={() => void persist()} disabled={busy} data-testid="nursing-admission-history-editor-save">
            {t("common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}

const textareaStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  padding: 10,
  fontSize: 13,
};

const inputStyle: CSSProperties = {
  ...textareaStyle,
  display: "block",
  width: "100%",
  marginTop: 4,
};
