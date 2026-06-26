/** App shell auth recovery panel visibility — phase-gated, never handler-gated. */

export type AppShellAuthRecoveryVisibilityInput = {
  /** True only when session bootstrap phase is recoverable_error. */
  authRecoveryActive: boolean;
  onAuthRecoveryRetry?: (() => void) | null;
  onAuthRecoveryLogin?: (() => void) | null;
  onAuthRecoveryReload?: (() => void) | null;
};

export function resolveAppShellShowAuthRecovery(
  input: AppShellAuthRecoveryVisibilityInput
): boolean {
  if (!input.authRecoveryActive) return false;
  return (
    typeof input.onAuthRecoveryRetry === "function" &&
    typeof input.onAuthRecoveryLogin === "function" &&
    typeof input.onAuthRecoveryReload === "function"
  );
}

/** Clears client auth/me cache and notifies the app layout to reload session. */
export function notifyAuthSessionRestored(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("medora:session-refresh"));
}
