/**
 * MEDUI.MEDICATION.GOVERNED_ACTIVATION_FRAMEWORK.1
 * Tdap end-to-end governance certification (audit-only).
 */

import { ENTERPRISE_WAVE1_BILLING_BY_CODE } from "./enterpriseWave1BillingManifest.js";
import type { MedicationActivationGovernanceRecord } from "./medicationActivationGovernance.js";
import {
  buildTdapVaccineAdministrationNote,
  emptyTdapVaccineAdministrationForm,
  getTdapFormularyEntry,
  sampleCompleteTdapVaccineAdministrationForm,
  TDAP_CATALOG_CODE,
  tdapNoteIsMonolingual,
  validateTdapVaccineAdministrationForm,
} from "./tdapVaccineAdministration.js";
import { VACCINE_MANUFACTURER_CATALOG } from "./vaccineManufacturerCatalog.js";
import { TDAP_VIS_REFERENCE } from "./vaccineVisGovernance.js";

export type TdapGovernanceCheck = {
  check: string;
  pass: boolean;
  detail: string;
};

export type TdapGovernanceCertificationReport = {
  ticket: "MEDUI.MEDICATION.GOVERNED_ACTIVATION_FRAMEWORK.1";
  generatedAt: string;
  catalogCode: string;
  checks: TdapGovernanceCheck[];
  decision: "PASS" | "FAIL";
  blockers: string[];
};

export function certifyTdapGovernance(
  activationRecord: MedicationActivationGovernanceRecord | null
): TdapGovernanceCertificationReport {
  const entry = getTdapFormularyEntry();
  const billing = ENTERPRISE_WAVE1_BILLING_BY_CODE[TDAP_CATALOG_CODE];
  const emptyErrors = validateTdapVaccineAdministrationForm(emptyTdapVaccineAdministrationForm());
  const completeErrors = validateTdapVaccineAdministrationForm(sampleCompleteTdapVaccineAdministrationForm());
  const noteEn = buildTdapVaccineAdministrationNote(sampleCompleteTdapVaccineAdministrationForm(), "en");
  const noteFr = buildTdapVaccineAdministrationNote(sampleCompleteTdapVaccineAdministrationForm(), "fr");

  const checks: TdapGovernanceCheck[] = [
    {
      check: "tdap_exists_in_catalog",
      pass: Boolean(entry),
      detail: entry ? `Wave 1 entry: ${entry.displayNameEn}` : "Missing from enterprise Wave 1",
    },
    {
      check: "provider_orderability_state_documented",
      pass: Boolean(activationRecord?.restrictedReason || activationRecord?.reviewReason),
      detail: activationRecord?.status ?? "unknown",
    },
    {
      check: "provider_not_auto_orderable",
      pass: activationRecord?.status !== "ORDERABLE",
      detail: "Vaccine must remain restricted until explicit governance activation",
    },
    {
      check: "mar_workflow_validation",
      pass: completeErrors.length === 0,
      detail: `${completeErrors.length} validation errors on complete sample form`,
    },
    {
      check: "lot_tracking_required",
      pass: emptyErrors.includes("lot_number_required"),
      detail: "Empty form fails lot_number_required",
    },
    {
      check: "expiration_tracking_required",
      pass: emptyErrors.includes("expiration_date_required"),
      detail: "Empty form fails expiration_date_required",
    },
    {
      check: "manufacturer_tracking_required",
      pass: emptyErrors.includes("manufacturer_required"),
      detail: "Empty form fails manufacturer_required",
    },
    {
      check: "vis_tracking_supported",
      pass: Boolean(TDAP_VIS_REFERENCE.cdcVisUrl),
      detail: TDAP_VIS_REFERENCE.cdcVisUrl,
    },
    {
      check: "inventory_linkage_via_ndc",
      pass: Boolean(activationRecord?.ndcReady || billing?.ndc11),
      detail: billing?.ndc11 ?? "no NDC in wave1 billing manifest",
    },
    {
      check: "billing_linkage",
      pass: Boolean(billing?.hcpcs && billing?.administrationCpt && billing?.cvxCode),
      detail: billing ? `HCPCS ${billing.hcpcs}, CVX ${billing.cvxCode}` : "no billing row",
    },
    {
      check: "en_localization",
      pass: tdapNoteIsMonolingual(noteEn, "en") && Boolean(entry?.displayNameEn),
      detail: entry?.displayNameEn ?? "",
    },
    {
      check: "fr_localization",
      pass: tdapNoteIsMonolingual(noteFr, "fr") && Boolean(entry?.displayNameFr),
      detail: entry?.displayNameFr ?? "",
    },
    {
      check: "manufacturer_from_centralized_catalog",
      pass: VACCINE_MANUFACTURER_CATALOG.length >= 16,
      detail: `${VACCINE_MANUFACTURER_CATALOG.length} manufacturers in shared catalog`,
    },
    {
      check: "no_language_leakage",
      pass: tdapNoteIsMonolingual(noteEn, "en") && tdapNoteIsMonolingual(noteFr, "fr"),
      detail: "EN/FR auto-notes are monolingual",
    },
  ];

  const blockers = checks.filter((c) => !c.pass).map((c) => `${c.check}: ${c.detail}`);
  const workflowBlockers = blockers.filter(
    (b) => !b.startsWith("provider_not_auto_orderable") && !b.startsWith("provider_orderability_state")
  );

  return {
    ticket: "MEDUI.MEDICATION.GOVERNED_ACTIVATION_FRAMEWORK.1",
    generatedAt: new Date().toISOString(),
    catalogCode: TDAP_CATALOG_CODE,
    checks,
    decision: workflowBlockers.length === 0 ? "PASS" : "FAIL",
    blockers: workflowBlockers,
  };
}
