/**
 * Phase 19Y — nursing discharge execution under `nursingAssessment.erDispositionExecutionV1`.
 */

import {
  ER_DISPOSITION_EXECUTION_V1_KEY,
  type ErDischargeSortieExecutionStored,
} from "./emergencyDispositionV1";

export const NURSING_DISCHARGE_DESTINATIONS = [
  "HOME",
  "HOME_WITH_FAMILY",
  "SNF",
  "ASSISTED_LIVING",
  "TRANSFER_FACILITY",
  "ADMISSION_UNIT",
  "CUSTODY",
  "AMA",
  "LWBS",
  "MORGUE",
  "OTHER",
] as const;

export type NursingDischargeDestination = (typeof NURSING_DISCHARGE_DESTINATIONS)[number];

export const NURSING_DISCHARGE_CONDITIONS = [
  "STABLE",
  "IMPROVED",
  "UNCHANGED",
  "GUARDED",
  "FAIR",
  "AMBULATORY",
  "WHEELCHAIR",
  "STRETCHER",
  "OTHER",
] as const;

export type NursingDischargeCondition = (typeof NURSING_DISCHARGE_CONDITIONS)[number];

export const NURSING_DISCHARGE_TEACHING_ITEMS = [
  "DIAGNOSIS_REVIEWED",
  "MEDICATION_INSTRUCTIONS",
  "PRESCRIPTION_INSTRUCTIONS",
  "FOLLOW_UP_REVIEWED",
  "RETURN_PRECAUTIONS",
  "WOUND_CARE",
  "ACTIVITY_RESTRICTIONS",
  "WORK_SCHOOL_NOTE",
  "EQUIPMENT_USE",
  "PATIENT_VERBALIZED_UNDERSTANDING",
  "FAMILY_VERBALIZED_UNDERSTANDING",
  "INTERPRETER_USED",
  "WRITTEN_INSTRUCTIONS_PROVIDED",
] as const;

export type NursingDischargeTeachingItem = (typeof NURSING_DISCHARGE_TEACHING_ITEMS)[number];

export type NursingDischargeExecutionForm = {
  destination: NursingDischargeDestination | "";
  dischargeAtLocal: string;
  teachingReviewed: NursingDischargeTeachingItem[];
  conditionAtDischarge: NursingDischargeCondition | "";
  nursingDischargeNote: string;
};

export type NursingDischargeExecutionStored = ErDischargeSortieExecutionStored & {
  nursingDestination?: NursingDischargeDestination;
  nursingConditionAtDischarge?: NursingDischargeCondition;
  nursingTeachingReviewed?: NursingDischargeTeachingItem[];
  dischargedByTitle?: string;
};

export function emptyNursingDischargeExecutionForm(): NursingDischargeExecutionForm {
  return {
    destination: "",
    dischargeAtLocal: "",
    teachingReviewed: [],
    conditionAtDischarge: "",
    nursingDischargeNote: "",
  };
}

function readTeachingItems(raw: unknown): NursingDischargeTeachingItem[] {
  if (!Array.isArray(raw)) return [];
  const allowed = new Set<string>(NURSING_DISCHARGE_TEACHING_ITEMS);
  return raw.filter((x): x is NursingDischargeTeachingItem => typeof x === "string" && allowed.has(x));
}

export function hydrateNursingDischargeExecutionForm(
  nursingAssessment: unknown
): NursingDischargeExecutionForm {
  const form = emptyNursingDischargeExecutionForm();
  if (!nursingAssessment || typeof nursingAssessment !== "object" || Array.isArray(nursingAssessment)) {
    return form;
  }
  const raw = (nursingAssessment as Record<string, unknown>)[ER_DISPOSITION_EXECUTION_V1_KEY];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return form;
  const o = raw as Record<string, unknown>;

  const at = o.dischargeSortieCompletedAt;
  if (typeof at === "string" && at.trim()) {
    try {
      const d = new Date(at);
      if (!Number.isNaN(d.getTime())) {
        const pad = (n: number) => String(n).padStart(2, "0");
        form.dischargeAtLocal = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      }
    } catch {
      /* ignore */
    }
  }

  const dest = o.nursingDestination;
  if (typeof dest === "string" && (NURSING_DISCHARGE_DESTINATIONS as readonly string[]).includes(dest)) {
    form.destination = dest as NursingDischargeDestination;
  }

  const cond = o.nursingConditionAtDischarge;
  if (typeof cond === "string" && (NURSING_DISCHARGE_CONDITIONS as readonly string[]).includes(cond)) {
    form.conditionAtDischarge = cond as NursingDischargeCondition;
  }

  form.teachingReviewed = readTeachingItems(o.nursingTeachingReviewed);

  const note = o.dischargeSortieExecutionNote;
  if (typeof note === "string") form.nursingDischargeNote = note;

  return form;
}

