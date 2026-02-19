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

      const name = variableName.trim();
      if (name.startsWith('glossary:')) return match;

      return resolvedVariables[name] ?? match;
    },
  );

  return withLegacyVars.replace(
    MDX_VARIABLE_REGEX,
    (match: string, escapedPrefix: string, variableName: string, escapedSuffix: string): string => {
      if (escapedPrefix || escapedSuffix) return match;
      return resolvedVariables[variableName] ?? match;
    },
  );
}

const variablesCodeTransformer: Plugin<[Options?]> = ({ variables }: Options = {}) => tree => {
  const resolvedVariables = flattenVariables(variables);

  if (Object.keys(resolvedVariables).length === 0) return tree;

  visit(tree, 'inlineCode', (node: InlineCode) => {
    console.log('inlineCode:', JSON.stringify(node, null, 2));
    if (!node.value) return;
    node.value = resolveCodeVariables(node.value, resolvedVariables);
  });

  visit(tree, 'code', (node: Code) => {
    console.log('code:', JSON.stringify(node, null, 2));
    if (!node.value) return;
    node.value = resolveCodeVariables(node.value, resolvedVariables);
  });

  return tree;
};

export default variablesCodeTransformer;
