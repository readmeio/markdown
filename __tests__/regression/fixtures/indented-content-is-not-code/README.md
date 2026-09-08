# `indented-content-is-not-code` Fixture

CommonMark's indented-code-block rule (4+ columns → literal `<pre>` code) is
disabled in MDXish, matching MDX (`micromark-extension-mdx-md`), where indented
code does not exist and code must be fenced. This fixture locks in the two
customer shapes from CX-3739:

- A top-level `<div>` card indented 6 spaces, which rendered as one raw code
  block instead of HTML.
- An `<Accordion>` body whose 4+-column list items (a hand-numbered ordered
  list with nested bullets) fragmented into `CodeTabs` code blocks.

It also carries a fenced-code-inside-a-list case to pin that explicit fences —
the only remaining way to produce code — keep working at list-continuation
indentation.

Strict MDX renders this body as well (MDX has never had indented code), so the
snapshots double as an engine-parity check for the disabled rule.

## Source bugs

- CX-3739 — indented raw HTML renders as a code block under MDXish

## What flips this fixture

Re-enabling the `codeIndented` construct (removing `disableIndentedCode` in
`processor/utils.ts` from the parser in `lib/mdxish.ts` or the component-body
re-parser in `processor/transform/mdxish/components/utils.ts`), or changes to
how `<Accordion>` bodies are dedented and re-parsed
(`safeDeindent`/`parseMdChildren` in
`processor/transform/mdxish/components/mdx-blocks.ts`).
