/**
 * React HTML element props word boundaries (e.g., "on", "data", "aria", "accept", "auto")
 * Extracted from react-html-attributes package
 */
export declare const REACT_HTML_PROP_BOUNDARIES: string[];
/**
 * CSS style property word boundaries (e.g., "border", "margin", "padding", "flex", "align")
 * Extracted from react-native-known-styling-properties package
 */
export declare const CSS_STYLE_PROP_BOUNDARIES: string[];
/**
 * Custom component prop word boundaries not in React HTML or CSS boundaries.
 */
export declare const CUSTOM_PROP_BOUNDARIES: string[];
/**
 * Tags that should be passed through and handled at runtime (not by the mdxish plugin)
 */
export declare const RUNTIME_COMPONENT_TAGS: Set<string>;
/**
 * Standard HTML tags that should never be treated as custom components.
 * Uses the html-tags package, converted to a Set<string> for efficient lookups.
 */
export declare const STANDARD_HTML_TAGS: Set<string>;
/**
 * HTML void elements — elements that have no closing tag and no children.
 *
 * @see https://html.spec.whatwg.org/multipage/syntax.html#void-elements
 */
export declare const HTML_VOID_ELEMENTS: Set<string>;
