const DIGITAL_CARE_PERSISTENCE_OBJECT_NAMES = [
  "Portal",
  "Conversation",
  "Thread",
  "Message",
  "Notification",
  "Video",
  "Education",
  "Questionnaire",
  "Consent",
  "Proxy",
] as const;

describe("Digital Care persistence contracts", () => {
  it("keeps the DC-1G object vocabulary complete and unique", () => {
    expect(DIGITAL_CARE_PERSISTENCE_OBJECT_NAMES).toHaveLength(10);
    expect(new Set(DIGITAL_CARE_PERSISTENCE_OBJECT_NAMES).size).toBe(10);
  });

  it("does not introduce table or ORM semantics into the contract vocabulary", () => {
    for (const name of DIGITAL_CARE_PERSISTENCE_OBJECT_NAMES) {
      expect(name.toLowerCase()).not.toContain("table");
      expect(name.toLowerCase()).not.toContain("prisma");
    }
  });
});
