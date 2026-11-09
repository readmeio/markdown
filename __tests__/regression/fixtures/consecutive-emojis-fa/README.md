# `consecutive-emojis-fa` Fixture

Four emoji patterns that each surfaced their own fix in recent months:
consecutive gemojis, standalone FA shortcodes, FA inside a blockquote
callout header, and emoji combinations inside a JSX `<Callout>` body.

## Source bugs

- PR #1390 — consecutive gemojis (`:grin::grin:`) only rendered the first one
- PR #1421 — FA emoji shortcodes silently dropped inside blockquote callout headers
- PR #1416 — gemoji not rendering in api-header magic block titles
- PR #1449 — gemoji and expressions not rendering inside custom components

## What flips this fixture

Changes to the gemoji tokenizer's adjacent-emoji detection, the FA-emoji
handler in the callout transformer's `toMarkdownExtensions`, or the
component-children expression evaluation.
