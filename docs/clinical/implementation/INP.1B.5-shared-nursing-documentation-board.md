# INP.1B.5 implementation

## Composition

`NursingDocumentationBoard` is a care-setting-neutral presentation component. It receives immutable columns, row descriptors, an optional draft, an authorization flag and callbacks. It never calls an API and has no knowledge of ED or inpatient namespaces.

`InpatientNursingAssessmentPanel` is the inpatient adapter. It loads the INP.1A event endpoint, maps each event to a board column, creates blank or copied client-only drafts, and saves only through the INP.1A POST endpoint. The last event feeds the concise Nursing Summary sidebar.

The existing emergency adapter remains `EmergencyNursingReassessmentPanel` plus `EmergencyNursingDocumentationGrid`; it is deliberately unchanged to preserve its session, local draft, triage, trauma, Summary and Chart behavior. Future work may migrate ED rendering onto the neutral board only after equivalent interaction tests cover every ED-only row.

## Bedside workflow

1. Saved events render chronologically as read-only date/time/author columns.
2. **+ Add column** creates a blank unsaved reassessment with a visible current time.
3. **Copy previous** clones clinical content into a new unsaved draft. Amber cells identify copied values until edited.
4. The rightmost draft alone is editable. Empty fields remain “Not charted”; no normal value is implicit.
5. **Save assessment** posts canonical codes and verbatim narrative. The server supplies identity/time and appends a new immutable event.
6. RN/Admin receive authoring controls through the existing workspace authorization. Provider and locked encounters remain read-only. Other roles cannot obtain POST authority.

## Clinical scope

The board covers mental status, orientation, speech, pain, airway, respiratory effort/pattern/sounds/device, rhythm/perfusion/edema, abdomen/bowel/nausea-vomiting, urinary status, skin/wounds, mobility/gait/fall risk/precautions, lines/devices, safety, nutrition/hydration, intake/output and narrative. ED trauma and triage fields are absent.

## Legal record and projections

No new projection persistence was introduced. Latest-snapshot Overview and immutable-history Summary, Patient Chart and print/export continue to consume INP.1A data through shared projections. No Prisma schema, migration or seed changed.
