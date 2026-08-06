import { RMDX_BUILTIN_COMPONENT_TAGS } from './rmdxBuiltinComponentTags';
import { scanPascalCaseTags } from './utils/scanPascalCaseTags';

/**
 * Returns unique PascalCase custom component names in an RMDX document.
 * Built-in ReadMe components coerced by `readmeComponentsTransformer` are
 * excluded so the result matches post-mdast semantics without a full parse.
 */
const tags = (doc: string): string[] =>
  scanPascalCaseTags(doc, { exclude: RMDX_BUILTIN_COMPONENT_TAGS });

export default tags;
