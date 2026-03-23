import { protectCodeBlocks, restoreCodeBlocks } from '../../../lib/utils/mdxish/protect-code-blocks';

import { parseAttributes } from './mdxish-component-blocks';

// Matches single-line PascalCase tags at line start (up to 3 spaces indent per CommonMark).
// Only block-level HTML is affected, inline HTML already allows unquoted attribute values.
const SINGLE_LINE_PASCAL_TAG_RE = /^([ ]{0,3})<([A-Z][A-Za-z0-9_]*)([^\n]*?)(\/?)\s*>/gm;

/**
 * Wraps unquoted attribute values in PascalCase component tags with double quotes.
 *
 * Micromark's HTML block tokenizer rejects tags whose unquoted attribute values
 * contain characters like `:` or `/` (e.g. `src=https://example.com`), and GFM
 * autolinks then fragment the URLs into link nodes. By quoting these values before
 * parsing, the tags are recognized as valid HTML blocks and flow through to the
 * component-block transformer unchanged.
 */
export function normalizeComponentAttributes(content: string): string {
  const { protectedContent, protectedCode } = protectCodeBlocks(content);

  const normalized = protectedContent.replace(
    SINGLE_LINE_PASCAL_TAG_RE,
    (_match, indent: string, tagName: string, attrsPart: string, closing: string) => {
      const attrs = parseAttributes(attrsPart);
      if (!attrs.length) return `${indent}<${tagName}${attrsPart}${closing}>`;

      const rebuilt = attrs
        .map(attr => {
          if (attr.value === null) return ` ${attr.name}`;
          return ` ${attr.name}="${attr.value}"`;
        })
        .join('');

      return `${indent}<${tagName}${rebuilt}${closing ? ` ${closing}` : ''}>`;
    },
  );

  return restoreCodeBlocks(normalized, protectedCode);
}
