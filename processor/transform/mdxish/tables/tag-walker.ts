import { Tokenizer, TokenizerMode, type Token } from 'parse5';

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
 * `isStrayCloser` — source starts with `</`. A stray `</br>` / `</p>` is read as an
 *   element per the HTML5 spec; this flag lets consumers tell that apart from a real opener.
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
  onClose: (event: CloseEvent) => void;
  onOpen: (event: OpenEvent) => void;
}

// htmlparser2's HTML5 implied end tags: [openers, innermost open tags they close].
const IMPLIED_CLOSES: [RegExp, RegExp][] = [
  [
    /^(?:address|article|aside|blockquote|details|div|dl|fieldset|figcaption|figure|footer|form|header|hr|main|nav|ol|p|pre|section|table|ul)$/,
    /^p$/,
  ],
  [/^h[1-6]$/, /^(?:h[1-6]|p)$/],
  [/^tr$/, /^(?:tr|th|td)$/],
  [/^th$/, /^th$/],
  [/^td$/, /^(?:thead|th|td)$/],
  [/^(?:tbody|tfoot)$/, /^(?:thead|tbody)$/],
  [/^(?:dd|dt)$/, /^(?:dd|dt)$/],
  [/^optgroup$/, /^(?:optgroup|option)$/],
  [/^option$/, /^option$/],
  [/^li$/, /^li$/],
  [/^a$/, /^a$/],
];
const RAW_TEXT_TAGS = new Set(['iframe', 'noembed', 'noframes', 'script', 'style', 'textarea', 'title', 'xmp']);

const noop = () => {};

/**
 * Drive parse5's tokenizer over `html` (after masking non-tag regions) and emit
 * tag-balance events. `start`/`end` use the original-string offsets, so
 * callers can splice against the input directly.
 */
export const walkTags = (html: string, { onOpen, onClose }: TagWalkHandlers) => {
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
        const closes = IMPLIED_CLOSES.find(([openers]) => openers.test(name))?.[1];
        while (stack.length > 0 && closes?.test(stack[stack.length - 1])) {
          onClose({ name: stack.pop()!, start, end, implicit: true });
        }
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
        if (index === -1 && (name === 'br' || name === 'p')) {
          onOpen({ name, start, end, isSelfClosing: false, isStrayCloser: true });
          onClose({ name, start, end, implicit: false });
        }
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
