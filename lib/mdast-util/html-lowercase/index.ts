import type { Html } from 'mdast';
import type { CompileContext, Extension as FromMarkdownExtension, Handle } from 'mdast-util-from-markdown';

function enterHtmlLowercase(this: CompileContext, token: Parameters<Handle>[0]): void {
  this.enter({ type: 'html', value: '' } as Html, token);
}

function exitHtmlLowercase(this: CompileContext, token: Parameters<Handle>[0]): void {
  const node = this.stack[this.stack.length - 1] as Html;
  node.value = this.sliceSerialize(token);
  this.exit(token);
}

/**
 * mdast-util bridge for the `htmlLowercase` micromark construct.
 * Emits an opaque `html` mdast node containing the full tag source.
 * rehype-raw (parse5) later parses this into the correct hast element.
 */
export function htmlLowercaseFromMarkdown(): FromMarkdownExtension {
  return {
    enter: {
      htmlLowercase: enterHtmlLowercase,
    },
    exit: {
      htmlLowercase: exitHtmlLowercase,
    },
  };
}
