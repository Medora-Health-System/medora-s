"use client";

import React from "react";

const RAIL_CLASS = "medora-card-actions-rail";

export type MedoraCardActionsProps = {
  children: React.ReactNode;
  /** Border under rail on narrow viewports (default worklist: #f1f5f9; pending sync: #fde68a) */
  railBorderTopColor?: string;
};

/**
 * Right column: priority pill + buttons. Uses global class for ≥640px alignment.
 */
export function MedoraCardActions({ children, railBorderTopColor = "#f1f5f9" }: MedoraCardActionsProps) {
  return (
    <div
      className={RAIL_CLASS}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        alignItems: "flex-end",
        flexShrink: 0,
        minWidth: 160,
        borderTop: `1px solid ${railBorderTopColor}`,
        paddingTop: 12,
        width: "100%",
      }}
    >
      {children}
    </div>
  );
}

/** Inject once per page that uses MedoraCardActions (responsive rail). */
export function MedoraCardActionsMediaStyle() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
          @media (min-width: 640px) {
            .${RAIL_CLASS} {
              border-top: none !important;
              padding-top: 0 !important;
              align-items: flex-end !important;
              text-align: right !important;
              width: auto !important;
            }
          }
        `,
      }}
    />
  );
}
