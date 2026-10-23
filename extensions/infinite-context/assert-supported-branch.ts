import type { SessionEntry } from "@earendil-works/pi-coding-agent";

/**
 * Reject branches the archive cannot represent faithfully, naming the cause.
 *
 * Pi builds the branch by walking `parentId` links from the leaf and stops at the
 * first parent it cannot find. A complete branch therefore starts at the session
 * root (`parentId: null`). Any other start means entries are missing from the
 * session file, typically because an append was interrupted (for example by a
 * full disk) and Pi skipped the torn line on load. Reporting that here keeps the
 * snapshot checks in `forest.ts` from blaming the snapshot for a corrupted file.
 */
export function assertSupportedBranch(entries: readonly SessionEntry[]): void {
  const first = entries[0];
  if (first && first.parentId !== null)
    throw new Error(
      `The session file is corrupted: entry ${first.id} points to parent ${first.parentId}, ` +
        `which is missing from the file (likely an interrupted write, e.g. a full disk). ` +
        `Repair the session file or start a new session.`,
    );
  if (entries.some((entry) => entry.type === "compaction"))
    throw new Error(
      "This branch contains native compaction, which infinite-context v2 cannot archive; start a new session.",
    );
}
