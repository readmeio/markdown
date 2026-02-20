import type { Variables } from '../../../types';
import type { Code, InlineCode } from 'mdast';
import type { Plugin } from 'unified';

import { MDX_VARIABLE_REGEXP, VARIABLE_REGEXP } from '@readme/variable';
import { visit } from 'unist-util-visit';

interface Options {
  variables?: Variables;
}

// Single combined regex so that resolved values from one pattern are never re-scanned by the other.
const COMBINED_VARIABLE_REGEX = new RegExp(`${VARIABLE_REGEXP}|${MDX_VARIABLE_REGEXP}`, 'giu');

// Flatten variables into a single object for easy lookup
function flattenVariables(variables?: Variables): Record<string, string> {
  if (!variables) return {};

  return {
    ...Object.fromEntries((variables.defaults || []).map(d => [d.name, d.default])),
    ...variables.user,
  };
}

function resolveCodeVariables(value: string, resolvedVariables: Record<string, string>): string {
  return value.replace(
    COMBINED_VARIABLE_REGEX,
    (match: string, legacyName: string, mdxEscapePrefix: string, mdxVarName: string, mdxEscapeSuffix: string): string => {
      // Legacy variable: <<...>>
      if (legacyName !== undefined) {
        if (match.startsWith('\\<<') || match.endsWith('\\>>')) return match;

        const name = legacyName.trim();
        if (name.startsWith('glossary:')) return name.toUpperCase();

        return name in resolvedVariables ? resolvedVariables[name] : name.toUpperCase();
      }

      // MDX variable: {user.*}
      if (mdxEscapePrefix || mdxEscapeSuffix) return match;
      if (mdxVarName in resolvedVariables) return resolvedVariables[mdxVarName];
      const fullPath = match.slice(1, -1);
      return fullPath.toUpperCase();
    },
  );
}

/**
 * A remark mdast plugin that resolves legacy variables <<...>> and MDX variables {user.*} inside code and inline code nodes
 * to their values. Uses regexes from the readme variable to search for variables in the code string.
 *
 * This is needed because variables in code blocks and inline cannot be tokenized, and also we need to maintain the code string
 * in the code nodes. This enables engine side variable resolution in codes which improves UX
 */
const variablesCodeResolver: Plugin<[Options?]> = ({ variables }: Options = {}) => tree => {
  const resolvedVariables = flattenVariables(variables);

  visit(tree, 'inlineCode', (node: InlineCode) => {
    if (!node.value) return;
    node.value = resolveCodeVariables(node.value, resolvedVariables);
  });

  visit(tree, 'code', (node: Code) => {
    if (!node.value) return;
    const nextValue = resolveCodeVariables(node.value, resolvedVariables);
    node.value = nextValue;

    // Keep code-tabs/readme-components hProperties in sync with node.value
    // because renderers read `value` from hProperties.
    if (node.data?.hProperties && typeof node.data.hProperties === 'object') {
      node.data.hProperties.value = nextValue;
    }
  });

  return tree;
};

export default variablesCodeResolver;
