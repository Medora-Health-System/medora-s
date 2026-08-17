"use client";

/**
 * MEDUI.INP.2C — Projection-only clinical context while documenting Nursing Assessment.
 * No clinical writes. Reuses local board values + deep links (no second fan-out).
 */

import type { CSSProperties } from "react";
import { useI18n } from "@/lib/i18n";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import type { NursingBoardValue } from "@/features/clinical-documentation/NursingDocumentationBoard";
import type { InpatientWorkspaceSection } from "./inpatientWorkspaceSections";

const railShell: CSSProperties = {
  ...MEDORA_CARD_SHELL,
  padding: "10px 12px",
  position: "sticky",
  top: 12,
  maxHeight: "calc(100vh - 120px)",
  overflowY: "auto",
  alignSelf: "start",
};

function MiniLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        marginTop: 6,
        fontSize: 11,
        fontWeight: 600,
        padding: "5px 8px",
        borderRadius: 8,
        border: "1px solid #e2e8f0",
        background: "#fff",
        color: "#0f766e",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function asText(v: NursingBoardValue): string | null {
  if (v === undefined || v === "" || (Array.isArray(v) && v.length === 0)) return null;
  return Array.isArray(v) ? v.join(", ") : String(v);
}

export function NursingAssessmentContextRail({
  values,
  summaryLines,
  onNavigateSection,
  onOpenHub,
  variant = "desktop",
}: {
  values: Readonly<Record<string, NursingBoardValue>>;
  summaryLines: readonly string[];
  onNavigateSection?: (section: InpatientWorkspaceSection) => void;
  onOpenHub?: () => void;
  variant?: "desktop" | "drawer";
}) {
  const { t } = useI18n();
  const pain = values.painScore;
  const fall = asText(values.fallRisk);
  const oxygen = asText(values.oxygen);
  const respConcern = asText(values.respiratoryConcern);
  const abnormals: string[] = [];
  if (typeof pain === "number" && pain >= 4) {
    abnormals.push(`${t("inpatientNursingAssessmentInp2c.board.railPain")}: ${pain}/10`);
  }
  if (fall === "HIGH" || fall === "MODERATE") {
    abnormals.push(`${t("inpatientNursingAssessmentInp2c.board.railFall")}: ${fall}`);
  }
  if (respConcern && respConcern !== "NONE") {
    abnormals.push(t("inpatientNursingAssessmentInp2c.board.railOxygen"));
  }
  if (asText(values.safetyRisks) && asText(values.safetyRisks) !== "NONE") {
    abnormals.push(t("inpatientOverviewD4a34.nursing.safety"));
  }

  const body = (
    <aside
      data-testid="nursing-assessment-context-rail"
      data-persistence="none"
      aria-label={t("inpatientNursingAssessmentInp2c.board.railTitle")}
      style={variant === "desktop" ? railShell : { ...railShell, position: "relative", top: 0, maxHeight: "none" }}
    >
      <h2 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
        {t("inpatientNursingAssessmentInp2c.board.railTitle")}
      </h2>
      <p style={{ margin: "0 0 10px", fontSize: 11, color: "#64748b", lineHeight: 1.4 }}>
        {t("inpatientNursingAssessmentInp2c.board.railProjectionOnly")}
      </p>

      {summaryLines.length > 0 ? (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#334155", marginBottom: 4 }}>
            {t("inpatientNursingAssessmentInp2c.board.summary")}
          </div>
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: "#0f172a" }}>
            {summaryLines.slice(0, 8).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {abnormals.length > 0 ? (
        <div data-testid="assessment-rail-abnormals" style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#c2410c", marginBottom: 4 }}>
            {t("inpatientNursingAssessmentInp2c.board.abnormal")}
          </div>
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12 }}>
            {abnormals.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {typeof pain === "number" ? (
        <p style={{ margin: "0 0 6px", fontSize: 12 }}>
          {t("inpatientNursingAssessmentInp2c.board.railPain")}: <strong>{pain}/10</strong>
        </p>
      ) : null}
      {oxygen ? (
        <p style={{ margin: "0 0 6px", fontSize: 12 }}>
          {t("inpatientNursingAssessmentInp2c.board.railOxygen")}: <strong>{oxygen.replaceAll("_", " ")}</strong>
        </p>
      ) : null}

      {onOpenHub ? (
        <>
          <MiniLink label={t("inpatientNursingAssessmentInp2c.board.railOpenIo")} onClick={onOpenHub} />
          <MiniLink label={t("inpatientNursingAssessmentInp2c.board.railOpenDevices")} onClick={onOpenHub} />
        </>
      ) : null}
      {onNavigateSection ? (
        <>
          <MiniLink
            label={t("inpatientNursingAssessmentInp2c.board.railOpenOrders")}
            onClick={() => onNavigateSection("orders")}
          />
          <MiniLink
            label={t("inpatientNursingAssessmentInp2c.board.railOpenMar")}
            onClick={() => onNavigateSection("medications")}
          />
          <MiniLink
            label={t("inpatientNursingAssessmentInp2c.board.railOpenResults")}
            onClick={() => onNavigateSection("results")}
          />
        </>
      ) : null}
    </aside>
  );

  return body;
}
