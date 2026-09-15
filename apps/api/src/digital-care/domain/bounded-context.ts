export const DIGITAL_CARE_BOUNDED_CONTEXT = {
  name: "digital-care",
  displayName: "Digital Care",
  purpose:
    "Own digitally mediated patient engagement workflows while consuming clinical and enterprise data through approved public contracts and events.",
  futureCapabilities: [
    "portal",
    "communication",
    "notifications",
    "telemedicine",
    "education",
    "questionnaires",
    "monitoring",
    "consent",
    "proxy",
    "ai",
  ],
} as const;

export type DigitalCareBoundedContext = typeof DIGITAL_CARE_BOUNDED_CONTEXT;
