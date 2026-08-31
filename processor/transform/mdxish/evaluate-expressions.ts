import type { CustomComponents, Variables } from '../../../types';
import type { Root, Text } from 'mdast';
import type { MdxFlowExpression, MdxTextExpression } from 'mdast-util-mdx-expression';
import type { Plugin } from 'unified';
import type { Position } from 'unist';
import type { VFile } from 'vfile';

import React from 'react';
import { visit } from 'unist-util-visit';

import { evalExpression } from '../../../lib/utils/mdxish/mdxish-expression';
import { getComponentName, toPascalCase } from '../../../lib/utils/mdxish/mdxish-get-component-name';
import User from '../../../utils/user';

import { reactElementToHast } from './react-element-to-hast';

interface Options {
  components?: CustomComponents;
  variables?: Variables;
}

/** Names in JSX tag position (`<Foo`, `<Foo.Bar`) — the only identifiers that mean a component. */
const JSX_TAG = /<\s*([A-Z][A-Za-z0-9_$]*)/g;

/**
 * Bind the components a given expression actually references as tags. Scoped per expression on
 * purpose: binding the whole hash would shadow same-named globals (a `math` component would
 * break `{Math.max(1, 2)}`) and pad `evaluate`'s `new Function` parameter list. Resolution defers
 * to `getComponentName` so an expression and a plain tag always reach the same component.
 */
const componentScope = (expression: string, components: CustomComponents): Record<string, unknown> => {
  const scope: Record<string, unknown> = {};

  Array.from(expression.matchAll(JSX_TAG), match => match[1]).forEach(name => {
    if (name in scope) return;

    // `getComponentName` normalizes the tag, never the key, so it can't match `<MyBlock/>` to a
    // `my_block` entry; compare the key's PascalCase form for that direction.
    const key = getComponentName(name, components) ?? Object.keys(components).find(k => toPascalCase(k) === name);
    const Component = key ? components[key]?.default : undefined;
    if (typeof Component === 'function') scope[name] = Component;
  });

  return scope;
};

/**
 * We divide the result of an expression into two categories:
 * 1. Renderable values: HTML, JSX, e.g. .map() returning JSX 
 * 2. Non-renderable values: a string, number, or object, regular JS values
 */
const isRenderable = (value: unknown): boolean => {
  if (React.isValidElement(value)) return true;
  return Array.isArray(value) && value.some(isRenderable);
};

/** Turn a non-renderable evaluation result into a text node. */
const createTextNode = (result: unknown, position: Position | undefined): Text => {
  if (result === null || result === undefined) return { type: 'text', value: '', position };
  if (typeof result === 'object') return { type: 'text', value: JSON.stringify(result), position };
  return { type: 'text', value: String(result), position };
};

/**
 * AST transformer to evaluate MDX expressions.
 * Replaces mdxFlowExpression and mdxTextExpression nodes with their evaluated values.
 * Self-contained expressions resolve directly (e.g. `{1+1}`); expressions that reference
 * identifiers can resolve if those identifiers are a custom component, the `user` variables
 * object, or were introduced by an earlier `export const/function` (collected onto
 * `file.data.mdxishScope`). Anything else falls through to the error branch and is kept as
 * literal `{...}` text.
 */
const evaluateExpressions: Plugin<[Options?], Root> =
  ({ components, variables }: Options = {}) =>
  (tree, file: VFile) => {
    const baseScope: Record<string, unknown> = {
      // `User` matches the fallback the MDX path binds in `run.tsx`. Only when variables were
      // supplied: the proxy never throws, so an unconditional bind would resolve `user.*` on
      // surfaces that render without them instead of leaving literal text.
      ...(variables ? { user: User(variables) } : {}),
      // In-document exports win, matching `renderMdxish`.
      ...file.data.mdxishScope,
      React,
    };

    visit(tree, ['mdxFlowExpression', 'mdxTextExpression'], (node, index, parent) => {
      if (!parent || index === null || index === undefined) return;

      const expressionNode = node as MdxFlowExpression | MdxTextExpression;
      const { value, position } = expressionNode;
      const expression = value?.trim();
      if (!expression) return;

      try {
        const scope = { ...componentScope(expression, components ?? {}), ...baseScope };
        const result = evalExpression(expression, scope);
        if (isRenderable(result)) {
          // Stash hast built straight from the React tree; `mdxExpressionHandler` emits it and it 
          // passes through rehypeRaw/parse5 step later in the pipeline. This ensures that the 
          // expression result is not parsed by parse5 and fragmenting the nesting that is valid JSX 
          // but invalid HTML — e.g. an `<a>` wrapping `<a>`.
          expressionNode.data = { ...expressionNode.data, hChildren: reactElementToHast(result) };
        } else {
          parent.children.splice(index, 1, createTextNode(result, position));
        }
      } catch (_error) {
        // Evaluation failed — fall back to literal `{...}` text. The expression
        // parser treats contents as code, so backslash escapes aren't applied;
        // restore them here so e.g. `{\!}` round-trips to `{!}`.
        const processed = expression.replace(/\\([!-/:-@[-`{-~])/g, '$1');
        parent.children.splice(index, 1, { type: 'text', value: `{${processed}}`, position });
      }
    });

    return tree;
  };

export default evaluateExpressions;
