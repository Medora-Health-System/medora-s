export type EncounterListLifecycleProjection = {
  id: string;
  status?: string | null;
  closedAt?: string | null;
};

/** MEDUI.D4C.8.1: lifecycle closure is projected only from Encounter.status. */
export function projectEncounterListLifecycle(encounter: EncounterListLifecycleProjection) {
  const isClosed = encounter.status === "CLOSED";

  return {
    isClosed,
    closedAt: isClosed && encounter.closedAt ? encounter.closedAt : null,
    href: `/app/encounters/${encounter.id}`,
  } as const;
}
