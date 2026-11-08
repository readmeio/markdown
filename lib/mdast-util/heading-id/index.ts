import type { Heading } from 'mdast';
import type { CompileContext, Extension as FromMarkdownExtension, Token } from 'mdast-util-from-markdown';

function exitHeadingId(this: CompileContext, token: Token): void {
  const heading = this.stack[this.stack.length - 1] as Heading;
  const id = this.sliceSerialize(token).slice('{#'.length, -'}'.length);
  heading.data = { ...heading.data, hProperties: { ...heading.data?.hProperties, id } };
}

/** Sets a heading's id from its `headingId` token. */
export function headingIdFromMarkdown(): FromMarkdownExtension {
  return { exit: { headingId: exitHeadingId } };
}
