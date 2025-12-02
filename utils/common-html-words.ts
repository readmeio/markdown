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
 * Tags that should be passed through and handled at runtime (not by the mdxish plugin)
 */
export const RUNTIME_COMPONENT_TAGS = new Set(['Variable', 'variable']);

/**
 * Standard HTML tags that should never be treated as custom components.
 * Uses the html-tags package, converted to a Set<string> for efficient lookups.
 */
export const STANDARD_HTML_TAGS = new Set(htmlTags) as Set<string>;
