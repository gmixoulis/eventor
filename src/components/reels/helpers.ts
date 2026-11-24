/** "1:00", "0:08", "12:05" */
export function clipLength(totalSec: number): string {
  const sec = Math.max(0, Math.round(totalSec));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

/** Nearest start, except at a scrollable carousel end where the last fully visible card wins. */
export function activeIndex(offset: number, itemSize: number, count: number, viewport = 0, contentSize = 0): number {
  if (count <= 0 || itemSize <= 0) return 0;
  if (viewport > 0) {
    if (contentSize <= viewport) return 0;
    if (offset >= contentSize - viewport - 1) return count - 1;
  }
  return Math.min(count - 1, Math.max(0, Math.round(offset / itemSize)));
}

/** Whether item `i` keeps a mounted player: the current one and its neighbours. */
export function inPlayerWindow(i: number, active: number, count: number): boolean {
  return i >= 0 && i < count && Math.abs(i - active) <= 1;
}

export function likeCount(base: number, liked: boolean): number {
  return base + (liked ? 1 : 0);
}
