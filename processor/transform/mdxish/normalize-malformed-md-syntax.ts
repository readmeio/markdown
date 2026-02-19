import type { Emphasis, Html, Parent, PhrasingContent, Root, Strong, Text } from 'mdast';
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
const asteriskBoldRegex =
  /([^*\s]+)?\s*(\*\*)(?:\s+((?:[^*\n]|\*(?!\*))+?)(\s*)\2|((?:[^*\n]|\*(?!\*))+?)(\s+)\2)(\S|$)?/g;

// Pattern for __ bold __
const underscoreBoldRegex =
  /([^_\s]+)?\s*(__)(?:\s+((?:__(?! )|_(?!_)|[^_\n])+?)(\s*)\2|((?:__(?! )|_(?!_)|[^_\n])+?)(\s+)\2)(\S|$)?/g;

// Pattern for * italic *
const asteriskItalicRegex = /([^*\s]+)?\s*(\*)(?!\*)(?:\s+([^*\n]+?)(\s*)\2|([^*\n]+?)(\s+)\2)(\S|$)?/g;

// Pattern for _ italic _
const underscoreItalicRegex =
  /([^_\s]+)?\s*(_)(?!_)(?:\s+((?:[^_\n]|_(?! ))+?)(\s*)\2|((?:[^_\n]|_(?! ))+?)(\s+)\2)(\S|$)?/g;

// CommonMark ignores intraword underscores or asteriks, but we want to italicize/bold the inner part
// Pattern for intraword _word_ in words like hello_world_
const intrawordUnderscoreItalicRegex = /(\w)_(?!_)([a-zA-Z0-9]+)_(?![\w_])/g;

// Pattern for intraword __word__ in words like hello__world__
const intrawordUnderscoreBoldRegex = /(\w)__([a-zA-Z0-9]+)__(?![\w_])/g;

// Pattern for intraword *word* in words like hello*world*
const intrawordAsteriskItalicRegex = /(\w)\*(?!\*)([a-zA-Z0-9]+)\*(?![\w*])/g;

// Pattern for intraword **word** in words like hello**world**
const intrawordAsteriskBoldRegex = /(\w)\*\*([a-zA-Z0-9]+)\*\*(?![\w*])/g;

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
 * Strip redundant markdown emphasis markers (`**`, `*`, `__`, `_`) that sit
 * adjacent to matching HTML emphasis tags in a raw HTML string.
 * Legacy content often has patterns like `<strong>**text</strong>**`.
 */
const stripRedundantEmphasisMarkers = (html: string): string =>
  html
    .replace(/(<(?:strong|b)>)\s*\*\*/g, '$1')
    .replace(/\*\*\s*(<\/(?:strong|b)>)/g, '$1')
    .replace(/(<\/(?:strong|b)>)\s*\*\*/g, '$1')
    .replace(/\*\*\s*(<(?:strong|b)>)/g, '$1')
    .replace(/(<(?:em|i)>)\s*(?:\*(?!\*)|_(?!_))/g, '$1')
    .replace(/(?:(?<!\*)\*|(?<!_)_)\s*(<\/(?:em|i)>)/g, '$1')
    .replace(/(<\/(?:em|i)>)\s*(?:\*(?!\*)|_(?!_))/g, '$1')
    .replace(/(?:(?<!\*)\*|(?<!_)_)\s*(<(?:em|i)>)/g, '$1');

const BOLD_HTML_TAG_RE = /^<\/?\s*(?:strong|b)\s*>$/i;
const ITALIC_HTML_TAG_RE = /^<\/?\s*(?:em|i)\s*>$/i;

/**
 * Strip redundant emphasis markers from the AST. Handles two cases:
 * 1. Block-level HTML (single `html` node containing full markup) — string-level regex
 * 2. Inline HTML (separate `html`/`text` sibling nodes) — adjacency-based stripping
 */
