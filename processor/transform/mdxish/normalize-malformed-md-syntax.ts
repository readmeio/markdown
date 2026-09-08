import type { Emphasis, Parent, PhrasingContent, Root, Strong, Text } from 'mdast';
import type { Plugin } from 'unified';

import { SKIP, visit } from 'unist-util-visit';

// Marker patterns for multi-node emphasis detection
const MARKER_PATTERNS = [
  { isBold: true, marker: '**' },
  { isBold: true, marker: '__' },
  { isBold: false, marker: '*' },
  { isBold: false, marker: '_' },
] as const;

// Patterns to detect for bold (** and __) and italic (* and _) syntax:
// Bold: ** text**, **text **, word** text**, ** text **
// Italic: * text*, *text *, word* text*, * text *
// Same patterns for underscore variants
// We use separate patterns for each marker type to allow this flexibility.

// Pattern for ** bold **
// Groups: 1=wordBefore, 2=marker, 3=contentWithSpaceAfter, 4=trailingSpace1, 5=contentWithSpaceBefore, 6=trailingSpace2, 7=afterChar
// trailingSpace1 is for "** text **" pattern, trailingSpace2 is for "**text **" pattern
//
// The wordBefore and whitespace prefixes are deliberately bounded ({1,64} /
// {0,8}) rather than unbounded (+ / *). An unbounded prefix makes matchAll
// re-scan an arbitrarily long run from every character position, which turns
// the pass O(n²) on text nodes containing huge unbroken tokens (pasted base64
// payloads, minified code). Bounding the prefix caps the backtracking per
// position; a prefix longer than the bound just starts the match later, and
// the cut-off chars flow into the preceding text node instead — adjacent text
// parts are merged before splicing, so the emitted AST is unchanged.
//
// The content quantifiers are bounded too ({1,500}). The underscore content
// clauses can scan across `_` (needed for snake_case content), so without a
// bound every `_` in a marker-dense token (base64url, snake_case identifiers)
// re-scans to end-of-line looking for a closer — O(n²) again. Content already
// can't cross a newline, and 500 chars covers any sentence-length emphasis
// phrase; longer spans stay unnormalized rather than costing quadratic scans.
const asteriskBoldRegex =
  /([^*\s]{1,64})?\s{0,8}(\*\*)(?:\s+((?:[^*\n]|\*(?!\*)){1,500}?)(\s*)\2|((?:[^*\n]|\*(?!\*)){1,500}?)(\s+)\2)(\S|$)?/g;

// Pattern for __ bold __
const underscoreBoldRegex =
  /([^_\s]{1,64})?\s{0,8}(__)(?:\s+((?:__(?! )|_(?!_)|[^_\n]){1,500}?)(\s*)\2|((?:__(?! )|_(?!_)|[^_\n]){1,500}?)(\s+)\2)(\S|$)?/g;

// Pattern for * italic *
const asteriskItalicRegex =
  /([^*\s]{1,64})?\s{0,8}(\*)(?!\*)(?:\s+([^*\n]{1,500}?)(\s*)\2|([^*\n]{1,500}?)(\s+)\2)(\S|$)?/g;

// Pattern for _ italic _
const underscoreItalicRegex =
  /([^_\s]{1,64})?\s{0,8}(_)(?!_)(?:\s+((?:[^_\n]|_(?! )){1,500}?)(\s*)\2|((?:[^_\n]|_(?! )){1,500}?)(\s+)\2)(\S|$)?/g;

// Every loose alternation requires whitespace beside a marker — after the
// opening (`** text**`) or before the closing (`**text **`) — so
// marker-beside-whitespace is an exact gate for the loose families. A single
// linear probe skips them entirely on marker-dense tokens whose markers are
// all intraword (base64url payloads, snake_case identifiers).
const asteriskBesideWhitespaceRegex = /\*\s|\s\*/;
const underscoreBesideWhitespaceRegex = /_\s|\s_/;

// CommonMark ignores intraword underscores or asteriks, but we want to italicize/bold the inner part
// Pattern for intraword _word_ in words like hello_world_
const intrawordUnderscoreItalicRegex = /(\w)_(?!_)([a-zA-Z0-9]+)_(?![\w_])/g;

// Pattern for intraword __word__ in words like hello__world__
const intrawordUnderscoreBoldRegex = /(\w)__([a-zA-Z0-9]+)__(?![\w_])/g;

