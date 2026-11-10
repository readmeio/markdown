/* eslint-disable @typescript-eslint/no-use-before-define */
import type { Code, Construct, Effects, State } from 'micromark-util-types';

import { asciiAlpha, asciiAlphanumeric, markdownLineEnding, markdownSpace } from 'micromark-util-character';
import { codes } from 'micromark-util-symbol';

import { STANDARD_HTML_TAGS } from '../../../utils/common-html-words';

const isAttributeNameStart = (code: Code) => asciiAlpha(code) || code === codes.underscore || code === codes.colon;

const isAttributeName = (code: Code) =>
  asciiAlphanumeric(code) ||
  code === codes.underscore ||
  code === codes.colon ||
  code === codes.dot ||
  code === codes.dash;

// Characters CommonMark forbids in an unquoted attribute value, plus EOF and line endings.
const isInvalidInUnquotedValue = (code: Code) =>
  code === null ||
  markdownLineEnding(code) ||
  code === codes.quotationMark ||
  code === codes.apostrophe ||
  code === codes.equalsTo ||
  code === codes.lessThan ||
  code === codes.graveAccent;

/**
 * Claims a single-line native HTML opening tag carrying an unquoted attribute
 * value (`<a href=https://example.com>`), emitted as an opaque `mdxComponent`.
 * micromark's html-text ends unquoted values at `/`, so without this the tag
 * fails, stays text, and GFM autolinks the URL. Follows CommonMark's open-tag
 * grammar otherwise; the element body is left to the inline parser.
 */
function tokenizeHtmlOpenTag(effects: Effects, ok: State, nok: State) {
  let tagName = '';
  let quote: Code = null;
  let sawUnquotedValue = false;

  return start;

  function start(code: Code): State | undefined {
    effects.enter('mdxComponent');
    effects.enter('mdxComponentData');
    effects.consume(code);
    return tagNameStart;
  }

  function tagNameStart(code: Code): State | undefined {
    return asciiAlpha(code) ? tagNameRest(code) : nok(code);
  }

  function tagNameRest(code: Code): State | undefined {
    if (asciiAlphanumeric(code) || code === codes.dash) {
      tagName += String.fromCharCode(code);
      effects.consume(code);
      return tagNameRest;
    }
    if (!STANDARD_HTML_TAGS.has(tagName)) return nok(code);
    return code === codes.slash || code === codes.greaterThan || markdownSpace(code) ? between(code) : nok(code);
  }

  function between(code: Code): State | undefined {
    if (code === codes.slash) {
      effects.consume(code);
      return selfClose;
    }
    if (code === codes.greaterThan) return end(code);
    if (markdownSpace(code)) {
      effects.consume(code);
      return between;
    }
    if (isAttributeNameStart(code)) {
      effects.consume(code);
      return attributeName;
    }
    return nok(code);
  }

  function attributeName(code: Code): State | undefined {
    if (isAttributeName(code)) {
      effects.consume(code);
      return attributeName;
    }
    return attributeNameAfter(code);
  }

  function attributeNameAfter(code: Code): State | undefined {
    if (markdownSpace(code)) {
      effects.consume(code);
      return attributeNameAfter;
    }
    if (code === codes.equalsTo) {
      effects.consume(code);
      return valueBefore;
    }
    return between(code);
  }

  function valueBefore(code: Code): State | undefined {
    if (markdownSpace(code)) {
      effects.consume(code);
      return valueBefore;
    }
    if (code === codes.quotationMark || code === codes.apostrophe) {
      quote = code;
      effects.consume(code);
      return valueQuoted;
    }
    if (isInvalidInUnquotedValue(code) || code === codes.greaterThan) return nok(code);
    sawUnquotedValue = true;
    return valueUnquoted(code);
  }

  function valueQuoted(code: Code): State | undefined {
    if (code === null || markdownLineEnding(code)) return nok(code);
    effects.consume(code);
    return code === quote ? valueQuotedAfter : valueQuoted;
  }

  function valueQuotedAfter(code: Code): State | undefined {
    return code === codes.slash || code === codes.greaterThan || markdownSpace(code) ? between(code) : nok(code);
  }

  // Unlike micromark, `/` stays part of the value, as in the HTML spec.
  function valueUnquoted(code: Code): State | undefined {
    if (code === codes.greaterThan || markdownSpace(code)) return between(code);
    if (isInvalidInUnquotedValue(code)) return nok(code);
    effects.consume(code);
    return valueUnquoted;
  }

  function selfClose(code: Code): State | undefined {
    return code === codes.greaterThan ? end(code) : nok(code);
  }

  // Tags without an unquoted value already parse as html-text.
  function end(code: Code): State | undefined {
    if (!sawUnquotedValue) return nok(code);
    effects.consume(code);
    effects.exit('mdxComponentData');
    effects.exit('mdxComponent');
    return ok;
  }
}

export const htmlOpenTagConstruct: Construct = {
  name: 'htmlOpenTag',
  tokenize: tokenizeHtmlOpenTag,
};
