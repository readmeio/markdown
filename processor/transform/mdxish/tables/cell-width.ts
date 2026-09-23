import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx-jsx';

import { getAttrs } from '../../../utils';
import { isPlainObject } from '../style-object-to-css';

// Key must follow `{` or `,` so `minWidth`/`maxWidth` don't match on their suffix
const STYLE_OBJECT_WIDTH_REGEX = /[{,]\s*["']?width["']?\s*:\s*(?:"([^"]*)"|'([^']*)'|([^,}]+))/i;
// First colon only, so `url(http://…)` values stay intact
const CSS_DECLARATION_REGEX = /:(.*)/s;
const UNITLESS_NUMBER_REGEX = /^\d+(?:\.\d+)?$/;

interface CellSizingAttrs {
  style?: Record<string, unknown> | string;
  width?: number | string;
}

/** Bare numbers are pixels, as React and the HTML `width` attribute treat them. */
export const normalizeWidth = (value: unknown): string | null => {
  if (typeof value === 'number') return `${value}px`;
  if (typeof value !== 'string' || !value.trim()) return null;
  const trimmed = value.trim();
  return UNITLESS_NUMBER_REGEX.test(trimmed) ? `${trimmed}px` : trimmed;
};

const cssPropertyNames = (style: string): string[] =>
  style
    .split(';')
    .map(declaration => declaration.split(CSS_DECLARATION_REGEX)[0].trim().toLowerCase())
    .filter(Boolean);

/** Handles a CSS declaration list and a style object safe mode left as a string (`{ width: "30%" }`). */
export const widthFromStyleString = (style: string): string | undefined => {
  const trimmed = style.trim();
  if (trimmed.startsWith('{')) {
    return STYLE_OBJECT_WIDTH_REGEX.exec(trimmed)?.slice(1).find(Boolean);
  }

  return trimmed
    .split(';')
    .map(declaration => declaration.split(CSS_DECLARATION_REGEX))
    .find(([property]) => property.trim().toLowerCase() === 'width')?.[1];
};

/** Accepts `style={{ width }}`, `style="width: …"` and the hand-authored `width="…"`. */
export const getCellWidth = (cell: MdxJsxFlowElement | MdxJsxTextElement): string | null => {
  const { style, width } = getAttrs<CellSizingAttrs>(cell);

  let styleWidth: unknown;
  if (isPlainObject(style)) {
    styleWidth = style.width;
  } else if (typeof style === 'string') {
    styleWidth = widthFromStyleString(style);
  }
  return normalizeWidth(styleWidth) ?? normalizeWidth(width);
};

/** True when the cell's attributes state nothing but its width, which mdast can carry. */
export const hasOnlyWidthAttributes = (cell: MdxJsxFlowElement | MdxJsxTextElement): boolean => {
  if (cell.attributes.length === 0) return false;

  const { style } = getAttrs<CellSizingAttrs>(cell);
  return cell.attributes.every(attribute => {
    if (!('name' in attribute)) return false;
    if (attribute.name === 'width') return true;
    if (attribute.name !== 'style') return false;
    if (isPlainObject(style)) return Object.keys(style).every(key => key === 'width');
    return typeof style === 'string' && cssPropertyNames(style).every(property => property === 'width');
  });
};
