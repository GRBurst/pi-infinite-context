import assert from "node:assert/strict";
import test from "node:test";
import fc from "fast-check";
import { NUDGES_BEFORE_OVERFLOW, planNudge } from "./nudge.ts";
import { DEFAULT_SETTINGS, type Settings } from "./settings.ts";

const settings = (nudgeAtTokens: number, nudgeAtPercent: number): Settings => ({
  nudgeAtTokens,
  nudgeAtPercent,
});

test("a 200k window with the defaults nudges from 150k, as 75% did before", () => {
  assert.equal(planNudge(149_999, 200_000, DEFAULT_SETTINGS, 0, true).nudge, false);
  assert.deepEqual(planNudge(150_000, 200_000, DEFAULT_SETTINGS, 0, true), {
    nudge: true,
    band: 150_000,
  });
});

test("the token limit wins on a large window", () => {
  assert.equal(planNudge(150_000, 1_000_000, DEFAULT_SETTINGS, 0, true).nudge, true);
});

test("the percentage wins on a small window", () => {
  assert.equal(planNudge(59_999, 100_000, DEFAULT_SETTINGS, 0, true).nudge, false);
  assert.equal(planNudge(75_000, 100_000, DEFAULT_SETTINGS, 0, true).nudge, true);
});

test("a reminder repeats only at the next 15k step", () => {
  const first = planNudge(150_000, 200_000, DEFAULT_SETTINGS, 0, true);
  assert.equal(planNudge(164_999, 200_000, DEFAULT_SETTINGS, first.band, true).nudge, false);
  assert.deepEqual(planNudge(165_000, 200_000, DEFAULT_SETTINGS, first.band, true), {
    nudge: true,
    band: 165_000,
  });
});

test("no reminder when the agent is not continuing, and the band is kept", () => {
  assert.deepEqual(planNudge(180_000, 200_000, DEFAULT_SETTINGS, 150_000, false), {
    nudge: false,
    band: 150_000,
  });
});

test("dropping below the threshold resets the band", () => {
  assert.deepEqual(planNudge(10_000, 200_000, DEFAULT_SETTINGS, 170_000, true), {
    nudge: false,
    band: 0,
  });
});

test("unknown usage or window never nudges", () => {
  assert.equal(planNudge(NaN, 200_000, DEFAULT_SETTINGS, 0, true).nudge, false);
  assert.equal(planNudge(100_000, 0, DEFAULT_SETTINGS, 0, true).nudge, false);
});

/** Replays a context growing in 1k-token turns and counts the reminders fired before it overflows. */
function remindersUntilFull(window: number, s: Settings): number {
  let band = 0;
  let count = 0;
  for (let tokens = 0; tokens < window; tokens += 1_000) {
    const planned = planNudge(tokens, window, s, band, true);
    band = planned.band;
    if (planned.nudge) count++;
  }
  return count;
}

test("reminder counts per window size with the defaults", () => {
  const counts = new Map([
    [32_000, 3],
    [128_000, 3],
    [200_000, 4],
    [400_000, 17],
  ]);
  for (const [window, expected] of counts) {
    assert.equal(remindersUntilFull(window, DEFAULT_SETTINGS), expected, String(window));
  }
});

test("a threshold equal to the window still yields a finite, positive step", () => {
  const planned = planNudge(200_000, 200_000, settings(1_000_000, 100), 0, true);
  assert.deepEqual(planned, { nudge: true, band: 200_000 });
});

test("property: reminders never fire below the earlier limit and bands increase", () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 1, max: 5_000_000 }),
      fc.integer({ min: 1_000, max: 2_000_000 }),
      fc.integer({ min: 1, max: 5_000_000 }),
      fc.double({ min: 0.1, max: 100, noNaN: true }),
      fc.integer({ min: 0, max: 5_000_000 }),
      (tokens, window, limitTokens, limitPercent, lastBand) => {
        const threshold = Math.min(limitTokens, (limitPercent / 100) * window);
        const planned = planNudge(tokens, window, settings(limitTokens, limitPercent), lastBand, true);
        if (tokens < threshold) assert.equal(planned.nudge, false);
        if (planned.nudge) {
          assert.ok(planned.band > lastBand);
          assert.ok(planned.band <= tokens + 1e-6); // float slack of threshold + step * k
        }
      },
    ),
  );
});

test("property: at least NUDGES_BEFORE_OVERFLOW reminders fit between threshold and window", () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 64, max: 2_000 }), // window in k tokens
      fc.integer({ min: 1, max: 5_000 }), // token limit in k
      fc.integer({ min: 1, max: 99 }), // percent limit
      (windowK, limitK, limitPercent) => {
        const window = windowK * 1_000;
        const s = settings(limitK * 1_000, limitPercent);
        const threshold = Math.min(s.nudgeAtTokens, (limitPercent / 100) * window);
        // Needs room for the reminders on the 1k replay grid.
        fc.pre(window - threshold >= NUDGES_BEFORE_OVERFLOW * 1_000);
        assert.ok(remindersUntilFull(window, s) >= NUDGES_BEFORE_OVERFLOW);
      },
    ),
  );
});
