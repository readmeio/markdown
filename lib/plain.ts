/* eslint-disable @typescript-eslint/no-use-before-define */
import type { ExpressionStatement, Identifier, MemberExpression, SimpleLiteral } from 'estree';
import type { Nodes, Parents } from 'hast';
import type { MdxTextExpressionHast } from 'mdast-util-mdx-expression';

import { fromHtml } from 'hast-util-from-html';

import { MDX_COMMENT_REGEX } from '../processor/transform/stripComments';

/* @note: adapted from https://github.com/rehypejs/rehype-minify/blob/main/packages/hast-util-to-string/index.js
 */

interface Options {
  variables?: Record<string, string>;
}

const STRIP_TAGS = ['script', 'style'];

/**
 * Extract variable key from MDX expression AST (e.g., {user.name} → 'name')
 * Uses ESTree AST inspection, matching the approach in processor/transform/variables.ts
 *
 * @see https://github.com/syntax-tree/mdast-util-mdx-expression - MdxTextExpressionHast type
 * @see https://github.com/estree/estree/blob/master/es5.md - ESTree spec for expression types
 */
function extractMdxVariableKey(node: MdxTextExpressionHast): string | undefined {
  const estree = node.data?.estree;
  if (!estree || estree.type !== 'Program' || estree.body.length === 0) return undefined;

  const statement = estree.body[0];
  if (statement.type !== 'ExpressionStatement') return undefined;

  const expr = (statement as ExpressionStatement).expression;
  if (expr.type !== 'MemberExpression') return undefined;

  const memberExpr = expr as MemberExpression;
  const obj = memberExpr.object;
  if (obj.type !== 'Identifier' || (obj as Identifier).name !== 'user') return undefined;

  const prop = memberExpr.property;
  if (prop.type === 'Identifier') {
    return (prop as Identifier).name;
  }
  if (prop.type === 'Literal') {
    const val = (prop as SimpleLiteral).value;
    return typeof val === 'string' ? val : undefined;
  }

  return undefined;
}

function one(node: Nodes, opts: Options) {
  if (node.type === 'comment') return '';

  if ('type' in node && node.type === 'text') {
    // Remove all MDX comments from text nodes. We need this here because we
    // don't control whether comments are parsed into comment vs text nodes.
    return node.value.replace(MDX_COMMENT_REGEX, '');
  }

  if ('tagName' in node) {
    if (STRIP_TAGS.includes(node.tagName)) return '';

    switch (node.tagName) {
      // mdxish preserves the original JSX tag name HTMLBlock while hast() normalizes it to html-block
      case 'html-block':
      case 'HTMLBlock': {
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
  if (node.type === 'mdxTextExpression') {
    const key = extractMdxVariableKey(node as MdxTextExpressionHast);
    if (key) {
      return ('variables' in opts && opts.variables[key]) || key;
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
