"use client";

import React from "react";
import type { EnterpriseProcedureExecutionRoleCategory } from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { procedureExecutionCategoryLabelKey } from "@/lib/procedureExecutionUi";

const badgeStyles: Record<EnterpriseProcedureExecutionRoleCategory, React.CSSProperties> = {
  PROVIDER: { color: "#1d4ed8", background: "#eff6ff", border: "1px solid #93c5fd" },
  NURSING: { color: "#047857", background: "#ecfdf5", border: "1px solid #6ee7b7" },
  RESPIRATORY: { color: "#0369a1", background: "#e0f2fe", border: "1px solid #7dd3fc" },
  LAB: { color: "#7c3aed", background: "#f5f3ff", border: "1px solid #c4b5fd" },
  RADIOLOGY: { color: "#b45309", background: "#fffbeb", border: "1px solid #fcd34d" },
  MULTI_ROLE: { color: "#475569", background: "#f8fafc", border: "1px solid #cbd5e1" },
};

export function ProcedureExecutionCategoryBadge({
  category,
}: {
  category: EnterpriseProcedureExecutionRoleCategory;
}) {
  const { t } = useI18n();
  return (
    <span
      data-testid="procedure-execution-category-badge"
      style={{
        display: "inline-block",
        marginTop: 4,
        padding: "2px 8px",
        borderRadius: 9999,
        fontSize: 10,
        fontWeight: 600,
        lineHeight: 1.4,
        ...badgeStyles[category],
      }}
    >
      {t(procedureExecutionCategoryLabelKey(category))}
    </span>
  );
}
