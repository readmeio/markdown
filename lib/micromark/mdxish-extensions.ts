import type { Extension as FromMarkdownExtension } from 'mdast-util-from-markdown';
import type { Extension } from 'micromark-util-types';

import { mdxExpressionFromMarkdown } from 'mdast-util-mdx-expression';
import { mdxjsEsmFromMarkdown } from 'mdast-util-mdxjs-esm';
import { mdxExpression } from 'micromark-extension-mdx-expression';
import { mdxjsEsm } from 'micromark-extension-mdxjs-esm';

import { emptyTaskListItemFromMarkdown } from '../mdast-util/empty-task-list-item';
import { gemojiFromMarkdown } from '../mdast-util/gemoji';
import { htmlBlockComponentFromMarkdown } from '../mdast-util/html-block-component';
import { jsxTableFromMarkdown } from '../mdast-util/jsx-table';
import { legacyVariableFromMarkdown } from '../mdast-util/legacy-variable';
import { magicBlockFromMarkdown } from '../mdast-util/magic-block';
import { mdxComponentFromMarkdown } from '../mdast-util/mdx-component';
import { jsxAcornParser } from '../utils/jsx-acorn-parser';

import { gemoji } from './gemoji';
import { htmlBlockComponent } from './html-block-component';
import { jsxComment } from './jsx-comment';
import { jsxTable } from './jsx-table';
import { legacyVariable } from './legacy-variable';
import { looseHtmlEntity, looseHtmlEntityFromMarkdown } from './loose-html-entities';
import { magicBlock } from './magic-block';
import { mdxComponent } from './mdx-component';
import { mdxExpressionLenient } from './mdx-expression-lenient';

/**
 * Constructs disabled for every MDXish parser. `codeIndented` because 4+ column
 * indentation is formatting to an MDX author, never code — `mdx-md` drops it too.
 * Pass `extra` to disable more on top of the shared set, never in place of it.
 */
export const disableConstructs = (extra: readonly string[] = []): Extension => ({
  disable: { null: ['codeIndented', ...extra] },
});

interface ExtensionPair {
  /** Produces expression syntax, so safeMode drops it. */
  expression?: boolean;
  fromMarkdown?: () => FromMarkdownExtension;
  syntax?: () => Extension;
}

/**
 * Every MDXish extension, in canonical registration order — **lowest priority
 * first**, each syntax extension paired with its `fromMarkdown` counterpart.
 *
 * `combineExtensions` prepends constructs and nothing sets `add: 'after'`, so a
 * *later* entry is tried *first*. Only `flow` + `<` is contended: keep
 * `htmlBlockComponent` after `mdxComponent`, or `mdxComponent` claims
 * `<HTMLBlock>` (it takes any PascalCase tag outside
 * `TOKENIZER_MDX_COMPONENT_EXCLUDED_TAGS`, which `HTMLBlock` is not in).
 */
const REGISTRY = {
  jsxComment: { syntax: jsxComment, expression: true },
  jsxTable: { syntax: jsxTable, fromMarkdown: jsxTableFromMarkdown },
  magicBlock: { syntax: magicBlock, fromMarkdown: magicBlockFromMarkdown },
  // Two `{` tokenizers, never registered together: the document parser takes text
  // only, the component-body re-parser needs flow too for multi-line expressions.
  mdxExpressionLenient: { syntax: mdxExpressionLenient, fromMarkdown: mdxExpressionFromMarkdown, expression: true },
  // `allowEmpty` is the package default; passed explicitly because `mdx-jsx`
  // registers the same tokenizer with it off for attribute expressions.
  mdxExpression: {
    syntax: () => mdxExpression({ allowEmpty: true }),
    fromMarkdown: mdxExpressionFromMarkdown,
    expression: true,
  },
  mdxComponent: { syntax: mdxComponent, fromMarkdown: mdxComponentFromMarkdown },
  gemoji: { syntax: gemoji, fromMarkdown: gemojiFromMarkdown },
  legacyVariable: { syntax: legacyVariable, fromMarkdown: legacyVariableFromMarkdown },
  looseHtmlEntity: { syntax: looseHtmlEntity, fromMarkdown: looseHtmlEntityFromMarkdown },
  htmlBlockComponent: { syntax: htmlBlockComponent, fromMarkdown: htmlBlockComponentFromMarkdown },
  // This is for in-document variable & function definitions
  mdxjsEsm: {
    syntax: () => mdxjsEsm({ acorn: jsxAcornParser, addResult: true }),
    fromMarkdown: mdxjsEsmFromMarkdown,
    expression: true,
  },
  emptyTaskListItem: { fromMarkdown: emptyTaskListItemFromMarkdown },
} satisfies Record<string, ExtensionPair>;

