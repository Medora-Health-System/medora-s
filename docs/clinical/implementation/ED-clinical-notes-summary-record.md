# ED clinical notes Summary/record implementation

The shared `EncounterClinicalRecord` now contains typed `narrativeNotes`. Its builder accepts encounter-note API rows, rejects foreign-encounter rows, drops invalid/empty rows, deduplicates by persisted id, derives the visible legal status from persisted lifecycle metadata, and orders by authoritative creation time plus id.

`buildEncounterClinicalRecordInputFromEmergencySummary` passes the already-loaded `encounter.encounterNotes` source into this builder. There is no fetch in the builder and no Summary write. Both the enterprise Summary renderer and ER clinical-record print packet consume the exact same projection. The existing legacy Summary, patient chart, client print layout, and server chart export remain source-backed.

A typed ED documentation catalog gives every actual source family an explicit `INCLUDE_FULL`, `INCLUDE_STRUCTURED`, `REFERENCE`, or justified `EXCLUDE_WITH_REASON` disposition. Its test prevents an unclassified registered source.

Backward compatibility is read-only: legacy ER note rows and old nursing/provider JSON continue through existing normalizers; missing optional attribution becomes an explicit unavailable value rather than current-viewer attribution. No narrative translation or PHI logging was added.