// Pattern for intraword *word* in words like hello*world*
const intrawordAsteriskItalicRegex = /(\w)\*(?!\*)([a-zA-Z0-9]+)\*(?![\w*])/g;

// Pattern for intraword **word** in words like hello**world**
const intrawordAsteriskBoldRegex = /(\w)\*\*([a-zA-Z0-9]+)\*\*(?![\w*])/g;

// All regex families, in match-precedence order: collected matches are
// stable-sorted by match.index, so at an equal index the earlier row wins the
// overlap filter — keep this order. `gate` names the per-node precondition
// (see the gate record in the visitor) checked before the family's regex
// runs, so a node that can't possibly match never pays for a full scan: the
// intraword families need their marker character present, and the loose
// families additionally need that marker beside whitespace.
const REGEX_FAMILIES = [
  { regex: asteriskBoldRegex, isBold: true, marker: '**', gate: 'asteriskLoose' },
  { regex: underscoreBoldRegex, isBold: true, marker: '__', gate: 'underscoreLoose' },
  { regex: asteriskItalicRegex, isBold: false, marker: '*', gate: 'asteriskLoose' },
  { regex: underscoreItalicRegex, isBold: false, marker: '_', gate: 'underscoreLoose' },
  { regex: intrawordUnderscoreItalicRegex, isBold: false, isIntraword: true, marker: '_', gate: 'underscore' },
  { regex: intrawordUnderscoreBoldRegex, isBold: true, isIntraword: true, marker: '__', gate: 'underscore' },
  { regex: intrawordAsteriskItalicRegex, isBold: false, isIntraword: true, marker: '*', gate: 'asterisk' },
  { regex: intrawordAsteriskBoldRegex, isBold: true, isIntraword: true, marker: '**', gate: 'asterisk' },
] as const;

/**
 * Finds opening emphasis marker in a text value.
 * Returns marker info if found, null otherwise.
 */
function findOpeningMarker(text: string): {
  isBold: boolean;
  marker: string;
  textAfter: string;
  textBefore: string;
} | null {
  const results = MARKER_PATTERNS.map(({ isBold, marker }) => {
    if (marker === '*' && text.startsWith('**')) return null;
    if (marker === '_' && text.startsWith('__')) return null;

    if (text.startsWith(marker) && text.length > marker.length) {
      return { isBold, marker, textAfter: text.slice(marker.length), textBefore: '' };
    }

    const idx = text.indexOf(marker);
    if (idx > 0 && !/\s/.test(text[idx - 1])) {
      if (marker === '*' && text.slice(idx).startsWith('**')) return null;
      if (marker === '_' && text.slice(idx).startsWith('__')) return null;

      const after = text.slice(idx + marker.length);
      if (after.length > 0) {
        return { isBold, marker, textAfter: after, textBefore: text.slice(0, idx) };
      }
    }
    return null;
  });

  return results.find(r => r !== null) ?? null;
}

/**
 * Finds the end/closing marker in a text node for multi-node emphasis.
 */
function findEndMarker(text: string, marker: string): { textAfter: string; textBefore: string } | null {
  const spacePattern = ` ${marker}`;
  const spaceIdx = text.indexOf(spacePattern);
  if (spaceIdx >= 0) {
    if (marker === '*' && text.slice(spaceIdx + 1).startsWith('**')) return null;
    if (marker === '_' && text.slice(spaceIdx + 1).startsWith('__')) return null;

    return {
      textAfter: text.slice(spaceIdx + spacePattern.length),
      textBefore: text.slice(0, spaceIdx),
    };
  }

  if (text.startsWith(marker)) {
    if (marker === '*' && text.startsWith('**')) return null;
    if (marker === '_' && text.startsWith('__')) return null;

    return {
      textAfter: text.slice(marker.length),
      textBefore: '',
    };
  }

  return null;
}

type OpeningMarkerInfo = NonNullable<ReturnType<typeof findOpeningMarker>>;
type ClosingMarkerInfo = NonNullable<ReturnType<typeof findEndMarker>>;

interface MarkerPair {
  closing: ClosingMarkerInfo;
  closingIdx: number;
  opening: OpeningMarkerInfo;
  openingIdx: number;
}

/**
 * Scan children for an opening emphasis marker in a text node.
 */
