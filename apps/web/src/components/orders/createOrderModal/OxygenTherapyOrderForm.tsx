"use client";

import React from "react";
import { useI18n } from "@/lib/i18n";
import {
  OXYGEN_THERAPY_DEVICES,
  OXYGEN_THERAPY_FIO2_OPTIONS,
  OXYGEN_THERAPY_FLOW_OPTIONS,
  OXYGEN_THERAPY_FREQUENCY_MODES,
  OXYGEN_THERAPY_RT_OPTIONS,
  OXYGEN_THERAPY_TARGET_OPTIONS,
  buildOxygenTherapyManualLabel,
  defaultOxygenTherapyDraft,
  deviceUsesFio2,
  deviceUsesFlow,
  type OxygenTherapyDraft,
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

function optionLabel(
  group: string,
  value: string,
  t: (key: string) => string
): string {
  return t(`createOrderModal.oxygen.${group}.${value}`);
}

export function OxygenTherapyOrderForm({
  draft,
  onChange,
  previewLocale,
}: {
  draft?: OxygenTherapyDraft | null;
  onChange: (draft: OxygenTherapyDraft) => void;
  previewLocale: "en" | "fr";
}) {
  const { t } = useI18n();
  const current = draft ?? defaultOxygenTherapyDraft();

  const patch = (partial: Partial<OxygenTherapyDraft>) => {
    onChange({ ...current, ...partial });
  };

  const preview = buildOxygenTherapyManualLabel(current, previewLocale);

  return (
    <div style={panelStyle} data-testid="oxygen-therapy-order-form">
      <div style={{ fontSize: 12, fontWeight: 700, color: "#1e3a8a", marginBottom: 8 }}>
        {t("createOrderModal.oxygen.sectionTitle")}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 12px" }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <span style={labelSm}>{t("createOrderModal.oxygen.deviceLabel")}</span>
          <select
            value={current.device}
            onChange={(e) => patch({ device: e.target.value as OxygenTherapyDraft["device"] })}
            style={inputSm}
          >
            {OXYGEN_THERAPY_DEVICES.map((device) => (
              <option key={device} value={device}>
                {optionLabel("devices", device, t)}
              </option>
            ))}
          </select>
        </div>
        {current.device === "other" ? (
          <div style={{ gridColumn: "1 / -1" }}>
            <span style={labelSm}>{t("createOrderModal.oxygen.deviceCustomLabel")}</span>
            <input
              type="text"
              value={current.deviceCustom ?? ""}
              onChange={(e) => patch({ deviceCustom: e.target.value })}
              style={inputSm}
            />
          </div>
        ) : null}
        {deviceUsesFlow(current.device) ? (
          <>
            <div>
              <span style={labelSm}>{t("createOrderModal.oxygen.flowLabel")}</span>
              <select
                value={current.flowSelection}
                onChange={(e) =>
                  patch({ flowSelection: e.target.value as OxygenTherapyDraft["flowSelection"] })
                }
                style={inputSm}
              >
                {OXYGEN_THERAPY_FLOW_OPTIONS.map((flow) => (
                  <option key={flow} value={flow}>
                    {flow === "custom"
                      ? t("createOrderModal.oxygen.flowCustomOption")
                      : `${flow} L/min`}
                  </option>
                ))}
              </select>
            </div>
            {current.flowSelection === "custom" ? (
              <div>
                <span style={labelSm}>{t("createOrderModal.oxygen.flowCustomLabel")}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={current.flowCustomLpm ?? ""}
                  onChange={(e) => patch({ flowCustomLpm: e.target.value })}
                  style={inputSm}
                />
              </div>
            ) : null}
          </>
        ) : null}
        {deviceUsesFio2(current.device) ? (
          <>
            <div>
              <span style={labelSm}>{t("createOrderModal.oxygen.fio2Label")}</span>
              <select
                value={current.fio2Selection ?? "28"}
                onChange={(e) =>
                  patch({ fio2Selection: e.target.value as OxygenTherapyDraft["fio2Selection"] })
                }
                style={inputSm}
              >
                {OXYGEN_THERAPY_FIO2_OPTIONS.map((fio2) => (
                  <option key={fio2} value={fio2}>
                    {fio2 === "custom"
                      ? t("createOrderModal.oxygen.fio2CustomOption")
                      : `${fio2}%`}
                  </option>
                ))}
              </select>
            </div>
            {current.fio2Selection === "custom" ? (
              <div>
                <span style={labelSm}>{t("createOrderModal.oxygen.fio2CustomLabel")}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={current.fio2CustomPercent ?? ""}
                  onChange={(e) => patch({ fio2CustomPercent: e.target.value })}
                  style={inputSm}
                />
              </div>
            ) : null}
          </>
        ) : null}
        <div>
          <span style={labelSm}>{t("createOrderModal.oxygen.frequencyLabel")}</span>
          <select
            value={current.frequencyMode}
            onChange={(e) =>
              patch({ frequencyMode: e.target.value as OxygenTherapyDraft["frequencyMode"] })
            }
            style={inputSm}
          >
            {OXYGEN_THERAPY_FREQUENCY_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {optionLabel("frequency", mode, t)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <span style={labelSm}>{t("createOrderModal.oxygen.targetLabel")}</span>
          <select
            value={current.targetSelection}
            onChange={(e) =>
              patch({ targetSelection: e.target.value as OxygenTherapyDraft["targetSelection"] })
            }
            style={inputSm}
          >
            {OXYGEN_THERAPY_TARGET_OPTIONS.map((target) => (
              <option key={target} value={target}>
                {optionLabel("targets", target, t)}
              </option>
            ))}
          </select>
        </div>
        {current.targetSelection === "custom" ? (
          <div style={{ gridColumn: "1 / -1" }}>
            <span style={labelSm}>{t("createOrderModal.oxygen.targetCustomLabel")}</span>
            <input
              type="text"
              value={current.targetCustom ?? ""}
              onChange={(e) => patch({ targetCustom: e.target.value })}
              style={inputSm}
            />
          </div>
        ) : null}
        <div style={{ gridColumn: "1 / -1" }}>
          <span style={labelSm}>{t("createOrderModal.oxygen.rtLabel")}</span>
          <select
            value={current.rtInvolvement}
            onChange={(e) =>
              patch({ rtInvolvement: e.target.value as OxygenTherapyDraft["rtInvolvement"] })
            }
            style={inputSm}
          >
            {OXYGEN_THERAPY_RT_OPTIONS.map((rt) => (
              <option key={rt} value={rt}>
                {optionLabel("rt", rt, t)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div
        style={{
          marginTop: 10,
          fontSize: 12,
          color: "#334155",
          lineHeight: 1.4,
          padding: "8px 10px",
          borderRadius: 6,
          background: "#fff",
          border: "1px solid #e2e8f0",
        }}
        data-testid="oxygen-therapy-order-preview"
      >
        <strong>{t("createOrderModal.oxygen.previewLabel")}:</strong> {preview}
      </div>
    </div>
  );
}
