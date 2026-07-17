/**
 * Compatibility re-export — Phase 6 moved the implementation under Nest `src/`
 * so HTTP and CLI share one module. CLI scripts may keep importing this path.
 */
export * from "../../../src/medications/rxnorm/rxnorm-verification-service";
