import {
  isCriticalPathReady,
  markCriticalDependenciesReady,
  markOptionalPrewarmRuntime,
  markSchemaGuardRuntime,
  resetRuntimeAvailabilityStateForTests,
} from "./runtime-availability.state";

describe("runtime availability state", () => {
  beforeEach(() => {
    resetRuntimeAvailabilityStateForTests();
  });

  it("is not ready until schema guard and critical deps are set", () => {
    expect(isCriticalPathReady()).toBe(false);
    markCriticalDependenciesReady();
    expect(isCriticalPathReady()).toBe(false);
    markSchemaGuardRuntime("ok");
    expect(isCriticalPathReady()).toBe(true);
  });

  it("optional prewarm failure does not fail critical path", () => {
    markSchemaGuardRuntime("skipped");
    markCriticalDependenciesReady();
    markOptionalPrewarmRuntime("failed");
    expect(isCriticalPathReady()).toBe(true);
  });
});
