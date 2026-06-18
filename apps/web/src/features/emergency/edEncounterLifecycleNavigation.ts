export type EdLifecycleBoardView =
  | "trackboard"
  | "bedBoard"
  | "myPatients"
  | "incompleteCharts"
  | "allEncounters";

export const ED_LIFECYCLE_BOARD_VIEWS: readonly EdLifecycleBoardView[] = [
  "trackboard",
  "bedBoard",
  "myPatients",
  "incompleteCharts",
  "allEncounters",
] as const;

export const ED_LIFECYCLE_BOARD_VIEW_I18N_KEYS: Record<EdLifecycleBoardView, string> = {
  trackboard: "edLifecycle.navigation.trackboard",
  bedBoard: "edLifecycle.navigation.bedBoard",
  myPatients: "edLifecycle.navigation.myPatients",
  incompleteCharts: "edLifecycle.navigation.incompleteCharts",
  allEncounters: "edLifecycle.navigation.allEncounters",
};

export const ED_LIFECYCLE_PLACEHOLDER_I18N_KEYS: Partial<
  Record<EdLifecycleBoardView, string>
> = {};

export function isEdLifecyclePlaceholderView(_view: EdLifecycleBoardView): boolean {
  return false;
}
