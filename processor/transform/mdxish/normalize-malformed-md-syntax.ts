import type { Emphasis, Parent, Root, Strong, Text } from 'mdast';
import type { Plugin } from 'unified';

import { visit } from 'unist-util-visit';

/**
 * A remark plugin that normalizes malformed bold and italic markers in text nodes.
 * Detects patterns like `** bold**`, `Hello** Wrong Bold**`, `__ bold__`, `Hello__ Wrong Bold__`,
 * `* italic*`, `Hello* Wrong Italic*`, `_ italic_`, or `Hello_ Wrong Italic_`
 * and converts them to proper strong/emphasis nodes, matching the behavior of the legacy rdmd engine.
 *
 * Supports both asterisk (`**bold**`, `*italic*`) and underscore (`__bold__`, `_italic_`) syntax.
 *
 * This runs after remark-parse, which (in v11+) is strict and doesn't parse
 * malformed emphasis syntax. This plugin post-processes the AST to handle these cases.
 */
const normalizeEmphasisAST: Plugin = () => (tree: Root) => {
  visit(tree, 'text', (node: Text, index, parent: Parent) => {
    if (index === undefined || !parent) return;

    // Skip if inside code blocks, inline code, or already inside strong/emphasis
    if (
      parent.type === 'inlineCode' ||
      parent.type === 'code' ||
      parent.type === 'strong' ||
      parent.type === 'emphasis'
    ) {
      return;
    }

    const text = node.value;

    // Patterns to detect for bold (** and __) and italic (* and _) syntax:
    // Bold: ** text**, **text **, word** text**, ** text **
    // Italic: * text*, *text *, word* text*, * text *
    // Same patterns for underscore variants

    // Combined regex to match all malformed bold and italic patterns
    // We match bold first (longer patterns), then italic (shorter patterns)
    // Pattern: ([^*_\s]+)?\s*(\*\*|__|\*|_)(?:\s+([^*_\n]+?)\s*\2|([^*_\n]+?)\s+\2)(\S|$)?
    // - ([^*_\s]+)? - optional word before, excluding * and _ (capture group 1)
    //   This ensures we don't match "Hello*" as a word when we have "Hello**"
    // - \s* - optional whitespace before markers
    // - (\*\*|__|\*|_) - opening markers: **, __, *, or _ (capture group 2, used as \2 for closing)
    //   Note: Order matters - longer patterns (**, __) are matched before shorter ones (*, _)
    // - (?:...) - alternation:
    //   - \s+([^*_\n]+?)\s*\2 - space after opening, content, optional space before closing (group 3)
    //   - OR ([^*_\n]+?)\s+\2 - content, space before closing (group 4)
    // - (\S|$)? - optional non-whitespace after or end of string (capture group 5)
    const malformedEmphasisRegex = /([^*_\s]+)?\s*(\*\*|__|\*|_)(?:\s+([^*_\n]+?)\s*\2|([^*_\n]+?)\s+\2)(\S|$)?/g;

    const matches = [...text.matchAll(malformedEmphasisRegex)];
    if (matches.length === 0) return;

    const parts: (Emphasis | Strong | Text)[] = [];
    let lastIndex = 0;

    matches.forEach(match => {
      const matchIndex = match.index ?? 0;
      const fullMatch = match[0];

      // Add text before the match
      if (matchIndex > lastIndex) {
        const beforeText = text.slice(lastIndex, matchIndex);
        if (beforeText) {
          parts.push({ type: 'text', value: beforeText } satisfies Text);
        }
      }

      const wordBefore = match[1]; // e.g., "Hello" in "Hello** Wrong Bold**" or "Hello* Wrong Italic*"
      const marker = match[2]; // Either "**", "__", "*", or "_"
      const contentWithSpaceAfter = match[3]; // Content when there's a space after opening markers
      const contentWithSpaceBefore = match[4]; // Content when there's only a space before closing markers
      const content = (contentWithSpaceAfter || contentWithSpaceBefore || '').trim(); // The content, trimmed
      const afterChar = match[5]; // Character after closing markers (if any)

      // Determine if this is bold (double markers) or italic (single markers)
      const isBold = marker === '**' || marker === '__';

      // Find position of opening markers
      const markerPos = fullMatch.indexOf(marker);
      const spacesBeforeMarkers = wordBefore
        ? fullMatch.slice(wordBefore.length, markerPos)
        : fullMatch.slice(0, markerPos);

      // If there's a space after the opening markers (group 3), we should add a space before the word
      // BUT only if there's actually a word before AND no spaces already exist before the markers
      // If there's only a space before the closing markers (group 4), we should NOT add a space
      // If spaces already exist before markers (like "Hello  **"), we should preserve them and NOT add another
      const shouldAddSpace = !!contentWithSpaceAfter && !!wordBefore && !spacesBeforeMarkers;

      if (wordBefore) {
        // Preserve spacing before markers, and add space only if there was one after opening markers
        // and no spaces already exist before the markers
        const spacing = spacesBeforeMarkers + (shouldAddSpace ? ' ' : '');
        parts.push({ type: 'text', value: wordBefore + spacing } satisfies Text);
      } else if (spacesBeforeMarkers) {
        parts.push({ type: 'text', value: spacesBeforeMarkers } satisfies Text);
      }
      // Note: We don't add a space when there's no word before, even if there was a space after opening markers
      // This matches the behavior where "** text **" or "* text *" should become just a strong/emphasis node, no leading space

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
        parts.push({ type: 'text', value: ` ${afterChar}` } satisfies Text);
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
    }
  });

  return tree;
};

export default normalizeEmphasisAST;
