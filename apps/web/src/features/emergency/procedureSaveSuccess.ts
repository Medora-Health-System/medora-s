/** Delay before auto-closing procedure documentation modal after successful save. */
export const PROCEDURE_SAVE_SUCCESS_CLOSE_MS = 1000;

export async function afterProcedureDocumentSaveSuccess(opts: {
  onRecorded: () => void;
  onClose: () => void;
}): Promise<void> {
  opts.onRecorded();
  await new Promise((resolve) => setTimeout(resolve, PROCEDURE_SAVE_SUCCESS_CLOSE_MS));
  opts.onClose();
}
