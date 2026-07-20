"use client";

import React from "react";
import { useI18n } from "@/lib/i18n";
import type { FacilityBedBoardBedRow } from "@/lib/bedBoardApi";
import { formatEncounterGovernedRoomDisplay } from "@/lib/governedRoomDisplay";

export type BedBoardAssignCandidate = {
  id: string;
  label: string;
  roomLabel?: string | null;
  type?: string | null;
  admissionSummaryJson?: unknown;
};

export type BedBoardAssignPickerLoadState = "loading" | "ready" | "error";

export type BedBoardAssignEncounterPickerProps = {
  open: boolean;
  bed: FacilityBedBoardBedRow;
  candidates: BedBoardAssignCandidate[];
  /** Distinguish loading / empty / error — never show empty while loading. */
  loadState?: BedBoardAssignPickerLoadState;
  onSelect: (candidate: BedBoardAssignCandidate) => void;
  onClose: () => void;
  onRetry?: () => void;
};

export function BedBoardAssignEncounterPicker({
  open,
  bed,
  candidates,
  loadState = "ready",
  onSelect,
  onClose,
  onRetry,
}: BedBoardAssignEncounterPickerProps) {
  const { t } = useI18n();
  if (!open) return null;

  const title = t("bedBoard.assignPickTitle").replace(
    "{{bed}}",
    bed.displayKey || bed.display
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bed-board-assign-picker-title"
      data-testid="bed-board-assign-picker"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 55,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(15, 23, 42, 0.35)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          border: "1px solid #e2e8f0",
          padding: 16,
          minWidth: 320,
          maxWidth: 480,
          maxHeight: "70vh",
          overflow: "auto",
          boxShadow: "0 10px 30px rgba(15,23,42,0.12)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <h3
          id="bed-board-assign-picker-title"
          style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700 }}
        >
          {title}
        </h3>
        {loadState === "loading" ? (
          <p data-testid="bed-board-assign-loading" style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
            {t("bedBoard.assignPickLoading")}
          </p>
        ) : loadState === "error" ? (
          <div data-testid="bed-board-assign-error">
            <p style={{ margin: "0 0 8px", fontSize: 13, color: "#b91c1c" }}>
              {t("bedBoard.assignPickError")}
            </p>
            {onRetry ? (
              <button
                type="button"
                data-testid="bed-board-assign-retry"
                onClick={onRetry}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  background: "#fff",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {t("bedBoard.assignPickRetry")}
              </button>
            ) : null}
          </div>
        ) : candidates.length === 0 ? (
          <p data-testid="bed-board-assign-empty" style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
            {t("bedBoard.assignPickEmpty")}
          </p>
        ) : (
          <ul
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {candidates.map((candidate) => {
              const location = formatEncounterGovernedRoomDisplay(
                {
                  roomLabel: candidate.roomLabel,
                  type: candidate.type,
                  admissionSummaryJson: candidate.admissionSummaryJson,
                },
                t
              );
              return (
                <li key={candidate.id}>
                  <button
                    type="button"
                    data-testid={`bed-board-assign-candidate-${candidate.id}`}
                    onClick={() => onSelect(candidate)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "1px solid #e2e8f0",
                      background: "#f8fafc",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    <span>{candidate.label}</span>
                    {location ? (
                      <span
                        style={{
                          display: "block",
                          marginTop: 2,
                          fontSize: 11,
                          fontWeight: 500,
                          color: "#64748b",
                        }}
                      >
                        {location}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <button
          type="button"
          onClick={onClose}
          style={{
            marginTop: 12,
            padding: "6px 12px",
            borderRadius: 8,
            border: "1px solid #cbd5e1",
            background: "#fff",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {t("bedBoard.assignPickCancel")}
        </button>
      </div>
    </div>
  );
}
