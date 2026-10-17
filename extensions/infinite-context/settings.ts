/**
 * Parse the extension's optional settings file (location: see index.ts).
 *
 * Both fields only tune when a reminder appears, so each one is fail-open on its own:
 * a missing or nonsensical value falls back to its default and a partial file still works
 * (KISS — refusing to run over a typo'd number helps nobody). Nothing here grants authority.
 */

/**
 * Session entry type recording the effective settings, for retrospective analysis. Separate
 * from the fold snapshot entry (forest.ts INFINITE_CONTEXT_ENTRY), whose latest entry is
 * parsed as fold state on load.
 */
export const SETTINGS_ENTRY = "infinite-context:settings";

export interface Settings {
  /** Remind once the context holds at least this many tokens. */
  readonly nudgeAtTokens: number;
  /** Remind once the context fills at least this percentage of the model's window. */
  readonly nudgeAtPercent: number;
}

/**
 * 150k tokens is where long contexts degrade on large-window models; 75% of a 200k window
 * is the same number, so small-window behavior is unchanged.
 */
export const DEFAULT_SETTINGS: Settings = {
  nudgeAtTokens: 150_000,
  nudgeAtPercent: 75,
};

/** A token count is a whole, positive number. */
function positiveInt(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : fallback;
}

/** A window share above 100% could never be reached, so the range is (0, 100]. */
function percent(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 && value <= 100
    ? value
    : fallback;
}

/** Parses the settings file's contents; unparseable text is treated as an empty file. */
export function parseSettings(json: string): Settings {
  let value: Record<string, unknown> | undefined;
  try {
    const parsed: unknown = JSON.parse(json);
    if (typeof parsed === "object" && parsed !== null) value = parsed as Record<string, unknown>;
  } catch {
    // Fall through to defaults; the file is the user's, not a contract we can repair.
  }
  return {
    nudgeAtTokens: positiveInt(value?.nudgeAtTokens, DEFAULT_SETTINGS.nudgeAtTokens),
    nudgeAtPercent: percent(value?.nudgeAtPercent, DEFAULT_SETTINGS.nudgeAtPercent),
  };
}

/**
 * True when `recorded` (the data of the latest settings entry on the branch, if any) does not
 * describe `current`. Untrusted session data, so anything unexpected counts as changed.
 */
export function settingsChanged(recorded: unknown, current: Settings): boolean {
  if (typeof recorded !== "object" || recorded === null) return true;
  const data = recorded as Record<string, unknown>;
  return (
    data.nudgeAtTokens !== current.nudgeAtTokens ||
    data.nudgeAtPercent !== current.nudgeAtPercent
  );
}
