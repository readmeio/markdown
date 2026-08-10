import { MAGIC_BLOCK_REGEX } from './extractMagicBlocks';

export interface ScanPascalCaseTagsOptions {
  /** Names to omit from the result (e.g. RMDX builtins). */
  exclude?: ReadonlySet<string>;
  /** Skip `[block:…]…[/block]` regions. Default false. */
  skipMagicBlocks?: boolean;
}

/** Opening PascalCase tags; negative lookbehind skips legacy `<<VARIABLE>>` syntax. */
const PASCAL_OPEN_TAG_RE = /(?<!<)<([A-Z][A-Za-z0-9_]*)\b/g;

/** Fenced code using matching ``` or ~~~ delimiters (same spirit as protectCodeBlocks). */
const FENCED_CODE_RE = /```[\s\S]*?```|~~~[\s\S]*?~~~/g;

/** Inline code spans (no newlines), matching protectCodeBlocks. */
const INLINE_CODE_RE = /`([^`\n]+)`/g;

/**
 * Collect unique PascalCase JSX/MDX component names from a markdown string
 * without running a full MDAST parse. Skips fenced/inline code; optionally
 * skips magic blocks. Order is first-seen.
 */
export function scanPascalCaseTags(doc: string, opts: ScanPascalCaseTagsOptions = {}): string[] {
  const { skipMagicBlocks = false, exclude } = opts;

  let scanTarget = doc.replace(FENCED_CODE_RE, match => ' '.repeat(match.length));
  scanTarget = scanTarget.replace(INLINE_CODE_RE, match => ' '.repeat(match.length));
  if (skipMagicBlocks) {
    scanTarget = scanTarget.replace(MAGIC_BLOCK_REGEX, match => ' '.repeat(match.length));
  }

  const names = new Set<string>();
  PASCAL_OPEN_TAG_RE.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = PASCAL_OPEN_TAG_RE.exec(scanTarget)) !== null) {
    const name = match[1];
    if (exclude?.has(name)) continue;
    names.add(name);
  }

  return Array.from(names);
}
