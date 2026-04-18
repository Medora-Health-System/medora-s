/**
 * Medico-legal chart lock: when provider documentation is signed, clinical mutations are blocked server-side
 * (`assertEncounterNotSigned`) and the UI treats the encounter as read-only except addenda.
 */

export function isEncounterLocked(
  encounter: { providerDocumentationStatus?: string | null } | null | undefined
): boolean {
  return encounter?.providerDocumentationStatus === "SIGNED";
}
