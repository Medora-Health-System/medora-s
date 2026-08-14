"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { D4C8C_CERTIFICATION_ID } from "@medora/shared";
import { useI18n } from "@/lib/i18n";

type Props = {
  patientId: string;
  roleCodes: readonly string[];
  children: ReactNode;
};

/**
 * MEDUI.D4C.8C — enterprise Patient Medical Record shell.
 * Longitudinal index only. Does not embed D4C.8B clinical composition.
 */
export function EnterprisePatientMedicalRecord({ patientId, roleCodes, children }: Props) {
  const { t } = useI18n();
  const isFacilityAdmin =
    roleCodes.includes("ADMIN") || roleCodes.includes("MEDORA_SUPER_ADMIN");

  return (
    <div
      data-testid="enterprise-patient-medical-record"
      data-certification-id={D4C8C_CERTIFICATION_ID}
      data-patient-id={patientId}
    >
      <header style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#0f172a" }}>
          {t("enterprisePatientMedicalRecordD4c8c.title")}
        </h2>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b", maxWidth: 720 }}>
          {t("enterprisePatientMedicalRecordD4c8c.subtitle")}
        </p>
        {isFacilityAdmin ? (
          <p style={{ margin: "10px 0 0", fontSize: 13 }}>
            <Link
              href="/app/admin/audit"
              style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}
            >
              {t("enterprisePatientMedicalRecordD4c8c.audit.adminLink")}
            </Link>
            <span style={{ color: "#64748b" }}>
              {" — "}
              {t("enterprisePatientMedicalRecordD4c8c.audit.adminHint")}
            </span>
          </p>
        ) : null}
      </header>
      {children}
    </div>
  );
}
