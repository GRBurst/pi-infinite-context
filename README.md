# pi-infinite-context

A [Pi](https://pi.dev/) extension for long-running sessions. The agent replaces old work in its context with short summaries. The original messages stay saved and searchable.

## Install

```bash
pi install npm:pi-infinite-context
```

Start a new session after installing.

## How it works

![On the left, the model sees a message, Summary B, and another message from top to bottom. Summary B represents Fold B in the archive on the right. Each fold has its summary in the header and ordered children below. Fold B contains an original message, Fold A, and another original message. Fold A contains two original messages.](docs/folding.svg)

A **fold** groups messages under a summary. The model sees the summary instead of those messages; the originals stay in the archive. Folds can contain earlier folds, as Fold B contains Fold A above. The agent can search and read the archive without unfolding it. Pi's chat history stays unchanged.

## Tools

| Tool | What it does |
| --- | --- |
| `context_fold` | Groups consecutive messages or folds under a new summary. |
| `context_map` | Lists top-level messages and folds, or the direct contents of one fold. |
| `context_search` | Searches original messages and fold summaries using regular expressions. |
| `context_peek` | Reads one original message or fold summary by ID, with an optional line range. |

Map and search results provide the IDs to read next.

## Context reminders

When Pi estimates that context is at least **75% full**, the extension reminds the agent during tool work to fold completed work while keeping the current task, open questions, errors, and useful evidence. It reminds again as usage rises.

The agent chooses what to fold and writes the summaries. Reminders do not fold anything themselves.

Pi's own compaction, including `/compact`, is blocked. If the agent does not fold enough, the context can still overflow.
