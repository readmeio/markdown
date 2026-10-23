import type { MdxishOpts } from '../../lib/mdxish';
import type { Node } from 'unist';

import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { loadFixture } from '../../lib/render-fixture';
import { parseMdxishWithSource } from '../helpers';

const FIXTURES_DIR = join(__dirname, 'fixtures');

const describeRange = (node: Node) => `${node.type} ${node.position?.start.offset}-${node.position?.end.offset}`;

/**
 * Every positioned node whose range falls outside the document or its nearest positioned ancestor.
 * A sub-parser that inserts nodes without mapping them onto the page leaves snippet offsets that land here.
 */
const misplacedNodes = (tree: Node, source: string): string[] => {
  const misplaced: string[] = [];
  const visit = (node: Node, ancestor: Node | undefined) => {
    const range = node.position && { start: node.position.start.offset ?? 0, end: node.position.end.offset ?? 0 };
    if (range) {
      const outer = ancestor?.position
        ? { start: ancestor.position.start.offset ?? 0, end: ancestor.position.end.offset ?? 0 }
        : { start: 0, end: source.length };
      if (range.start < outer.start || range.end > outer.end || range.start > range.end) {
        misplaced.push(`${describeRange(node)} outside ${ancestor ? describeRange(ancestor) : 'document'}`);
      }
    }
    if ('children' in node && Array.isArray(node.children)) {
      node.children.forEach((child: Node) => visit(child, range ? node : ancestor));
    }
  };
  visit(tree, undefined);
  return misplaced;
};

describe('mdxish node positions', () => {
  const fixtures = readdirSync(FIXTURES_DIR, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name);

  describe.each([
    ['renderer', {}],
    ['editor', { newEditorTypes: true }],
  ] satisfies [string, MdxishOpts][])('%s', (_mode, opts) => {
    it.each(fixtures)('%s keeps every node inside its parent and the document', fixture => {
      const { body } = loadFixture(join(FIXTURES_DIR, fixture));
      const { source, tree } = parseMdxishWithSource(body, opts);

      expect(misplacedNodes(tree, source)).toStrictEqual([]);
    });
  });
});
