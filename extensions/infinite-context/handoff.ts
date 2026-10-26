/**
 * When saved folds cannot be applied, the raw transcript must not go out in their place: it is
 * several times larger than the folded context and can overflow the window or cost far more
 * than the user expects. The request carries a short notice instead, and the run is aborted so
 * the user can hand over to a new session.
 */

/** True when snapshot data holds a root fold. Tolerant of garbage: it runs after a failed load. */
export function snapshotHasFolds(data: unknown): boolean {
  const roots = (data as { roots?: unknown } | null | undefined)?.roots;
  return Array.isArray(roots) && roots.some((root) => (root as { kind?: unknown } | null)?.kind === "fold");
}

export const handoffNotice = (reason: string): string =>
  `infinite-context: folds could not be applied (${reason}). ` +
  "This request carries this notice instead of the unfolded transcript: start a new session and hand the work over.";

/** The only message a request carries when its folds cannot be applied. */
export const handoffRequest = (reason: string, timestamp: number) => [
  { role: "user" as const, content: handoffNotice(reason), timestamp },
];
