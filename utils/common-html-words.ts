import htmlTags from 'html-tags';
import reactHtmlAttributes from 'react-html-attributes';
import { allProps as reactNativeStylingProps } from 'react-native-known-styling-properties';

/**
 * Extract word boundaries from camelCase strings (e.g., "borderWidth" -> ["border", "width"])
 */
function extractWordBoundaries(camelCaseStr: string): string[] {
  return camelCaseStr
    .replace(/([A-Z])/g, ' $1')
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 0);
}

/**
 * Get all unique word boundaries from an array of camelCase property names.
 * Filters out single-letter words to avoid false matches in smartCamelCase.
 */
function getWordBoundariesFromProps(props: string[]): string[] {
  const boundaries = new Set<string>();
  props.forEach(prop => {
    extractWordBoundaries(prop).forEach(word => {
      // Filter out single-letter words to prevent false matches (e.g., "d" matching in "data")
      // Keep meaningful 2+ character words
      if (word.length >= 2) {
        boundaries.add(word);
      }
    });
  });
  return Array.from(boundaries).sort();
}

/**
 * React HTML element props word boundaries (e.g., "on", "data", "aria", "accept", "auto")
 * Extracted from react-html-attributes package
 */
export const REACT_HTML_PROP_BOUNDARIES = getWordBoundariesFromProps(reactHtmlAttributes['*'] || []);

/**
 * CSS style property word boundaries (e.g., "border", "margin", "padding", "flex", "align")
 * Extracted from react-native-known-styling-properties package
 */
export const CSS_STYLE_PROP_BOUNDARIES = getWordBoundariesFromProps(reactNativeStylingProps as string[]);

/**
 * Custom component prop word boundaries not in React HTML or CSS boundaries.
 */
export const CUSTOM_PROP_BOUNDARIES = [
  'alt',
  'attribute',
  'attributes',
  'buttons',
  'caption',
  'collection',
  'columns',
  'copy',
  'dark',
  'data',
  'depth',
  'download',
  'embed',
  'empty',
  'favicon',
  'flow',
  'iframe',
  'image',
  'layout',
  'lazy',
  'meta',
  'provider',
  'run',
  'safe',
  'scripts',
  'tag',
  'term',
  'terms',
  'theme',
  'url',
  'value',
];

/**
 * Tags that should be passed through and handled at runtime (not by the mdxish plugin)
 */
export const RUNTIME_COMPONENT_TAGS = new Set(['Variable', 'variable', 'html-block', 'rdme-pin']);

/**
 * Standard HTML tags that should never be treated as custom components.
 * Uses the html-tags package, converted to a Set<string> for efficient lookups.
 */
export const STANDARD_HTML_TAGS = new Set(htmlTags) as Set<string>;

/**
 * Table structural tags. Blank lines inside these carry deliberate meaning for
 * `mdxishTables` (e.g. splitting cell content into paragraphs, or deciding
 * whether a table stays plain HTML vs a JSX `<Table>`), so transforms that
 * neutralize or claim across blank lines must leave them alone.
 */
export const HTML_TABLE_STRUCTURE_TAGS = new Set([
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'td',
  'th',
  'caption',
  'colgroup',
]);

/**
 * Tags whose bodies a later mdxish transform keeps raw and never re-parses as
 * markdown. Both layers depend on this property, not on the tags being figures:
 * the transformer treats them as non-promotable, and the tokenizer must not claim
 * markdown islands inside them (a claimed island would never be re-parsed and would
 * leak as literal text). Currently just the figure tags, whose bodies are owned by
 * the figure reassembly transform (`mdxishJsxToMdast`).
 */
export const NON_REPARSED_BODY_TAGS = new Set(['figure', 'figcaption']);

/**
 * The two HTML "foreign content" namespaces: SVG and MathML. Their descendants
 * (`<path>`, `<mrow>`, …) are namespaced XML, not HTML tags or components. A closed
 * set per the HTML spec, so transforms can treat these roots as opaque islands.
 */
export const FOREIGN_CONTENT_TAGS = ['svg', 'math'] as const;

/**
 * HTML void elements — elements that have no closing tag and no children.
 *
 * @see https://html.spec.whatwg.org/multipage/syntax.html#void-elements
 */
export const HTML_VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);
