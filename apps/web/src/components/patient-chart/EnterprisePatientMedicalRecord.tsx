"use client";

import type { ReactNode } from "react";
import { D4C8C_CERTIFICATION_ID } from "@medora/shared";

type Props = {
  patientId: string;
  roleCodes: readonly string[];
  children: ReactNode;
};

/**
 * Patient record shell.
 *
 * The Patient module is a patient-level summary/profile surface. Encounter-authoritative
 * clinical documentation remains in the ED, inpatient, and encounter workspaces.
 */
export function EnterprisePatientMedicalRecord({ patientId, children }: Props) {
  return (
    <div
      data-testid="enterprise-patient-medical-record"
      data-certification-id={D4C8C_CERTIFICATION_ID}
      data-patient-id={patientId}
    >
      {children}
    </div>
  );
}
