"use client";

import type { CSSProperties } from "react";
import type { MedicationMasterConceptDetail } from "@/lib/medicationMasterApi";
import { useI18n } from "@/lib/i18n";

function sectionShell(): CSSProperties {
  return {
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: "12px 14px",
    marginBottom: 12,
    background: "#fff",
  };
}

function warnStyle(severity: string): CSSProperties {
  if (severity === "critical") {
    return { background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" };
  }
  if (severity === "warning") {
    return { background: "#fffbeb", color: "#92400e", border: "1px solid #fde68a" };
  }
  return { background: "#f0f9ff", color: "#0c4a6e", border: "1px solid #bae6fd" };
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <p style={{ margin: "4px 0", fontSize: 13, color: "#334155" }}>
      <span style={{ color: "#64748b" }}>{label} : </span>
      {value || "—"}
    </p>
  );
}

export function MedicationMasterValidationReview({ detail }: { detail: MedicationMasterConceptDetail }) {
  const { t } = useI18n();
  const { concept, products, validationWarnings } = detail;

  return (
    <div style={{ fontSize: 14 }}>
      <div
        style={{
          padding: "10px 12px",
          borderRadius: 8,
          background: "#f0f9ff",
          border: "1px solid #bae6fd",
          color: "#0c4a6e",
          fontSize: 13,
          marginBottom: 16,
        }}
      >
        {t("medicationMasterValidation.readOnlyBanner")}
      </div>

      {validationWarnings.length > 0 ? (
        <section style={sectionShell()}>
          <h2 style={{ margin: "0 0 10px 0", fontSize: 15 }}>
            {t("medicationMasterValidation.warningsTitle")} ({validationWarnings.length})
          </h2>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            {validationWarnings.map((w, i) => (
              <li key={`${w.code}-${w.scopeLabel}-${i}`} style={{ marginBottom: 8 }}>
                <span
                  style={{
                    ...warnStyle(w.severity),
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: 9999,
                    marginRight: 6,
                  }}
                >
                  {t(`medicationMasterValidation.severity.${w.severity}`)}
                </span>
                <span style={{ color: "#475569" }}>
                  [{w.scope} · {w.scopeLabel}]
                </span>{" "}
                {t(`medicationMasterValidation.warning.${w.code}`)}
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p style={{ color: "#166534", fontSize: 14, marginBottom: 16 }}>
          {t("medicationMasterValidation.noWarnings")}
        </p>
      )}

      <section style={sectionShell()}>
        <h2 style={{ margin: "0 0 8px 0", fontSize: 15 }}>{t("medicationMasterValidation.sectionConcept")}</h2>
        <FieldRow label={t("medicationMasterValidation.fieldDisplayName")} value={concept.displayName} />
        <FieldRow label={t("medicationMasterValidation.fieldCode")} value={concept.code} />
        <FieldRow label={t("medicationMasterValidation.fieldGenericName")} value={concept.genericName} />
        <FieldRow
          label={t("medicationMasterValidation.fieldTherapeuticClass")}
          value={concept.therapeuticClass?.name ?? ""}
        />
      </section>

      <section style={sectionShell()}>
        <h2 style={{ margin: "0 0 8px 0", fontSize: 15 }}>{t("medicationMasterValidation.sectionSafety")}</h2>
        {concept.safetyProfile ? (
          <>
            <FieldRow
              label={t("medicationMasterValidation.fieldHighAlert")}
              value={concept.safetyProfile.isHighAlert ? t("common.yes") : t("common.no")}
            />
            <FieldRow
              label={t("medicationMasterValidation.fieldControlled")}
              value={concept.safetyProfile.isControlled ? t("common.yes") : t("common.no")}
            />
          </>
        ) : (
          <p style={{ color: "#b45309", fontSize: 13 }}>{t("medicationMasterValidation.missingSafetyProfile")}</p>
        )}
      </section>

      <section style={sectionShell()}>
        <h2 style={{ margin: "0 0 8px 0", fontSize: 15 }}>{t("medicationMasterValidation.sectionAliases")}</h2>
        <p style={{ fontSize: 13 }}>
          {concept.conceptAliases.length > 0 ? concept.conceptAliases.map((a) => a.alias).join(" · ") : "—"}
        </p>
      </section>

      {products.map((product) => (
        <section key={product.id} style={{ ...sectionShell(), background: "#fafafa" }}>
          <h2 style={{ margin: "0 0 8px 0", fontSize: 15 }}>
            {t("medicationMasterValidation.sectionProduct")} — {product.strengthDisplay}
          </h2>
          <FieldRow label={t("medicationMasterValidation.fieldCode")} value={product.code} />
          <FieldRow
            label={t("medicationMasterValidation.fieldAdministrationType")}
            value={product.administrationType}
          />
          <FieldRow
            label={t("medicationMasterValidation.fieldLegacyCatalog")}
            value={product.legacyCatalogMedicationId ?? ""}
          />

          <h3 style={{ margin: "12px 0 6px 0", fontSize: 14 }}>{t("medicationMasterValidation.sectionAdministration")}</h3>
          {product.administrationProfile ? (
            <FieldRow
              label={t("medicationMasterValidation.fieldMarWorkflow")}
              value={product.administrationProfile.defaultMarWorkflow}
            />
          ) : (
            <p style={{ color: "#b45309", fontSize: 13 }}>{t("medicationMasterValidation.missingAdminProfile")}</p>
          )}

          <h3 style={{ margin: "12px 0 6px 0", fontSize: 14 }}>{t("medicationMasterValidation.sectionInfusion")}</h3>
          {product.infusionProfile ? (
            <FieldRow
              label={t("medicationMasterValidation.fieldInfusionType")}
              value={product.infusionProfile.infusionType}
            />
          ) : (
            <p style={{ color: "#64748b", fontSize: 13 }}>{t("medicationMasterValidation.noInfusionProfile")}</p>
          )}

          {product.productAliases.length > 0 ? (
            <>
              <h3 style={{ margin: "12px 0 6px 0", fontSize: 14 }}>
                {t("medicationMasterValidation.productAliases")}
              </h3>
              <p style={{ fontSize: 13 }}>{product.productAliases.map((a) => a.alias).join(" · ")}</p>
            </>
          ) : null}

          {product.packages.map((pkg) => (
            <div
              key={pkg.id}
              style={{
                marginTop: 12,
                padding: 10,
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                background: "#fff",
              }}
            >
              <h3 style={{ margin: "0 0 6px 0", fontSize: 14 }}>
                {t("medicationMasterValidation.sectionPackage")} — {pkg.packageDescription}
              </h3>
              <FieldRow label={t("medicationMasterValidation.fieldCode")} value={pkg.code} />
              <FieldRow label={t("medicationMasterValidation.fieldNdc")} value={pkg.ndc11 ?? pkg.ndcDisplay ?? ""} />

              <h4 style={{ margin: "10px 0 4px 0", fontSize: 13 }}>{t("medicationMasterValidation.sectionBilling")}</h4>
              {pkg.billingProfiles.length > 0 ? (
                pkg.billingProfiles.map((b, idx) => (
                  <div key={idx} style={{ marginBottom: 8, paddingLeft: 8, borderLeft: "3px solid #e2e8f0" }}>
                    <FieldRow
                      label={t("medicationMasterValidation.fieldBillingReview")}
                      value={b.requiresManualReview ? t("common.yes") : t("common.no")}
                    />
                    <FieldRow label={t("medicationMasterValidation.fieldHcpcs")} value={b.hcpcsCodeSuggested ?? ""} />
                  </div>
                ))
              ) : (
                <p style={{ color: "#b45309", fontSize: 13 }}>{t("medicationMasterValidation.missingBillingProfile")}</p>
              )}

              <h4 style={{ margin: "10px 0 4px 0", fontSize: 13 }}>{t("medicationMasterValidation.sectionFormulary")}</h4>
              {pkg.facilityFormulary ? (
                <>
                  <FieldRow
                    label={t("medicationMasterValidation.fieldOnFormulary")}
                    value={pkg.facilityFormulary.isOnFormulary ? t("common.yes") : t("common.no")}
                  />
                  <FieldRow
                    label={t("medicationMasterValidation.fieldEdFormulary")}
                    value={pkg.facilityFormulary.isEDFormulary ? t("common.yes") : t("common.no")}
                  />
                  <FieldRow
                    label={t("medicationMasterValidation.fieldFavoriteTier")}
                    value={pkg.facilityFormulary.favoriteTier ?? ""}
                  />
                </>
              ) : (
                <p style={{ color: "#b45309", fontSize: 13 }}>{t("medicationMasterValidation.missingFormularyRow")}</p>
              )}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
