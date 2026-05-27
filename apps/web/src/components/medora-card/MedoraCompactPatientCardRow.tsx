"use client";

import React from "react";

/**
 * Dense worklist row: left (avatar + optional footer + identity) | compact room | right column.
 * Matches the Emergency trackboard approved layout (operational density).
 */
const INNER_OFFSET: React.CSSProperties = {
  margin: "-8px -8px",
  width: "calc(100% + 16px)",
  minWidth: 0,
};

const MAIN_ROW: React.CSSProperties = {
  display: "flex",
  flexDirection: "row",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 8,
  rowGap: 6,
  width: "100%",
  minWidth: 0,
};

/** Same circle as MedoraCardIdentity — kept here for column stack + optional footer (e.g. ESI). */
export const MEDORA_COMPACT_AVATAR_CIRCLE_STYLE: React.CSSProperties = {
  flexShrink: 0,
  width: 44,
  height: 44,
  borderRadius: "50%",
  backgroundColor: "#f1f5f9",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 14,
  fontWeight: 600,
  color: "#334155",
  border: "1px solid #e2e8f0",
};

export type MedoraCompactPatientCardRowProps = {
  avatarInitials: string;
  /** e.g. ESI digit under avatar (Emergency only) */
  avatarFooter?: React.ReactNode;
  identity: React.ReactNode;
  roomLabel: string;
  roomValue: string;
  right: React.ReactNode;
  /** Wider right column when many actions (e.g. nursing). */
  rightMaxWidth?: number;
  /**
   * When true, stacks identity / tiles / actions vertically for narrow viewports
   * (ED trackboard mobile/tablet). Default false preserves desktop-dense worklist rows.
   */
  stackedLayout?: boolean;
  /**
   * Optional content rendered immediately *before* the room tile, in the same
   * horizontal "tile group" position. Used by the Emergency trackboard to
   * display a LOS tile next to the Room tile. Kept optional so existing
   * worklists continue to render unchanged.
   */
  centerLeading?: React.ReactNode;
  /**
   * Optional content rendered immediately *after* the room tile, before the
   * right column. Used for compact metadata blocks (e.g. assigned personnel).
   */
  centerTrailing?: React.ReactNode;
  /** Optional max width for the centerTrailing block (default 200). */
  centerTrailingMaxWidth?: number;
};

export function MedoraCompactPatientCardRow({
  avatarInitials,
  avatarFooter,
  identity,
  roomLabel,
  roomValue,
  right,
  rightMaxWidth = 240,
  stackedLayout = false,
  centerLeading,
  centerTrailing,
  centerTrailingMaxWidth = 200,
}: MedoraCompactPatientCardRowProps) {
  if (stackedLayout) {
    return (
      <div style={INNER_OFFSET} data-testid="medora-compact-patient-card-stacked">
        <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "flex-start",
              gap: 8,
              minWidth: 0,
              width: "100%",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 0,
                flexShrink: 0,
                width: 44,
              }}
            >
              <div style={MEDORA_COMPACT_AVATAR_CIRCLE_STYLE} aria-hidden>
                {avatarInitials}
              </div>
              {avatarFooter}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>{identity}</div>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              alignItems: "stretch",
              width: "100%",
              minWidth: 0,
            }}
          >
            {centerLeading ? (
              <div style={{ flex: "1 1 100px", minWidth: 0, display: "flex", alignItems: "center" }}>
                {centerLeading}
              </div>
            ) : null}
            <div
              style={{
                flex: "1 1 100px",
                minWidth: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-start",
              }}
            >
              <div
                style={{
                  padding: "4px 8px",
                  borderRadius: 8,
                  border: "1px solid #bae6fd",
                  backgroundColor: "#f0f9ff",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5)",
                  textAlign: "center",
                  minWidth: 0,
                  width: "100%",
                  maxWidth: "100%",
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "#0369a1",
                    marginBottom: 1,
                    lineHeight: 1,
                  }}
                >
                  {roomLabel}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    lineHeight: 1.15,
                    color: "#0c4a6e",
                    fontVariantNumeric: "tabular-nums",
                    wordBreak: "break-word",
                  }}
                >
                  {roomValue}
                </div>
              </div>
            </div>
            {centerTrailing ? (
              <div
                style={{
                  flex: "1 1 160px",
                  minWidth: 0,
                  maxWidth: "100%",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {centerTrailing}
              </div>
            ) : null}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "stretch",
              justifyContent: "flex-start",
              gap: 6,
              width: "100%",
              minWidth: 0,
            }}
          >
            {right}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={INNER_OFFSET}>
      <div style={MAIN_ROW}>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 8,
            flex: "1 1 220px",
            minWidth: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 0,
              flexShrink: 0,
              width: 44,
            }}
          >
            <div style={MEDORA_COMPACT_AVATAR_CIRCLE_STYLE} aria-hidden>
              {avatarInitials}
            </div>
            {avatarFooter}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>{identity}</div>
        </div>

        {centerLeading ? (
          <div
            style={{
              flex: "0 0 auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 2px",
              alignSelf: "center",
            }}
          >
            {centerLeading}
          </div>
        ) : null}

        <div
          style={{
            flex: "0 0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 4px",
            alignSelf: "center",
          }}
        >
          <div
            style={{
              padding: "4px 8px",
              borderRadius: 8,
              border: "1px solid #bae6fd",
              backgroundColor: "#f0f9ff",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5)",
              textAlign: "center",
              minWidth: 72,
              maxWidth: 120,
            }}
          >
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "#0369a1",
                marginBottom: 1,
                lineHeight: 1,
              }}
            >
              {roomLabel}
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                lineHeight: 1.15,
                color: "#0c4a6e",
                fontVariantNumeric: "tabular-nums",
                wordBreak: "break-word",
              }}
            >
              {roomValue}
            </div>
          </div>
        </div>

        {centerTrailing ? (
          <div
            style={{
              flex: "0 1 auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-start",
              padding: "0 4px",
              alignSelf: "center",
              minWidth: 132,
              maxWidth: centerTrailingMaxWidth,
            }}
          >
            {centerTrailing}
          </div>
        ) : null}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            justifyContent: "center",
            gap: 3,
            flex: "0 1 200px",
            marginLeft: "auto",
            minWidth: 132,
            maxWidth: rightMaxWidth,
            alignSelf: "center",
          }}
        >
          {right}
        </div>
      </div>
    </div>
  );
}
