import { Injectable, OnModuleInit } from "@nestjs/common";
import { prewarmProviderOrderableCatalogCodesRegistry } from "@medora/shared";
import { getLogPolicy } from "../common/logging/log-policy";
import { createStructuredLogger } from "../common/logging/structured-logger";

const log = createStructuredLogger("MedicationRegistryPrewarm");

@Injectable()
export class MedicationRegistryPrewarmService implements OnModuleInit {
  onModuleInit(): void {
    const started = Date.now();
    const activeCodes = prewarmProviderOrderableCatalogCodesRegistry();
    const durationMs = Date.now() - started;
    const meta = {
      durationMs,
      activeCodeCount: activeCodes.size,
    };
    const warnMs = getLogPolicy().prewarmWarnMs;
    if (durationMs >= warnMs) {
      log.warn("provider_orderable_catalog_codes_prewarmed_slow", meta);
    } else {
      log.log("provider_orderable_catalog_codes_prewarmed", meta);
    }
  }
}
