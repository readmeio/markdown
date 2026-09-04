import type { CustomComponents, Variables } from '../../../types';
import type { ElementContent } from 'hast';
import type { Paragraph, PhrasingContent, Root, Text } from 'mdast';
import type { MdxFlowExpression, MdxTextExpression } from 'mdast-util-mdx-expression';
import type { Plugin } from 'unified';
import type { Position } from 'unist';
import type { VFile } from 'vfile';

import React from 'react';
import { visit } from 'unist-util-visit';

import { INLINE_COMPONENT_TAGS, INLINE_HTML_TAGS } from '../../../lib/constants';
import { evalExpression, jsxComponentNames } from '../../../lib/utils/mdxish/mdxish-expression';
import { getComponentName, toPascalCase } from '../../../lib/utils/mdxish/mdxish-get-component-name';
import User from '../../../utils/user';

import { reactElementToHast } from './react-element-to-hast';

interface Options {
  components?: CustomComponents;
  variables?: Variables;
}

/**
 * Bind the components a given expression actually uses as tags. Scoped per expression on purpose:
 * binding the whole hash would shadow same-named globals (a `math` component would break
 * `{Math.max(1, 2)}`) and pad `evaluate`'s `new Function` parameter list. Resolution defers to
 * `getComponentName` so an expression and a plain tag always reach the same component.
 */
const componentScope = (expression: string, components: CustomComponents): Record<string, unknown> => {
  const scope: Record<string, unknown> = {};

  jsxComponentNames(expression).forEach(name => {
    // `getComponentName` normalizes the tag, never the key, so it can't match `<MyBlock/>` to a
    // `my_block` entry; compare the key's PascalCase form for that direction.
    const tagName = getComponentName(name, components) ?? Object.keys(components).find(k => toPascalCase(k) === name);
    if (!tagName) return;

    scope[name] = (props: Record<string, unknown>) => React.createElement(tagName, props);
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

/**
 * Whether an expression evaluated to block-level content. A capitalized tag is a component,
 * block-level unless it's on the inline list (so a `Table` component isn't mistaken for an inline
 * `<table>`); a lowercase tag is HTML, block-level unless it's phrasing content.
 */
const isBlockResult = (children: ElementContent[]): boolean =>
  children.some(child => {
    if (child.type !== 'element' && child.type !== 'mdx-jsx') return false;
    const { tagName } = child as { tagName: string };
    const inline = /^[A-Z]/.test(tagName) ? INLINE_COMPONENT_TAGS : INLINE_HTML_TAGS;
    return !inline.has(tagName);
  });

const JSX_ELEMENT_TYPES = new Set(['mdxJsxFlowElement', 'mdxJsxTextElement']);

const wrapInParagraph = (child: PhrasingContent): Paragraph => ({
  type: 'paragraph',
  children: [child],
  position: child.position,
});

const placeText = (text: Text, needsBlock: boolean): Paragraph | Text => (needsBlock ? wrapInParagraph(text) : text);

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

      const needsBlock = expressionNode.type === 'mdxFlowExpression' && !JSX_ELEMENT_TYPES.has(parent.type);

      try {
        const scope = { ...componentScope(expression, components ?? {}), ...baseScope };
        const result = evalExpression(expression, scope);
        if (isRenderable(result)) {
          // Stash hast built straight from the React tree; `mdxExpressionHandler` emits it and it 
          // passes through rehypeRaw/parse5 step later in the pipeline. This ensures that the 
          // expression result is not parsed by parse5 and fragmenting the nesting that is valid JSX 
          // but invalid HTML — e.g. an `<a>` wrapping `<a>`.
          const hChildren = reactElementToHast(result);
          expressionNode.data = { ...expressionNode.data, hChildren };
          // An inline result in a block slot renders inside a `<p>`, as its one-line form does.
          // Retyping it as a text expression makes it legal paragraph content.
          if (needsBlock && !isBlockResult(hChildren)) {
            const inline: MdxTextExpression = { ...expressionNode, type: 'mdxTextExpression' };
            parent.children.splice(index, 1, wrapInParagraph(inline));
          }
        } else {
          parent.children.splice(index, 1, placeText(createTextNode(result, position), needsBlock));
        }
      } catch (_error) {
        // Evaluation failed — fall back to literal `{...}` text. The expression
        // parser treats contents as code, so backslash escapes aren't applied;
        // restore them here so e.g. `{\!}` round-trips to `{!}`.
        const processed = expression.replace(/\\([!-/:-@[-`{-~])/g, '$1');
        const literal: Text = { type: 'text', value: `{${processed}}`, position };
        parent.children.splice(index, 1, placeText(literal, needsBlock));
      }
    });

    // A text expression is parsed inside a paragraph, but its result can be block content: a
    // `<Tabs>` renders a `<div>`, and a browser closes the `<p>` before it, so the DOM it builds
    // no longer matches what was rendered and hydration fails. Lift the expression out when
    // that's all the paragraph holds.
    visit(tree, 'paragraph', (node, index, parent) => {
      if (!parent || index === null || index === undefined) return;

      const meaningful = node.children.filter(child => !(child.type === 'text' && !child.value.trim()));
      const [only] = meaningful;
      if (meaningful.length !== 1 || only.type !== 'mdxTextExpression') return;

      const hChildren = only.data?.hChildren as ElementContent[] | undefined;
      if (!hChildren || !isBlockResult(hChildren)) return;

      parent.children.splice(index, 1, only);
    });

    return tree;
  };

export default evaluateExpressions;
