const COMMENT_BLOCK_REGEX = /{\/\*([\s\S]*?)\*\/}/g;

const migrateComments = (doc: string, migrateDoc: (doc: string, opts) => string, opts): string => {
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
      compiled = migrateDoc(inner, opts);
      // Trim trailing whitespace only if inner content had no newlines
      if (!/\r|\n/.test(inner)) {
        compiled = compiled.trimEnd();
      }
    } catch {
      return match;
    }

    // Recursively process any nested comments
    const processed = migrateComments(compiled, migrateDoc, opts);

    return `{/*${leadingWhitespace}${processed}${trailingWhitespace}*/}`;
  });
};

export default migrateComments;