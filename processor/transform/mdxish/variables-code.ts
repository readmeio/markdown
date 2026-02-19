import type { Variables } from '../../../types';
import type { Code, InlineCode } from 'mdast';
import type { Plugin } from 'unified';

import { MDX_VARIABLE_REGEXP, VARIABLE_REGEXP } from '@readme/variable';
import { visit } from 'unist-util-visit';

interface Options {
  variables?: Variables;
}

const LEGACY_VARIABLE_REGEX = new RegExp(VARIABLE_REGEXP, 'giu');
const MDX_VARIABLE_REGEX = new RegExp(MDX_VARIABLE_REGEXP, 'giu');

// Flatten variables into a single object for easy lookup
function flattenVariables(variables?: Variables): Record<string, string> {
  if (!variables) return {};

  return {
    ...Object.fromEntries((variables.defaults || []).map(d => [d.name, d.default])),
    ...(variables.user),
  };
}

function resolveCodeVariables(value: string, resolvedVariables: Record<string, string>): string {
  const withLegacyVars = value.replace(
    LEGACY_VARIABLE_REGEX,
    (match: string, variableName: string): string => {
      if (match.startsWith('\\<<') || match.endsWith('\\>>')) return match;

      // Legacy & MDX behavior: Glossary and missing variables are just capitalized
      const name = variableName.trim();
      if (name.startsWith('glossary:')) return name.toUpperCase();

      return name in resolvedVariables ? resolvedVariables[name] : name.toUpperCase();
    },
  );

  return withLegacyVars.replace(
    MDX_VARIABLE_REGEX,
    (match: string, escapedPrefix: string, variableName: string, escapedSuffix: string): string => {
      if (escapedPrefix || escapedSuffix) return match;
      if (variableName in resolvedVariables) return resolvedVariables[variableName];
      // Extract the full variable path from the match (e.g., "user.missing" from "{user.missing}")
      const fullPath = match.slice(1, -1);
      return fullPath.toUpperCase();
    },
  );
}

/**
 * A remark mdast plugin that resolves legacy variables <<...>> and MDX variables {user.*} inside code and inline code nodes
 * to their values. Uses regexes from the readme variable to search for variables in the code string.
 *
 * Variables in code blocks and inline cannot be tokenized, and also we need to maintain the code string
 * This enables engine side variable resolution which improves UX
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
