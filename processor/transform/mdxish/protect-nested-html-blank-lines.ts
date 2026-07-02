import { htmlBlockNames } from 'micromark-util-html-tag-name';

import { protectCodeBlocks, restoreCodeBlocks } from '../../../lib/utils/mdxish/protect-code-blocks';

// Table structural tags are excluded: `mdxishTables` already gives blank lines inside
// `<td>`/`<th>` cells deliberate meaning (e.g. splitting into paragraphs, or deciding
// whether a table stays a plain HTML table vs a JSX `<Table>`), so this transform must
// not neutralize them.
const TABLE_STRUCTURE_TAGS = new Set(['table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'caption', 'colgroup']);
const BLOCK_TAG_NAMES = new Set([...htmlBlockNames].filter(tag => !TABLE_STRUCTURE_TAGS.has(tag)));

// A line that *starts* with a complete, non-self-closing opening tag, e.g. `<div>` or
// `  <div className="foo">` — trailing content on the same line (e.g. `<div><span>a</span>`,
// common in Prettier-compacted JSX) is allowed and doesn't prevent a match. Up to 3 leading
// spaces mirrors CommonMark's HTML block start rule.
const OPEN_TAG_LEADING_RE = /^ {0,3}<([a-z][\w-]*)(?:\s[^<>]*)?(?<!\/)>/i;

/**
 * Net open/close depth change for `tag` across an entire line — counts every non-self-closing
 * `<tag ...>` as +1 and every `</tag>` as -1, so nesting depth stays correct even when a tag
 * shares a line with other content instead of sitting alone on its own line.
 */
function tagDepthDelta(line: string, tag: string): number {
  const opens = line.match(new RegExp(`<${tag}(?:\\s[^<>]*)?(?<!/)>`, 'g'))?.length ?? 0;
  const closes = line.match(new RegExp(`</${tag}>`, 'g'))?.length ?? 0;
  return opens - closes;
}

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

/**
 * Net `{`/`}` depth change for a line, tracking (and skipping) quoted strings and template
 * literals so a literal brace inside string content (a URL, JSON example, icon name, etc.)
 * doesn't desync the open-expression tracking. `quoteChar` carries an in-progress quote across
 * the line boundary, since template literals routinely span multiple lines.
 */
function braceDeltaAndQuote(line: string, quoteChar: string | null): { delta: number; quoteChar: string | null } {
  let delta = 0;
  let quote = quoteChar;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (quote) {
      if (char === '\\') {
        i += 1; // Skip the escaped character so e.g. `\"` doesn't end the string early.
      } else if (char === quote) {
        quote = null;
      }
      continue; // eslint-disable-line no-continue
    }

    if (char === '"' || char === "'" || char === '`') {
      quote = char;
    } else if (char === '{') {
      delta += 1;
    } else if (char === '}') {
      delta -= 1;
    }
  }

  return { delta, quoteChar: quote };
}

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
 * Tracks nesting depth via simple line matching rather than a full parser: each line is
 * scanned for how many times the wrapper tag opens/closes on it (`tagDepthDelta`), which
 * handles both the prevalent "one tag per line" JSX style and tags sharing a line with other
 * content (e.g. `<div><span>a</span>`, common in Prettier-compacted JSX). A blank line between
 * two tag-like lines is replaced with a placeholder; a blank line inside an unclosed `{...}` JS
 * expression (e.g. between statements in a `.map()` callback body) is deleted outright instead
 * — inserting text there would corrupt the JS source once the expression is evaluated, but
 * removing a blank separator between two complete statements is always syntactically safe.
 */
export function protectNestedHtmlBlankLines(content: string): string {
  const { placeholders: htmlBlockPlaceholders, protectedContent: contentWithoutHtmlBlocks } = protectHtmlBlockTags(content);
  const { protectedContent, protectedCode } = protectCodeBlocks(contentWithoutHtmlBlocks);

  const lines = protectedContent.split('\n');
  let activeTag: string | null = null;
  let depth = 0;
  let braceDepth = 0;
  let quoteChar: string | null = null;
  let lastNonBlankTrimmed = '';

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!activeTag) {
      const openMatch = line.match(OPEN_TAG_LEADING_RE);
      if (openMatch && BLOCK_TAG_NAMES.has(openMatch[1].toLowerCase())) {
        activeTag = openMatch[1];
        depth = 1;
        braceDepth = 0;
        quoteChar = null;
        // Account for any further opens/closes of this tag later on the same line (e.g. a
        // compacted `<div><div>` or a fully self-contained `<div>...</div>` one-liner).
        depth += tagDepthDelta(line.slice(openMatch[0].length), activeTag);
        if (depth <= 0) activeTag = null;
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

    const brace = braceDeltaAndQuote(line, quoteChar);
    quoteChar = brace.quoteChar;
    braceDepth = Math.max(0, braceDepth + brace.delta);

    depth += tagDepthDelta(line, activeTag);
    if (depth <= 0) activeTag = null;
  }

  return restoreHtmlBlockTags(restoreCodeBlocks(lines.join('\n'), protectedCode), htmlBlockPlaceholders);
}
