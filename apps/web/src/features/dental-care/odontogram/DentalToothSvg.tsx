"use client";

import type { MouseEvent } from "react";
import type { D5a4CanonicalTooth, D5a4ToothSurface } from "@medora/shared";

const FILL_BY_FINDING: Record<string, string> = {
  MISSING: "#94a3b8",
  IMPLANT: "#64748b",
  CROWN: "#fbbf24",
  CARIES: "#ef4444",
  EXISTING_RESTORATION: "#38bdf8",
  FRACTURE: "#f97316",
  ROOT_CANAL_TREATED: "#a78bfa",
  IMPACTED: "#c084fc",
  UNERUPTED: "#e2e8f0",
  PLANNED: "#fde68a",
  DEFAULT: "#fff7ed",
};

type Props = {
  tooth: D5a4CanonicalTooth;
  label: string;
  ariaLabel: string;
  selected: boolean;
  selectedSurfaces: readonly D5a4ToothSurface[];
  dominantFindingType: string | null;
  surfaceFindings: Partial<Record<D5a4ToothSurface, string>>;
  disabled?: boolean;
  onSelectTooth: (event: MouseEvent<HTMLButtonElement>) => void;
  onToggleSurface: (surface: D5a4ToothSurface) => void;
};

function surfaceFill(
  surface: D5a4ToothSurface,
  selectedSurfaces: readonly D5a4ToothSurface[],
  surfaceFindings: Partial<Record<D5a4ToothSurface, string>>,
  wholeFill: string
): string {
  if (selectedSurfaces.includes(surface)) return "#2563eb";
  const ft = surfaceFindings[surface];
  if (ft) return FILL_BY_FINDING[ft] ?? FILL_BY_FINDING.DEFAULT!;
  return wholeFill;
}

export function DentalToothSvg({
  tooth,
  label,
  ariaLabel,
  selected,
  selectedSurfaces,
  dominantFindingType,
  surfaceFindings,
  disabled,
  onSelectTooth,
  onToggleSurface,
}: Props) {
  const wholeFill =
    dominantFindingType && !Object.keys(surfaceFindings).length
      ? FILL_BY_FINDING[dominantFindingType] ?? FILL_BY_FINDING.DEFAULT!
      : FILL_BY_FINDING.DEFAULT!;
  const missing = dominantFindingType === "MISSING";
  const w = tooth.morphology === "MOLAR" ? 44 : tooth.morphology === "PREMOLAR" ? 36 : 30;
  const h = 56;
  const isAnterior = tooth.morphology === "INCISOR" || tooth.morphology === "CANINE";
  const midH = isAnterior ? "INCISAL" : "OCCLUSAL";
  const outerB = tooth.arch === "MAXILLARY" ? "FACIAL" : "BUCCAL";
  const outerL = tooth.arch === "MAXILLARY" ? "PALATAL" : "LINGUAL";

  const crownPath =
    tooth.morphology === "CANINE"
      ? `M4,${h - 8} L${w / 2},6 L${w - 4},${h - 8} Z`
      : tooth.morphology === "INCISOR"
        ? `M6,10 H${w - 6} V${h - 8} H6 Z`
        : tooth.morphology === "PREMOLAR"
          ? `M5,12 Q${w / 2},4 ${w - 5},12 V${h - 8} H5 Z`
          : `M4,14 Q12,6 ${w / 2},8 Q${w - 12},6 ${w - 4},14 V${h - 8} H4 Z`;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelectTooth}
      aria-label={ariaLabel}
      aria-pressed={selected}
      data-testid={`dental-tooth-${tooth.code}`}
      style={{
        border: selected ? "2px solid #1d4ed8" : "1px solid #cbd5e1",
        borderRadius: 8,
        padding: 2,
        background: selected ? "#eff6ff" : "#fff",
        cursor: disabled ? "default" : "pointer",
        opacity: missing ? 0.55 : 1,
        minWidth: w + 8,
      }}
    >
      <svg width={w} height={h + 16} viewBox={`0 0 ${w} ${h + 16}`} role="img" aria-hidden="true">
        <path d={crownPath} fill={wholeFill} stroke="#334155" strokeWidth={1.2} />
        {/* Surface zones — presentation geometry only */}
        <rect
          x={2}
          y={h * 0.18}
          width={w * 0.28}
          height={h * 0.45}
          fill={surfaceFill("MESIAL", selectedSurfaces, surfaceFindings, "transparent")}
          fillOpacity={0.85}
          stroke="transparent"
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) onToggleSurface("MESIAL");
          }}
        />
        <rect
          x={w * 0.72}
          y={h * 0.18}
          width={w * 0.26}
          height={h * 0.45}
          fill={surfaceFill("DISTAL", selectedSurfaces, surfaceFindings, "transparent")}
          fillOpacity={0.85}
          stroke="transparent"
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) onToggleSurface("DISTAL");
          }}
        />
        <rect
          x={w * 0.28}
          y={4}
          width={w * 0.44}
          height={h * 0.22}
          fill={surfaceFill(outerB as D5a4ToothSurface, selectedSurfaces, surfaceFindings, "transparent")}
          fillOpacity={0.85}
          stroke="transparent"
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) onToggleSurface(outerB as D5a4ToothSurface);
          }}
        />
        <rect
          x={w * 0.28}
          y={h * 0.55}
          width={w * 0.44}
          height={h * 0.22}
          fill={surfaceFill(outerL as D5a4ToothSurface, selectedSurfaces, surfaceFindings, "transparent")}
          fillOpacity={0.85}
          stroke="transparent"
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) onToggleSurface(outerL as D5a4ToothSurface);
          }}
        />
        <rect
          x={w * 0.3}
          y={h * 0.28}
          width={w * 0.4}
          height={h * 0.24}
          fill={surfaceFill(midH as D5a4ToothSurface, selectedSurfaces, surfaceFindings, "transparent")}
          fillOpacity={0.9}
          stroke="transparent"
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) onToggleSurface(midH as D5a4ToothSurface);
          }}
        />
        <text
          x={w / 2}
          y={h + 12}
          textAnchor="middle"
          fontSize={10}
          fontWeight={700}
          fill="#0f172a"
        >
          {label}
        </text>
      </svg>
    </button>
  );
}
