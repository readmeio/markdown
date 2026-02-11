import type { Element, ElementContent, Root } from 'hast';

import GithubSlugger from 'github-slugger';
import { visit } from 'unist-util-visit';

function isHeading(node: Element) {
  return /^h[1-6]$/.test(node.tagName);
}

/** Extract text content from a HAST node, reconstructing {user.*} from <variable> elements. */
function textContent(node: ElementContent): string {
  if (node.type === 'text') return node.value;
  if (node.type === 'element' && node.tagName === 'variable' && node.properties?.name) {
    return `{user.${node.properties.name}}`;
  }
  if ('children' in node) return node.children.map(textContent).join('');
  return '';
}

export interface MdxishSlugOpts {
  sourceHeadingTexts?: string[];
}

/**
 * Rehype plugin that adds `id` attributes to headings (like rehype-slug),
 * but reconstructs `{user.*}` variable text from <variable> elements so that
 * heading slugs are based on the unresolved variable names rather than ignoring them.
 *
 * When `sourceHeadingTexts` is provided, slugs are derived from those texts (matched
 * by index) instead of the rendered heading content. This allows slugs to remain stable
 * when legacy `<<variables>>` are resolved before the pipeline runs.
 */
const mdxishSlug = ({ sourceHeadingTexts }: MdxishSlugOpts = {}) => {
  const slugger = new GithubSlugger();

  return (tree: Root) => {
    slugger.reset();
    let headingIndex = 0;

    visit(tree, 'element', (node: Element) => {
      if (isHeading(node) && !node.properties.id) {
        const text =
          sourceHeadingTexts && headingIndex < sourceHeadingTexts.length
            ? sourceHeadingTexts[headingIndex]
            : node.children.map(textContent).join('');
        node.properties.id = slugger.slug(text);
        headingIndex += 1;
      }
    });
  };
};

export default mdxishSlug;
