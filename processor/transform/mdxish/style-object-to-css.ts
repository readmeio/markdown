import React from 'react';

/**
 * CSS properties React treats as unitless — a bare number stays as-is instead of
 * getting `px` appended. Mirrors React DOM's `isUnitlessNumber` whitelist.
 * @see https://github.com/facebook/react/blob/main/packages/react-dom-bindings/src/shared/CSSProperty.js
 */
const UNITLESS_CSS_PROPERTIES = new Set([
  'animationIterationCount',
  'aspectRatio',
  'borderImageOutset',
  'borderImageSlice',
  'borderImageWidth',
  'boxFlex',
  'boxFlexGroup',
  'boxOrdinalGroup',
  'columnCount',
  'columns',
  'flex',
  'flexGrow',
  'flexPositive',
  'flexShrink',
  'flexNegative',
  'flexOrder',
  'gridArea',
  'gridRow',
  'gridRowEnd',
  'gridRowSpan',
  'gridRowStart',
  'gridColumn',
  'gridColumnEnd',
  'gridColumnSpan',
  'gridColumnStart',
  'fontWeight',
  'lineClamp',
  'lineHeight',
  'opacity',
  'order',
  'orphans',
  'tabSize',
  'widows',
  'zIndex',
  'zoom',
  'fillOpacity',
  'floodOpacity',
  'stopOpacity',
  'strokeDasharray',
  'strokeDashoffset',
  'strokeMiterlimit',
  'strokeOpacity',
  'strokeWidth',
]);

/** Convert a camelCase (or CSS custom property) key into its kebab-case CSS name. */
const cssPropertyName = (key: string): string => (key.startsWith('--') ? key : key.replace(/[A-Z]/g, m => `-${m.toLowerCase()}`));

/** React appends `px` to non-zero numeric values, except unitless and custom properties. */
const cssPropertyValue = (key: string, value: unknown): string =>
  typeof value === 'number' && value !== 0 && !key.startsWith('--') && !UNITLESS_CSS_PROPERTIES.has(key)
    ? `${value}px`
    : `${value}`;

/**
 * True for a value that should be serialized as a style object rather than passed through
 * as an already-CSS string. React elements are excluded since they're valid objects too.
 */
export const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value) && !React.isValidElement(value);

/**
 * Serialize a React-style inline style object (`{ color: "red", fontSize: 12 }`) into a
 * CSS declaration string (`color:red;font-size:12px`), the shape hast/HTML expects for a
 * `style` attribute. Empty (`undefined`/`null`/`''`) entries are dropped.
 */
export const styleObjectToCssText = (style: Record<string, unknown>): string =>
  Object.entries(style)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${cssPropertyName(key)}:${cssPropertyValue(key, value)}`)
    .join(';');
