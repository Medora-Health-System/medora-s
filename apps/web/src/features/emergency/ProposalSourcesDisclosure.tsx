"use client";

import { useId, useState, type CSSProperties } from "react";
import {
  provenanceDisplayKey,
  sourceDisplayLabel,
  sourceDisplayText,
  type AdmissionFieldOrigin,
  type AdmissionProposalSourceRef,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";

const detailsStyle: CSSProperties = {
  marginTop: 4,
  fontSize: 11,
  color: "#64748b",
};

/**
 * Discreet “Sources used” control for SYSTEM_PROPOSAL fields (D4A.2.1).
 * Keyboard-accessible native disclosure; no raw JSON / internal IDs.
 */
export function ProposalSourcesDisclosure({
  origin,
  sources,
  testId,
}: {
  origin?: AdmissionFieldOrigin | null;
  sources?: AdmissionProposalSourceRef[] | null;
  testId?: string;
}) {
  const { t } = useI18n();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  if (!origin && !(sources?.length)) return null;

  return (
    <div style={detailsStyle} data-testid={testId ?? "proposal-sources"}>
      {origin ? (
        <p style={{ margin: "0 0 2px", fontWeight: 600, color: "#0369a1" }}>
          {t(`emergencyDisposition.provenanceDisplay.${provenanceDisplayKey(origin)}`)}
        </p>
      ) : null}
      {origin === "SYSTEM_PROPOSAL" && (sources?.length ?? 0) > 0 ? (
        <>
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((v) => !v)}
            style={{
              border: "none",
              background: "transparent",
              padding: 0,
              color: "#1d4ed8",
              fontWeight: 600,
              fontSize: 11,
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            {t("emergencyDisposition.sourcesUsed")}
          </button>
          {open ? (
            <ul
              id={panelId}
              style={{ margin: "4px 0 0", paddingLeft: 18 }}
              data-testid="proposal-sources-list"
            >
              {sources!.map((s, i) => {
                const label = sourceDisplayLabel(s);
                const text = sourceDisplayText(s);
                return (
                  <li key={`${s.sourceType || s.kind}-${i}`}>
                    {label}
                    {text ? `: ${text}` : ""}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
