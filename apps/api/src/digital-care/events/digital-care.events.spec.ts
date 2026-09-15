import { DIGITAL_CARE_SHARED_EVENT_NAMES } from "./digital-care.events";

describe("Digital Care shared event vocabulary", () => {
  it("keeps the canonical DC-1C event names stable and unique", () => {
    expect(DIGITAL_CARE_SHARED_EVENT_NAMES).toEqual([
      "PatientRegistered",
      "PatientActivated",
      "PatientDisabled",
      "LabReleased",
      "ConversationCreated",
      "ConversationReplied",
      "VideoStarted",
      "NotificationSent",
      "EducationAssigned",
      "ConsentSigned",
    ]);

    expect(new Set(DIGITAL_CARE_SHARED_EVENT_NAMES).size).toBe(
      DIGITAL_CARE_SHARED_EVENT_NAMES.length,
    );
  });
});
