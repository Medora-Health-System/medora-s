"use client";

import React, { useId, useState } from "react";

/**
 * Expandable legal disclosure: concise summary + See more / Show less.
 * Opening See more does NOT mark the section reviewed.
 */
export function ExpandableLegalSection({
  title,
  summary,
  fullBody,
  sourceLabel,
  sourceUrl,
  seeMoreLabel,
  showLessLabel,
  sourceHeading,
  onFullTextMadeAvailable,
}: {
  title: string;
  summary: string;
  fullBody: string;
  sourceLabel?: string;
  sourceUrl?: string;
  seeMoreLabel: string;
  showLessLabel: string;
  sourceHeading: string;
  onFullTextMadeAvailable?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();

  const toggle = () => {
    setExpanded((prev) => {
      const next = !prev;
      if (next) onFullTextMadeAvailable?.();
      return next;
    });
  };

  return (
    <div style={{ fontSize: 13, lineHeight: 1.6, color: "#334155" }}>
      <p style={{ margin: "0 0 8px 0" }}>{summary}</p>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={expanded}
        aria-controls={panelId}
        style={{
          border: "none",
          background: "transparent",
          color: "#1d4ed8",
          fontWeight: 700,
          fontSize: 12,
          cursor: "pointer",
          padding: 0,
          textDecoration: "underline",
        }}
      >
        {expanded ? showLessLabel : seeMoreLabel}
      </button>
      {expanded && (
        <div
          id={panelId}
          role="region"
          aria-label={title}
          style={{
            marginTop: 10,
            padding: "12px 14px",
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            whiteSpace: "pre-wrap",
            maxHeight: "none",
          }}
        >
          {fullBody}
          {(sourceLabel || sourceUrl) && (
            <div style={{ marginTop: 12, fontSize: 11, color: "#64748b" }}>
              <div style={{ fontWeight: 700, marginBottom: 2 }}>{sourceHeading}</div>
              {sourceLabel && <div>{sourceLabel}</div>}
              {sourceUrl && (
                <a href={sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#1d4ed8" }}>
                  {sourceUrl}
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
