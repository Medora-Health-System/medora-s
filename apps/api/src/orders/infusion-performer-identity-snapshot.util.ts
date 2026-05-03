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
 * Builds identity snapshot from DB user (optional) + resolved role rows + optional JWT/facility role fallback.
 * Null-safe on role rows — never throws on missing `role` joins.
 */
export function buildInfusionPerformerIdentitySnapshotFromDbParts(input: {
  userId: string;
  user: { firstName: string | null; lastName: string | null } | null;
  /** Non-null role rows only (code required). */
  roleRows: Array<{ code: string; name: string | null }>;
  /** When DB has no UserRole rows (or all orphaned), use request role codes from auth (e.g. RN). */
  requestorRoleCodesFallback?: readonly string[];
  actionRecordedAt?: string;
}): InfusionPerformerIdentitySnapshot {
  const sorted = [...input.roleRows].sort((a, b) => a.code.localeCompare(b.code));
  const uniqueFromDb = [...new Set(sorted.map((r) => r.code))];
  let roleCodesPipe = uniqueFromDb.join("|");
  if (!roleCodesPipe && input.requestorRoleCodesFallback?.length) {
    roleCodesPipe = [...new Set(input.requestorRoleCodesFallback.map(String))].sort().join("|");
  }
  if (!roleCodesPipe) {
    roleCodesPipe = "UNKNOWN";
  }
  const primaryRoleTitle = sorted[0]?.name?.trim() || sorted[0]?.code || null;
  return buildInfusionPerformerIdentitySnapshot({
    userId: input.userId,
    firstName: input.user?.firstName ?? null,
    lastName: input.user?.lastName ?? null,
    roleCodesPipe,
    primaryRoleTitle,
    actionRecordedAt: input.actionRecordedAt,
  });
}

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