function findOpeningInChildren(children: Parent['children']) {
  let result: { idx: number; opening: NonNullable<ReturnType<typeof findOpeningMarker>> } | null = null;

  children.some((child, idx) => {
    if (child.type !== 'text') return false;
    const found = findOpeningMarker((child as Text).value);
    if (found) {
      result = { idx, opening: found };
      return true;
    }
    return false;
  });

  return result;
}

/**
 * Scan children (after openingIdx) for a closing emphasis marker.
 */
function findClosingInChildren(children: Parent['children'], openingIdx: number, marker: string) {
  let result: { closing: NonNullable<ReturnType<typeof findEndMarker>>; closingIdx: number } | null = null;

  children.slice(openingIdx + 1).some((child, relativeIdx) => {
    if (child.type !== 'text') return false;
    const found = findEndMarker((child as Text).value, marker);
    if (found) {
      result = { closingIdx: openingIdx + 1 + relativeIdx, closing: found };
      return true;
    }
    return false;
  });

  return result;
}

/**
 * Build the replacement nodes for a matched emphasis pair.
 */
function buildReplacementNodes(container: Parent, { opening, openingIdx, closing, closingIdx }: MarkerPair) {
  const newNodes: PhrasingContent[] = [];

  if (opening.textBefore) {
    newNodes.push({ type: 'text', value: `${opening.textBefore} ` } as Text);
  }

  const emphasisChildren: PhrasingContent[] = [];

  const openingText = opening.textAfter.replace(/^\s+/, '');
  if (openingText) {
    emphasisChildren.push({ type: 'text', value: openingText } as Text);
  }

  container.children.slice(openingIdx + 1, closingIdx).forEach(child => {
    emphasisChildren.push(child as PhrasingContent);
  });

  const closingText = closing.textBefore.replace(/\s+$/, '');
  if (closingText) {
    emphasisChildren.push({ type: 'text', value: closingText } as Text);
  }

  if (emphasisChildren.length > 0) {
    const emphasisNode = opening.isBold
      ? ({ type: 'strong', children: emphasisChildren } as Strong)
      : ({ type: 'emphasis', children: emphasisChildren } as Emphasis);
    newNodes.push(emphasisNode);
  }

  if (closing.textAfter) {
    newNodes.push({ type: 'text', value: closing.textAfter } as Text);
  }

  return newNodes;
}

/**
 * Find and transform one multi-node emphasis pair in the container.
 * Returns true if a pair was found and transformed, false otherwise.
 */
function processOneEmphasisPair(container: Parent) {
  const openingResult = findOpeningInChildren(container.children);
  if (!openingResult) return false;

  const { idx: openingIdx, opening } = openingResult;

  const closingResult = findClosingInChildren(container.children, openingIdx, opening.marker);
  if (!closingResult) return false;

  const { closingIdx, closing } = closingResult;

  const newNodes = buildReplacementNodes(container, { opening, openingIdx, closing, closingIdx });

  const deleteCount = closingIdx - openingIdx + 1;
  container.children.splice(openingIdx, deleteCount, ...(newNodes as typeof container.children));

  return true;
}

/**
 * Handle malformed emphasis that spans multiple AST nodes.
 * E.g., "**bold [link](url)**" where markers are in different text nodes.
 */
function visitMultiNodeEmphasis(tree: Root) {
  const containerTypes = ['paragraph', 'heading', 'tableCell', 'listItem', 'blockquote'];

  visit(tree, node => {
    if (!containerTypes.includes(node.type)) return;
    if (!('children' in node) || !Array.isArray(node.children)) return;

    const container = node as Parent;
    let foundPair = true;
    while (foundPair) {
      foundPair = processOneEmphasisPair(container);
    }
  });
}

/**
 * Returns true when the node at `index` inside `parent.children` sits between
 * sibling `html` nodes that form an inline `<code>…</code>` element.
 */
function isInsideInlineHtmlCode(index: number | undefined, parent: Parent): boolean {
  if (index === undefined || !Array.isArray(parent.children)) return false;
  let i = index - 1;
  while (i >= 0) {
    const sibling = parent.children[i];
    if (sibling.type === 'html' && 'value' in sibling && typeof sibling.value === 'string') {
      const val = (sibling as { type: 'html'; value: string }).value.trim().toLowerCase();
      if (val === '<code>' || val.startsWith('<code ') || val.startsWith('<code\t')) return true;
      if (val === '</code>') return false;
    }
    i -= 1;
  }
  return false;
}

