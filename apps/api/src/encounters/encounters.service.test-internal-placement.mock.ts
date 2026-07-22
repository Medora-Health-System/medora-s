/** Minimal InternalPlacementService mock for EncountersService unit tests. */
export function createMockInternalPlacementService() {
  return {
    isWorkflowEnabled: jest.fn().mockReturnValue(false),
    getActiveForEncounter: jest.fn().mockResolvedValue(null),
    createDraft: jest.fn(),
    updateDraft: jest.fn(),
    signDraft: jest.fn(),
    submitRequested: jest.fn(),
  };
}