function stripRedundantEmphasisNodes(tree: Root) {
  visit(tree, 'html', (node: Html) => {
    node.value = stripRedundantEmphasisMarkers(node.value);
  });

  visit(tree, (node, _index, parent) => {
    if (!parent || !('children' in parent) || !Array.isArray(parent.children)) return;

    const children = parent.children as (Html | PhrasingContent | Text)[];
    let changed = true;

    while (changed) {
      changed = false;
      for (let i = 0; i < children.length; i += 1) {
        const child = children[i];
        // eslint-disable-next-line no-continue
        if (child.type !== 'text') continue;

        const text = (child as Text).value;

        const prev = i > 0 ? children[i - 1] : null;
        const next = i < children.length - 1 ? children[i + 1] : null;
        const prevIsHtml = prev?.type === 'html';
        const nextIsHtml = next?.type === 'html';
        const prevValue = prevIsHtml ? (prev as Html).value : '';
        const nextValue = nextIsHtml ? (next as Html).value : '';

        let newText = text;

        if (prevIsHtml && BOLD_HTML_TAG_RE.test(prevValue)) {
          newText = newText.replace(/^\s*\*\*\s*/, '');
        }
        if (prevIsHtml && ITALIC_HTML_TAG_RE.test(prevValue)) {
          newText = newText.replace(/^\s*(?:\*(?!\*)|_(?!_))\s*/, '');
        }
        if (nextIsHtml && BOLD_HTML_TAG_RE.test(nextValue)) {
          newText = newText.replace(/\s*\*\*\s*$/, '');
        }
        if (nextIsHtml && ITALIC_HTML_TAG_RE.test(nextValue)) {
          newText = newText.replace(/\s*(?:\*(?!\*)|_(?!_))\s*$/, '');
        }

        if (newText !== text) {
          if (newText === '') {
            children.splice(i, 1);
            i -= 1;
          } else {
            (child as Text).value = newText;
          }
          changed = true;
        }
      }
    }
  });
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
  visit(tree, 'text', function visitor(node: Text, index, parent: Parent) {
    if (index === undefined || !parent) return undefined;

    // Skip if inside code blocks or inline code
    if (parent.type === 'inlineCode' || parent.type === 'code') {
      return undefined;
    }

    const text = node.value;

    interface MatchInfo {
      isBold: boolean;
      isIntraword?: boolean;
      marker: string;
      match: RegExpMatchArray;
    }

    const allMatches: MatchInfo[] = [];

    [...text.matchAll(asteriskBoldRegex)].forEach(match => {
      allMatches.push({ isBold: true, marker: '**', match });
    });
    [...text.matchAll(underscoreBoldRegex)].forEach(match => {
      allMatches.push({ isBold: true, marker: '__', match });
    });
    [...text.matchAll(asteriskItalicRegex)].forEach(match => {
      allMatches.push({ isBold: false, marker: '*', match });
    });
    [...text.matchAll(underscoreItalicRegex)].forEach(match => {
      allMatches.push({ isBold: false, marker: '_', match });
    });
    [...text.matchAll(intrawordUnderscoreItalicRegex)].forEach(match => {
      allMatches.push({ isBold: false, isIntraword: true, marker: '_', match });
    });
    [...text.matchAll(intrawordUnderscoreBoldRegex)].forEach(match => {
      allMatches.push({ isBold: true, isIntraword: true, marker: '__', match });
    });
    [...text.matchAll(intrawordAsteriskItalicRegex)].forEach(match => {
      allMatches.push({ isBold: false, isIntraword: true, marker: '*', match });
    });
    [...text.matchAll(intrawordAsteriskBoldRegex)].forEach(match => {
      allMatches.push({ isBold: true, isIntraword: true, marker: '**', match });
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

    if (parts.length > 0) {
      parent.children.splice(index, 1, ...parts);
      return [SKIP, index + parts.length];
    }

    return undefined;
  });

  // Strip redundant emphasis markers adjacent to HTML emphasis tags (e.g., <strong>**text</strong>**)
  stripRedundantEmphasisNodes(tree);

  // Handle malformed emphasis spanning multiple nodes (e.g., **text [link](url) **)
  visitMultiNodeEmphasis(tree);

  return tree;
};

export default normalizeEmphasisAST;
