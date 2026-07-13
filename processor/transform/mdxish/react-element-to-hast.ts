import type { MdxJsx } from '../../../types';
import type { ElementContent, Properties, Text } from 'hast';
import type { Raw } from 'mdast-util-to-hast';

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { isPlainObject, styleObjectToCssText } from './style-object-to-css';

// React props that never map to an HTML/hast attribute.
const RESERVED_PROPS = new Set(['children', 'key', 'ref']);

/**
 * Translate React props into hast `properties`: reserved and function props (event handlers)
 * are dropped (known gap), `style` objects flatten to CSS text. Names stay as authored (`className`); the
 * hast → HTML boundary maps them to `class`/`for` downstream.
 */
function propsToHastProperties(props: Record<string, unknown>): Properties {
  const properties: Record<string, unknown> = {};

  Object.entries(props).forEach(([key, value]) => {
    if (RESERVED_PROPS.has(key) || typeof value === 'function' || value === undefined) return;
    properties[key] = key === 'style' && isPlainObject(value) ? styleObjectToCssText(value) : value;
  });

  // Values are resolved React props, wider than hast's HTML-attribute `PropertyValue` union.
  return properties as Properties;
}

/**
 * Render an element with React's own renderer as a last resort, wrapped as a hast `raw` node —
 * the same node type markdown's literal HTML blocks produce, so it re-enters rehypeRaw's
 * parse5 pass normally. Used for element types this converter can't resolve on its own (wrapped
 * component types, or a function component that throws when called outside React, e.g. one
 * using hooks). It's not immune to the invalid-HTML-nesting this module otherwise avoids, but
 * that's a fair trade against silently dropping the content.
 */
function renderFallbackHtml(element: React.ReactElement): ElementContent[] {
  try {
    const rawNode: Raw = { type: 'raw', value: renderToStaticMarkup(element) };
    return [rawNode];
  } catch {
    return [];
  }
}

/**
 * Convert a React element tree into hast. Emitting `mdx-jsx` nodes (rehypeRaw passthrough, later normalized to `element`)
 * preserves nesting that is valid JSX but not valid HTML, which parse5 would otherwise
 * restructure — e.g. an `<a>` wrapping another `<a>`.
 * Recursively converts the tree into an array of hast nodes, dealing with arrays and null/undefined/boolean values.
 */
export function reactElementToHast(node: unknown): ElementContent[] {
  if (Array.isArray(node)) return node.flatMap(reactElementToHast);
  if (node === null || node === undefined || typeof node === 'boolean') return [];

  if (typeof node === 'string' || typeof node === 'number') {
    const textNode: Text = { type: 'text', value: String(node) };
    return [textNode];
  }

  if (!React.isValidElement<Record<string, unknown>>(node)) return [];

  const { type, props } = node;

  // Fragments contribute their children with no wrapper element.
  if (type === React.Fragment) return reactElementToHast(props.children);

  // Resolve function components to their rendered output so the tree is plain intrinsic
  // elements. If invoking it directly throws (e.g. it uses hooks, which need React's own
  // render context), fall back to React's renderer for just this subtree.
  if (typeof type === 'function') {
    try {
      return reactElementToHast((type as (componentProps: unknown) => unknown)(props));
    } catch {
      return renderFallbackHtml(node);
    }
  }

  // Non-intrinsic, non-callable element types — `React.memo`, `React.forwardRef`,
  // `Context.Provider`/`Consumer`, `React.lazy` — have no `type` we can resolve ourselves.
  if (typeof type !== 'string') return renderFallbackHtml(node);

  const mdxJsxNode: MdxJsx = {
    type: 'mdx-jsx',
    tagName: type,
    properties: propsToHastProperties(props),
    children: reactElementToHast(props.children),
  };

  return [mdxJsxNode];
}