export type MdxishFeature = keyof typeof REGISTRY;

// ======= TOKENIZER EXTENSION GROUP DEFINITIONS =======

/** Tokenizers that claim a whole block so broader ones can't fragment it. */
const BLOCK_CLAIMS: MdxishFeature[] = ['jsxTable', 'magicBlock', 'mdxComponent', 'htmlBlockComponent'];

/** Inline syntax every parser that renders user prose needs. */
const INLINE: MdxishFeature[] = ['gemoji', 'legacyVariable', 'looseHtmlEntity'];

/**
 * `{}` and ESM (export) syntax. A parser that re-parses a component body swaps
 * `mdxExpressionLenient` for the flow-capable `mdxExpression`, so it composes
 * this group itself. The `expression` flag on each registry entry determines what
 * drops these in safeMode
 */
const EXPRESSIONS: MdxishFeature[] = ['jsxComment', 'mdxExpressionLenient', 'mdxjsEsm'];

// ======= TOKENIZER EXTENSION GROUP REGISTRY =======

/**
 * The feature set of every MDXish sub-parser, kept together so adding a
 * tokenizer means deciding for each one rather than silently reaching none of
 * them. A site opting out of a group should say so here, in the open.
 */
export const FEATURES = {
  /** `lib/mdxish.ts` — the document parser; the only site taking every group */
  document: [...BLOCK_CLAIMS, ...INLINE, ...EXPRESSIONS, 'emptyTaskListItem'],

  /**
   * `components/utils.ts` — re-parses a component body, which should tokenize
   * like the document around it: when the two drifted a `<Table>` in a
   * `<Callout>` lost every row (CX-3705).
   */
  componentBody: [
    ...BLOCK_CLAIMS,
    ...INLINE,
    'mdxExpression',
    'emptyTaskListItem',
  ],

  /**
   * `lib/mdxishTags.ts` — collects component names, so nothing inline is needed.
   * Omits `htmlBlockComponent` deliberately since it's not a custom component,
   * and not components can be nested inside it (it's just for raw HTML).
   */
  tags: BLOCK_CLAIMS.filter(feature => feature !== 'htmlBlockComponent'),

  /**
   * `tables/mdxish-tables.ts` — table cells.
   */
  tableCell: [...INLINE],

  /** `magic-blocks` — legacy content, no components */
  magicBlockBody: [...INLINE, 'emptyTaskListItem'],

  /** `magic-blocks` — api-header titles */
  apiHeaderTitle: [...INLINE],

  /**
   * `lib/stripComments.ts` — parses only to strip comments, then re-stringifies,
   * so it needs the tokenizers that keep a construct in one piece across the
   * round trip. 
   * No inline syntax: nothing here rewrites prose, and magic blocks are already excluded.
   */
  stripComments: [...BLOCK_CLAIMS.filter(feature => feature !== 'magicBlock'), 'mdxExpression'],
} satisfies Record<string, MdxishFeature[]>;

/**
 * Builds the extension lists for an MDXish parser. `features` is an unordered
 * set — ordering is `REGISTRY`'s job, so a call site can't get it wrong — and
 * the base construct config is always registered.
 *
 * Extensions outside the registry (`mdxjs()`, `gfmStrikethrough()`) stay at their
 * call site; spread them onto the result, minding the `flow` + `<` order.
 */
export function mdxishExtensions(
  features: readonly MdxishFeature[],
  { disable = [], safeMode = false }: { disable?: readonly string[]; safeMode?: boolean } = {},
): { fromMarkdownExtensions: FromMarkdownExtension[]; micromarkExtensions: Extension[] } {
  const enabled: Set<string> = new Set(features);
  const entries: [string, ExtensionPair][] = Object.entries(REGISTRY);
  const selected = entries
    .filter(([feature, pair]) => enabled.has(feature) && !(safeMode && pair.expression))
    .map(([, pair]) => pair);

  return {
    fromMarkdownExtensions: selected.flatMap(({ fromMarkdown }) => (fromMarkdown ? [fromMarkdown()] : [])),
    micromarkExtensions: [disableConstructs(disable), ...selected.flatMap(({ syntax }) => (syntax ? [syntax()] : []))],
  };
}
