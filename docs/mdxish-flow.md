# MDXish Pipeline

## Entry Points

| Function | Returns | Purpose |
|----------|---------|---------|
| `mdxish(md, opts?)` | HAST tree | Main processor |
| `mix(md, opts?)` | HTML string | Wrapper: `mdxish()` → `rehype-stringify` |
| `renderMdxish(hast, opts?)` | React module | HAST → React components |

## Pipeline

```
Raw Markdown
    │
    ▼
PRE-PROCESSING (string transforms)
    │  normalizeTableSeparator     Fix malformed GFM table separators
    │  preprocessJSXExpressions    Protect HTMLBlocks (base64), strip JSX comments,
    │                              evaluate attribute expressions, escape unbalanced braces
    │  processSnakeCaseComponent   Replace snake_case names with parser-safe placeholders
    │
    ▼
REMARK PHASE (MDAST)
    │  remarkParse                 Markdown → MDAST (with magicBlock + mdxExpression tokenizers)
    │  remarkFrontmatter           Parse YAML frontmatter
    │  normalizeEmphasisAST        Fix malformed bold/italic (** bold** → **bold**)
    │  magicBlockTransformer       [block:TYPE] nodes → images, callouts, code blocks, etc.
    │  imageTransformer            Inline images → image blocks with magic block props
    │  defaultTransformers         callout, codeTabs, gemoji, embed (@embed links)
    │  mdxishComponentBlocks       PascalCase HTML blocks → mdxJsxFlowElement
    │  restoreSnakeCaseComponentNames  Restore snake_case names from placeholders
    │  mdxishTables                <Table> JSX → markdown table nodes, re-parse cell content
    │  mdxishHtmlBlocks            <HTMLBlock>{`...`}</HTMLBlock> → html-block nodes
    │  evaluateExpressions         Evaluate MDX expressions ({expr}) via jsxContext
    │  variablesTextTransformer    {user.*} patterns → <Variable> nodes (regex-based)
    │  tailwindTransformer         Wrap components in TailwindRoot (if useTailwind: true)
    │  remarkGfm                   Tables, strikethrough, task lists, autolinks, footnotes
    │
    ▼
MDAST → HAST CONVERSION
    │  remarkRehype                Convert with mdxComponentHandlers (preserves MDX elements)
    │
    ▼
REHYPE PHASE (HAST)
    │  rehypeRaw                   Raw HTML strings → proper HAST elements
    │  rehypeSlug                  Add IDs to headings for anchor links
    │  rehypeMdxishComponents      Match custom components, camelCase props, process children as MD
    │
    ▼
HAST Tree (output)
```

## Notable Transformers

### Magic Blocks
Custom micromark tokenizer (`lib/micromark/magic-block`) for ReadMe's legacy `[block:TYPE]...[/block]` syntax. Has both flow (block-level) and text (inline) constructs. The `mdxExpression` flow construct is disabled to prevent it from intercepting magic block bodies that start with `{`.

### HTMLBlocks
Content is base64-encoded during preprocessing to prevent the parser from consuming `<script>`/`<style>` tags. The transformer decodes it and handles nested template literals with code fences.

### Tables
Since mdxish doesn't use `remarkMdx`, `<Table>` JSX elements are manually converted to markdown table nodes. Cell contents are re-parsed through `remarkParse` + `remarkGfm`.

### User Variables
`variablesTextTransformer` parses `{user.name}`, `{user['field']}`, and `{user["field"]}` patterns from text nodes using regex (no `remarkMdx` dependency).
