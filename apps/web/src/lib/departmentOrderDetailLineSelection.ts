export type DepartmentOrderLineSelectionItem = {
  id: string;
};

/**
 * Resolves which order line should be expanded on department order detail.
 * Prefers `?ligne=` when valid, keeps the current selection when still present,
 * otherwise defaults to the first visible line.
 */
export function resolveSelectedLineId(
  items: readonly DepartmentOrderLineSelectionItem[],
  highlightLineId: string,
  currentSelectedId: string | null | undefined
): string | null {
  if (items.length === 0) return null;

  const trimmedHighlight = highlightLineId.trim();
  if (trimmedHighlight && items.some((item) => item.id === trimmedHighlight)) {
    return trimmedHighlight;
  }

  if (currentSelectedId && items.some((item) => item.id === currentSelectedId)) {
    return currentSelectedId;
  }

  return items[0]!.id;
}

export function isDepartmentOrderLineExpanded(
  itemId: string,
  selectedLineId: string | null | undefined
): boolean {
  return Boolean(selectedLineId && itemId === selectedLineId);
}
