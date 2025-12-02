import type { Variable } from '../../types';
import type { Parent, Text } from 'mdast';
import type { Plugin } from 'unified';

import { visit } from 'unist-util-visit';

import { NodeTypes } from '../../enums';

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

/**
 * A remark plugin that parses {user.<field>} patterns from text nodes
 * without requiring remarkMdx. Creates Variable nodes for runtime resolution.
 *
 * Supports any user field: name, email, email_verified, exp, iat, etc.
 */
const variablesTextTransformer: Plugin = () => tree => {
  visit(tree, 'text', (node: Text, index, parent: Parent) => {
    if (index === undefined || !parent) return;

    // Skip if inside inline code
    if (parent.type === 'inlineCode') return;

    const text = node.value;
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

      // Create Variable node
      parts.push({
        type: NodeTypes.variable,
        data: {
          hName: 'Variable',
          hProperties: { name: varName },
        },
        value: match[0],
      } satisfies Variable);

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
