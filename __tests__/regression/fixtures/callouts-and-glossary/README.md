# `callouts-and-glossary` Fixture

Crash-prone combinations of `<Callout>`, `<Glossary>`, and FA emoji inside
callout headers. Each of these patterns crashed view-mode rendering at some
point in the last two months.

## Source bugs

- PR #1421 — FA emoji shortcodes (`:fa-rss-square:`) silently dropped inside blockquote callout headers
- PR #1441 — `<<glossary:term>>` inside a callout title crashed the whole page
- PR #1408 — empty `<Glossary>` / `<Glossary></Glossary>` crashed both MDX and MDXish
- PR #1454 — headerless callouts incorrectly applied title styling to first body paragraph

## What flips this fixture

Changes to the callout transformer's `toMarkdownExtensions`, the
`extractCalloutTitle` regex, glossary lookup paths, or the headerless
callout detection logic.
