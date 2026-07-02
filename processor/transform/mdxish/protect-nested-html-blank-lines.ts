import { htmlBlockNames } from 'micromark-util-html-tag-name';

import { protectCodeBlocks, restoreCodeBlocks } from '../../../lib/utils/mdxish/protect-code-blocks';

// Table structural tags are excluded: `mdxishTables` already gives blank lines inside
// `<td>`/`<th>` cells deliberate meaning (e.g. splitting into paragraphs, or deciding
// whether a table stays a plain HTML table vs a JSX `<Table>`), so this transform must
// not neutralize them.
const TABLE_STRUCTURE_TAGS = new Set(['table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'caption', 'colgroup']);
const BLOCK_TAG_NAMES = new Set([...htmlBlockNames].filter(tag => !TABLE_STRUCTURE_TAGS.has(tag)));

// A line that is nothing but one complete, non-self-closing opening tag, e.g. `<div>` or
// `  <div className="foo">`. Up to 3 leading spaces mirrors CommonMark's HTML block start rule.
const STANDALONE_OPEN_TAG_RE = / {0,3}<([a-z][\w-]*)(?:\s[^<>]*)?>$/i;
// A line that is nothing but one closing tag, e.g. `</div>`.
const STANDALONE_CLOSE_TAG_RE = /^\s*<\/([a-z][\w-]*)>\s*$/i;

// `<HTMLBlock>{`...`}</HTMLBlock>` bodies are a literal HTML payload the author wants preserved
// byte-for-byte (see `processor/transform/mdxish/mdxish-html-blocks.ts`) — including any blank
// lines inside them, which routinely appear on purpose. They must not be touched here.
const HTML_BLOCK_TAG_RE = /<HTMLBlock\b[^>]*>[\s\S]*?<\/HTMLBlock>/g;

/** Swap `<HTMLBlock>...</HTMLBlock>` spans for placeholders so their contents are left untouched. */
function protectHtmlBlockTags(content: string): { placeholders: string[]; protectedContent: string } {
  const placeholders: string[] = [];
  const protectedContent = content.replace(HTML_BLOCK_TAG_RE, match => {
    const index = placeholders.length;
    placeholders.push(match);
    return `___MDXISH_HTMLBLOCK_${index}___`;
  });
  return { placeholders, protectedContent };
}

function restoreHtmlBlockTags(content: string, placeholders: string[]): string {
  return content.replace(/___MDXISH_HTMLBLOCK_(\d+)___/g, (_m, idx: string) => placeholders[parseInt(idx, 10)]);
}

/** True when a trimmed line looks like it ends a tag (`...>`), so a following blank line is plausibly a gap between JSX siblings. */
const endsLikeTag = (trimmed: string): boolean => trimmed.endsWith('>');
/** True when a trimmed line looks like it starts a tag (`<...`), so a preceding blank line is plausibly a gap between JSX siblings. */
const startsLikeTag = (trimmed: string): boolean => trimmed.startsWith('<');

/** Rough net `{`/`}` count for a line — good enough to tell "inside a brace expression" from "between tags". */
const netBraceDelta = (line: string): number =>
  (line.match(/\{/g)?.length ?? 0) - (line.match(/\}/g)?.length ?? 0);

/**
 * Neutralizes blank lines nested inside a lowercase, plain-attribute block-level HTML tag
 * (e.g. `<div>`) by replacing them with an inert HTML comment placeholder.
 *
 * CommonMark HTML blocks (type 6 — `div`, `section`, etc.) terminate on the first blank line,
 * with no notion of tag nesting. JSX authored against React (the common source of ReadMe's
 * "custom HTML" doc content) routinely puts blank lines between sibling children for
 * readability. Without this, mdxish's `mdxComponent` tokenizer *does* track nesting depth and
 * survives internal blank lines — but only once it claims the block, which for a lowercase tag
 * requires a `{…}` attribute expression on the opening tag itself (see
 * `processor/transform/mdxish/components/mdx-blocks.ts`). A plain `<div className="...">` with
 * no expression attribute never reaches that tokenizer; it falls through to CommonMark's raw
 * html-flow construct, which fragments the block at the first blank line — corrupting the
 * markup and, per CX-3646, leaking indented continuation lines as literal code blocks.
 *
 * Restricted to standalone open/close tag lines (each tag alone on its own line, the prevalent
 * style for JSX copied from React source) so nesting depth can be tracked with simple line
 * matching rather than a full parser. A blank line between two tag-like lines is replaced with
 * a placeholder; a blank line inside an unclosed `{...}` JS expression (e.g. between statements
 * in a `.map()` callback body) is deleted outright instead — inserting text there would corrupt
 * the JS source once the expression is evaluated, but removing a blank separator between two
 * complete statements is always syntactically safe.
 */
export function protectNestedHtmlBlankLines(content: string): string {
  const { placeholders: htmlBlockPlaceholders, protectedContent: contentWithoutHtmlBlocks } = protectHtmlBlockTags(content);
  const { protectedContent, protectedCode } = protectCodeBlocks(contentWithoutHtmlBlocks);

  const lines = protectedContent.split('\n');
  let activeTag: string | null = null;
  let depth = 0;
  let braceDepth = 0;
  let lastNonBlankTrimmed = '';

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!activeTag) {
      const openMatch = line.match(STANDALONE_OPEN_TAG_RE);
      if (openMatch && BLOCK_TAG_NAMES.has(openMatch[1].toLowerCase())) {
        activeTag = openMatch[1];
        depth = 1;
        braceDepth = 0;
      }
      if (trimmed) lastNonBlankTrimmed = trimmed;
      continue; // eslint-disable-line no-continue
    }

    if (trimmed.length === 0) {
      if (braceDepth > 0) {
        // Blank line between JS statements inside an open expression — drop it so CommonMark
        // never sees a blank line, without inserting anything that could break the JS syntax.
        lines.splice(i, 1);
        i -= 1;
        continue; // eslint-disable-line no-continue
      }

      const nextNonBlank = lines.slice(i + 1).find(l => l.trim().length > 0);
      if (endsLikeTag(lastNonBlankTrimmed) && nextNonBlank && startsLikeTag(nextNonBlank.trim())) {
        // Blank line between two JSX sibling tags — replace with an inert placeholder so
        // CommonMark's html-flow construct doesn't treat it as the block terminator. Match the
        // following line's indentation so a later dedent pass (`safeDeindent` in
        // `components/mdx-blocks.ts`) doesn't get skewed to 0 by an unindented placeholder.
        const indent = nextNonBlank.match(/^[ \t]*/)?.[0] ?? '';
        lines[i] = `${indent}<!---->`;
      }
      continue; // eslint-disable-line no-continue
    }

    lastNonBlankTrimmed = trimmed;
    braceDepth = Math.max(0, braceDepth + netBraceDelta(line));

    const openMatch = line.match(STANDALONE_OPEN_TAG_RE);
    if (openMatch && openMatch[1] === activeTag) {
      depth += 1;
      continue; // eslint-disable-line no-continue
    }

    const closeMatch = line.match(STANDALONE_CLOSE_TAG_RE);
    if (closeMatch && closeMatch[1] === activeTag) {
      depth -= 1;
      if (depth === 0) activeTag = null;
    }
  }

  return restoreHtmlBlockTags(restoreCodeBlocks(lines.join('\n'), protectedCode), htmlBlockPlaceholders);
}
