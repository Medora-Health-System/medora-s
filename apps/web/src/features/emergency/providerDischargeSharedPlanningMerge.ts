/**
 * Phase 19Y.2B — shared discharge planning field merge/dedupe (return precautions, work/school, follow-ups).
 */

import {
  newDefaultFollowUpRow,
  newFollowUpRowId,
  type ProviderDischargeDocumentationForm,
  type ProviderDischargeFollowUpRow,
} from "./providerDischargeDocumentationModel";
import type { ProviderDischargeTemplate } from "./providerDischargeTemplateRegistry";

export type TemplateSharedFields = {
  returnPrecautions: string;
  returnWorkSchool?: string;
  defaultFollowUps?: ProviderDischargeFollowUpRow[];
};

function normalizeTextBlocks(text: string): string[] {
  return text
    .split(/\n+/)
    .flatMap((paragraph) => paragraph.split(/(?<=[.!?])\s+/))
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Merge unique lines/sentences without repeating identical text. */
export function mergeUniquePrecautionText(existing: string, additions: string[]): string {
  const seen = new Set<string>();
  const parts: string[] = [];
  const pushUnique = (line: string) => {
    const key = line.trim().toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    parts.push(line.trim());
  };
  for (const line of normalizeTextBlocks(existing)) pushUnique(line);
  for (const addition of additions) {
    for (const line of normalizeTextBlocks(addition)) pushUnique(line);
  }
  return parts.join("\n");
}

function followUpDedupeKey(row: ProviderDischargeFollowUpRow): string {
  return [
    row.specialty.trim().toLowerCase(),
    row.providerOrFacility.trim().toLowerCase(),
    row.timing.trim().toLowerCase(),
  ].join("|");
}

export function mergeDedupedFollowUpRows(
  existing: ProviderDischargeFollowUpRow[],
  additions: ProviderDischargeFollowUpRow[]
): ProviderDischargeFollowUpRow[] {
  const seen = new Set<string>();
  const result: ProviderDischargeFollowUpRow[] = [];
  for (const row of [...existing, ...additions]) {
    const key = followUpDedupeKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ ...row, id: row.id || newFollowUpRowId() });
  }
  return result.length ? result : [newDefaultFollowUpRow()];
}

export function mergeSharedReturnWorkSchool(existing: string, additions: string[]): string {
  return mergeUniquePrecautionText(existing, additions);
}

export function extractSharedFieldsFromTemplate(template: ProviderDischargeTemplate): TemplateSharedFields {
  return {
    returnPrecautions: template.suggestedText.returnPrecautions,
    returnWorkSchool: template.suggestedText.returnWorkSchool,
    defaultFollowUps: template.defaultFollowUps,
  };
}

export function mergeTemplateSharedFieldsIntoForm(
  form: ProviderDischargeDocumentationForm,
  shared: TemplateSharedFields,
  options?: { overwriteExisting?: boolean }
): Pick<ProviderDischargeDocumentationForm, "returnPrecautions" | "returnWorkSchool" | "followUps"> {
  const overwrite = options?.overwriteExisting === true;
  let returnPrecautions = form.returnPrecautions;
  let returnWorkSchool = form.returnWorkSchool;
  let followUps = form.followUps;

  if (shared.returnPrecautions?.trim()) {
    if (overwrite) {
      returnPrecautions = shared.returnPrecautions.trim();
    } else if (!returnPrecautions.trim()) {
      returnPrecautions = shared.returnPrecautions.trim();
    }
  }

  if (shared.returnWorkSchool?.trim()) {
    if (overwrite) {
      returnWorkSchool = shared.returnWorkSchool.trim();
    } else if (!returnWorkSchool.trim()) {
      returnWorkSchool = shared.returnWorkSchool.trim();
    }
  }

  if (shared.defaultFollowUps?.length) {
    const additions = shared.defaultFollowUps.map((row) => ({ ...row, id: newFollowUpRowId() }));
    const hasComplete = followUps.some((r) => r.providerOrFacility.trim() || r.timing.trim());
    if (overwrite) {
      followUps = additions;
    } else if (!hasComplete) {
      followUps = mergeDedupedFollowUpRows(followUps, additions);
    }
  }

  if (!followUps.length) followUps = [newDefaultFollowUpRow()];

  return { returnPrecautions, returnWorkSchool, followUps };
}

