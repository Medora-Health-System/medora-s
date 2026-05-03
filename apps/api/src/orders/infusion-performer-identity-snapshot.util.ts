/**
 * IVPB / infusion — durable performer identity on OrderEvent.metadata + AuditLog.metadata.
 * Snapshot is taken at action time so later User/role renames do not erase legal context.
 */

export type InfusionPerformerIdentitySnapshot = {
  performedByUserId: string;
  performedByDisplayName?: string;
  /** Human label at action time (e.g. Role.name) or primary role code. */
  performedByTitle?: string;
  /** Pipe-separated role codes for this facility (stable, sorted). */
  performedByRoleSnapshot: string;
  actionRecordedAt: string;
};

export type BuildInfusionPerformerIdentitySnapshotInput = {
  userId: string;
  firstName?: string | null;
  lastName?: string | null;
  /** Sorted unique codes joined with "|", e.g. "RN" or "ADMIN|RN". */
  roleCodesPipe: string;
  /** Prefer Role.name when present (locale-specific label at action time). */
  primaryRoleTitle?: string | null;
  /** Injected in tests; defaults to `new Date().toISOString()`. */
  actionRecordedAt?: string;
};

/**
 * Pure builder — load User + UserRole in the service, then call this.
 */
export function buildInfusionPerformerIdentitySnapshot(
  input: BuildInfusionPerformerIdentitySnapshotInput
): InfusionPerformerIdentitySnapshot {
  const display = [input.firstName ?? "", input.lastName ?? ""].join(" ").trim();
  const actionRecordedAt = input.actionRecordedAt ?? new Date().toISOString();
  const pipe = input.roleCodesPipe.trim() || "UNKNOWN";
  const titleFromRole = input.primaryRoleTitle?.trim();
  const title =
    titleFromRole ||
    (pipe !== "UNKNOWN" ? pipe.split("|")[0]?.trim() : undefined) ||
    undefined;

  return {
    performedByUserId: input.userId,
    ...(display ? { performedByDisplayName: display } : {}),
    ...(title ? { performedByTitle: title } : {}),
    performedByRoleSnapshot: pipe,
    actionRecordedAt,
  };
}

/** Read path: prefer metadata snapshot, then join. */
export function resolvePerformedByDisplayNameFromOrderEvent(metadata: unknown, joinFallback: string): string {
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    const m = metadata as Record<string, unknown>;
    const fromMeta = m.performedByDisplayName;
    if (typeof fromMeta === "string" && fromMeta.trim()) {
      return fromMeta.trim();
    }
  }
  return joinFallback.trim();
}
