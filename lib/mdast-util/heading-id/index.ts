import type { Literal } from 'mdast';
import type { CompileContext, Extension as FromMarkdownExtension, Token } from 'mdast-util-from-markdown';

/** A line-final `{#id}`, kept whole until `headingIdsTransformer` makes it a heading's id or turns it back into text. */
export interface HeadingIdSuffix extends Literal {
  type: 'mdxishHeadingId';
}

declare module 'mdast' {
  interface PhrasingContentMap {
    mdxishHeadingId: HeadingIdSuffix;
  }

  interface RootContentMap {
    mdxishHeadingId: HeadingIdSuffix;
  }
}

/** Writes a suffix back as it was authored, for serializers that run before `headingIdsTransformer`. */
export const headingIdToMarkdown = (node: HeadingIdSuffix): string => node.value;

function enterHeadingId(this: CompileContext, token: Token): void {
  this.enter({ type: 'mdxishHeadingId', value: '' }, token);
}

function exitHeadingId(this: CompileContext, token: Token): void {
  const node = this.stack[this.stack.length - 1] as HeadingIdSuffix;
  node.value = this.sliceSerialize(token);
  this.exit(token);
}

export function headingIdFromMarkdown(): FromMarkdownExtension {
  return { enter: { headingId: enterHeadingId }, exit: { headingId: exitHeadingId } };
}
