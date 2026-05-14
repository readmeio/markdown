/**
 * Cheap pre-scan for `export`/`import` declarations that would be tokenized
 * by `mdxjsEsm`. Only matches block-level lines where the keyword is followed
 * by a real ESM declarator — that way prose like "Export your data..." or
 * "Import the file..." doesn't accidentally opt the document into ESM
 * tokenization (which runs acorn and would throw on plain English).
 */
export default function hasEsmDeclarations(content: string): boolean {
  return /^(?:export|import)\s+(?:const|let|var|function|class|async|default|\{|\*)\b/m.test(content);
}
