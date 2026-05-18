import { useEffect } from "react";
import {
  applyClinicalBeforeUnloadWarning,
  clinicalBeforeUnloadShouldWarn,
} from "./clinicalBeforeUnload";

export { applyClinicalBeforeUnloadWarning, clinicalBeforeUnloadShouldWarn };

export function useClinicalBeforeUnloadWarning(input: {
  dirty: boolean;
  workflowEditable?: boolean;
  signedOrFinalized?: boolean;
}): void {
  useEffect(() => {
    if (!clinicalBeforeUnloadShouldWarn(input)) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      applyClinicalBeforeUnloadWarning(event);
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [input.dirty, input.workflowEditable, input.signedOrFinalized]);
}
