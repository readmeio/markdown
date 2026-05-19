/**
 * Cheap pre-scan for `export`/`import` declarations that would be tokenized
 * by `mdxjsEsm`. Only matches block-level lines where the keyword is followed
 * by a real ESM declarator.
 *
 * Main motivation on this is to allow syntax like "export <non-esm-declarator>"
 * to be a valid doc as adding the ESM tokenizer would consider "export " as the start of an ESM declaration.
 * Since we'll need to render a lot of legacy docs, having a line starting with "export "
 * doesn't sound too rare. We don't want to error out on those docs.
 */
export default function hasEsmDeclarations(content: string) {
  return /^(?:export|import)\s+(?:const|let|var|function|class|async|default|\{|\*)\b/m.test(content);
}
