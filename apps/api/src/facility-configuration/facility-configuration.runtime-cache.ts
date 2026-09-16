import { Injectable } from "@nestjs/common";
import {
  defaultFacilityConfigurationSettings,
  projectFacilityRuntimeConfiguration,
  type FacilityConfigurationSettings,
  type FacilityRuntimeConfiguration,
} from "@medora/shared";
import { createStructuredLogger } from "../common/logging/structured-logger";

export type FacilityConfigurationCacheEntry = {
  facilityId: string;
  revision: number;
  settings: FacilityConfigurationSettings;
  runtime: FacilityRuntimeConfiguration;
  loadedAt: number;
};

const log = createStructuredLogger("FacilityConfigurationCache");

@Injectable()
export class FacilityConfigurationRuntimeCache {
  private readonly hot = new Map<string, FacilityConfigurationCacheEntry>();
  private readonly lastValid = new Map<string, FacilityConfigurationCacheEntry>();

  get(facilityId: string): FacilityConfigurationCacheEntry | undefined {
    return this.hot.get(facilityId);
  }

  lastValidFor(facilityId: string): FacilityConfigurationCacheEntry | undefined {
    return this.lastValid.get(facilityId) ?? this.hot.get(facilityId);
  }

  put(facilityId: string, revision: number, settings: FacilityConfigurationSettings): FacilityConfigurationCacheEntry {
    const entry: FacilityConfigurationCacheEntry = {
      facilityId,
      revision,
      settings,
      runtime: projectFacilityRuntimeConfiguration(facilityId, settings, revision),
      loadedAt: Date.now(),
    };
    this.hot.set(facilityId, entry);
    this.lastValid.set(facilityId, entry);
    log.log("facility_configuration_runtime_rebuild", { facilityId, revision });
    return entry;
  }

  invalidate(facilityId: string): void {
    this.hot.delete(facilityId);
    log.log("facility_configuration_cache_invalidate", { facilityId });
  }

  failoverRuntime(facilityId: string): FacilityRuntimeConfiguration {
    const last = this.lastValidFor(facilityId);
    if (last) {
      log.warn("facility_configuration_failover", { facilityId, revision: last.revision, source: "last_valid" });
      return last.runtime;
    }
    log.warn("facility_configuration_failover", { facilityId, revision: 0, source: "defaults" });
    return projectFacilityRuntimeConfiguration(facilityId, defaultFacilityConfigurationSettings(), 0);
  }
}
