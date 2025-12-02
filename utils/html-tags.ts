import htmlTags from 'html-tags';

/**
 * Common word boundaries for CSS/React props
 */
export const COMMON_WORD_BOUNDARIES = [
  'class',
  'icon',
  'background',
  'text',
  'font',
  'border',
  'max',
  'min',
  'color',
  'size',
  'width',
  'height',
  'style',
  'weight',
  'radius',
  'image',
  'data',
  'aria',
  'role',
  'tab',
  'index',
  'type',
  'name',
  'value',
  'id',
];

/**
 * Tags that should be passed through and handled at runtime (not by the mdxish plugin)
 */
export const RUNTIME_COMPONENT_TAGS = new Set(['Variable', 'variable']);

/**
 * Standard HTML tags that should never be treated as custom components.
 * Uses the html-tags package, converted to a Set<string> for efficient lookups.
 */
export const STANDARD_HTML_TAGS = new Set(htmlTags) as Set<string>;
