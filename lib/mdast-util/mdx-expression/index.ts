import type { Parent, Text } from 'mdast';
import type { CompileContext, Extension as FromMarkdownExtension, Token } from 'mdast-util-from-markdown';

import { mdxExpressionFromMarkdown } from 'mdast-util-mdx-expression';

const upstream = mdxExpressionFromMarkdown();

/**
 * An image's alt is its label flattened to text, which drops an expression's braces. Keep the
 * `{...}` source there so `{user.*}` still resolves in alt at render time (RM-10865).
 */
function exitTextExpression(this: CompileContext, token: Token): void {
  upstream.exit.mdxTextExpression.call(this, token);
  if (!this.stack.some(node => node.type === 'image')) return;

  const { children } = this.stack[this.stack.length - 1] as Parent;
  const { position } = children[children.length - 1];
  children[children.length - 1] = { type: 'text', value: this.sliceSerialize(token), position } satisfies Text;
}

export function mdxishExpressionFromMarkdown(): FromMarkdownExtension {
  return { ...upstream, exit: { ...upstream.exit, mdxTextExpression: exitTextExpression } };
}
