import type { Token } from 'parse5';

import { Tokenizer, TokenizerMode } from 'parse5';

import { HTML_VOID_ELEMENTS } from '../../../../utils/common-html-words';

/**
 * Skip certain regions / parts of the content that the tokenizer should not handle
 */
export const maskNonTagRegions = (html: string): string =>
  html
    .replace(/```[\s\S]*?```|~{3,}[\s\S]*?~{3,}|``(?:[^`]|`(?!`))*``|`[^`\n]*`/g, m => ' '.repeat(m.length))
    // `<<NAME>>` is legacy variable syntax — without masking,
    // the tokenizer sees the inner `<NAME>` as a tag. Blanking any `<<` also
    // covers malformed variants like `<<string>`.
    .replace(/<</g, '  ')
    // skip escaped tag openers
    .replace(/\\</g, '  ');

interface TagEvent {
  end: number;
  name: string;
  start: number;
}

/**
 * `isSelfClosing` — source ends with `/>`.
 * `isStrayCloser` — source starts with `</`. A stray `</br>` is read as `<br>`
 *   per the HTML5 spec; this flag lets consumers tell that apart from a real opener.
 */
interface OpenEvent extends TagEvent {
  isSelfClosing: boolean;
  isStrayCloser: boolean;
}

// Implicit means the tag was opened but not closed
interface CloseEvent extends TagEvent {
  implicit: boolean;
}

interface TagWalkHandlers {
  onClose?: (event: CloseEvent) => void;
  onOpen?: (event: OpenEvent) => void;
}

// Bodies of these are raw text, so tag-like content inside them is ignored.
const RAW_TEXT_TAGS = new Set(['script', 'style', 'textarea', 'title']);

const noop = () => {};

/**
 * Drive parse5's tokenizer over `html` (after masking non-tag regions) and emit
 * tag-balance events. `start`/`end` use the original-string offsets, so
 * callers can splice against the input directly.
 */
export const walkTags = (html: string, { onOpen = noop, onClose = noop }: TagWalkHandlers) => {
  const stack: string[] = [];
  // parse5 lowercases tag names, so slice the original casing from the source.
  const readTag = ({ location, tagName }: Token.TagToken, nameOffset: number) => {
    const { startOffset: start, endOffset: end } = location!;
    return { start, end, name: html.slice(start + nameOffset, start + nameOffset + tagName.length) };
  };

  const tokenizer = new Tokenizer(
    { sourceCodeLocationInfo: true },
    {
      onStartTag(token) {
        const { name, start, end } = readTag(token, 1);
        onOpen({ name, start, end, isSelfClosing: html[end - 2] === '/', isStrayCloser: false });
        if (token.selfClosing || HTML_VOID_ELEMENTS.has(name)) {
          onClose({ name, start, end, implicit: true });
          return;
        }
        stack.push(name);
        if (RAW_TEXT_TAGS.has(token.tagName)) tokenizer.state = TokenizerMode.RAWTEXT;
      },
      onEndTag(token) {
        const { name, start, end } = readTag(token, 2);
        const index = stack.lastIndexOf(name);
        if (index === -1 && name === 'br') {
          onOpen({ name, start, end, isSelfClosing: false, isStrayCloser: true });
          onClose({ name, start, end, implicit: false });
        }
        // Closing a tag implicitly closes everything still open inside it.
        while (index !== -1 && stack.length > index) {
          onClose({ name: stack.pop()!, start, end, implicit: stack.length > index });
        }
      },
      onEof() {
        while (stack.length > 0) onClose({ name: stack.pop()!, start: html.length, end: html.length, implicit: true });
      },
      onCharacter: noop,
      onComment: noop,
      onDoctype: noop,
      onNullCharacter: noop,
      onWhitespaceCharacter: noop,
    },
  );
  tokenizer.write(maskNonTagRegions(html), true);
};
