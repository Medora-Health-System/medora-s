/**
 * INP.PROV.1A — Non-leading documentation completeness prompts (not coding / not revenue).
 * Never invents diagnoses. Never suggests MCC/E/M upcoding language.
 *
 * Unknown vs known-empty:
 * - Omitted optional fields are NOT evaluated (no false alerts from unwired UI).
 * - Explicit empty / false-path evidence is required before raising an alert.
 */

export type InpatientDocumentationCompletenessAlertCode =
  | "MEDICAL_NECESSITY_MISSING"
  | "TIME_SELECTED_TIME_MISSING"
  | "CRITICAL_CARE_TIME_MISSING"
  | "DIAGNOSIS_LACKS_PLAN"
  | "CARRY_FORWARD_UNREVIEWED"
  | "UNSIGNED_DRAFT_PRESENT"
  | "SPECIFICITY_CLARIFY";

export type InpatientDocumentationCompletenessAlert = {
  code: InpatientDocumentationCompletenessAlertCode;
  /** Clinically neutral prompt — never revenue-leading. */
  messageEn: string;
  severity: "info" | "warning";
};

export type InpatientDocumentationCompletenessInput = {
  careSetting?: "INPATIENT" | "OBSERVATION" | "EMERGENCY" | null;
  /**
   * Provider-authored admission / disposition rationale text.
   * Only evaluated when the property is present on the input object
   * (`null` / `""` = known empty → alert; omitted = unknown → skip).
   */
  admissionRationaleText?: string | null;
  /** True when provider elected time-based E/M documentation. Omitted = unknown. */
  timeBasedEmSelected?: boolean;
  totalProviderTimeMinutes?: number | null;
  /** True when critical-care documentation path is active. Omitted = unknown. */
  criticalCareDocumented?: boolean;
  criticalCareMinutes?: number | null;
  /**
   * Active problems lacking any assessment/plan text.
   * Omitted = unknown (no alert). Explicit `> 0` raises DIAGNOSIS_LACKS_PLAN.
   */
  problemsWithoutPlanCount?: number;
  /** Copied prior note content awaiting explicit review. Omitted = unknown. */
  carryForwardPendingReview?: boolean;
  hasUnsignedProviderDraft?: boolean;
  /** Vague diagnosis wording needing clinical clarification (not a coding cue). */
  vagueDiagnosisLabels?: readonly string[];
};

const REVENUE_FORBIDDEN =
  /\b(mcc|cc\b|drg|reimbursement|upcod|higher e\/?m|capture an? mcc|increase revenue)\b/i;

export function inpatientDocumentationCompletenessMessageIsNonLeading(
  message: string
): boolean {
  return !REVENUE_FORBIDDEN.test(message);
}

export function buildInpatientDocumentationCompletenessAlerts(
  input: InpatientDocumentationCompletenessInput
): InpatientDocumentationCompletenessAlert[] {
  const alerts: InpatientDocumentationCompletenessAlert[] = [];
  const setting = String(input.careSetting ?? "INPATIENT").toUpperCase();

  if (setting === "INPATIENT" || setting === "OBSERVATION") {
    // Only when caller supplies the key — omitted means UI has not evaluated canonical rationale.
    if (Object.prototype.hasOwnProperty.call(input, "admissionRationaleText")) {
      const rationale = String(input.admissionRationaleText ?? "").trim();
      if (!rationale) {
        alerts.push({
          code: "MEDICAL_NECESSITY_MISSING",
          severity: "warning",
          messageEn:
            "Admission rationale / medical necessity is not documented. If inpatient-level care is required, document the clinical rationale explicitly.",
        });
      }
    }
  }

  if (input.timeBasedEmSelected === true) {
    const mins = input.totalProviderTimeMinutes;
    if (mins == null || !Number.isFinite(mins) || mins <= 0) {
      alerts.push({
        code: "TIME_SELECTED_TIME_MISSING",
        severity: "warning",
        messageEn:
          "Time-based documentation appears selected, but total provider time for this date is missing.",
      });
    }
  }

  if (input.criticalCareDocumented === true) {
    const mins = input.criticalCareMinutes;
    if (mins == null || !Number.isFinite(mins) || mins <= 0) {
      alerts.push({
        code: "CRITICAL_CARE_TIME_MISSING",
        severity: "warning",
        messageEn:
          "Critical-care documentation appears active, but critical-care time is missing.",
      });
    }
  }

  if (
    Object.prototype.hasOwnProperty.call(input, "problemsWithoutPlanCount") &&
    (input.problemsWithoutPlanCount ?? 0) > 0
  ) {
    alerts.push({
      code: "DIAGNOSIS_LACKS_PLAN",
      severity: "info",
      messageEn:
        "One or more active problems have no current assessment or plan. Document the clinical status and plan when clinically established.",
    });
  }

  if (input.carryForwardPendingReview === true) {
    alerts.push({
      code: "CARRY_FORWARD_UNREVIEWED",
      severity: "warning",
      messageEn:
        "Prior note content was carried forward and still requires explicit provider review before save or sign.",
    });
  }

  if (input.hasUnsignedProviderDraft === true) {
    alerts.push({
      code: "UNSIGNED_DRAFT_PRESENT",
      severity: "info",
      messageEn: "An unsigned provider documentation draft is present on this encounter.",
    });
  }

  if (Object.prototype.hasOwnProperty.call(input, "vagueDiagnosisLabels")) {
    for (const label of input.vagueDiagnosisLabels ?? []) {
      const name = String(label ?? "").trim();
      if (!name) continue;
      alerts.push({
        code: "SPECIFICITY_CLARIFY",
        severity: "info",
        messageEn: `"${name}" may lack clinically relevant specificity. If a more precise diagnosis has been clinically established, document it explicitly.`,
      });
    }
  }

  return alerts.filter((a) => inpatientDocumentationCompletenessMessageIsNonLeading(a.messageEn));
}
