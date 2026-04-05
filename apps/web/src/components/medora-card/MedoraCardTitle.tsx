"use client";

import React from "react";

export type MedoraCardTitleProps = {
  title: string;
  /** NIR line or any secondary line (already styled by caller if needed) */
  subline?: React.ReactNode;
};

export function MedoraCardTitle({ title, subline }: MedoraCardTitleProps) {
  return (
    <>
      <h2
        style={{
          margin: 0,
          fontSize: 16,
          fontWeight: 600,
          color: "#0f172a",
          lineHeight: 1.25,
        }}
      >
        {title}
      </h2>
      {subline != null && subline !== false ? <div style={{ marginTop: 6 }}>{subline}</div> : null}
    </>
  );
}
