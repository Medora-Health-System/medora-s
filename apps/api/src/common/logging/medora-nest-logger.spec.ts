import { ConsoleLogger } from "@nestjs/common";
import { MedoraNestLogger } from "./medora-nest-logger";
import { resetLogPolicyCache } from "./log-policy";

describe("MedoraNestLogger", () => {
  const prev = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = prev;
    resetLogPolicyCache();
    jest.restoreAllMocks();
  });

  it("drops RoutesResolver log lines in production but keeps warn/error", () => {
    process.env.NODE_ENV = "production";
    resetLogPolicyCache();
    const logger = new MedoraNestLogger();

    const superLog = jest.spyOn(ConsoleLogger.prototype, "log").mockImplementation(() => undefined);
    const superWarn = jest.spyOn(ConsoleLogger.prototype, "warn").mockImplementation(() => undefined);
    const superError = jest.spyOn(ConsoleLogger.prototype, "error").mockImplementation(() => undefined);

    logger.log("Mapped {/health, GET}", "RoutesResolver");
    logger.warn("slow_boot", "RoutesResolver");
    logger.error("boot_failed", undefined, "RoutesResolver");

    expect(superLog).not.toHaveBeenCalled();
    expect(superWarn).toHaveBeenCalled();
    expect(superError).toHaveBeenCalled();
  });

  it("allows application Bootstrap log lines in production", () => {
    process.env.NODE_ENV = "production";
    resetLogPolicyCache();
    const logger = new MedoraNestLogger();
    const superLog = jest.spyOn(ConsoleLogger.prototype, "log").mockImplementation(() => undefined);

    logger.log('{"event":"bootstrap_listening"}', "Bootstrap");
    expect(superLog).toHaveBeenCalled();
  });
});
