# `vars-in-inline-html` Fixture

Custom variables — both legacy `<<companyName>>` and `{user.companyName}` — used
as the *entire* body of a single-line block-level HTML tag (`<div>`, `<p>`,
`<h3>`), alongside the `<span>` form that always worked.

## Source bug

A variable resolved inside `<span>` but not inside `<div>`, `<p>`, `<h1>`–`<h3>`.
CommonMark swallows a single-line block tag as one raw `html` node, and the
mdx-blocks transformer only re-parses such a wrapper when
`containsMarkdownConstruct` finds a markdown construct in its body. Variables and
glossary terms were listed as "plain content" on the mistaken assumption that they
already resolved inside raw HTML — they don't: rehype-raw's parse5 pass reads
`<<companyName>>` as a stray `<` plus a `<companyName>` tag. A body that also held
real markdown (`<div>**bold** <<companyName>></div>`) resolved by accident, which
is why the bug looked intermittent.

## What this locks in

- The variable resolves to `Acme Inc` in every wrapper, not just `<span>`.
- A sole `{user.*}` body stays phrasing content — no `<p>` wedged inside `<p>`.
- Braces that name no variable (`{ color: red }`, `{1 + 1}`) stay literal, so
  the custom CSS authors write in these fields is untouched.

## MDX side is empty by design

Strict MDX rejects the legacy `<<companyName>>` syntax, so the committed
`vars-in-inline-html (mdx) 1` snapshot is `""`. The MDXish snapshot is the
regression contract.

## What flips this fixture

`PLAIN_CONTENT_TYPES` / `containsMarkdownConstruct`
(`processor/transform/mdxish/components/utils.ts`), the sole-flow-expression
re-typing in `processor/transform/mdxish/components/mdx-blocks.ts`, or
`soleUserVariableExpression` in `processor/transform/mdxish/variables-text.ts`.
