import migrateCallouts from '../processor/transform/migrate-callouts';
import migrateHtmlTags from '../processor/transform/migrate-html-tags';
import migrateLinkReferences from '../processor/transform/migrate-link-references';

import mdastV6 from './mdastV6';
import mdx from './mdx';

const COMMENT_BLOCK_REGEX = /{\/\*([\s\S]*?)\*\/}/g;

const compileDocument = (doc: string, { rdmd }): string => {
  const ast = mdastV6(doc, { rdmd });

  return mdx(ast, { remarkTransformers: [migrateCallouts, [migrateLinkReferences, { rdmd }], migrateHtmlTags], file: doc })
    .replaceAll(/&#x20;/g, ' ')
    // @note: I'm not sure what's happening, but I think mdx is converting an
    // 'a' to '&#x61;' as a means of escaping it. I think this helps with
    // parsing weird cases.
    .replaceAll(/&#x61;/g, 'a');
};

const convertComments = (doc: string, opts): string => {
  return doc.replace(COMMENT_BLOCK_REGEX, (match, contents: string) => {
    // Preserve leading and trailing whitespace
    const leadingWhitespace = contents.match(/^\s*/)?.[0] ?? '';
    const trailingWhitespace = contents.match(/\s*$/)?.[0] ?? '';
    const inner = contents.slice(leadingWhitespace.length, contents.length - trailingWhitespace.length);

    // Skip empty comments
    if (!inner.trim()) return match;

    // Compile the inner content through the migration pipeline
    let compiled: string;
    try {
      compiled = compileDocument(inner, opts);
      // Trim trailing whitespace only if inner content had no newlines
      if (!/\r|\n/.test(inner)) {
        compiled = compiled.trimEnd();
      }
    } catch {
      return match;
    }

    // Recursively process any nested comments
    const processed = convertComments(compiled, opts);

    return `{/*${leadingWhitespace}${processed}${trailingWhitespace}*/}`;
  });
};

const migrate = (doc: string, opts): string => {
  return convertComments(compileDocument(doc, opts), opts);
};

export default migrate;
