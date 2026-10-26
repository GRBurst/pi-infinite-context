import assert from "node:assert/strict";
import { test } from "node:test";
import { handoffNotice, handoffRequest, snapshotHasFolds } from "./handoff.ts";

test("only a saved root fold makes the unfolded transcript unsafe to send", () => {
  for (const data of [undefined, null, "x", { roots: "garbage" }, { version: 2, roots: [] }, { roots: [null, { kind: "message", id: "a" }] }])
    assert.equal(snapshotHasFolds(data), false, JSON.stringify(data));
  assert.equal(snapshotHasFolds({ version: 2, roots: [{ kind: "message", id: "a" }, { kind: "fold", id: "f", children: [] }] }), true);
});

test("the handoff request is one user message with the reason", () => {
  assert.deepEqual(handoffRequest("why", 42), [{ role: "user", content: handoffNotice("why"), timestamp: 42 }]);
  assert.match(handoffNotice("why"), /folds could not be applied \(why\)/);
});
