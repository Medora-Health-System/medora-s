/**
 * D4A.2.7C — Searchable Additional Clinical Documentation launcher.
 * Do not embed the full catalog inside every admission section.
 */

"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { ADDITIONAL_DOC_CATEGORIES, type AdditionalDocCategory } from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";

export type AdditionalDocCatalogItem = {
  id: string;
  titleKey: string;
  descriptionKey: string;
  category: AdditionalDocCategory;
  roles: Array<"PROVIDER" | "NURSING" | "TECHNICIAN">;
  encounterTypes: Array<"INPATIENT" | "OBSERVATION">;
  status: "available" | "required" | "suggested" | "inProgress" | "completed";
};

const DEFAULT_CATALOG: AdditionalDocCatalogItem[] = [
  {
    id: "io-flowsheet",
    titleKey: "inpatientRapidConvergenceD4a27c.launcher.categories.INTAKE_OUTPUT",
    descriptionKey: "inpatientRapidConvergenceD4a27c.launcher.categories.INTAKE_OUTPUT",
    category: "INTAKE_OUTPUT",
    roles: ["NURSING", "TECHNICIAN"],
    encounterTypes: ["INPATIENT", "OBSERVATION"],
    status: "suggested",
  },
  {
    id: "fall-screen",
    titleKey: "inpatientRapidConvergenceD4a27c.launcher.categories.SAFETY",
    descriptionKey: "inpatientRapidConvergenceD4a27c.launcher.categories.SAFETY",
    category: "SAFETY",
    roles: ["NURSING"],
    encounterTypes: ["INPATIENT", "OBSERVATION"],
    status: "required",
  },
  {
    id: "skin-wound",
    titleKey: "inpatientRapidConvergenceD4a27c.launcher.categories.SKIN_WOUND",
    descriptionKey: "inpatientRapidConvergenceD4a27c.launcher.categories.SKIN_WOUND",
    category: "SKIN_WOUND",
    roles: ["NURSING"],
    encounterTypes: ["INPATIENT", "OBSERVATION"],
    status: "available",
  },
  {
    id: "devices",
    titleKey: "inpatientRapidConvergenceD4a27c.launcher.categories.DEVICES",
    descriptionKey: "inpatientRapidConvergenceD4a27c.launcher.categories.DEVICES",
    category: "DEVICES",
    roles: ["NURSING", "PROVIDER"],
    encounterTypes: ["INPATIENT", "OBSERVATION"],
    status: "available",
  },
  {
    id: "belongings",
    titleKey: "inpatientRapidConvergenceD4a27c.launcher.categories.BELONGINGS",
    descriptionKey: "inpatientRapidConvergenceD4a27c.launcher.categories.BELONGINGS",
    category: "BELONGINGS",
    roles: ["NURSING", "TECHNICIAN"],
    encounterTypes: ["INPATIENT", "OBSERVATION"],
    status: "available",
  },
  {
    id: "neuro",
    titleKey: "inpatientRapidConvergenceD4a27c.launcher.categories.NEUROLOGIC",
    descriptionKey: "inpatientRapidConvergenceD4a27c.launcher.categories.NEUROLOGIC",
    category: "NEUROLOGIC",
    roles: ["NURSING", "PROVIDER"],
    encounterTypes: ["INPATIENT", "OBSERVATION"],
    status: "suggested",
  },
  {
    id: "education",
    titleKey: "inpatientRapidConvergenceD4a27c.launcher.categories.EDUCATION",
    descriptionKey: "inpatientRapidConvergenceD4a27c.launcher.categories.EDUCATION",
    category: "EDUCATION",
    roles: ["NURSING"],
    encounterTypes: ["INPATIENT", "OBSERVATION"],
    status: "available",
  },
  {
    id: "scores",
    titleKey: "inpatientRapidConvergenceD4a27c.launcher.categories.SCORES_SCREENS",
    descriptionKey: "inpatientRapidConvergenceD4a27c.launcher.categories.SCORES_SCREENS",
    category: "SCORES_SCREENS",
    roles: ["NURSING", "PROVIDER"],
    encounterTypes: ["INPATIENT", "OBSERVATION"],
    status: "available",
  },
];

