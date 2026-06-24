import { Injectable, OnModuleInit } from "@nestjs/common";
import { prewarmProviderOrderableCatalogCodesRegistry } from "@medora/shared";
import { createStructuredLogger } from "../common/logging/structured-logger";

const log = createStructuredLogger("MedicationRegistryPrewarm");

@Injectable()
export class MedicationRegistryPrewarmService implements OnModuleInit {
  onModuleInit(): void {
    const started = Date.now();
    const activeCodes = prewarmProviderOrderableCatalogCodesRegistry();
    log.log("provider_orderable_catalog_codes_prewarmed", {
      durationMs: Date.now() - started,
      activeCodeCount: activeCodes.size,
    });
  }
}
