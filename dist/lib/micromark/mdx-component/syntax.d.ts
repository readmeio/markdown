import type { Extension } from 'micromark-util-types';
declare module 'micromark-util-types' {
    interface TokenTypeMap {
        mdxComponent: 'mdxComponent';
        mdxComponentData: 'mdxComponentData';
    }
}
/**
 * Micromark extension that tokenizes MDX-like components.
 *
 * **Flow (block)** — captures 1) PascalCase components and 2) lowercase HTML tags
 * that carry `{…}` attribute expressions as single flow blocks (including
 * self-closing `<Component />`). Prevents CommonMark from fragmenting them
 * across multiple HTML / paragraph nodes.
 *
 * **Text (inline)** — registers only for lowercase tags with brace attrs
 * (e.g. `Start <a href={url}>here</a> end`). Picks them up during inline
 * parsing so they render inline inside their paragraph, then are rewritten
 * to `mdxJsxTextElement` by the `components/inline-html` transformer.
 * PascalCase is intentionally flow-only; ReadMe's custom components are
 * authored as block-level elements.
 *
 * Excludes tags handled by dedicated tokenizers: Table, HTMLBlock, Glossary,
 * Anchor.
 *
 * The resulting `html` mdast node is later restructured into an
 * `mdxJsxFlowElement` (block) or `mdxJsxTextElement` (inline) by the
 * corresponding component-block transformer.
 */
export declare function mdxComponent(): Extension;