export function AdditionalClinicalDocumentationLauncher({
  role = "NURSING",
  encounterType = "INPATIENT",
  catalog = DEFAULT_CATALOG,
  onOpen,
  compact = false,
  launchLabel,
}: {
  role?: "PROVIDER" | "NURSING" | "TECHNICIAN";
  encounterType?: "INPATIENT" | "OBSERVATION";
  catalog?: AdditionalDocCatalogItem[];
  onOpen?: (item: AdditionalDocCatalogItem) => void;
  compact?: boolean;
  launchLabel?: string;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<AdditionalDocCategory | "ALL">("ALL");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return catalog.filter((item) => {
      if (!item.roles.includes(role)) return false;
      if (!item.encounterTypes.includes(encounterType)) return false;
      if (category !== "ALL" && item.category !== category) return false;
      if (!needle) return true;
      const title = t(item.titleKey).toLowerCase();
      const desc = t(item.descriptionKey).toLowerCase();
      return title.includes(needle) || desc.includes(needle) || item.id.includes(needle);
    });
  }, [catalog, role, encounterType, category, q, t]);

  return (
    <div data-testid="additional-clinical-documentation-launcher">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={launchBtn}
        data-testid="additional-docs-launch-btn"
      >
        {launchLabel ?? t("inpatientRapidConvergenceD4a27c.launcher.title")}
      </button>
      {open ? (
        <div
          style={{
            ...MEDORA_CARD_SHELL,
            padding: 12,
            marginTop: 8,
            maxWidth: compact ? 520 : 720,
          }}
          role="dialog"
          aria-label={t("inpatientRapidConvergenceD4a27c.launcher.title")}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("inpatientRapidConvergenceD4a27c.launcher.search")}
            style={searchInput}
            data-testid="additional-docs-search"
          />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "8px 0" }}>
            <button
              type="button"
              onClick={() => setCategory("ALL")}
              style={category === "ALL" ? chipOn : chipOff}
            >
              All
            </button>
            {ADDITIONAL_DOC_CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                style={category === c ? chipOn : chipOff}
              >
                {t(`inpatientRapidConvergenceD4a27c.launcher.categories.${c}`)}
              </button>
            ))}
          </div>
          {filtered.length === 0 ? (
            <p style={{ fontSize: 12, color: "#64748b" }}>
              {t("inpatientRapidConvergenceD4a27c.launcher.empty")}
            </p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
              {filtered.map((item) => (
                <li
                  key={item.id}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: 12,
                    padding: "10px 12px",
                    background: "#fff",
                  }}
                  data-testid={`additional-doc-card-${item.id}`}
                >
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{t(item.titleKey)}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                    {t(`inpatientRapidConvergenceD4a27c.launcher.categories.${item.category}`)} ·{" "}
                    {t(`inpatientRapidConvergenceD4a27c.launcher.status.${item.status}`)}
                  </div>
                  <button
                    type="button"
                    style={{ ...chipOn, marginTop: 8 }}
                    onClick={() => onOpen?.(item)}
                  >
                    {t("inpatientRapidConvergenceD4a27c.launcher.open")}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

const launchBtn: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid #99f6e4",
  background: "#f0fdfa",
  color: "#0f766e",
  cursor: "pointer",
};

const searchInput: CSSProperties = {
  width: "100%",
  fontSize: 13,
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  boxSizing: "border-box",
};

const chipOff: CSSProperties = {
  fontSize: 11,
  padding: "4px 8px",
  borderRadius: 9999,
  border: "1px solid #cbd5e1",
  background: "#fff",
  cursor: "pointer",
};

const chipOn: CSSProperties = {
  ...chipOff,
  borderColor: "#0f766e",
  background: "#ccfbf1",
  color: "#115e59",
  fontWeight: 600,
};
