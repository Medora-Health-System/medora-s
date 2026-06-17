"use client";

import React, { useEffect, useRef, useState } from "react";
import type { MarClinicalCorrectionMenuItem } from "@/features/mar/marClinicalCorrectionWorkflow";
import { CLINICAL_MIN_TOUCH_TARGET_PX } from "@/lib/clinicalViewport";

export function MedicationAdministrationCorrectionMenu({
  items,
  t,
  onSelectAction,
  disabled,
}: {
  items: MarClinicalCorrectionMenuItem[];
  t: (key: string) => string;
  onSelectAction: (type: "TIME" | "DOSE" | "ROUTE" | "CHARTED_NOT_GIVEN" | "DUPLICATE") => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={rootRef} style={{ position: "relative", display: "inline-flex" }}>
      <button
        type="button"
        data-testid="mar-clinical-correction-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        title={t("marClinicalCorrection.menuTooltip")}
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: CLINICAL_MIN_TOUCH_TARGET_PX,
          minHeight: CLINICAL_MIN_TOUCH_TARGET_PX,
          padding: "0 10px",
          borderRadius: 8,
          border: "1px solid #cbd5e1",
          background: disabled ? "#f1f5f9" : "#fff",
          color: disabled ? "#94a3b8" : "#334155",
          cursor: disabled ? "not-allowed" : "pointer",
          fontSize: 13,
          fontWeight: 600,
          flexShrink: 0,
        }}
      >
        {t("marClinicalCorrection.menuLabel")}
      </button>
      {open ? (
        <div
          role="menu"
          data-testid="mar-clinical-correction-menu-panel"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            zIndex: 50,
            minWidth: 240,
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.12)",
            padding: 6,
          }}
        >
          {items.map((item) => {
            const label = t(item.labelKey);
            if (item.kind === "blocked") {
              return (
                <button
                  key={item.type}
                  type="button"
                  role="menuitem"
                  disabled
                  title={t(item.blockedReasonKey)}
                  data-testid={`mar-clinical-correction-blocked-${item.type}`}
                  style={menuItemStyle(false, true)}
                >
                  {label}
                </button>
              );
            }
            const enabled = item.enabled;
            return (
              <button
                key={item.type}
                type="button"
                role="menuitem"
                disabled={!enabled}
                title={item.blockedReasonKey ? t(item.blockedReasonKey) : undefined}
                data-testid={`mar-clinical-correction-action-${item.type}`}
                onClick={() => {
                  if (!enabled) return;
                  setOpen(false);
                  onSelectAction(item.type);
                }}
                style={menuItemStyle(enabled, false)}
              >
                {label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function menuItemStyle(enabled: boolean, blocked: boolean): React.CSSProperties {
  return {
    display: "block",
    width: "100%",
    textAlign: "left",
    padding: "8px 10px",
    border: "none",
    borderRadius: 8,
    background: "transparent",
    color: blocked ? "#94a3b8" : enabled ? "#0f172a" : "#94a3b8",
    fontSize: 13,
    cursor: blocked || !enabled ? "not-allowed" : "pointer",
  };
}
