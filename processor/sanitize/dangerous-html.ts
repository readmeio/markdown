import type { Root } from 'hast';

/**
 * Elements removed wholesale (subtree included) because they execute script,
 * load remote resources, or open a foreign-content (MathML/SVG) parsing context
 * that lets `<script>` survive namespace-confusion bypasses.
 */
const DANGEROUS_TAG_NAMES = new Set([
  'script',
  'noscript',
  'style',
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

// MDX keeps JSX (including raw HTML) as `mdxJsxFlowElement`/`mdxJsxTextElement`
// nodes with a `name` + `attributes` array, whereas the mdxish/`md` pipelines
// produce hast `element` nodes with `tagName` + `properties`. This loose shape
// lets one walker sanitize both so every engine reaches parity.
interface SanitizableNode {
  attributes?: { name?: string | null; type: string; value?: unknown }[];
  children?: SanitizableNode[];
  name?: string | null;
  properties?: Record<string, unknown> | null;
  tagName?: string;
  type: string;
}

/** The element/component name for either node shape, or null for text/root/fragments. */
const elementName = (node: SanitizableNode): string | null => {
  if (node.type === 'element') return typeof node.tagName === 'string' ? node.tagName : null;
  if (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') return node.name ?? null;
  return null;
};

const cleanHostElement = (node: SanitizableNode): void => {
  const { properties } = node;
  if (properties) {
    Object.keys(properties).forEach(key => {
      if (isEventHandlerAttribute(key) || (isUrlAttribute(key) && isDangerousUrl(properties[key]))) {
        delete properties[key];
      }
    });
  }

  if (node.attributes) {
    node.attributes = node.attributes.filter(attr => {
      if (attr.type !== 'mdxJsxAttribute' || typeof attr.name !== 'string') return true; // keep `{...spread}`
      if (isEventHandlerAttribute(attr.name)) return false;
      return !(isUrlAttribute(attr.name) && isDangerousUrl(attr.value));
    });
  }
};

/**
 * Removes dangerous descendant elements and neutralizes script-bearing attributes
 * in place. Recurses through components so raw HTML nested inside them is cleaned;
 * iterates back-to-front so splicing doesn't skip siblings.
 */
const cleanChildren = (node: SanitizableNode): void => {
  if (!node.children) return;

  for (let index = node.children.length - 1; index >= 0; index -= 1) {
    const child = node.children[index];
    const name = elementName(child);
    const isHostElement = name !== null && !isComponentName(name);

    if (isHostElement && DANGEROUS_TAG_NAMES.has(name.toLowerCase())) {
      node.children.splice(index, 1);
      continue; // eslint-disable-line no-continue
    }

    if (isHostElement) cleanHostElement(child);
    cleanChildren(child);
  }
};

/**
 * Strips script-execution vectors from a HAST/MDX tree: `<script>`, MathML/SVG
 * foreign content, event-handler attributes, and `javascript:`/`vbscript:` URLs.
 * Handles both hast `element` and MDX JSX nodes; PascalCase custom components keep
 * their props (React props, not DOM handlers) — only host elements are sanitized.
 */
export const stripDangerousHtml = (tree: Root): void => cleanChildren(tree);
