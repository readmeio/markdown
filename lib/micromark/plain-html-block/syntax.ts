import type { Construct, Extension } from 'micromark-util-types';

import { codes } from 'micromark-util-symbol';

import { createResolveToLinePrefix, createTokenize } from '../mdx-component/tokenize';

declare module 'micromark-util-types' {
  interface TokenTypeMap {
    plainHtmlBlock: 'plainHtmlBlock';
    plainHtmlBlockData: 'plainHtmlBlockData';
  }
}

const plainHtmlBlockConstruct: Construct = {
  name: 'plainHtmlBlock',
  tokenize: createTokenize('plainHtmlFlow'),
  resolveTo: createResolveToLinePrefix('plainHtmlBlock'),
  concrete: true,
};

/**
 * Micromark extension that tokenizes plain lowercase HTML block tags (`div`,
 * `section`, `p`, …) with no `{…}` attribute as a single flow block.
 *
 * This exists so blank lines between nested siblings don't fragment a wrapper
 * into separate HTML/paragraph nodes (the CommonMark html-flow behavior that
 * CX-3646 hit). It claims conservatively — refusing PascalCase openers, nested
 * table tags, brace attributes, self-closing tags, custom elements, and markdown
 * islands after a blank line — so every rejected shape falls back to CommonMark
 * html-flow exactly as before.
 *
 * Registered after `mdxComponent` in the extension array so it is *tried last*
 * among the `<` constructs (micromark prepends later extensions): `mdxComponent`
 * and `jsxTable` get first refusal, and only genuinely plain HTML reaches here.
 * The resulting opaque `html` node is left literal for rehype-raw by
 * `mdxishMdxComponentBlocks` (it carries no expressions to promote).
 */
export function plainHtmlBlock(): Extension {
  return {
    flow: { [codes.lessThan]: [plainHtmlBlockConstruct] },
  };
}
