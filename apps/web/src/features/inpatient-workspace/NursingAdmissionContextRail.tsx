"use client";

/**
 * MEDUI.INP.2B — Read-only clinical context while documenting Nursing Admission.
 * Projection only — never persists.
 */

import { type CSSProperties } from "react";
import { useI18n } from "@/lib/i18n";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import { DISPLAY_DASH } from "@/lib/patientDisplay";

const shell: CSSProperties = {
  ...MEDORA_CARD_SHELL,
  padding: "10px 12px",
  position: "sticky",
  top: 72,
  maxHeight: "calc(100vh - 140px)",
  overflowY: "auto",
};

export function NursingAdmissionContextRail({
  codeStatus,
  isolation,
  allergiesSummary,
}: {
  codeStatus?: { value: string | null; documented: boolean } | null;
  isolation?: { value: string | null; documented: boolean } | null;
  allergiesSummary?: string | null;
}) {
  const { t } = useI18n();
  return (
    <aside
      data-testid="nursing-admission-context-rail"
      data-persistence="none"
      aria-label={t("inpatientAdmissionInp2b.rail.title")}
      style={shell}
    >
      <h2 style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 700 }}>
        {t("inpatientAdmissionInp2b.rail.title")}
      </h2>
      <p style={{ margin: "0 0 10px", fontSize: 11, color: "#64748b" }}>
        {t("inpatientAdmissionInp2b.rail.projectionOnly")}
      </p>
      <div style={{ marginBottom: 8, fontSize: 12 }}>
        <strong>{t("inpatientAdmissionInp2b.rail.codeStatus")}</strong>
        <div>
          {codeStatus?.documented
            ? codeStatus.value || DISPLAY_DASH
            : t("inpatientAdmissionInp2b.rail.notDocumented")}
        </div>
        <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
          {t("inpatientAdmissionInp2b.domain.openCodeStatus")}
        </div>
      </div>
      <div style={{ marginBottom: 8, fontSize: 12 }}>
        <strong>{t("inpatientAdmissionInp2b.rail.isolation")}</strong>
        <div>
          {isolation?.documented
            ? isolation.value || DISPLAY_DASH
            : t("inpatientAdmissionInp2b.rail.notDocumented")}
        </div>
        <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
          {t("inpatientAdmissionInp2b.domain.openIsolation")}
        </div>
      </div>
      <div style={{ fontSize: 12 }}>
        <strong>{t("inpatientAdmissionInp2b.rail.allergies")}</strong>
        <div>{allergiesSummary?.trim() || t("inpatientAdmissionInp2b.rail.notDocumented")}</div>
      </div>
    </aside>
  );
}
