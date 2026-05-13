import { Parser } from 'htmlparser2';

/**
 * Skip certain regions / parts of the content that htmlparser2 should not handle
 */
const maskNonTagRegions = (html: string): string =>
  html
    .replace(/```[\s\S]*?```|``(?:[^`]|`(?!`))*``|`[^`\n]*`/g, m => ' '.repeat(m.length))
    // `<<NAME>>` is legacy variable syntax — without masking,
    // htmlparser2 sees the inner `<NAME>` as a tag. Blanking any `<<` also
    // covers malformed variants like `<<string>`.
    .replace(/<</g, '  ')
    // skip escaped tag openers
    .replace(/\\</g, '  ');

interface TagEvent {
  end: number;
  name: string;
  start: number;
}

interface CloseEvent extends TagEvent {
  implicit: boolean;
}

interface TagWalkHandlers {
  onClose?: (event: CloseEvent) => void;
  onOpen?: (event: TagEvent) => void;
}

/**
 * Drive htmlparser2 over `html` (after masking non-tag regions) and emit
 * tag-balance events. `start`/`end` use the original-string offsets, so
 * callers can splice against the input directly.
 */
export const walkTags = (html: string, handlers: TagWalkHandlers): void => {
  const masked = maskNonTagRegions(html);
  // htmlparser2's endIndex points at the `>` (inclusive); +1 lands just past
  // it, which is what callers want for splicing.
  const tagEnd = (parser: Parser) => (parser.endIndex ?? parser.startIndex) + 1;

  const parser: Parser = new Parser(
    {
      onopentag(name) {
        handlers.onOpen?.({ name, start: parser.startIndex, end: tagEnd(parser) });
      },
      onclosetag(name, implicit) {
        handlers.onClose?.({ name, start: parser.startIndex, end: tagEnd(parser), implicit });
      },
    },
    {
      lowerCaseAttributeNames: false,
      lowerCaseTags: false,
      recognizeSelfClosing: true,
    },
  );
  parser.write(masked);
  parser.end();
};
