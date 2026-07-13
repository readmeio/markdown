import type { Root, Element } from 'hast';
import type { MdxJsxAttribute } from 'mdast-util-mdx-jsx';
import type { Node, Parent } from 'unist';

import { SKIP, visit } from 'unist-util-visit';

// A deny-list, deliberately weaker than the `md` pipeline's `rehype-sanitize`
// allow-list: those pipelines preserve arbitrary custom components, which an
// allow-list can't express. Anything not enumerated below passes through, so
// CSS exfiltration via `style` and similar lower-severity vectors are out of scope.

/**
 * Elements removed wholesale (subtree included) because they execute script,
 * load remote resources, or open a foreign-content (MathML/SVG) parsing context
 * that lets `<script>` survive namespace-confusion bypasses.
 */
const DANGEROUS_TAG_NAMES = new Set([
  'script',
  'noscript',
  'template',
  'iframe',
  'frame',
  'frameset',
  'object',
  'applet',
  'base',
  'link',
  'meta',
  'svg',
  'math',
]);

/**
 * URL-valued attributes that can carry a `javascript:` payload. Compared after
 * normalizing the attribute name (lowercased, non-letters stripped) so both hast
 * properties (`xLinkHref`, `formAction`) and raw JSX attributes (`xlink:href`,
 * `formaction`) match the same entry.
 */
const URL_ATTRIBUTES = new Set([
  'href',
  'src',
  'srcset',
  'xlinkhref',
  'action',
  'formaction',
  'poster',
  'background',
  'cite',
  'data',
  'ping',
  'longdesc',
  'manifest',
]);

const EVENT_HANDLER_ATTRIBUTE = /^on/i;

// Control characters and spaces HTML strips before resolving a URL scheme; keeping
// them would let `java\tscript:` slip past the protocol check below.
// eslint-disable-next-line no-control-regex
const IGNORED_URL_CHARS = /[\u0000-\u0020]/g;

const normalizeAttributeName = (name: string): string => name.toLowerCase().replace(/[^a-z]/g, '');

const isEventHandlerAttribute = (name: string): boolean => EVENT_HANDLER_ATTRIBUTE.test(name);

const isUrlAttribute = (name: string): boolean => URL_ATTRIBUTES.has(normalizeAttributeName(name));

// PascalCase names are custom React components (e.g. `<Callout>`), not host
// elements; their `on*`/url-like values are component props, not DOM handlers.
const isComponentName = (name: string): boolean => /^[A-Z]/.test(name);

/**
 * True for URLs that execute on navigation/load. Only a leading scheme matters:
 * a colon that appears after a `/`, `?`, or `#` is part of a relative path, not a scheme.
 * 
 * Re-derives scheme parsing the `md` allow-list gets from rehype-sanitize, since the
 * deny-list path has no schema. Treats the value as one URL, so it can't vet each entry
 * of a comma-delimited `srcset` — fine only because `srcset` can't run a `javascript:` scheme.
 */
const isDangerousUrl = (value: unknown): boolean => {
  if (typeof value !== 'string') return false;

  const normalized = value.replace(IGNORED_URL_CHARS, '').toLowerCase();
  const colonIndex = normalized.indexOf(':');
  if (colonIndex === -1) return false;

  const pathDelimiterIndex = normalized.search(/[/?#]/);
  if (pathDelimiterIndex !== -1 && pathDelimiterIndex < colonIndex) return false;

  const scheme = normalized.slice(0, colonIndex);
  if (scheme === 'javascript' || scheme === 'vbscript') return true;

  // `data:` is only dangerous when it can render markup/script (e.g. data:text/html).
  return scheme === 'data' && /^[^,]*(?:html|xml|script|svg)/.test(normalized.slice(colonIndex + 1));
};

// One tree can mix hast `element` nodes (`tagName`/`properties`) with MDX JSX nodes
// (`name`/`attributes`), since the `compile` pipeline never round-trips JSX through
// parse5. A host element is exactly one shape, so guards narrow before touching attrs.
interface MdxJsxElementNode extends Node {
  attributes?: MdxJsxAttribute[];
  name?: string | null;
  type: 'mdxJsxFlowElement' | 'mdxJsxTextElement';
}

const isHastElement = (node: Node): node is Element => node.type === 'element';
const isMdxJsxElement = (node: Node): node is MdxJsxElementNode =>
  node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement';

/** The element/component name for either node shape, or null for text/root/fragments. */
const elementName = (node: Node): string | null => {
  if (isHastElement(node)) return node.tagName;
  if (isMdxJsxElement(node)) return node.name ?? null;
  return null;
};

/**
 * Removes `javascript:`-bearing URL attributes from either node shape, in place.
 * With `stripEventHandlers`, also drops `on*` attributes — passed for host elements
 * (where `on*` are DOM handlers) but not custom components (where they're React props).
 *
 * A URL attribute survives only as a safe string literal: a non-string value (an MDX
 * `href={expr}` expression node) could still resolve to `javascript:` at render time,
 * so it's dropped rather than trusted.
 */
const cleanElement = (node: Node, stripEventHandlers: boolean): void => {
  if (isHastElement(node) && node.properties) {
    const { properties } = node;
    Object.keys(properties).forEach(key => {
      if (
        (stripEventHandlers && isEventHandlerAttribute(key)) ||
        (isUrlAttribute(key) && isDangerousUrl(properties[key]))
      ) {
        delete properties[key];
      }
    });
  }

  if (isMdxJsxElement(node) && node.attributes) {
    node.attributes = node.attributes.filter(attr => {
      if (attr.type !== 'mdxJsxAttribute' || typeof attr.name !== 'string') return true; // keep `{...spread}`
      if (stripEventHandlers && isEventHandlerAttribute(attr.name)) return false;
      if (isUrlAttribute(attr.name)) return typeof attr.value === 'string' && !isDangerousUrl(attr.value);
      return true;
    });
  }
};

/**
 * Strips script-execution vectors (script, MathML/SVG foreign content, event handlers,
 * `javascript:`/`vbscript:` URLs) from a HAST/MDX tree. Custom components keep their
 * `on*` props (React props, not DOM handlers) but have dangerous URL props stripped and
 * are descended into to clean nested raw HTML.
 */
export const stripDangerousHtml = (tree: Root): void => {
  visit(tree, (node, index, parent: Parent | undefined) => {
    const name = elementName(node);

    // Non-elements (root/text): descend without touching attributes.
    if (name === null) return undefined;

    // PascalCase components: keep `on*` props (React props, not DOM handlers), but still
    // strip dangerous URL props — a component may forward `href`/`src` to a host element.
    if (isComponentName(name)) {
      cleanElement(node, false);
      return undefined;
    }

    // Host element: drop it (and its subtree) wholesale if dangerous; SKIP continues at the
    // same index, which now holds the next sibling shifted in by the splice.
    if (DANGEROUS_TAG_NAMES.has(name.toLowerCase())) {
      if (parent && typeof index === 'number') {
        parent.children.splice(index, 1);
        return [SKIP, index];
      }
      return undefined;
    }

    cleanElement(node, true);
    return undefined;
  });
};

/**
 * Rehype plugin wrapping the deny-list stripper for the `mdxish` and MDX `compile`
 * pipelines, which can't use the `md` allow-list because custom components must
 * survive. Must run after raw HTML is parsed into nodes.
 */
const rehypeStripDangerousHtml = () => (tree: Root) => {
  stripDangerousHtml(tree);
  return tree;
};

export default rehypeStripDangerousHtml;
