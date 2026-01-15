/* eslint-disable @typescript-eslint/no-use-before-define */
import type { Nodes, Parents } from 'hast';

import { fromHtml } from 'hast-util-from-html';

/* @note: adapted from https://github.com/rehypejs/rehype-minify/blob/main/packages/hast-util-to-string/index.js
 */

interface Options {
  variables?: Record<string, string>;
}

interface MdxExpressionNode {
  data?: {
    estree?: {
      body: {
        expression: {
          object?: { name: string };
          property?: { name?: string; type: string; value?: string };
        };
        type: string;
      }[];
      type: string;
    };
  };
  type: string;
}

const STRIP_TAGS = ['script', 'style'];

/**
 * Extract variable key from MDX expression AST (e.g., {user.name} → 'name')
 * Uses ESTree AST inspection, matching the approach in processor/transform/variables.ts
 */
function extractMdxVariableKey(node: MdxExpressionNode): string | undefined {
  const estree = node.data?.estree;
  if (estree?.type !== 'Program') return undefined;

  const [statement] = estree.body;
  if (statement?.type !== 'ExpressionStatement') return undefined;

  const { expression } = statement;
  if (expression?.object?.name !== 'user') return undefined;

  const { property } = expression;
  if (!property || !['Literal', 'Identifier'].includes(property.type)) return undefined;

  return property.type === 'Identifier' ? property.name : property.value;
}

function one(node: Nodes, opts: Options) {
  if (node.type === 'comment') return '';

  if ('type' in node && node.type === 'text') {
    return node.value;
  }

  if ('tagName' in node) {
    if (STRIP_TAGS.includes(node.tagName)) return '';

    switch (node.tagName) {
      case 'html-block': {
        if (!node.properties.html) return '';
        return all(fromHtml(node.properties.html.toString()), opts);
      }
      case 'rdme-callout': {
        const { icon, title } = node.properties;

        const children = node?.children?.slice(title ? 1 : 0);
        const body = children ? all({ type: 'root', children }, opts) : '';

        return [icon, ' ', title, title && body && ': ', body].filter(Boolean).join('');
      }
      // 'variable' (lowercase) comes from mdxish() after rehypeRaw normalizes HTML tag names
      case 'variable':
      case 'Variable': {
        const key = node.properties.name.toString();
        const val = 'variables' in opts && opts.variables[key];
        return val || key;
      }
      case 'img': {
        return node.properties?.title || '';
      }
      case 'Accordion':
      case 'Card':
      case 'Callout':
      case 'Tab': {
        const title = node.properties?.title || '';
        const children = node?.children;
        const body = children ? all({ type: 'root', children }, opts) : '';

        return [title, body].filter(Boolean).join(' ');
      }
      default:
        break;
    }
  }

  // Handle MDX expressions like {user.name}
  if ('type' in node && (node as { type: string }).type === 'mdxTextExpression') {
    const key = extractMdxVariableKey(node as MdxExpressionNode);
    if (key && 'variables' in opts) {
      return opts.variables[key] || key;
    }
  }

  if ('value' in node) {
    return node.value;
  }

  return 'children' in node ? all(node, opts) : ' ';
}

function all(node: Parents, opts: Options) {
  let index = -1;
  const result = [];

  // eslint-disable-next-line no-plusplus
  while (++index < node?.children.length) {
    result[index] = one(node.children[index], opts);
  }

  return result.join(' ').replaceAll(/\s+/g, ' ').trim();
}

const plain = (node: Nodes, opts: Options = {}) => {
  return 'children' in node ? all(node, opts) || one(node, opts) : one(node, opts);
};

export default plain;
