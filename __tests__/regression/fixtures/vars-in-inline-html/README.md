# `vars-in-inline-html` Fixture

Custom variables — both legacy `<<companyName>>` and `{user.companyName}` — used as
the *entire* body of a block-level HTML tag, across the wrapper layouts, tree
depths and component nestings authors actually write.

## Source bug

A variable resolved inside `<span>` but not inside `<div>`, `<p>`, `<h1>`–`<h3>`.
Two independent causes, both of which this fixture pins:

1. **The promotion gate.** CommonMark swallows a single-line block tag as one raw
   `html` node, and the mdx-blocks transformer only re-parses such a wrapper when
   `containsMarkdownConstruct` finds a markdown construct in its body. Variables and
   glossary terms were listed as "plain content" on the mistaken assumption that they
   already resolved inside raw HTML — they don't: rehype-raw's parse5 pass reads
   `<<companyName>>` as a stray `<` plus a `<companyName>` tag. A body that also held
   real markdown (`<div>**bold** <<companyName>></div>`) resolved by accident, which is
   why the bug looked intermittent.
2. **The component tokenizer's body scan.** `bodyLessThan` read the inner `<companyName>`
   of `<<companyName>>` as a nested opening tag, so the wrapper never balanced and the
   tokenizer dropped its claim on the block. CommonMark then split it at the next blank
   line, leaving the closing tag as a separate html node and the body raw.

## What this locks in

- The variable resolves in every wrapper, not just `<span>`.
- Every wrapper layout resolves: closer on its own line, a blank line before the
  closer, and an indented body. The fully block-separated form
  (`<div>` / blank line / variable / blank line / `</div>`) keeps its `<p>` — that is
  ordinary markdown-in-HTML-block behavior and is unchanged by the fix.
- Variables nested several tags deep, and variables wrapped in HTML inside a component.
- Glossary terms (`<<glossary:owlbert>>`) behave the same as variables — they were in
  the same "plain content" list and broke the same way.
- Braces that name no variable (`{ color: red }`, `{1 + 1}`) stay literal, so the
  custom CSS authors write in these fields is untouched.
- Mixed bodies: a reference alongside other expressions promotes the wrapper, after
  which the siblings evaluate (`{1 + 1}` → `2`) and CSS-shaped braces stay literal but
  are re-serialized (`{ color: red }` → `{color: red}`). That is how promotion has
  always behaved — `<div>**bold** { color: red }</div>` does the same on `next`; a
  reference is just a new way to trigger it. A body with no reference at all is
  untouched.

## MDX side is empty by design

Strict MDX rejects the legacy `<<companyName>>` syntax, so the committed
`vars-in-inline-html (mdx) 1` snapshot is `""`. The MDXish snapshot is the
regression contract.

## What flips this fixture

`PLAIN_CONTENT_TYPES` / `containsMarkdownConstruct`
(`processor/transform/mdxish/components/utils.ts`), `soleUserVariableExpression`
(`processor/transform/mdxish/variables-text.ts`), or the `<<` branch of `bodyLessThan`
(`lib/micromark/mdx-component/syntax.ts`).

## Known gap

A raw `<table>` cell whose content *starts* with a legacy variable
(`<td><<companyName>></td>`) still fails to resolve — the table subsystem parses cells
with `mdxjs` registered, and `legacyVariable` is a text-only construct, so the flow JSX
construct claims the `<` first. Unrelated machinery; tracked separately. A cell that
leads with other content (`<td>**bold** <<companyName>></td>`, the `legacy-vars-in-table`
fixture) resolves fine.
