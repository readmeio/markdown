import type { Html } from 'mdast';
import type { CompileContext, Extension as FromMarkdownExtension, Handle } from 'mdast-util-from-markdown';

/**
 * Builds a from-markdown extension that turns a tokenizer token into an opaque
 * `html` mdast node holding the full serialized source text.
 *
 * The point is to capture the entire component/block source verbatim rather than
 * split it into multiple nodes, which is tricky given the range of formatting
 * variations (multiline components, inline components, indents, whitespace
 * between tags, etc.). A tokenizer is a robust way to capture these variations.
 *
 * Later, a transformer parses the emitted `html` node, extracts the tag name,
 * attributes, and children, and (for MDX components) converts it into an
 * `mdxJsxFlowElement`. Plain HTML blocks are left literal for rehype-raw.
 *
 * Shared by the `mdxComponent` and `plainHtmlBlock` constructs.
 */
export function createOpaqueHtmlFromMarkdown(tokenName: string): FromMarkdownExtension {
  function enter(this: CompileContext, token: Parameters<Handle>[0]): void {
    this.enter({ type: 'html', value: '' } as Html, token);
  }

  function exit(this: CompileContext, token: Parameters<Handle>[0]): void {
    const node = this.stack[this.stack.length - 1] as Html;
    node.value = this.sliceSerialize(token);
    this.exit(token);
  }

  return {
    enter: { [tokenName]: enter },
    exit: { [tokenName]: exit },
  };
}

/**
 * mdast-util bridge for the `mdxComponent` micromark construct.
 */
export function mdxComponentFromMarkdown(): FromMarkdownExtension {
  return createOpaqueHtmlFromMarkdown('mdxComponent');
}
