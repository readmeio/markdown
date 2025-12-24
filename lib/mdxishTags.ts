import { extractMagicBlocks } from './utils/extractMagicBlocks';

const tags = (doc: string) => {
  const { replaced: sanitizedDoc } = extractMagicBlocks(doc);

  const set = new Set<string>();


  const componentPattern = /<\/?([A-Z][A-Za-z0-9_]*)(?:\s[^>]*)?\/?>/g;
  let match: RegExpExecArray | null;
  while ((match = componentPattern.exec(sanitizedDoc)) !== null) {
    const tagName = match[1];
    set.add(tagName);
  }

  return Array.from(set);
};

export default tags;