export function readNursingDischargeExecutionStored(
  nursingAssessment: unknown
): NursingDischargeExecutionStored | null {
  if (!nursingAssessment || typeof nursingAssessment !== "object" || Array.isArray(nursingAssessment)) {
    return null;
  }
  const raw = (nursingAssessment as Record<string, unknown>)[ER_DISPOSITION_EXECUTION_V1_KEY];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const at = o.dischargeSortieCompletedAt;
  const by = o.dischargeSortieCompletedByDisplayName;
  if (typeof at !== "string" || typeof by !== "string") return null;

  const out: NursingDischargeExecutionStored = {
    dischargeSortieCompletedAt: at,
    dischargeSortieCompletedByDisplayName: by,
  };

  const note = o.dischargeSortieExecutionNote;
  if (typeof note === "string" && note.trim()) out.dischargeSortieExecutionNote = note.trim().slice(0, 2000);

  const dest = o.nursingDestination;
  if (typeof dest === "string" && (NURSING_DISCHARGE_DESTINATIONS as readonly string[]).includes(dest)) {
    out.nursingDestination = dest as NursingDischargeDestination;
  }

  const cond = o.nursingConditionAtDischarge;
  if (typeof cond === "string" && (NURSING_DISCHARGE_CONDITIONS as readonly string[]).includes(cond)) {
    out.nursingConditionAtDischarge = cond as NursingDischargeCondition;
  }

  const teaching = readTeachingItems(o.nursingTeachingReviewed);
  if (teaching.length) out.nursingTeachingReviewed = teaching;

  const title = o.dischargedByTitle;
  if (typeof title === "string" && title.trim()) out.dischargedByTitle = title.trim();

  return out;
}

export function mergeNursingDischargeExecutionIntoNursingAssessment(
  previousNursingAssessment: unknown,
  stored: NursingDischargeExecutionStored
): Record<string, unknown> {
  const base =
    previousNursingAssessment && typeof previousNursingAssessment === "object" && !Array.isArray(previousNursingAssessment)
      ? { ...(previousNursingAssessment as Record<string, unknown>) }
      : {};

  const payload: Record<string, unknown> = {
    dischargeSortieCompletedAt: stored.dischargeSortieCompletedAt,
    dischargeSortieCompletedByDisplayName: stored.dischargeSortieCompletedByDisplayName,
  };

  const note = stored.dischargeSortieExecutionNote?.trim().slice(0, 2000);
  if (note) payload.dischargeSortieExecutionNote = note;

  if (stored.nursingDestination) payload.nursingDestination = stored.nursingDestination;
  if (stored.nursingConditionAtDischarge) payload.nursingConditionAtDischarge = stored.nursingConditionAtDischarge;
  if (stored.nursingTeachingReviewed?.length) payload.nursingTeachingReviewed = stored.nursingTeachingReviewed;
  if (stored.dischargedByTitle?.trim()) payload.dischargedByTitle = stored.dischargedByTitle.trim();

  base[ER_DISPOSITION_EXECUTION_V1_KEY] = payload;
  return base;
}

export function nursingDischargeFormToStored(
  form: NursingDischargeExecutionForm,
  completedByDisplayName: string,
  completedByTitle?: string
): NursingDischargeExecutionStored {
  const iso =
    form.dischargeAtLocal.trim() ?
      new Date(form.dischargeAtLocal).toISOString()
    : new Date().toISOString();

  return {
    dischargeSortieCompletedAt: iso,
    dischargeSortieCompletedByDisplayName: completedByDisplayName.trim(),
    dischargeSortieExecutionNote: form.nursingDischargeNote.trim() || undefined,
    nursingDestination: form.destination || undefined,
    nursingConditionAtDischarge: form.conditionAtDischarge || undefined,
    nursingTeachingReviewed: form.teachingReviewed.length ? form.teachingReviewed : undefined,
    dischargedByTitle: completedByTitle?.trim() || undefined,
  };
}
