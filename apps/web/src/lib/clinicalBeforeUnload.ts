export function clinicalBeforeUnloadShouldWarn(input: {
  dirty: boolean;
  workflowEditable?: boolean;
  signedOrFinalized?: boolean;
}): boolean {
  return Boolean(input.dirty && input.workflowEditable !== false && !input.signedOrFinalized);
}

export function applyClinicalBeforeUnloadWarning(event: BeforeUnloadEvent): void {
  event.preventDefault();
  event.returnValue = "";
}

export function clinicalDraftPreservedMessageState(input: {
  dirty: boolean;
  draftPreserved: boolean;
  saveFailed?: boolean;
}): "none" | "draft_preserved" | "save_failed_draft_preserved" {
  if (!input.dirty || !input.draftPreserved) return "none";
  return input.saveFailed ? "save_failed_draft_preserved" : "draft_preserved";
}
