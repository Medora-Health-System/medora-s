# INP.1B implementation

`InpatientNursingAssessmentPanel` is the inpatient-native structured charting surface. Canonical codes are selected in localized dropdowns and POSTed to `/encounters/:id/inpatient-nursing-assessments`; reload and the history rail read the latest encounter namespace and `/encounters/:id/inpatient-nursing-assessment-events`. Each save remains a new immutable server-attributed event.

The panel shows and updates PMH, PSH, home medications, tobacco, alcohol, substances and other social history through `/patients/:id/clinical-history-profile/sections/:section`. Allergies are read from the existing patient profile authority; no assessment allergy field was introduced. The version-1 contract received only an optional `generalAppearance` coded field, preserving old snapshots.

The INP.1A adapter remains the common Summary/chart/print contract. The UI never writes those projections, never patches generic encounter JSON, and never imports or writes the ED assessment namespace. EN/FR catalogs localize presentation while persisted values remain canonical.
