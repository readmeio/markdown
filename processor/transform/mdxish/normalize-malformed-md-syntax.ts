import type { Parent, Root, Strong, Text } from 'mdast';
import type { Plugin } from 'unified';

import { visit } from 'unist-util-visit';

/**
 * A remark plugin that normalizes malformed bold markers in text nodes.
 * Detects patterns like `** bold**` or `Hello** Wrong Bold**` and converts them
 * to proper strong nodes, matching the behavior of the legacy rdmd engine.
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

    // Patterns to detect:
    // 1. ** text** (space after opening, preceded by space/start)
    // 2. **text ** (space before closing, followed by non-whitespace or end)
    // 3. word** text** (word before, space after opening)
    // 4. ** text ** (spaces on both sides)

    // Combined regex to match all malformed bold patterns
    // Pattern: (\S+)?\s*\*\*(?:\s+([^*\n]+?)\s*\*\*|([^*\n]+?)\s+\*\*)(\S|$)?
    // - (\S+)? - optional word before (capture group 1)
    // - \s* - optional whitespace before ** (to preserve spaces like "Hello **")
    // - \*\* - opening **
    // - (?:...) - alternation:
    //   - \s+([^*\n]+?)\s*\*\* - space after opening, content, optional space before closing (group 2)
    //   - OR ([^*\n]+?)\s+\*\* - content, space before closing (group 3)
    // - (\S|$)? - optional non-whitespace after or end of string (capture group 4)
    const malformedBoldRegex = /(\S+)?\s*\*\*(?:\s+([^*\n]+?)\s*\*\*|([^*\n]+?)\s+\*\*)(\S|$)?/g;

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
      const content = (match[2] || match[3] || '').trim(); // The bold content (from either pattern), trimmed
      const afterChar = match[4]; // Character after closing ** (if any)

      const asteriskPos = fullMatch.indexOf('**');
      const spacesBefore = wordBefore
        ? fullMatch.slice(wordBefore.length, asteriskPos)
        : fullMatch.slice(0, asteriskPos);

      if (wordBefore) {
        const spacing = spacesBefore || ' ';
        parts.push({ type: 'text', value: wordBefore + spacing } satisfies Text);
      } else if (spacesBefore) {
        parts.push({ type: 'text', value: spacesBefore } satisfies Text);
      }

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
