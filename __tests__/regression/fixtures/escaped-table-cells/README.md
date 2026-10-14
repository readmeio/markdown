# `escaped-table-cells` Fixture

Backslash escapes and entities in text-only table cells must stay literal.

## Source bug

- RM-18923 — a text-only cell was re-parsed from its already-decoded text, so
  `\*a\*` rendered as italics (and `&lt;x&gt;` could turn into a tag). Cells are
  now re-parsed from their own source.

## What flips this fixture

Changes to the text-only cell re-parse in `mdxishTables` (`cellMarkdown`), or to
how the table re-parse decodes escapes and entities.
