/** Set true locally to trace room/bed mutations (MEDUI.ED.BEDBOARD.ROOM_MUTATION.2). */
export const BEDBOARD_MUTATION_DEBUG =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_BEDBOARD_MUTATION_DEBUG === "true";

export function logBedBoardMutationDebug(scope: string, payload: Record<string, unknown>): void {
  if (!BEDBOARD_MUTATION_DEBUG) return;
  console.debug(`[Medora BedBoardMutation:${scope}]`, payload);
}
