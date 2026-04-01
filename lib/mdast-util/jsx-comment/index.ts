import type { CompileContext, Extension as FromMarkdownExtension, Handle } from 'mdast-util-from-markdown';
import type { MdxFlowExpression } from 'mdast-util-mdx-expression';

function enterJsxComment(this: CompileContext, token: Parameters<Handle>[0]): void {
  this.enter(
    {
      type: 'mdxFlowExpression',
      value: '',
      data: { estree: null },
    } as MdxFlowExpression,
    token,
  );
}

function exitJsxCommentValue(this: CompileContext, token: Parameters<Handle>[0]): void {
  const node = this.stack[this.stack.length - 1] as MdxFlowExpression;
  // The tokenizer consumes `*/` as part of the value before confirming `}` closes the comment,
  // so the serialized value ends with `*/` — strip it to avoid duplication when wrapping.
  const raw = this.sliceSerialize(token).replace(/\*\/$/, '');
  node.value += raw;
}

function exitJsxCommentLineEnding(this: CompileContext, token: Parameters<Handle>[0]): void {
  const node = this.stack[this.stack.length - 1] as MdxFlowExpression;
  node.value += this.sliceSerialize(token);
}

function exitJsxComment(this: CompileContext, token: Parameters<Handle>[0]): void {
  const node = this.stack[this.stack.length - 1] as MdxFlowExpression;
  node.value = `/*${node.value}*/`;
  this.exit(token);
}

export function jsxCommentFromMarkdown(): FromMarkdownExtension {
  return {
    enter: {
      jsxComment: enterJsxComment,
    },
    exit: {
      jsxCommentValue: exitJsxCommentValue,
      jsxCommentLineEnding: exitJsxCommentLineEnding,
      jsxComment: exitJsxComment,
    },
  };
}
