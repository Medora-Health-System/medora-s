import {
  projectEncounterNotesAsEnterpriseClinicalDocuments,
  projectEncounterNotesLegalRecords,
} from "./enterprise-clinical-document-foundation.util";

describe("enterprise-clinical-document-foundation.util (D4B.1)", () => {
  const notes = [
    {
      id: "n1",
      encounterId: "enc-1",
      patientId: "pat-1",
      facilityId: "fac-1",
      noteType: "NURSING",
      body: "Initial note",
      authorUserId: "u1",
      authorDisplayName: "Nurse One",
      authorRoleTitle: "RN",
      createdAt: "2026-07-26T10:00:00.000Z",
    },
    {
      id: "n2",
      encounterId: "enc-1",
      patientId: "pat-1",
      facilityId: "fac-1",
      noteType: "NURSING",
      body: "Amendment body",
      authorUserId: "u1",
      authorDisplayName: "Nurse One",
      authorRoleTitle: "RN",
      createdAt: "2026-07-26T11:00:00.000Z",
      isAmendment: true,
      amendedFromNoteId: "n1",
      amendmentReason: "Clarify",
    },
  ];

  it("projects notes without N+1 shape (single map pass)", () => {
    const docs = projectEncounterNotesAsEnterpriseClinicalDocuments({
      notes,
      careSetting: "EMERGENCY",
      currentAssignedClinicianUserId: "u-assigned",
    });
    expect(docs).toHaveLength(2);
    expect(docs[0].author.userId).toBe("u1");
    expect(docs[0].currentAssignedClinicianUserId).toBe("u-assigned");
    expect(docs[1].lifecycleState).toBe("AMENDED");
  });

  it("returns bounded legal projections newest first", () => {
    const page = projectEncounterNotesLegalRecords({
      notes,
      careSetting: "EMERGENCY",
      limit: 1,
      offset: 0,
    });
    expect(page.total).toBe(2);
    expect(page.projections).toHaveLength(1);
    expect(page.projections[0].documentId).toBe("n2");
    expect(page.projections[0].amendmentLabel).toBeTruthy();
  });
});
