"use client";

export type MedicalExamTrendCardProps = {
  label: string;
  currentValue: number;
  previousValue: number | null;
  direction: "up" | "down" | "flat";
  suffix?: string;
  testId?: string;
};

const DIRECTION_LABEL = {
  up: "↑",
  down: "↓",
  flat: "→",
} as const;

export function MedicalExamTrendCard({
  label,
  currentValue,
  previousValue,
  direction,
  suffix = "%",
  testId,
}: MedicalExamTrendCardProps) {
  return (
    <div
      data-testid={testId}
      style={{
        padding: "12px 14px",
        borderRadius: 12,
        border: "1px solid #e2e8f0",
        background: "#fff",
        minWidth: 140,
      }}
    >
      <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4, fontWeight: 600, textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: "#0f172a" }}>
          {currentValue}
          {suffix}
        </span>
        <span style={{ fontSize: 13, color: "#64748b" }}>
          {DIRECTION_LABEL[direction]} {previousValue == null ? "—" : `${previousValue}${suffix}`}
        </span>
      </div>
    </div>
  );
}
