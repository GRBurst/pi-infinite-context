import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_SETTINGS, parseSettings, settingsChanged } from "./settings.ts";

test("an empty or unreadable file yields the defaults", () => {
  for (const input of ["", "not json", "null", "[]", "42", "{}"]) {
    assert.deepEqual(parseSettings(input), DEFAULT_SETTINGS, input);
  }
});

test("each field is read on its own", () => {
  assert.deepEqual(parseSettings(JSON.stringify({ nudgeAtTokens: 100_000 })), {
    ...DEFAULT_SETTINGS,
    nudgeAtTokens: 100_000,
  });
  assert.deepEqual(parseSettings(JSON.stringify({ nudgeAtPercent: 50.5 })), {
    ...DEFAULT_SETTINGS,
    nudgeAtPercent: 50.5,
  });
  assert.equal(parseSettings(JSON.stringify({ nudgeAtPercent: 100 })).nudgeAtPercent, 100);
});

test("an invalid field falls back without disturbing the valid one", () => {
  for (const bad of [0, -1, 1.5, "1000", null, NaN]) {
    assert.deepEqual(
      parseSettings(JSON.stringify({ nudgeAtTokens: bad, nudgeAtPercent: 60 })),
      { ...DEFAULT_SETTINGS, nudgeAtPercent: 60 },
      String(bad),
    );
  }
  for (const bad of [0, -5, 100.1, "50", null]) {
    assert.deepEqual(
      parseSettings(JSON.stringify({ nudgeAtTokens: 9000, nudgeAtPercent: bad })),
      { ...DEFAULT_SETTINGS, nudgeAtTokens: 9000 },
      String(bad),
    );
  }
});

test("unknown keys are ignored", () => {
  assert.deepEqual(parseSettings(JSON.stringify({ whatever: true })), DEFAULT_SETTINGS);
});

test("only a record that matches the current settings counts as unchanged", () => {
  assert.equal(settingsChanged({ ...DEFAULT_SETTINGS }, DEFAULT_SETTINGS), false);
  assert.equal(settingsChanged({ ...DEFAULT_SETTINGS, nudgeAtTokens: 1 }, DEFAULT_SETTINGS), true);
  assert.equal(settingsChanged({ ...DEFAULT_SETTINGS, nudgeAtPercent: 1 }, DEFAULT_SETTINGS), true);
  for (const recorded of [undefined, null, "x", 3, {}]) {
    assert.equal(settingsChanged(recorded, DEFAULT_SETTINGS), true, String(recorded));
  }
});
