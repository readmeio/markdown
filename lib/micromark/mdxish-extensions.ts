import type { Extension as FromMarkdownExtension } from 'mdast-util-from-markdown';
import type { Extension } from 'micromark-util-types';

import { mdxExpressionFromMarkdown } from 'mdast-util-mdx-expression';
import { mdxjsEsmFromMarkdown } from 'mdast-util-mdxjs-esm';
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
 * CommonMark constructs disabled for every MDXish parser.
 *
 * `codeIndented`: any line indented 4+ spaces is an indented code block per
 * CommonMark (https://spec.commonmark.org/0.28/#indented-code-blocks), which is
 * unexpected for users coming from MDX — `mdx-md` disables it for the same reason.
 *
 * Adding a construct here applies it to every sub-parser at once; before this
 * list existed each one had to be updated by hand and they drifted (CX-3708).
 */
export const MDXISH_DISABLED_CONSTRUCTS: readonly string[] = ['codeIndented'];

/**
 * Base construct config every MDXish parser registers. Pass `extra` to disable
 * further constructs on top of the shared set rather than replacing it.
 */
export const disableConstructs = (extra: readonly string[] = []): Extension => ({
  disable: { null: [...MDXISH_DISABLED_CONSTRUCTS, ...extra] },
});

interface ExtensionPair {
  fromMarkdown?: () => FromMarkdownExtension;
  syntax?: () => Extension;
}

/**
 * Canonical registration order for MDXish content extensions, **lowest priority
 * first**, pairing each syntax extension with its `fromMarkdown` counterpart so
 * the two lists can't fall out of sync.
 *
 * `micromark-util-combine-extensions` prepends every extension's constructs and
 * nothing here sets `add: 'after'`, so a *later* entry is tried *first*. Only
 * `flow` + `<` is contended — `jsxTable`, `mdxComponent` and `htmlBlockComponent`
 * all claim it, and `htmlBlockComponent` must stay after `mdxComponent` or
 * `mdxComponent` wins `<HTMLBlock>` (it claims any PascalCase tag outside
 * `TOKENIZER_MDX_COMPONENT_EXCLUDED_TAGS`, which `HTMLBlock` is not in).
 * Every other extension owns its start code alone, so its position is inert.
 *
 * This order is the document parser's proven one — don't reorder without a
 * regression test for the tag above.
 */
const REGISTRY = {
  jsxComment: { syntax: jsxComment },
  jsxTable: { syntax: jsxTable, fromMarkdown: jsxTableFromMarkdown },
  magicBlock: { syntax: magicBlock, fromMarkdown: magicBlockFromMarkdown },
  mdxExpressionLenient: { syntax: mdxExpressionLenient, fromMarkdown: mdxExpressionFromMarkdown },
  mdxComponent: { syntax: mdxComponent, fromMarkdown: mdxComponentFromMarkdown },
  gemoji: { syntax: gemoji, fromMarkdown: gemojiFromMarkdown },
  legacyVariable: { syntax: legacyVariable, fromMarkdown: legacyVariableFromMarkdown },
  looseHtmlEntity: { syntax: looseHtmlEntity, fromMarkdown: looseHtmlEntityFromMarkdown },
  htmlBlockComponent: { syntax: htmlBlockComponent, fromMarkdown: htmlBlockComponentFromMarkdown },
  mdxjsEsm: {
    syntax: () => mdxjsEsm({ acorn: jsxAcornParser, addResult: true }),
    fromMarkdown: mdxjsEsmFromMarkdown,
  },
  emptyTaskListItem: { fromMarkdown: emptyTaskListItemFromMarkdown },
} satisfies Record<string, ExtensionPair>;

export type MdxishFeature = keyof typeof REGISTRY;

/** Insertion order of `REGISTRY` is the canonical priority order. */
const FEATURE_ORDER = Object.keys(REGISTRY) as MdxishFeature[];

/**
 * Expression syntax is evaluated downstream, so safeMode drops every extension
 * that produces it. Centralised here so no call site can forget the gate.
 */
const SAFE_MODE_EXCLUDED: ReadonlySet<MdxishFeature> = new Set([
  'jsxComment',
  'mdxExpressionLenient',
  'mdxjsEsm',
]);

/**
 * The full MDXish content syntax set, shared by the parsers that render a
 * document: the top-level parser and the component-body re-parser. A component
 * body should tokenize exactly like the document it lives in — when the two
 * drifted, a `<Table>` nested in a `<Callout>` lost all of its rows (CX-3705).
 */
export const MDXISH_CONTENT_FEATURES: readonly MdxishFeature[] = [
  'jsxComment',
  'jsxTable',
  'magicBlock',
  'mdxExpressionLenient',
  'mdxComponent',
  'gemoji',
  'legacyVariable',
  'looseHtmlEntity',
  'htmlBlockComponent',
  'mdxjsEsm',
  'emptyTaskListItem',
];

interface MdxishExtensionOpts {
  /** Constructs to disable on top of `MDXISH_DISABLED_CONSTRUCTS`. */
  disable?: readonly string[];
  /** Drops the expression-producing extensions. */
  safeMode?: boolean;
}

/**
 * Builds the micromark + `fromMarkdown` extension lists for an MDXish parser.
 *
 * `features` is treated as an unordered set: ordering is this module's job (see
 * `REGISTRY`), so a call site can't introduce an ordering bug by listing them
 * differently. The base construct config is always registered.
 *
 * Extensions outside the registry (`mdxjs()`, `gfmStrikethrough()`) stay at
 * their call site — spread them onto the returned lists. Position is only
 * load-bearing for `flow` + `<`, so appending is safe for everything else.
 */
export function mdxishExtensions(
  features: readonly MdxishFeature[],
  { disable = [], safeMode = false }: MdxishExtensionOpts = {},
): { fromMarkdownExtensions: FromMarkdownExtension[]; micromarkExtensions: Extension[] } {
  const enabled = new Set(features);
  const selected: ExtensionPair[] = FEATURE_ORDER.filter(
    feature => enabled.has(feature) && !(safeMode && SAFE_MODE_EXCLUDED.has(feature)),
  ).map(feature => REGISTRY[feature]);

  return {
    fromMarkdownExtensions: selected.flatMap(({ fromMarkdown }) => (fromMarkdown ? [fromMarkdown()] : [])),
    micromarkExtensions: [
      disableConstructs(disable),
      ...selected.flatMap(({ syntax }) => (syntax ? [syntax()] : [])),
    ],
  };
}
