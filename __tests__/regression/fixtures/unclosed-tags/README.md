# `unclosed-tags` Fixture

Three orphan/unclosed tag patterns that historically broke parsing in
distinct ways. Each was the subject of its own PR over a two-week span.

## Source bugs

- PR #1474 — orphaned `<Tag>` opener swallows following blockquote-callout
- PR #1480 / #1482 — orphan closing tags (`</li>`, `</br>`) in `<Table>` cells drop the table from the JSX pipeline
- PR #1477 — `terminateHtmlFlowBlocks` insertion of blank line collapses raw-content opener (`<pre>`, `<table>`)

## MDX side is empty by design

Strict MDX rejects orphan/unclosed tags during parse. The committed
`unclosed-tags (mdx) 1` snapshot is `""`. The MDXish-side snapshot is the
real regression contract — that's the engine doing the work to recover from
malformed input.

## What flips this fixture

Any change to `findOrphanClosers`, `repairUnclosedTags`, `normalizeTagSpacing`,
`terminateHtmlFlowBlocks`, the concrete-token flag on the mdx tokenizer, or
`hasUnclosedRawContentOpener` guard.
