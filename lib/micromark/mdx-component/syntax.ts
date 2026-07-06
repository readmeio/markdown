import type { Construct, Extension } from 'micromark-util-types';

import { codes } from 'micromark-util-symbol';

import { createResolveToLinePrefix, createTokenize } from './tokenize';

declare module 'micromark-util-types' {
  interface TokenTypeMap {
    mdxComponent: 'mdxComponent';
    mdxComponentData: 'mdxComponentData';
  }
}

const mdxComponentFlowConstruct: Construct = {
  name: 'mdxComponent',
  tokenize: createTokenize('flow'),
  resolveTo: createResolveToLinePrefix('mdxComponent'),
  concrete: true,
};

const mdxComponentTextConstruct: Construct = {
  name: 'mdxComponentText',
  tokenize: createTokenize('text'),
};

/**
 * Micromark extension that tokenizes MDX-like components.
 *
 * **Flow (block)** — captures 1) PascalCase components and 2) lowercase HTML tags
 * that carry `{…}` attribute expressions as single flow blocks (including
 * self-closing `<Component />`). Prevents CommonMark from fragmenting them
 * across multiple HTML / paragraph nodes.
 *
 * **Text (inline)** — registers for lowercase tags and inline PascalCase
 * components (Anchor, Glossary) that carry brace attrs (e.g.
 * `Start <a href={url}>here</a> end`, `<Anchor href={url}>x</Anchor>`). Picks
 * them up during inline parsing so they render inline inside their paragraph,
 * then are rewritten to `mdxJsxTextElement` by the `components/inline-html`
 * transformer. All other PascalCase is flow-only; ReadMe's custom components
 * are authored as block-level elements.
 *
 * Excludes tags handled by dedicated tokenizers: Table, HTMLBlock, Glossary,
 * Anchor. Plain lowercase HTML blocks (no brace attribute) are claimed by the
 * separate `plainHtmlBlock` construct — see `../plain-html-block/syntax.ts`.
 *
 * The resulting `html` mdast node is later restructured into an
 * `mdxJsxFlowElement` (block) or `mdxJsxTextElement` (inline) by the
 * corresponding component-block transformer.
 */
export function mdxComponent(): Extension {
  return {
    flow: { [codes.lessThan]: [mdxComponentFlowConstruct] },
    text: { [codes.lessThan]: [mdxComponentTextConstruct] },
  };
}
