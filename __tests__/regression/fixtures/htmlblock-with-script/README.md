# `htmlblock-with-script` Fixture

Static HTML content inside an `<HTMLBlock>` template-literal — exercises
the HTMLBlock parse path without enabling `runScripts`.

## Source bugs

- PR #1457 — `\n` escape inside a `runScripts=true` template literal was mangled by `formatHtmlForMdxish`, crashing the page with a JavaScript `SyntaxError`

## Scope note

The original bug specifically required `runScripts=true` plus a `\n` inside
a `<script>` tag. This fixture intentionally omits `runScripts` to avoid
exercising script execution from the test render helper. The HTMLBlock
template-literal parse path itself is still covered. If the
`runScripts=true` variant ever needs locked-in coverage, it should land in
a separate fixture with explicit isolation review first.

## What flips this fixture

Changes to `formatHtmlForMdxish`, the HTMLBlock JSX template-literal
tokenizer, or the static-HTML pass-through in either engine.
