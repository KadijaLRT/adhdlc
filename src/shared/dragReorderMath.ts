/** Pure helpers for drag-to-reorder lists. Kept free of React so they can be tested directly. */

export interface ItemBox {
  /** Top edge within the list container. */
  y: number;
  /** Height of the item. */
  h: number;
}

/** Returns a copy of `list` with the item at `from` moved to `to`. Out-of-range indexes return an unchanged copy. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...(list || [])];
  if (!Number.isInteger(from) || !Number.isInteger(to)) return next;
  if (from < 0 || from >= next.length || to < 0 || to >= next.length || from === to) return next;
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item as T);
  return next;
}

/**
 * Where the dragged item would land. `boxes` is in current list order;
 * `dy` is how far the finger or pointer has moved. The item lands after
 * every other item whose midpoint sits above the dragged item's midpoint.
 */
export function targetIndexFor(boxes: readonly ItemBox[], from: number, dy: number): number {
  const dragged = boxes?.[from];
  if (!dragged || !Number.isFinite(dy)) return Math.max(0, from);
  const center = dragged.y + dragged.h / 2 + dy;
  let target = 0;
  for (let i = 0; i < boxes.length; i += 1) {
    if (i === from) continue;
    const other = boxes[i];
    if (other && other.y + other.h / 2 < center) target += 1;
  }
  return target;
}

/** How far a non-dragged item slides to open a gap for the dragged one. `span` is dragged height plus the gap between items. */
export function shiftFor(index: number, from: number, target: number, span: number): number {
  if (index === from) return 0;
  if (from < target && index > from && index <= target) return -span;
  if (from > target && index >= target && index < from) return span;
  return 0;
}