export function mergeSharedFieldsFromSelectedTemplates(
  form: ProviderDischargeDocumentationForm,
  templates: TemplateSharedFields[],
  options?: { overwriteExisting?: boolean }
): Pick<ProviderDischargeDocumentationForm, "returnPrecautions" | "returnWorkSchool" | "followUps"> {
  const overwrite = options?.overwriteExisting === true;
  if (overwrite) {
    let scratch: ProviderDischargeDocumentationForm = {
      ...form,
      returnPrecautions: "",
      returnWorkSchool: "",
      followUps: [newDefaultFollowUpRow()],
    };
    for (const template of templates) {
      scratch = { ...scratch, ...mergeTemplateSharedFieldsIntoForm(scratch, template, { overwriteExisting: true }) };
    }
    return {
      returnPrecautions: scratch.returnPrecautions,
      returnWorkSchool: scratch.returnWorkSchool,
      followUps: scratch.followUps,
    };
  }

  let bundledPrecautions = "";
  let bundledWorkSchool = "";
  let bundledFollowUps: ProviderDischargeFollowUpRow[] = [];
  for (const template of templates) {
    if (template.returnPrecautions?.trim()) {
      bundledPrecautions = mergeUniquePrecautionText(bundledPrecautions, [template.returnPrecautions]);
    }
    if (template.returnWorkSchool?.trim()) {
      bundledWorkSchool = mergeSharedReturnWorkSchool(bundledWorkSchool, [template.returnWorkSchool]);
    }
    if (template.defaultFollowUps?.length) {
      bundledFollowUps = mergeDedupedFollowUpRows(bundledFollowUps, template.defaultFollowUps);
    }
  }

  const hasFollowUp = form.followUps.some((r) => r.providerOrFacility.trim() || r.timing.trim());

  return {
    returnPrecautions: form.returnPrecautions.trim() || bundledPrecautions,
    returnWorkSchool: form.returnWorkSchool.trim() || bundledWorkSchool,
    followUps:
      hasFollowUp ?
        form.followUps
      : bundledFollowUps.length ?
        bundledFollowUps.map((row) => ({ ...row, id: row.id || newFollowUpRowId() }))
      : form.followUps,
  };
}

/** Lift legacy per-card shared fields into top-level shared discharge planning. */
export function hydrateSharedFieldsIntoForm(
  form: ProviderDischargeDocumentationForm,
  topLevel: {
    returnPrecautions?: string;
    returnWorkSchool?: string;
    followUps?: ProviderDischargeFollowUpRow[];
  }
): ProviderDischargeDocumentationForm {
  let returnPrecautions = topLevel.returnPrecautions ?? "";
  let returnWorkSchool = topLevel.returnWorkSchool ?? "";
  let followUps = topLevel.followUps?.length ? [...topLevel.followUps] : [];

  for (const doc of form.diagnosisDocs) {
    if (doc.returnPrecautions?.trim()) {
      returnPrecautions = mergeUniquePrecautionText(returnPrecautions, [doc.returnPrecautions]);
    }
    if (doc.returnWorkSchool?.trim()) {
      returnWorkSchool = mergeSharedReturnWorkSchool(returnWorkSchool, [doc.returnWorkSchool]);
    }
    if (doc.followUps?.length) {
      followUps = mergeDedupedFollowUpRows(followUps, doc.followUps);
    }
  }

  if (!followUps.length) followUps = [newDefaultFollowUpRow()];

  return { ...form, returnPrecautions, returnWorkSchool, followUps };
}
