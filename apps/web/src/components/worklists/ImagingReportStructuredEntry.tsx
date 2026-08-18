"use client";

import React, { useMemo } from "react";
import { serializeRadiologyReportFields } from "@medora/shared";
import { parseRadiologySections } from "@/lib/clinicalResultNormalize";
import { useI18n } from "@/lib/i18n";

type ImagingReportStructuredEntryProps = {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  t: (key: string) => string;
};

function headingCompact(heading: string): string {
  return heading
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s/g, "");
}

function fieldFromSections(
  sections: { heading: string; body: string }[],
  remainder: string
): {
  indication: string;
  technique: string;
  contrast: string;
  comparison: string;
  findings: string;
  impression: string;
  remainder: string;
} {
  const fields = {
    indication: "",
    technique: "",
    contrast: "",
    comparison: "",
    findings: "",
    impression: "",
    remainder,
  };
  const unused: string[] = remainder ? [remainder] : [];
  for (const section of sections) {
    const key = headingCompact(section.heading);
    if (key.includes("indication")) fields.indication = section.body;
    else if (key === "technique") fields.technique = section.body;
    else if (key === "contrast" || key === "contraste") fields.contrast = section.body;
    else if (key === "comparison" || key === "comparaison") fields.comparison = section.body;
    else if (key === "findings" || key.startsWith("constat") || key.startsWith("resultat")) {
      fields.findings = section.body;
    }     else if (key === "impression" || key === "conclusion") fields.impression = section.body;
    else if (key === "report" || key === "compterendu") {
      fields.remainder = [fields.remainder, section.body].filter(Boolean).join("\n\n");
    } else unused.push(`${section.heading}:\n${section.body}`);
  }
  fields.remainder = unused.join("\n\n").trim();
  return fields;
}

export function ImagingReportStructuredEntry({
  value,
  onChange,
  placeholder,
  t,
}: ImagingReportStructuredEntryProps) {
  const { language } = useI18n();
  const parsed = useMemo(() => parseRadiologySections(value, language), [value, language]);
  const fields = fieldFromSections(parsed.sections, parsed.remainder);
  const hasStructured = Boolean(
    fields.indication ||
      fields.technique ||
      fields.contrast ||
      fields.comparison ||
      fields.findings ||
      fields.impression ||
      parsed.sections.length
  );

  const patch = (next: Partial<typeof fields>) => {
    onChange(serializeRadiologyReportFields({ ...fields, ...next }));
  };

  const areaStyle: React.CSSProperties = {
    display: "block",
    marginTop: 6,
    width: "100%",
    boxSizing: "border-box",
    padding: 8,
    minHeight: 64,
  };

  if (!value.trim() || hasStructured) {
    return (
      <div style={{ display: "grid", gap: 10, marginTop: 6 }}>
        {(
          [
            ["indication", t("orderDetail.radIndication")],
            ["technique", t("orderDetail.radTechnique")],
            ["contrast", t("orderDetail.radContrast")],
            ["comparison", t("orderDetail.radComparison")],
            ["findings", t("orderDetail.radFindings")],
            ["impression", t("orderDetail.radImpression")],
          ] as const
        ).map(([id, label]) => (
          <label key={id} style={{ display: "block", fontSize: 13, fontWeight: 600 }}>
            {label}
            <textarea
              value={fields[id]}
              onChange={(e) => patch({ [id]: e.target.value })}
              rows={id === "findings" || id === "impression" ? 4 : 2}
              style={areaStyle}
            />
          </label>
        ))}
        <textarea
          value={fields.remainder}
          onChange={(e) => patch({ remainder: e.target.value })}
          rows={3}
          placeholder={placeholder}
          style={areaStyle}
        />
      </div>
    );
  }

  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={8}
      placeholder={placeholder}
      style={{ display: "block", marginTop: 6, width: "100%", boxSizing: "border-box", padding: 8 }}
    />
  );
}
