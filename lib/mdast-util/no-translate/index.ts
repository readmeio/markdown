import type { Html } from 'mdast';
import type { CompileContext, Extension as FromMarkdownExtension, Handle } from 'mdast-util-from-markdown';

function enterNoTranslate(this: CompileContext, token: Parameters<Handle>[0]): void {
  // The whole tag sits in this one node, so the transforms promote it without a `{}` gate.
  this.enter({ type: 'html', value: '', data: { tokenized: true } } as Html, token);
}

function exitNoTranslate(this: CompileContext, token: Parameters<Handle>[0]): void {
  const node = this.stack[this.stack.length - 1] as Html;
  node.value = this.sliceSerialize(token);
  this.exit(token);
}

// The whole `<NoTranslate>…</NoTranslate>` becomes one opaque `html` node, like `mdxComponent` does.
// The component transforms then promote it to a JSX element.
export function noTranslateFromMarkdown(): FromMarkdownExtension {
  return {
    enter: { noTranslate: enterNoTranslate },
    exit: { noTranslate: exitNoTranslate },
  };
}
