import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { AiFacilityReviewContextService } from "./ai-facility-review-context.service.js";

describe("AI-1 trusted encounter facility context", () => {
  const findFirst = jest.fn();
  const service = new AiFacilityReviewContextService({ encounter: { findFirst } } as any);
  beforeEach(() => findFirst.mockReset());

  it("derives jurisdiction and language independently from the persisted encounter facility", async () => {
    findFirst.mockResolvedValue({ facility: { country: "United States", defaultLanguage: "es" } });
    const result = await service.resolve("facility-1", "encounter-1");
    expect(result.country.jurisdiction).toBe("US");
    expect(result.language).toBe("es");
    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "encounter-1", facilityId: "facility-1", facility: { isActive: true } },
    }));
  });

  it("supports Haitian jurisdiction with French facility language", async () => {
    findFirst.mockResolvedValue({ facility: { country: "Haiti", defaultLanguage: "fr" } });
    const result = await service.resolve("facility-1", "encounter-1");
    expect(result.country.jurisdiction).toBe("HT");
    expect(result.language).toBe("fr");
  });

  it("rejects encounters outside the active facility", async () => {
    findFirst.mockResolvedValue(null);
    await expect(service.resolve("facility-1", "encounter-other")).rejects.toBeInstanceOf(NotFoundException);
  });

  it.each([
    { country: "Unknown", defaultLanguage: "en" },
    { country: "US", defaultLanguage: "auto" },
  ])("fails closed on unsupported facility settings %p", async (facility) => {
    findFirst.mockResolvedValue({ facility });
    await expect(service.resolve("facility-1", "encounter-1")).rejects.toBeInstanceOf(ForbiddenException);
  });
});
