export function createMockBedBoardService() {
  return {
    buildBedKeyForAssignment: jest.fn((unit: string, room: string) => `${unit}:${room}`),
    getEffectiveBedRow: jest.fn().mockResolvedValue(null),
    assertBedAssignableOrThrow: jest.fn(),
    getBedBoard: jest.fn(),
    updateBedStatus: jest.fn(),
    loadOperationalOverlays: jest.fn().mockResolvedValue(new Map()),
  };
}
