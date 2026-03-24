import type { Variable } from '../../../types';
import type { Parent, Text } from 'mdast';
import type { MdxTextExpression } from 'mdast-util-mdx-expression';
import type { Plugin } from 'unified';

import { visit } from 'unist-util-visit';

import { NodeTypes } from '../../../enums';

/**
 * Matches {user.<field>} patterns:
 * - {user.name}
 * - {user.email}
 * - {user['field']}
 * - {user["field"]}
 *
 * Captures the field name in group 1 (dot notation) or group 2 (bracket notation)
 */
const USER_VAR_REGEX = /\{user\.(\w+)\}|\{user\[['"](\w+)['"]\]\}/g;

function makeVariableNode(varName: string, rawValue: string): Variable {
  return {
    type: NodeTypes.variable,
    data: {
      hName: 'Variable',
      hProperties: { name: varName },
    },
    value: rawValue,
  } satisfies Variable;
}

/**
 * A remark plugin that parses {user.<field>} patterns from text nodes and
 * mdxTextExpression nodes, creating Variable nodes for runtime resolution.
 *
 * Handles both:
 * - `text` nodes: when safeMode is true or after expression evaluation
 * - `mdxTextExpression` nodes: when mdxExpression has parsed {user.*} before evaluation
 *
 * Supports any user field: name, email, email_verified, exp, iat, etc.
 */
const variablesTextTransformer: Plugin = () => tree => {
  // Handle mdxTextExpression nodes (e.g. {user.name} parsed by mdxExpression)
  visit(tree, 'mdxTextExpression', (node: MdxTextExpression, index, parent: Parent) => {
    if (index === undefined || !parent) return;
    const wrapped = `{${(node.value ?? '').trim()}}`; // Wrap the expression value in {} to match the USER_VAR_REGEX pattern
    const matches = [...wrapped.matchAll(USER_VAR_REGEX)];
    if (matches.length !== 1) return;
    const varName = matches[0][1] || matches[0][2];
    parent.children.splice(index, 1, makeVariableNode(varName, wrapped));
  });

  visit(tree, 'text', (node: Text, index, parent: Parent) => {
    if (index === undefined || !parent) return;

    // Skip if inside inline code
    if (parent.type === 'inlineCode') return;

    const text = node.value;
    if (typeof text !== 'string' || !text.trim()) return;

    if (!text.includes('{user.') && !text.includes('{user[')) return;

    const matches = [...text.matchAll(USER_VAR_REGEX)];
    if (matches.length === 0) return;

    const parts: (Text | Variable)[] = [];
    let lastIndex = 0;

    matches.forEach(match => {
      const matchIndex = match.index ?? 0;

      // Add text before the match
      if (matchIndex > lastIndex) {
        parts.push({ type: 'text', value: text.slice(lastIndex, matchIndex) } satisfies Text);
      }

      // Extract variable name from either capture group (dot or bracket notation)
      const varName = match[1] || match[2];
      parts.push(makeVariableNode(varName, match[0]));

      lastIndex = matchIndex + match[0].length;
    });

    // Add remaining text after last match
    if (lastIndex < text.length) {
      parts.push({ type: 'text', value: text.slice(lastIndex) } satisfies Text);
    }

    // Replace node with parts
    if (parts.length > 1 || (parts.length === 1 && parts[0].type !== 'text')) {
      parent.children.splice(index, 1, ...parts);
    }
  });

  return tree;
};

export default variablesTextTransformer;
