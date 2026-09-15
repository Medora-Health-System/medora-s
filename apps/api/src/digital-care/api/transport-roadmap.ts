import type { DigitalCareApiTransport } from "./digital-care-api.contract";

export const DIGITAL_CARE_TRANSPORT_ROADMAP = {
  rest: {
    phase: "DC-1F",
    status: "contracted",
    implementation: "DC-2+",
  },
  graphql: {
    phase: "future",
    status: "planned",
    implementation: "not-started",
  },
  websocket: {
    phase: "future",
    status: "planned",
    implementation: "not-started",
  },
  push: {
    phase: "future",
    status: "planned",
    implementation: "not-started",
  },
  fhir: {
    phase: "future",
    status: "planned",
    implementation: "not-started",
  },
} as const satisfies Record<
  DigitalCareApiTransport,
  { phase: string; status: string; implementation: string }
>;
