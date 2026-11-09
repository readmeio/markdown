# `jsx-attribute-entities` Fixture

JSX attributes carrying HTML character entities. MDX decodes these via a
strict parser; MDXish's permissive tokenizer historically passed them
through as opaque strings, producing a pure cross-engine divergence.

## Source bugs

- PR #1462 — numeric/hex entities in JSX attribute values (e.g. `<Callout icon="&#128679;">`) rendered as literal entity text
- PR #1461 — `<Image caption="...">` containing nested entity-encoded JSX threw in the strict MDAST re-parse

## What flips this fixture

Changes to `decodeHTMLStrict` invocations in `mdxish`, the JSX attribute
value tokenizer, or `imageTransformer`'s caption re-parse guard.
