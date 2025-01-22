import { visit } from 'unist-util-visit';
import mdast from './mdast';
import { isMDXEsm } from '../processor/utils';
import { MdxjsEsm } from 'mdast-util-mdx';

const EXPORT_NAME_REGEX = /export\s+(?:const|let|var|function)\s+(\w+)/;

const exports = (doc: string) => {
  const set = new Set<string>();

  visit(mdast(doc), isMDXEsm, (node: MdxjsEsm) => {
    if (node.value?.match(EXPORT_NAME_REGEX)) {
      const [, name] = node.value.match(EXPORT_NAME_REGEX);
      set.add(name);
    }
  });

  return Array.from(set);
};

export default exports;
