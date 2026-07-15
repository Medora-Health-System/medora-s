import type { ProviderDischargeDocumentationForm } from "./providerDischargeDocumentationModel";

/**
 * When encounter diagnoses are soft-removed, drop checkbox refs and unedited
 * generated discharge cards. Preserve clinician-edited cards as orphaned/manual.
 */
export function pruneDischargeFormAfterDiagnosisRemoval(
  form: ProviderDischargeDocumentationForm,
  activeEncounterDiagnosisIds: ReadonlySet<string>
): ProviderDischargeDocumentationForm {
  const nextRefs = form.diagnosisRefs
    .filter((ref) => {
      const id = ref.encounterDiagnosisId;
      if (!id) return true;
      return activeEncounterDiagnosisIds.has(id);
    })
    .map((ref, index) => ({
      ...ref,
      isPrimary: index === 0,
    }));

  const removedIds = new Set<string>();
  for (const ref of form.diagnosisRefs) {
    const id = ref.encounterDiagnosisId;
    if (typeof id === "string" && id.length > 0 && !activeEncounterDiagnosisIds.has(id)) {
      removedIds.add(id);
    }
  }

  if (removedIds.size === 0 && nextRefs.length === form.diagnosisRefs.length) {
    return form;
  }

  const nextDocs = form.diagnosisDocs.flatMap((doc) => {
    const src = doc.sourceEncounterDiagnosisId || doc.encounterDiagnosisId;
    if (!src || !removedIds.has(src)) return [doc];
    const providerConfirmed = doc.templateMeta?.providerConfirmed === true;
    if (providerConfirmed) {
      return [
        {
          ...doc,
          encounterDiagnosisId: undefined,
          sourceEncounterDiagnosisId: `orphaned-manual-${doc.id}`,
          staleDiagnosisIdentityWarning: true,
        },
      ];
    }
    return [];
  });

  return {
    ...form,
    diagnosisRefs: nextRefs,
    diagnosisDocs: nextDocs,
  };
}
