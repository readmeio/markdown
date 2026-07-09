import type { MdxJsx } from '../../../types';
import type { ElementContent, Properties, Text } from 'hast';

import React from 'react';

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
  // elements. Anything that throws is dropped, matching the evaluation error fallback.
  if (typeof type === 'function') {
    try {
      return reactElementToHast((type as (componentProps: unknown) => unknown)(props));
    } catch {
      return [];
    }
  }

  if (typeof type !== 'string') return [];

  const mdxJsxNode: MdxJsx = {
    type: 'mdx-jsx',
    tagName: type,
    properties: propsToHastProperties(props),
    children: reactElementToHast(props.children),
  };

  return [mdxJsxNode];
}
