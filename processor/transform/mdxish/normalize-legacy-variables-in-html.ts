import type { Html, Root, RootContent } from 'mdast';
import type { Plugin } from 'unified';
import type { Node, Parent } from 'unist';

const VARIABLE_TAG_RE = /^<[Vv]ariable\s+name="([^"]+)"[^>]*>$/;
const VARIABLE_CLOSE_TAG_RE = /^<\/[Vv]ariable>$/;
const VARIABLE_INLINE_RE = /<[Vv]ariable\s+name="([^"]+)"[^>]*>(?:<\/[Vv]ariable>)?/g;

/**
 * Converts `<Variable name="X">` HTML tags to `{user.X}` text nodes so the
 * editor recognizes them as variables. Handles both standalone void tags
 * (from the flattener) and inline tag pairs embedded in larger HTML strings.
 */
const normalizeLegacyVariablesInHtml: Plugin<[], Root> = () => tree => {
  const walk = (parent: Parent) => {
    for (let i = parent.children.length - 1; i >= 0; i -= 1) {
      const child = parent.children[i] as Node;
      if ('children' in child) walk(child as Parent);

      if (child.type === 'html') {
        const html = child as Html;

        const standaloneMatch = html.value.match(VARIABLE_TAG_RE);
        if (standaloneMatch) {
          (parent.children as RootContent[])[i] = {
            type: 'text',
            value: `{user.${standaloneMatch[1]}}`,
          } as unknown as RootContent;

          const next = parent.children[i + 1] as Node | undefined;
          if (next?.type === 'html' && VARIABLE_CLOSE_TAG_RE.test((next as Html).value)) {
            parent.children.splice(i + 1, 1);
          }
        } else {
          VARIABLE_INLINE_RE.lastIndex = 0;
          if (VARIABLE_INLINE_RE.test(html.value)) {
            VARIABLE_INLINE_RE.lastIndex = 0;
            html.value = html.value.replace(VARIABLE_INLINE_RE, (_match, name) => `{user.${name}}`);
          }
        }
      }
    }
  };

  walk(tree);
};

export default normalizeLegacyVariablesInHtml;
