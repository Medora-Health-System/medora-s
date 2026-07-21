import {
  evaluateSchemaCompatibility,
  schemaCompatGuardEnabled,
  type SchemaObjectPresence,
} from "./schema-compatibility";

function basePresence(
  overrides: Partial<SchemaObjectPresence> = {}
): SchemaObjectPresence {
  return {
    trackboardRequiredColumnsMissing: [],
    encounterCoreColumnsMissing: [],
    hospitalEpisodeTablePresent: false,
    hospitalEpisodeIdColumnPresent: false,
    hospitalEpisodeStatusEnumPresent: false,
    hospitalEpisodeCloseReasonEnumPresent: false,
    d3bMigrationRecorded: false,
    internalPlacementTablePresent: false,
    internalPlacementStatusEnumPresent: false,
    internalPlacementRequestedTypeEnumPresent: false,
    receivingEncounterLifecycleEnumPresent: false,
    d3cMigrationRecorded: false,
    appliedMigrationCount: 10,
    latestAppliedMigration: "20261023120000_medication_phase_18_operational_governance",
    ...overrides,
  };
}

describe("schema-compatibility evaluate (D3B/D3C + Encounter contracts)", () => {
  it("allows pre-D3B database when all hospital flags OFF and contracts safe", () => {
    const report = evaluateSchemaCompatibility(basePresence(), {
      hospitalEpisodeFoundationEnabled: false,
      internalPlacementWorkflowEnabled: false,
      receivingEncounterFoundationEnabled: false,
      encounterQueryContractError: null,
    });
    expect(report.ok).toBe(true);
    expect(report.verdict).toBe("COMPATIBLE");
    expect(report.encounterQueryContractsSafe).toBe(true);
  });

  it("fails when shared Encounter contracts leak hospitalEpisodeId even if flag OFF", () => {
    const report = evaluateSchemaCompatibility(basePresence(), {
      hospitalEpisodeFoundationEnabled: false,
      internalPlacementWorkflowEnabled: false,
      receivingEncounterFoundationEnabled: false,
      encounterQueryContractError: 'ENCOUNTER_CORE_SELECT must not include D3 key "hospitalEpisodeId"',
    });
    expect(report.ok).toBe(false);
    expect(report.verdict).toBe("UNSAFE_RUNTIME_QUERY_CONTRACT");
    expect(report.encounterQueryContractsSafe).toBe(false);
  });

  it("allows post-D3B / pre-D3C when placement flags OFF", () => {
    const report = evaluateSchemaCompatibility(
      basePresence({
        hospitalEpisodeTablePresent: true,
        hospitalEpisodeIdColumnPresent: true,
        hospitalEpisodeStatusEnumPresent: true,
        hospitalEpisodeCloseReasonEnumPresent: true,
        d3bMigrationRecorded: true,
      }),
      {
        hospitalEpisodeFoundationEnabled: false,
        internalPlacementWorkflowEnabled: false,
        receivingEncounterFoundationEnabled: false,
        encounterQueryContractError: null,
      }
    );
    expect(report.ok).toBe(true);
  });

  it("allows post-D3C when flags OFF", () => {
    const report = evaluateSchemaCompatibility(
      basePresence({
        hospitalEpisodeTablePresent: true,
        hospitalEpisodeIdColumnPresent: true,
        hospitalEpisodeStatusEnumPresent: true,
        hospitalEpisodeCloseReasonEnumPresent: true,
        d3bMigrationRecorded: true,
        internalPlacementTablePresent: true,
        internalPlacementStatusEnumPresent: true,
        internalPlacementRequestedTypeEnumPresent: true,
        receivingEncounterLifecycleEnumPresent: true,
        d3cMigrationRecorded: true,
      }),
      {
        hospitalEpisodeFoundationEnabled: false,
        internalPlacementWorkflowEnabled: false,
        receivingEncounterFoundationEnabled: false,
        encounterQueryContractError: null,
      }
    );
    expect(report.ok).toBe(true);
  });

  it("fails when D3C ON but InternalPlacementRequest table missing", () => {
    const report = evaluateSchemaCompatibility(
      basePresence({
        hospitalEpisodeTablePresent: true,
        hospitalEpisodeIdColumnPresent: true,
        hospitalEpisodeStatusEnumPresent: true,
        hospitalEpisodeCloseReasonEnumPresent: true,
      }),
      {
        hospitalEpisodeFoundationEnabled: false,
        internalPlacementWorkflowEnabled: true,
        receivingEncounterFoundationEnabled: false,
        encounterQueryContractError: null,
      }
    );
    expect(report.ok).toBe(false);
    expect(report.verdict).toBe("FEATURE_ON_SCHEMA_MISSING");
  });

  it("fails when D3C ON but D3B schema missing", () => {
    const report = evaluateSchemaCompatibility(
      basePresence({
        internalPlacementTablePresent: true,
        internalPlacementStatusEnumPresent: true,
        internalPlacementRequestedTypeEnumPresent: true,
        receivingEncounterLifecycleEnumPresent: true,
      }),
      {
        internalPlacementWorkflowEnabled: true,
        encounterQueryContractError: null,
      }
    );
    expect(report.ok).toBe(false);
    expect(report.verdict).toBe("FEATURE_ON_SCHEMA_MISSING");
  });

  it("fails when D3B ON but hospitalEpisodeId missing", () => {
    const report = evaluateSchemaCompatibility(
      basePresence({
        hospitalEpisodeTablePresent: true,
        hospitalEpisodeIdColumnPresent: false,
        hospitalEpisodeStatusEnumPresent: true,
        hospitalEpisodeCloseReasonEnumPresent: true,
      }),
      {
        hospitalEpisodeFoundationEnabled: true,
        encounterQueryContractError: null,
      }
    );
    expect(report.ok).toBe(false);
    expect(report.verdict).toBe("FEATURE_ON_SCHEMA_MISSING");
  });

  it("fails when required Encounter core columns missing", () => {
    const report = evaluateSchemaCompatibility(
      basePresence({ encounterCoreColumnsMissing: ["workflowState"] }),
      {
        hospitalEpisodeFoundationEnabled: false,
        encounterQueryContractError: null,
      }
    );
    expect(report.ok).toBe(false);
    expect(report.verdict).toBe("REQUIRED_SCHEMA_MISSING");
  });

  it("fails when required Trackboard Encounter columns missing", () => {
    const report = evaluateSchemaCompatibility(
      basePresence({ trackboardRequiredColumnsMissing: ["workflowState"] }),
      {
        hospitalEpisodeFoundationEnabled: false,
        encounterQueryContractError: null,
      }
    );
    expect(report.ok).toBe(false);
    expect(report.verdict).toBe("REQUIRED_SCHEMA_MISSING");
  });
});

describe("schemaCompatGuardEnabled", () => {
  it("defaults on in production", () => {
    expect(schemaCompatGuardEnabled({ NODE_ENV: "production" })).toBe(true);
  });

  it("defaults off outside production unless explicitly enabled", () => {
    expect(schemaCompatGuardEnabled({ NODE_ENV: "development" })).toBe(false);
    expect(
      schemaCompatGuardEnabled({
        NODE_ENV: "development",
        MEDORA_SCHEMA_COMPAT_GUARD: "true",
      })
    ).toBe(true);
  });
});
