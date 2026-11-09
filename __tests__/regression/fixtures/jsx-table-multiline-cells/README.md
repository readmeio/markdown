# `jsx-table-multiline-cells` Fixture

A JSX `<Table>` whose single cell holds three blank-line-separated paragraphs.
Locks in that paragraph breaks inside a table cell survive the render instead
of collapsing into one concatenated line (`Line 1Line 2Line 3`).

## Source bugs

- PR #1445 — multi-paragraph table cells collapsed to a single line. The fix
  this render suite exercises lives in `jsx-to-mdast` / `mdxish-tables`:
  `unwrapSoleParagraph` only unwraps a cell's paragraph wrapper when it is the
  cell's *sole* paragraph (`paragraphCount === 1`); a cell with more than one
  paragraph keeps every `<p>` intact.

> **Scope note:** PR #1445's companion fix in `mdxishTablesToJsx` — forcing JSX
> `<Table>` output over a GFM pipe table when a cell has `>1` paragraph (since
> GFM cells are single-line) — is in the *serialize* path (mdast → markdown),
> which this render-only suite (markdown → HTML) does not exercise. This fixture
> locks in the render-observable half: paragraph preservation in the cell.

## What it proves

- Both engines emit `<td>...<p>Line 1</p><p>Line 2</p><p>Line 3</p>...</td>` —
  the three paragraphs stay distinct. A regression in `unwrapSoleParagraph`
  (e.g. flattening multi-paragraph cells) would re-collapse them and flip both
  per-engine snapshots.
- Suite B reports a `differ`/`structural` result whose only change is the
  `text-align:left` style MDXish derives from `align={["left"]}`; the cell's
  paragraph structure itself is convergent.

## What flips this fixture

The `paragraphCount !== 1` guard in `unwrapSoleParagraph`
(`processor/transform/mdxish/tables/utils.ts`), the table cell paragraph
handling in `mdxish-tables`, or any change to how `align` props map onto cell
`style`.
