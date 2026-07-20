# MDXish Processor Overview

## `mdxishAstProcessor()`

### Preprocessing Step

> **See**: `preprocessContent` — @lib/mdxish.ts#120-139

`preprocessContent` is a string-level preprocessor that runs before the markdown is handed to remarkParse. It exists because several syntactic patterns in ReadMe's flavor of markdown would confuse or break the standard CommonMark/MDX parser if fed to it directly. By patching the raw string first, these issues are sidestepped.

It applies seven transforms in sequence (the function carries a matching docstring at @lib/mdxish.ts#107-119):

1. **`normalizeClosingTagWhitespace()`**

   Canonicalizes closing tags that contain stray whitespace (e.g. `</ td >` → `</td>`). Runs first so that `jsxTable` later sees a literal `</table>` and so the HTML-line classification in `terminateHtmlFlowBlocks` is accurate.
1. **`normalizeTableSeparator()`**

   Fixes malformed GFM table separator rows — e.g. misplaced alignment colons like `|: ---` → `| :---`. Without this, remarkGfm would fail to recognize the table.
1. **`collapseForeignContentBlankLines()`**

   Collapses blank lines inside `<svg>`/`<math>` islands. A blank line inside foreign content would otherwise fragment it — the children spill out as an indented code block once a wrapper re-parses its deindented body (#1545).
1. **`terminateHtmlFlowBlocks()`**

   Inserts blank lines after standalone HTML elements (like `<div>...</div>`) when the next line is regular markdown. CommonMark's HTML flow rules only terminate on blank lines, so without this, the parser would swallow subsequent markdown content into the HTML block token.
1. **`closeSelfClosingHtmlTags()`**

   Rewrites invalid "self-closing" HTML tags into explicit open/close pairs (e.g. `<i />` → `<i></i>`). HTML (unlike JSX) has no self-closing syntax for non-void elements, so leaving these would confuse the parser.
1. **`normalizeCompactHeadings()`**

   Normalizes compact ATX headings that omit the space after the hashes (e.g. `#Heading` → `# Heading`) so they are recognized as headings rather than paragraph text.
1. **`processSnakeCaseComponent()`**

   Remark's parser rejects tag names containing underscores (e.g. `<my_component>`). This step replaces known snake_case component names with safe placeholder names (`<MDXishSnakeCase0>`) and returns a mapping so they can be restored later by the `restoreSnakeCaseComponentNames` transformer in the run phase.

> **Note:** Earlier revisions of this pipeline also ran a `preprocessJSXExpressions()` string transform to escape stray/unbalanced braces. That step was removed (#1429, #1531). MDX expressions are now handled at the parser level by the lenient expression tokenizer (`mdxExprTextOnly` = `mdxExpressionLenient()`), and attribute expressions flow through as `mdxJsxAttributeValueExpression` nodes that are evaluated later.

##### Where it sits in the flow

```
                    preprocessContent (string → string)
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│  normalizeClosingTagWhitespace — fix stray-space closers │
│  normalizeTableSeparator       — fix table syntax        │
│  collapseForeignContentBlankLines — keep svg/math whole  │  before
│  terminateHtmlFlowBlocks       — fix HTML flow           │  parsing
│  closeSelfClosingHtmlTags      — <i /> → <i></i>         │
│  normalizeCompactHeadings      — #Heading → # Heading    │
│  processSnakeCaseComponent     — placeholder swap        │
└─────────────────────────────┬─────────────────────────────┘
                              │
                              ▼
                      remarkParse (tokenize)
                              │
                              ▼
                    MDAST transformers...
                         ...
                    restoreSnakeCaseComponentNames  ◄── undo (7)
```

### Processor Pipeline

> **See**: `mdxishAstProcessor` — @lib/mdxish.ts#141-241 (parser setup #166-206, `.use` chain #208-230)

The core Xish engine which parses Markdown and converts it to an MDAST object. This is the base processor used for both the editor and rendering flows. `mdxishAstProcessor` returns the *configured but un-run* processor (plus `parserReadyContent`); callers run it, or `mdxish()` extends it further (see below).

Several parser extensions and transformers are conditional:
- `!safeMode` adds the MDX expression tokenizer, the ESM (`export`) tokenizer, and the JSX-comment tokenizer.
- `newEditorTypes` adds `mdxishInlineMdxComponents` and `mdxishJsxToMdast`.
- `useTailwind` adds `tailwindTransformer`.

```
| ................ process (parse + run to MDAST) ............ |
| .. parse ........... | .............. run .................. |

                                                      NO COMPILER
          +--------+                     +----------+  (MDAST is
Input ->- | Parser | ->- Syntax Tree ->- |    N/A   |   returned
          +--------+          |          +----------+   directly)
               |              |
               |              X
               |              |
               |       +--------------+
               |       | Transformers |
               |       +--------------+
               |              |
  ┌────────────┘          ┌───┴──────────────────────────────┐
  │                       │                                  │
  │  PARSER               │  MDAST TRANSFORMERS              │
  │  (micromark)          │  (remark plugins, in .use order) │
  │                       │                                  │
  │  remarkParse          │  remarkFrontmatter               │
  │   micromarkExts:      │  normalizeEmphasisAST            │
  │    · jsxTable         │  mdxishSelfClosingBlocks         │
  │    · magicBlock       │  mdxishMdxComponentBlocks        │
  │    · mdxComponent     │  mdxishInlineMdxHtmlBlocks       │
  │    · gemoji           │  restoreSnakeCaseComponentNames  │
  │    · legacyVariable   │  mdxishTables                    │
  │    · looseHtmlEntity  │  mdxishHtmlBlocks                │
  │    · htmlBlockComp.   │  magicBlockTransformer           │
  │    · mdxExprTextOnly? │  imageTransformer                │
  │    · mdxjsEsm?        │  defaultTransformers             │
  │    · jsxComment?      │    (callouts, codeTabs, embeds)  │
  │                       │  mdxishInlineMdxComponents?      │
  │   fromMarkdownExts:   │  mdxishJsxToMdast?               │
  │    · jsxTable         │  variablesTextTransformer        │
  │    · magicBlock       │  tailwindTransformer?            │
  │    · mdxComponent     │  remarkGfm                       │
  │    · gemoji           │                                  │
  │    · legacyVariable   │                                  │
  │    · emptyTaskList…   │                                  │
  │    · looseHtmlEntity  │                                  │
  │    · htmlBlockComp.   │                                  │
  │    · mdxExpression…?  │                                  │
  │    · mdxjsEsm…?       │                                  │
  │                       │                                  │
  └───────────────────────┴──────────────────────────────────┘
      ? = added only when !safeMode (parser) / when the
          matching opt is set (transformers)
```

## `mdxish()`

### Preprocessing Step

> **See**: @lib/mdxish.ts#291-293

These three lines are a protect-strip-restore pattern that removes JSX comments (`{/* ... */}`) from the markdown before anything else processes it. Here's the step-by-step:

1. **`protectCodeBlocks(mdContent)`**

   Replaces fenced code blocks and inline code with placeholder tokens (`___CODE_BLOCK_0___`, `___INLINE_CODE_0___`), stashing the originals so they can be restored later. This prevents the next step from stripping things that look like JSX comments but are actually inside code.
2. **`removeJSXComments(protectedContent)`**

   Strips all JSX comment expressions from the (now code-protected) string. With code blocks safely out of the way, this only hits actual JSX comments in prose/component markup.
3. **`restoreCodeBlocks(withoutComments, protectedCode)`**

   Swaps the placeholder tokens back to their original code content, yielding the final `contentWithoutComments` string.

##### Why it's necessary

JSX comments are valid in MDX but have no meaning in the rendered output. If left in, they'd be parsed by the MDX expression tokenizer (the `mdxExprTextOnly` micromark extension) as expression nodes and could appear as literal text or cause parse errors. Stripping them at the string level — before `mdxishAstProcessor` and `preprocessContent` even run — is the simplest way to ensure they're gone.

##### Where it sits in the flow

This runs in `mdxish()` before calling `mdxishAstProcessor`, making it the very first string-level transform — even before `preprocessContent`:

```
mdContent (raw input)
    │
    ▼
┌──────────────────────────────┐
│  protectCodeBlocks           │  ◄── lines 291-293
│  removeJSXComments           │      (in mdxish())
│  restoreCodeBlocks           │
└──────────────┬───────────────┘
               │ contentWithoutComments
               ▼
┌───────────────────────────────────┐
│  preprocessContent                │  ◄── inside mdxishAstProcessor()
│    normalizeClosingTagWhitespace  │
│    normalizeTableSeparator        │
│    collapseForeignContentBlankLines
│    terminateHtmlFlowBlocks        │
│    closeSelfClosingHtmlTags       │
│    normalizeCompactHeadings       │
│    processSnakeCaseComponent      │
└──────────────┬────────────────────┘
               │ parserReadyContent
               ▼
         remarkParse → transformers → ...
```

### Processor Pipeline

> **See**: `mdxish` — @lib/mdxish.ts#282-333 (appended `.use` chain #297-315)

`mdxish()` takes the base processor from `mdxishAstProcessor()` and appends the remaining MDAST transformers, the MDAST → HAST bridge (`remarkRehype`), and the HAST (rehype) transformers, then runs it and returns the resulting HAST tree. As with the base processor there is no compiler/stringify stage — a tree is returned directly.

The `!safeMode`-only stages are the expression/export evaluators and the deferred-attribute resolver.

```
| ................ process (parse + run to HAST) ............. |
| .. parse ........... | .............. run ................... |

                                                      NO COMPILER
          +--------+                     +----------+  (HAST obj
Input ->- | Parser | ->- Syntax Tree ->- |    N/A   |   returned
          +--------+          |          +----------+   directly)
               |              X
               |              |
               |       +--------------+
               |       | Transformers |
               |       +--------------+
               |              |
  ┌────────────┘          ┌───┴───────────────────────────────────────────┐
  │                       │                                               │
  │  PARSER               │  MDAST TRANSFORMERS          HAST XFORMERS    │
  │  (as base, above)     │  (remark plugins)            (rehype)         │
  │                       │                                               │
  │  …base pipeline…      │  …base MDAST transformers…   preserveBool…    │
  │                       │  evaluateExports?            rehypeRaw        │
  │                       │  hardBreaks                  restoreBool…     │
  │                       │  evaluateExpressions?        resolveDeferred…?│
  │                       │  evaluateStyleBlockExpr?     normalizeMdxJsx… │
  │                       │  variablesCodeResolver ──┐   rehypeFlatten…   │
  │                       │                          │   mdxishMermaid…   │
  │                       │                          │   generateSlug…    │
  │                       │              bridge:      │   rehypeMdxish…    │
  │                       │              remarkRehype ┘                    │
  │                       │              (MDAST → HAST,                    │
  │                       │               mdxComponentHandlers)           │
  │                       │                                               │
  └───────────────────────┴───────────────────────────────────────────────┘
      ? = added only when !safeMode

  rehypeRaw passes through `html-block` and `mdx-jsx` nodes so they bypass
  parse5's string-only HTML round-trip.
```
