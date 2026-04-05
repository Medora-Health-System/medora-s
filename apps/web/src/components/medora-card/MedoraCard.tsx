"use client";

import React from "react";
import { MEDORA_CARD_PENDING_SYNC_SHELL, MEDORA_CARD_SHELL } from "./medoraCardTokens";

export type MedoraCardVariant = "default" | "pendingSync";

export type MedoraCardProps = {
  /** 4px left accent (acuity, priority, etc.) */
  leftAccentColor: string;
  variant?: MedoraCardVariant;
  children: React.ReactNode;
  /** Optional extra class (e.g. transition + hover shadow) */
  className?: string;
};

/**
 * Outer list card shell: radius 16, border, optional pending-sync surface.
 */
export function MedoraCard({ leftAccentColor, variant = "default", children, className }: MedoraCardProps) {
  const shell = variant === "pendingSync" ? MEDORA_CARD_PENDING_SYNC_SHELL : MEDORA_CARD_SHELL;
  return (
    <article
      className={className}
      style={{
        overflow: "hidden",
        borderRadius: MEDORA_CARD_SHELL.radius,
        border: shell.border,
        backgroundColor: shell.background,
        boxShadow: shell.boxShadow,
        borderLeftWidth: MEDORA_CARD_SHELL.leftAccentWidth,
        borderLeftStyle: "solid",
        borderLeftColor: leftAccentColor,
      }}
    >
      {children}
    </article>
  );
}

/**
 * Inner flex row: padding 16, gap 16, wrap — matches Soins infirmiers / worklist.
 */
export function MedoraCardInner({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 16,
        padding: 16,
        alignItems: "stretch",
        justifyContent: "space-between",
      }}
    >
      {children}
    </div>
  );
}
