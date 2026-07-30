/**
 * MEDUI.D4C.7K — test double for the required EnterpriseEncounterLifecycleService dependency
 * of EncountersService.
 *
 * Specs that exercise `close()` must use the real service (see
 * `encounters.service.close-advisory-d4c7j.spec.ts`): this double only satisfies the required
 * constructor dependency for specs that never close an encounter, and fails loudly if a close
 * path reaches it unexpectedly.
 */
export function createMockEnterpriseLifecycleService() {
  return {
    applyCloseTransition: jest.fn(async () => {
      throw new Error(
        "EnterpriseEncounterLifecycleService.applyCloseTransition must be exercised with the real service"
      );
    }),
    recordLifecycleTransition: jest.fn().mockResolvedValue(1),
    reopenEncounter: jest.fn(),
    listLifecycleTimeline: jest.fn(),
    assertCloseAuthorized: jest.fn(),
    assertReopenAuthorized: jest.fn(),
  };
}
