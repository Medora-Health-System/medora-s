import { Injectable } from "@nestjs/common";
import { EventEmitter } from "events";
import { createStructuredLogger } from "../common/logging/structured-logger";

export const FACILITY_CONFIGURATION_UPDATED_EVENT = "FacilityConfigurationUpdated" as const;

export type FacilityConfigurationUpdatedPayload = {
  facilityId: string;
  revision: number;
};

const log = createStructuredLogger("FacilityConfigurationEvents");

@Injectable()
export class FacilityConfigurationEvents {
  private readonly bus = new EventEmitter();

  constructor() {
    this.bus.setMaxListeners(50);
  }

  emitUpdated(payload: FacilityConfigurationUpdatedPayload): void {
    log.log("facility_configuration_broadcast", payload);
    this.bus.emit(FACILITY_CONFIGURATION_UPDATED_EVENT, payload);
  }

  onUpdated(listener: (payload: FacilityConfigurationUpdatedPayload) => void): () => void {
    this.bus.on(FACILITY_CONFIGURATION_UPDATED_EVENT, listener);
    return () => this.bus.off(FACILITY_CONFIGURATION_UPDATED_EVENT, listener);
  }
}
