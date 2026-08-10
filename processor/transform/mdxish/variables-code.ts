import type { Variables } from '../../../types';
import type { Code, InlineCode } from 'mdast';
import type { Plugin } from 'unified';

import { visit } from 'unist-util-visit';

import { flattenVariables, replaceVariables } from '../../../lib/utils/mdxish/mdxish-variables';

interface Options {
  variables?: Variables;
}

function resolveCodeVariables(value: string, resolvedVariables: Record<string, string>): string {
  return replaceVariables(value, ({ isMdxSyntax, name, source }) => {
    if (name in resolvedVariables) return resolvedVariables[name];

    // Unresolved code variables echo the full reference, so `{user.missing}` reads as `USER.MISSING`
    return (isMdxSyntax ? source.slice(1, -1) : name).toUpperCase();
  });
}

/**
 * A remark mdast plugin that resolves legacy variables <<...>> and MDX variables {user.*} inside code and inline code nodes
 * to their values. Uses regexes from the readme variable to search for variables in the code string.
 *
 * This is needed because variables in code blocks and inline cannot be tokenized, and also we need to maintain the code string
 * in the code nodes. This enables engine side variable resolution in codes which improves UX
 */
const variablesCodeResolver: Plugin<[Options?]> =
  ({ variables }: Options = {}) =>
  tree => {
    const resolvedVariables = flattenVariables(variables);

    visit(tree, 'inlineCode', (node: InlineCode) => {
      if (!node.value) return;
      node.value = resolveCodeVariables(node.value, resolvedVariables);
    });

    visit(tree, 'code', (node: Code) => {
      if (!node.value) return;
      if (node.lang === 'mermaid') return;

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
