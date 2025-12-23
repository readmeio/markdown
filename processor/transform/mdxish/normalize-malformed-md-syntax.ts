import type { Emphasis, Parent, Root, Strong, Text } from 'mdast';
import type { Plugin } from 'unified';

import { SKIP, visit } from 'unist-util-visit';

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
      /([^_\s]+)?\s*(__)(?:\s+((?:[^_\n]|_(?!_))+?)(\s*)\2|((?:[^_\n]|_(?!_))+?)(\s+)\2)(\S|$)?/g;

    // Pattern for * italic *
    const asteriskItalicRegex = /([^*\s]+)?\s*(\*)(?!\*)(?:\s+([^*\n]+?)(\s*)\2|([^*\n]+?)(\s+)\2)(\S|$)?/g;

    // Pattern for _ italic _
    const underscoreItalicRegex = /([^_\s]+)?\s*(_)(?!_)(?:\s+([^_\n]+?)(\s*)\2|([^_\n]+?)(\s+)\2)(\S|$)?/g;

    interface MatchInfo {
      isBold: boolean;
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

    filteredMatches.forEach(({ match, marker, isBold }) => {
      const matchIndex = match.index ?? 0;
      const fullMatch = match[0];

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

  return tree;
};

export default normalizeEmphasisAST;
