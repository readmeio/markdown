import type { Html } from 'mdast';
import type { CompileContext, Extension as FromMarkdownExtension, Handle } from 'mdast-util-from-markdown';

function enterMdxComponent(this: CompileContext, token: Parameters<Handle>[0]): void {
  this.enter({ type: 'html', value: '' } as Html, token);
}

function exitMdxComponent(this: CompileContext, token: Parameters<Handle>[0]): void {
  const node = this.stack[this.stack.length - 1] as Html;
  node.value = this.sliceSerialize(token);
  this.exit(token);
}

export function mdxComponentFromMarkdown(): FromMarkdownExtension {
  return {
    enter: {
      mdxComponent: enterMdxComponent,
    },
    exit: {
      mdxComponent: exitMdxComponent,
    },
  };
}