/**
 * A remark plugin that normalizes malformed bold and italic markers in text nodes.
 * Detects patterns like `** bold**`, `Hello** Wrong Bold**`, `__ bold__`, `Hello__ Wrong Bold__`,
 * `* italic*`, `Hello* Wrong Italic*`, `_ italic_`, or `Hello_ Wrong Italic_`
 * and converts them to proper strong/emphasis nodes, matching the behavior of the legacy rdmd engine.
 *
 * Supports both asterisk (`**bold**`, `*italic*`) and underscore (`__bold__`, `_italic_`) syntax.
 * Also supports snake_case content like `** some_snake_case**`.
 *
 * This runs after remark-parse, which (in v11+) is strict and doesn't parse
 * malformed emphasis syntax. This plugin post-processes the AST to handle these cases.
 */
const normalizeEmphasisAST: Plugin = () => (tree: Root) => {
  // Back-scanning siblings for <code>…</code> html pairs costs O(children)
  // per text node — O(children²) per parent, which bites on marker-dense
  // paragraphs where micromark emits thousands of inline children. Most
  // parents have no html children at all, so cache that check per parent and
  // skip the back-scan entirely. The cached flag survives our splices: they
  // only ever swap text nodes for text/strong/emphasis, never html.
  const hasHtmlChild = new WeakMap<Parent, boolean>();
  const mayBeInsideInlineHtmlCode = (index: number, parent: Parent): boolean => {
    let flag = hasHtmlChild.get(parent);
    if (flag === undefined) {
      flag = parent.children.some(child => child.type === 'html');
      hasHtmlChild.set(parent, flag);
    }
    return flag && isInsideInlineHtmlCode(index, parent);
  };

  visit(tree, 'text', function visitor(node: Text, index, parent: Parent) {
    if (index === undefined || !parent) return undefined;

    // Skip if inside code blocks, inline code, or MDX JSX <code> elements.
    if (parent.type === 'inlineCode' || parent.type === 'code') {
      return undefined;
    }
    // The parent type check for mdxJsxTextElement/mdxJsxFlowElement handles
    // raw HTML <code>...</code> inside table cells, which the table re-parser
    // parses as MDX JSX (not as an mdast `inlineCode` node).
    if (
      (parent.type === 'mdxJsxTextElement' || parent.type === 'mdxJsxFlowElement') &&
      'name' in parent &&
      parent.name === 'code'
    ) {
      return undefined;
    }
    const text = node.value;

    // The regexes below can't match without their marker character, but
    // running them anyway costs a scan of the whole node — ruinous on huge
    // pasted payloads (base64 attachments, minified code). Checked before the
    // html-sibling scan so marker-free text never pays for that either.
    const hasAsterisk = text.includes('*');
    const hasUnderscore = text.includes('_');
    if (!hasAsterisk && !hasUnderscore) return undefined;

    // In GFM tables, inline <code>...</code> is represented as sibling `html`
    // nodes rather than as an mdxJsxTextElement, so the check above doesn't
    // apply. Scan backwards through siblings to see if we are enclosed by a
    // <code>…</code> inline HTML pair.
    if (mayBeInsideInlineHtmlCode(index, parent)) {
      return undefined;
    }

    const gates: Record<(typeof REGEX_FAMILIES)[number]['gate'], boolean> = {
      asterisk: hasAsterisk,
      asteriskLoose: hasAsterisk && asteriskBesideWhitespaceRegex.test(text),
      underscore: hasUnderscore,
      underscoreLoose: hasUnderscore && underscoreBesideWhitespaceRegex.test(text),
    };

    interface MatchInfo {
      isBold: boolean;
      isIntraword?: boolean;
      marker: string;
      match: RegExpMatchArray;
    }

    const allMatches: MatchInfo[] = [];

    REGEX_FAMILIES.forEach(({ regex, gate, ...info }) => {
      if (!gates[gate]) return;
      [...text.matchAll(regex)].forEach(match => {
        allMatches.push({ ...info, match });
      });
    });

    if (allMatches.length === 0) return undefined;

    allMatches.sort((a, b) => (a.match.index ?? 0) - (b.match.index ?? 0));

    const filteredMatches: MatchInfo[] = [];
    let lastEnd = 0;
    allMatches.forEach(info => {
      const start = info.match.index ?? 0;
      const end = start + info.match[0].length;
      if (start >= lastEnd) {
        filteredMatches.push(info);
        lastEnd = end;
      }
    });

    if (filteredMatches.length === 0) return undefined;

    const parts: (Emphasis | Strong | Text)[] = [];
    let lastIndex = 0;

    filteredMatches.forEach(({ isBold, isIntraword, marker, match }) => {
      const matchIndex = match.index ?? 0;
      const fullMatch = match[0];

      if (isIntraword) {
        // handles cases like hello_world_ where we only want to italicize 'world'
        const charBefore = match[1] || ''; // e.g., "l" in "hello_world_"
        const content = match[2]; // e.g., "world"

        const combinedBefore = text.slice(lastIndex, matchIndex) + charBefore;
        if (combinedBefore) {
          parts.push({ type: 'text', value: combinedBefore } satisfies Text);
        }
        if (isBold) {
          parts.push({
            type: 'strong',
            children: [{ type: 'text', value: content } satisfies Text],
          } satisfies Strong);
        } else {
          parts.push({
            type: 'emphasis',
            children: [{ type: 'text', value: content } satisfies Text],
          } satisfies Emphasis);
        }

        lastIndex = matchIndex + fullMatch.length;
        return;
      }

      if (matchIndex > lastIndex) {
        const beforeText = text.slice(lastIndex, matchIndex);
        if (beforeText) {
          parts.push({ type: 'text', value: beforeText } satisfies Text);
        }
      }

      const wordBefore = match[1]; // e.g., "Hello" in "Hello** Wrong Bold**"
      const contentWithSpaceAfter = match[3]; // Content when there's a space after opening markers
      const trailingSpace1 = match[4] || ''; // Space before closing markers (for "** text **" pattern)
      const contentWithSpaceBefore = match[5]; // Content when there's only a space before closing markers
      const trailingSpace2 = match[6] || ''; // Space before closing markers (for "**text **" pattern)
      const trailingSpace = trailingSpace1 || trailingSpace2; // Combined trailing space
      const content = (contentWithSpaceAfter || contentWithSpaceBefore || '').trim();
      const afterChar = match[7]; // Character after closing markers (if any)

      const markerPos = fullMatch.indexOf(marker);
      const spacesBeforeMarkers = wordBefore
        ? fullMatch.slice(wordBefore.length, markerPos)
        : fullMatch.slice(0, markerPos);

      const shouldAddSpace = !!contentWithSpaceAfter && !!wordBefore && !spacesBeforeMarkers;

      if (wordBefore) {
        const spacing = spacesBeforeMarkers + (shouldAddSpace ? ' ' : '');
        parts.push({ type: 'text', value: wordBefore + spacing } satisfies Text);
      } else if (spacesBeforeMarkers) {
        parts.push({ type: 'text', value: spacesBeforeMarkers } satisfies Text);
      }
      if (content) {
        if (isBold) {
          parts.push({
            type: 'strong',
            children: [{ type: 'text', value: content } satisfies Text],
          } satisfies Strong);
        } else {
          parts.push({
            type: 'emphasis',
            children: [{ type: 'text', value: content } satisfies Text],
          } satisfies Emphasis);
        }
      }

      if (afterChar) {
        const prefix = trailingSpace ? ' ' : '';
        parts.push({ type: 'text', value: prefix + afterChar } satisfies Text);
      }

      lastIndex = matchIndex + fullMatch.length;
    });

    if (lastIndex < text.length) {
      const remainingText = text.slice(lastIndex);
      if (remainingText) {
        parts.push({ type: 'text', value: remainingText } satisfies Text);
      }
    }

    // Merge adjacent text parts so the emitted AST doesn't depend on where a
    // match happened to start (the bounded prefixes above can shift a match
    // start rightward, splitting what used to be a single text node).
    const mergedParts = parts.reduce<typeof parts>((acc, part) => {
      const prev = acc[acc.length - 1];
      if (part.type === 'text' && prev?.type === 'text') {
        prev.value += part.value;
      } else {
        acc.push(part);
      }
      return acc;
    }, []);

    if (mergedParts.length > 0) {
      parent.children.splice(index, 1, ...mergedParts);
      return [SKIP, index + mergedParts.length];
    }

    return undefined;
  });

  // Handle malformed emphasis spanning multiple nodes (e.g., **text [link](url) **)
  visitMultiNodeEmphasis(tree);

  return tree;
};

export default normalizeEmphasisAST;
