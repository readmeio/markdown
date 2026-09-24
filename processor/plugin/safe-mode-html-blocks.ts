import type { Root } from 'hast';
import type { Transformer } from 'unified';

import { visit } from 'unist-util-visit';

import { toPascalCase } from '../../lib/utils/mdxish/mdxish-get-component-name';

/**
 * Whether a tag name renders through the `HTMLBlock` component. Mirrors the
 * separator-agnostic, case-insensitive lookup in `getComponentName` and the
 * rehype-react component map, so `html-block`, `HTMLBlock`, `HtmlBlock` and
 * `htmlblock` all match.
 */
const isHtmlBlockTag = (tagName: string): boolean => toPascalCase(tagName).toLowerCase() === 'htmlblock';

/**
 * Forces `safeMode` on every element that renders through `HTMLBlock` so it is
 * shown as escaped text instead of injected.
 *
 * Runs last, so it sees every producer of the element — `[block:html]`,
 * `<HTMLBlock>` with a template body or an `html` attribute, and a literal
 * `<html-block>` — and it is unconditional so an author-supplied
 * `safeMode="false"` can't opt out.
 */
export const rehypeSafeModeHtmlBlocks = (): Transformer<Root, Root> => tree => {
  visit(tree, 'element', node => {
    if (isHtmlBlockTag(node.tagName)) node.properties.safeMode = 'true';
  });
};
