/** Test double for D4A.3.0 EnterpriseAssignmentService injection into EncountersService. */
export function createMockEnterpriseAssignmentService() {
  return {
    mutateEmergencySelfAssignment: jest.fn().mockResolvedValue({
      previousUserId: null,
      unchanged: false,
      encounterId: "enc-1",
      patientId: "patient-1",
      version: 4,
    }),
    mutateHospitalAssignment: jest.fn(),
    getHospitalBoardProjection: jest.fn(),
    seedEmptyHospitalAssignmentSummary: jest.fn((json: unknown) => json ?? {}),
    certification: () => "MEDUI.ENTERPRISE_HOSPITAL_ASSIGNMENT_ENGINE.D4A3_0",
  };
}
