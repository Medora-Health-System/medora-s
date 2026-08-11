# INP.1B.2 implementation

## Clinical UX corrections

- Reused the existing `InpatientAdmissionClinicalShell`, 20 schemas, server writer, reload path, completion validator, summary, and print flow.
- Added the missing admission-source canonical catalog and corrected arrival-mode codes.
- Made Immediate Assessment chips controlled editors for the persisted canonical fields. General appearance is multi-select; level of consciousness and orientation presets are single-select; immediate concerns are multi-select.
- Suppressed the four duplicate generic editors when their chip editors are present.
- Replaced glued EN/FR field labels with explicit readable catalog entries and removed raw-key fallback behavior.
- Removed workflow intro, domain-reuse/provenance prose, enterprise badge prose, and internal projection/domain diagnostics from normal clinical presentation.
- Renamed the final section to Nursing Handoff & Admission Completion in English and French.
- Retained explicit Save, Save and continue, Previous/Next, section status, completion progress, large chip targets, and keyboard navigation. Removed unsafe render-stale autosave scheduling rather than changing persistence semantics.

## Persistence sequence

A chip click supplies a canonical code to the shell `answers` draft. The controlled chip derives selection from that same value. Save sends the section answers and expected version through the existing API; the response replaces the local document/version. Section navigation saves dirty state first. Reload hydrates the same section answers. Translated labels are never serialized; authored narrative remains verbatim.

## Completion

The existing shared validator continues to enforce only fields marked required or conditionally required. `NOT_APPLICABLE` is accepted, and `UNABLE_TO_COMPLETE` requires a reason. Server signing uses the existing review/completion pathway rather than toggling a client-only flag.
