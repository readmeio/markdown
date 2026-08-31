import type { CustomComponents, Variables } from '../../../types';
import type { Root, Text } from 'mdast';
import type { MdxFlowExpression, MdxTextExpression } from 'mdast-util-mdx-expression';
import type { Plugin } from 'unified';
import type { Position } from 'unist';
import type { VFile } from 'vfile';

import React from 'react';
import { visit } from 'unist-util-visit';

import { evalExpression } from '../../../lib/utils/mdxish/mdxish-expression';
import { toPascalCase } from '../../../lib/utils/mdxish/mdxish-get-component-name';
import User from '../../../utils/user';

import { reactElementToHast } from './react-element-to-hast';

interface Options {
  components?: CustomComponents;
  variables?: Variables;
}

/**
 * JSX only compiles a *capitalized* tag to a variable reference (`<Callout/>` becomes
 * `React.createElement(Callout)`), so those are the only component names an expression can fail
 * to resolve; a lowercase tag becomes a string type and is matched against the components hash
 * later by `rehypeMdxishComponents`. Binding only capitalized names also keeps reserved words
 * (`default`, `class`) out of the scope, which matters because `evaluate` passes every scope key
 * as a `new Function` parameter — one invalid identifier is a syntax error for the whole page.
 */
const COMPONENT_IDENTIFIER = /^[A-Z][A-Za-z0-9_$]*$/;

/**
 * Bind the components hash to the identifiers an author writes in JSX. Without this a
 * component inside `{...}` is an unresolved reference, the evaluation throws, and the
 * expression falls back to literal text. snake_case keys are bound under their PascalCase
 * form too, mirroring how `getComponentName` resolves tag names.
 */
const componentScope = (components: CustomComponents = {}): Record<string, unknown> => {
  const exact: Record<string, unknown> = {};
  const aliases: Record<string, unknown> = {};

  Object.entries(components).forEach(([name, mod]) => {
    const Component = mod?.default;
    if (typeof Component !== 'function') return;

    if (COMPONENT_IDENTIFIER.test(name)) exact[name] = Component;

    const pascalCase = toPascalCase(name);
    if (pascalCase !== name && COMPONENT_IDENTIFIER.test(pascalCase)) aliases[pascalCase] = Component;
  });

  // An exact key outranks a name another key normalizes onto, matching `getComponentName`'s
  // match priority. Without this a caller-supplied `code_tabs` would claim `CodeTabs` and
  // `{<CodeTabs/>}` would render a different component than a plain `<CodeTabs/>`.
  return { ...aliases, ...exact };
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
    const scope: Record<string, unknown> = {
      ...componentScope(components),
      // `User` applies the same defaults-then-uppercase fallback the MDX path binds in
      // `run.tsx`, so a missing property resolves identically on both engines. Only bound when
      // the caller supplied variables at all: the proxy never throws, so binding it
      // unconditionally would resolve `user.*` on surfaces that render without variables
      // instead of leaving the expression as literal text.
      ...(variables ? { user: User(variables) } : {}),
      // In-document exports win over both, matching the precedence `renderMdxish` applies.
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
