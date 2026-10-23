import assert from "node:assert/strict";
import test from "node:test";
import type { SessionEntry } from "@earendil-works/pi-coding-agent";
import { assertSupportedBranch } from "./assert-supported-branch.ts";
import { messageEntry, userMessage } from "./pi-test-fixtures.ts";

test("a branch rooted at the session start is supported", () => {
  const root = messageEntry("u1", userMessage("one"));
  assertSupportedBranch([]);
  assertSupportedBranch([root, { ...messageEntry("u2", userMessage("two")), parentId: "u1" }]);
});

test("a branch cut off by a missing parent names the corrupted file, not the snapshot", () => {
  const orphan: SessionEntry = { ...messageEntry("u2", userMessage("two")), parentId: "lost" };
  assert.throws(
    () => assertSupportedBranch([orphan]),
    /session file is corrupted: entry u2 points to parent lost, which is missing/,
  );
});

test("native compaction is rejected", () => {
  const compaction: SessionEntry = {
    type: "compaction",
    id: "c",
    parentId: null,
    timestamp: new Date(1).toISOString(),
    summary: "native",
    firstKeptEntryId: "c",
    tokensBefore: 1,
  };
  assert.throws(() => assertSupportedBranch([compaction]), /contains native compaction/);
});
