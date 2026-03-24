/**
 * Preprocessor to normalize malformed GFM table separator syntax.
 *
 * Fixes the common mistake where the alignment colon is placed after the pipe
 * instead of before the dashes:
 *
 * Invalid: `|: ---` or `|:---` (colon after pipe)
 * Valid:   `| :---` (colon before dashes)
 *
 * Also handles right alignment:
 * Invalid: `| ---:| ` with space before pipe
 * Valid:   `| ---:|` (no space before closing pipe)
 *
 * This runs before remark-parse to ensure the table is recognized as a valid GFM table.
 */

/**
 * Pattern to match a table separator row.
 * A separator row consists of cells that contain only dashes, colons (for alignment), and spaces.
 *
 * Valid GFM separator formats:
 * - `---` or `----` (no alignment, defaults to left)
 * - `:---` (left aligned)
 * - `---:` (right aligned)
 * - `:---:` (center aligned)
 *
 * Invalid formats this fixes:
 * - `|: ---` → `| :---` (colon wrongly placed after pipe)
 * - `|:---` → `| :---` (colon directly after pipe, missing space)
 * - `|::---` or `| ::---` → `| :---` (double colon typo)
 */

// Match a line that looks like a table separator row
// This regex captures the whole line if it contains only pipe-separated cells with dashes/colons
const TABLE_SEPARATOR_LINE_REGEX = /^(\|[:\s-]+)+\|?\s*$/;

// Match malformed left-alignment: `|: ` or `|:` followed by dashes
// Captures: group 1 = pipe, group 2 = spaces after colon, group 3 = dashes
const MALFORMED_LEFT_ALIGN_REGEX = /\|:(\s*)(-+)/g;

// Match malformed double colon: `|::---` or `| ::---` → `| :---`
const MALFORMED_DOUBLE_COLON_REGEX = /\|\s*::(\s*)(-+)/g;

// Match malformed patterns with spaces before closing colons: `| --- : |` → `| ---: |`
const MALFORMED_RIGHT_ALIGN_SPACE_REGEX = /(-+)\s+:(\s*\|)/g;

// Match malformed center alignment with spaces: `| : --- : |` → `| :---: |`
const MALFORMED_CENTER_ALIGN_REGEX = /\|:(\s+)(-+)(\s+):/g;

/**
 * Normalizes a single table separator line.
 */
function normalizeTableSeparatorLine(line: string): string {
  // Check if this line looks like a table separator
  if (!TABLE_SEPARATOR_LINE_REGEX.test(line)) {
    return line;
  }

  let normalized = line;

  // Fix `|::---` → `| :---` (double colon typo)
  // Must run before single colon fix to avoid partial replacement
  normalized = normalized.replace(MALFORMED_DOUBLE_COLON_REGEX, '| :$2');

  // Fix `|: ---` or `|:---` → `| :---`
  // The colon should be adjacent to the dashes, not the pipe
  normalized = normalized.replace(MALFORMED_LEFT_ALIGN_REGEX, '| :$2');

  // Fix `| --- : |` → `| ---: |`
  // Remove space before right-alignment colon
  normalized = normalized.replace(MALFORMED_RIGHT_ALIGN_SPACE_REGEX, '$1:$2');

  // Fix `| : --- : |` → `| :---: |`
  // Remove spaces around center-aligned dashes
  normalized = normalized.replace(MALFORMED_CENTER_ALIGN_REGEX, '| :$2:');

  return normalized;
}

/**
 * Preprocesses markdown content to normalize malformed table separator syntax.
 *
 * @param content - The raw markdown content
 * @returns The content with normalized table separators
 */
export function normalizeTableSeparator(content: string): string {
  const lines = content.split('\n');
  const normalizedLines = lines.map((line, index) => {
    const prevLine = index > 0 ? lines[index - 1] : '';
    const isPrevLineTableRow = prevLine.trim().startsWith('|');
    if (isPrevLineTableRow) {
      return normalizeTableSeparatorLine(line);
    }

    return line;
  });

  return normalizedLines.join('\n');
}

export default normalizeTableSeparator;
