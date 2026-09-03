"use client";

import React, { useEffect, useMemo, useState } from "react";
import { BLOOD_PRODUCT_UNIT_VOLUME_PRESET_ML } from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { ClinicalDocumentationSelectField } from "./ClinicalDocumentationFieldControls";

import { resolveProductUiLanguageOrDefault } from "@/i18n/config";

const fieldStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 10px",
  minHeight: 36,
  fontSize: 12,
  borderRadius: 8,
  border: "1px solid #e2e8f0",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  color: "#475569",
  marginBottom: 2,
};

type VolumePreset = (typeof BLOOD_PRODUCT_UNIT_VOLUME_PRESET_ML)[number] | "OTHER";

function resolvePreset(unitVolumeMl: number): VolumePreset {
  return (BLOOD_PRODUCT_UNIT_VOLUME_PRESET_ML as readonly number[]).includes(unitVolumeMl)
    ? (unitVolumeMl as VolumePreset)
    : "OTHER";
}

export function BloodProductVolumeSelect({
  unitVolumeMl,
  onChangeVolumeMl,
  testIdPrefix,
}: {
  unitVolumeMl: number;
  onChangeVolumeMl: (ml: number) => void;
  testIdPrefix: string;
}) {
  const { t, language } = useI18n();
  const locale = resolveProductUiLanguageOrDefault(language);
  const [preset, setPreset] = useState<VolumePreset>(() => resolvePreset(unitVolumeMl));
  const [customMl, setCustomMl] = useState(() =>
    resolvePreset(unitVolumeMl) === "OTHER" ? String(unitVolumeMl) : ""
  );

  useEffect(() => {
    const nextPreset = resolvePreset(unitVolumeMl);
    setPreset(nextPreset);
    if (nextPreset === "OTHER") {
      setCustomMl(String(unitVolumeMl));
    }
  }, [unitVolumeMl]);

  const options = useMemo(
    () => [
      {
        value: "250",
        labelEn: t("clinicalDocumentation.forms.bloodProduct.volumePreset250"),
        labelFr: t("clinicalDocumentation.forms.bloodProduct.volumePreset250"),
      },
      {
        value: "300",
        labelEn: t("clinicalDocumentation.forms.bloodProduct.volumePreset300"),
        labelFr: t("clinicalDocumentation.forms.bloodProduct.volumePreset300"),
      },
      {
        value: "350",
        labelEn: t("clinicalDocumentation.forms.bloodProduct.volumePreset350"),
        labelFr: t("clinicalDocumentation.forms.bloodProduct.volumePreset350"),
      },
      {
        value: "500",
        labelEn: t("clinicalDocumentation.forms.bloodProduct.volumePreset500"),
        labelFr: t("clinicalDocumentation.forms.bloodProduct.volumePreset500"),
      },
      {
        value: "OTHER",
        labelEn: t("clinicalDocumentation.forms.bloodProduct.volumePresetOther"),
        labelFr: t("clinicalDocumentation.forms.bloodProduct.volumePresetOther"),
      },
    ],
    [t]
  );

  return (
    <div data-testid={`${testIdPrefix}-volume-select`}>
      <ClinicalDocumentationSelectField
        label={t("clinicalDocumentation.forms.bloodProduct.unitVolume")}
        value={String(preset)}
        options={options}
        locale={locale}
        onChange={(v) => {
          const next = v as VolumePreset;
          setPreset(next);
          if (next === "OTHER") {
            const parsed = Number(customMl);
            if (Number.isFinite(parsed) && parsed > 0) {
              onChangeVolumeMl(parsed);
            }
            return;
          }
          onChangeVolumeMl(Number(next));
        }}
        testId={`${testIdPrefix}-volume-preset`}
      />
      {preset === "OTHER" ? (
        <div style={{ marginTop: 6 }}>
          <span style={labelStyle}>{t("clinicalDocumentation.forms.bloodProduct.customVolumeMl")}</span>
          <input
            type="number"
            min={1}
            data-testid={`${testIdPrefix}-volume-custom`}
            value={customMl}
            onChange={(e) => {
              const raw = e.target.value;
              setCustomMl(raw);
              const parsed = Number(raw);
              if (Number.isFinite(parsed) && parsed > 0) {
                onChangeVolumeMl(parsed);
              }
            }}
            style={fieldStyle}
          />
        </div>
      ) : null}
    </div>
  );
}

export function isValidBloodProductUnitVolumeMl(value: number): boolean {
  return Number.isFinite(value) && value > 0 && value <= 100_000;
}
