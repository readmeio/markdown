import type { Parent, Root, Strong, Text } from 'mdast';
import type { Plugin } from 'unified';

import { visit } from 'unist-util-visit';

/**
 * A remark plugin that normalizes malformed bold markers in text nodes.
 * Detects patterns like `** bold**`, `Hello** Wrong Bold**`, `__ bold__`, or `Hello__ Wrong Bold__`
 * and converts them to proper strong nodes, matching the behavior of the legacy rdmd engine.
 *
 * Supports both asterisk (`**bold**`) and underscore (`__bold__`) bold syntax.
 *
 * This runs after remark-parse, which (in v11+) is strict and doesn't parse
 * malformed bold syntax. This plugin post-processes the AST to handle these cases.
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

    // Patterns to detect for both ** and __ syntax:
    // 1. ** text** or __ text__ (space after opening, preceded by space/start)
    // 2. **text ** or __text __ (space before closing, followed by non-whitespace or end)
    // 3. word** text** or word__ text__ (word before, space after opening)
    // 4. ** text ** or __ text __ (spaces on both sides)

    // Combined regex to match all malformed bold patterns for both ** and __
    // Pattern: (\S+)?\s*(\*\*|__)(?:\s+([^*_\n]+?)\s*\2|([^*_\n]+?)\s+\2)(\S|$)?
    // - (\S+)? - optional word before (capture group 1)
    // - \s* - optional whitespace before markers (to preserve spaces like "Hello **" or "Hello __")
    // - (\*\*|__) - opening markers: ** or __ (capture group 2, used as \2 for closing)
    // - (?:...) - alternation:
    //   - \s+([^*_\n]+?)\s*\2 - space after opening, content, optional space before closing (group 3)
    //   - OR ([^*_\n]+?)\s+\2 - content, space before closing (group 4)
    // - (\S|$)? - optional non-whitespace after or end of string (capture group 5)
    const malformedBoldRegex = /(\S+)?\s*(\*\*|__)(?:\s+([^*_\n]+?)\s*\2|([^*_\n]+?)\s+\2)(\S|$)?/g;

    const matches = [...text.matchAll(malformedBoldRegex)];
    if (matches.length === 0) return;

    const parts: (Strong | Text)[] = [];
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

      const wordBefore = match[1]; // e.g., "Hello" in "Hello** Wrong Bold**" or "Hello" in "Hello ** World**"
      const marker = match[2]; // Either "**" or "__"
      const contentWithSpaceAfter = match[3]; // Content when there's a space after opening markers
      const contentWithSpaceBefore = match[4]; // Content when there's only a space before closing markers
      const content = (contentWithSpaceAfter || contentWithSpaceBefore || '').trim(); // The bold content, trimmed
      const afterChar = match[5]; // Character after closing markers (if any)

      // Find position of opening markers (** or __)
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
      // This matches the behavior where "** text **" should become just a strong node, no leading space

      if (content) {
        parts.push({
          type: 'strong',
          children: [{ type: 'text', value: content } satisfies Text],
        } satisfies Strong);
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
