# INP.1B.3 Inpatient Nursing Assessment UX — Implementation

The Nursing Assessment route now mounts only `InpatientNursingAssessmentPanel`. A single horizontally compact navigation exposes Overview, Systems Assessment, neurological, respiratory, cardiovascular, GI, GU, skin/wounds, mobility/fall risk, pain, devices, safety, I&O, nutrition/hydration, education, handoff, and immutable history.

Documentation is config-driven: selects handle single coded findings, chips/checkboxes handle multiple findings, numbers handle scores/flow/FiO2, and text is limited to clinically necessary details. No clinical value is preselected. Section-level **Within expected limits** is an explicit action.

**New reassessment** creates a blank local draft. **Copy previous assessment** is separate and explicit: it copies the latest values into a new draft, assigns reassessment type, and never writes until Save. Changed fields receive a visual marker by comparison with the copied source. Save continues through the INP.1A endpoint, which creates a new server-timestamped session and event. Historical rows open read-only.

The Overview is computed directly from the current draft/latest assessment. Existing wound, I&O, swallowing, device, and restraint workflows are linked or projected rather than duplicated. Server-authoritative author/time are shown after reload.

All labels and option codes have parallel English and French catalogs. Canonical uppercase codes are persisted; clinician-entered narratives remain verbatim.
