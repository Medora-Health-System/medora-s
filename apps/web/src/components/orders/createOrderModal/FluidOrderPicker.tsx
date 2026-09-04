"use client";

import React from "react";
import { useI18n } from "@/lib/i18n";
import { pickLegacyBilingualStoredPair } from "@/i18n/config";
import {
  FLUID_ORDER_ENTRY_TYPE_OPTIONS,
  STANDARD_FLUID_BAG_SIZES_ML,
  STANDARD_FLUID_RATES_ML_PER_HR,
  buildFluidOrderDirections,
  defaultFluidOrderDraft,
  type FluidOrderDraft,
  type FluidOrderEntryTypeCode,
} from "@medora/shared";

const labelSm: React.CSSProperties = {
  fontSize: 11,
  color: "#555",
  display: "block",
  marginBottom: 2,
  fontWeight: 500,
};

const inputSm: React.CSSProperties = {
  width: "100%",
  padding: "6px 8px",
  border: "1px solid #ccc",
  borderRadius: 4,
  fontSize: 13,
  boxSizing: "border-box",
};

const panelStyle: React.CSSProperties = {
  marginTop: 8,
  marginBottom: 10,
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #dbeafe",
  backgroundColor: "#f8fbff",
};

export function FluidOrderPicker({
  draft,
  onChange,
}: {
  draft?: FluidOrderDraft | null;
  onChange: (draft: FluidOrderDraft, directions: string) => void;
}) {
  const { language, t } = useI18n();
  const current = draft ?? defaultFluidOrderDraft();
  const isBolus = current.rateSelection.mode === "bolus";

  const patch = (patchDraft: Partial<FluidOrderDraft>) => {
    const next: FluidOrderDraft = { ...current, ...patchDraft };
    onChange(next, buildFluidOrderDirections(next));
  };

  const patchRate = (rateSelection: FluidOrderDraft["rateSelection"]) => {
    patch({ rateSelection });
  };

  return (
    <div style={panelStyle} data-testid="fluid-order-picker">
      <div style={{ fontSize: 12, fontWeight: 700, color: "#1e3a8a", marginBottom: 8 }}>
        {t("createOrderModal.fluidSectionTitle")}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px 12px",
        }}
      >
        <div style={{ gridColumn: "1 / -1" }}>
          <span style={labelSm}>{t("createOrderModal.fluidTypeLabel")}</span>
          <select
            value={current.fluidType}
            onChange={(e) => patch({ fluidType: e.target.value as FluidOrderEntryTypeCode })}
            style={inputSm}
          >
            {FLUID_ORDER_ENTRY_TYPE_OPTIONS.map((opt) => (
              <option key={opt.code} value={opt.code}>
                {pickLegacyBilingualStoredPair(language, { en: opt.labelEn, fr: opt.labelFr }).value}
              </option>
            ))}
          </select>
        </div>
        <div>
          <span style={labelSm}>{t("createOrderModal.fluidBagSizeLabel")}</span>
          <select
            value={current.bagSizeMl}
            onChange={(e) =>
              patch({ bagSizeMl: Number(e.target.value) as FluidOrderDraft["bagSizeMl"] })
            }
            style={inputSm}
          >
            {STANDARD_FLUID_BAG_SIZES_ML.map((size) => (
              <option key={size} value={size}>
                {size} mL
              </option>
            ))}
          </select>
        </div>
        <div>
          <span style={labelSm}>{t("createOrderModal.fluidModeLabel")}</span>
          <select
            value={isBolus ? "bolus" : "continuous"}
            onChange={(e) =>
              patchRate(
                e.target.value === "bolus"
                  ? { mode: "bolus" }
                  : { mode: "continuous", rateMlPerHr: 100 }
              )
            }
            style={inputSm}
          >
            <option value="continuous">{t("createOrderModal.fluidModeContinuous")}</option>
            <option value="bolus">{t("createOrderModal.fluidModeBolus")}</option>
          </select>
        </div>
        {!isBolus ? (
          <div style={{ gridColumn: "1 / -1" }}>
            <span style={labelSm}>{t("createOrderModal.fluidRateLabel")}</span>
            <select
              value={
                current.rateSelection.mode === "bolus"
                  ? "100"
                  : "special" in current.rateSelection
                    ? current.rateSelection.special
                    : String(current.rateSelection.rateMlPerHr)
              }
              onChange={(e) => {
                const v = e.target.value;
                if (v === "KVO") patchRate({ mode: "continuous", special: "KVO" });
                else if (v === "WIDE_OPEN") patchRate({ mode: "continuous", special: "WIDE_OPEN" });
                else patchRate({ mode: "continuous", rateMlPerHr: Number(v) as never });
              }}
              style={inputSm}
            >
              {STANDARD_FLUID_RATES_ML_PER_HR.map((rate) => (
                <option key={rate} value={String(rate)}>
                  {rate} mL/hr
                </option>
              ))}
              <option value="KVO">KVO</option>
              <option value="WIDE_OPEN">{t("createOrderModal.fluidRateWideOpen")}</option>
            </select>
          </div>
        ) : (
          <div style={{ gridColumn: "1 / -1", fontSize: 12, color: "#475569" }}>
            {t("createOrderModal.fluidBolusHint")}
          </div>
        )}
      </div>
    </div>
  );
}
