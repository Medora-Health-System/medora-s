import { Test } from "@nestjs/testing";
import { AppModule } from "../app.module";
import { JurisdictionProfileRegistry } from "./jurisdiction-profile.registry";
import { applyE2eAuthTestEnv } from "../test-utils/e2e-auth-env";

applyE2eAuthTestEnv();

describe("FHIR module dependency injection", () => {
  it("resolves the jurisdiction registry through the real AppModule container", async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    expect(moduleRef.get(JurisdictionProfileRegistry).resolve("HT")).toHaveLength(1);
    await moduleRef.close();
  });
});
