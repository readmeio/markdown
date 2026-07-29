import fs from 'node:fs';
import path from 'node:path';

import remarkParse from 'remark-parse';
import { unified } from 'unified';

import {
  FEATURES,
  disableConstructs,
  mdxishExtensions,
  type MdxishFeature,
} from '../../../lib/micromark/mdxish-extensions';

// The builder is the single source of truth for MDXish extension registration
// (CX-3708). Its two jobs are (1) always applying the base construct config and
// (2) owning the ordering, which is load-bearing for the `flow` + `<` race.
describe('mdxishExtensions', () => {
  describe('base construct config', () => {
    it('registers the disabled constructs even with no features', () => {
      const { micromarkExtensions } = mdxishExtensions([]);

      expect(micromarkExtensions).toStrictEqual([{ disable: { null: ['codeIndented'] } }]);
    });

    it('appends extra disables on top of the base set instead of replacing it', () => {
      expect(disableConstructs(['list', 'headingAtx'])).toStrictEqual({
        disable: { null: ['codeIndented', 'list', 'headingAtx'] },
      });
    });

    it('keeps the base set intact when a caller mutates the array it passed', () => {
      const extra = ['list'];
      disableConstructs(extra);
      extra.push('thematicBreak');

      expect(disableConstructs()).toStrictEqual({ disable: { null: ['codeIndented'] } });
    });
  });

  describe('ordering', () => {
    const parseWith = (features: MdxishFeature[], doc: string) => {
      const { micromarkExtensions, fromMarkdownExtensions } = mdxishExtensions(features);
      return unified()
        .data('micromarkExtensions', micromarkExtensions)
        .data('fromMarkdownExtensions', fromMarkdownExtensions)
        .use(remarkParse)
        .parse(doc);
    };

    // micromark's combineExtensions prepends per (hook, code), so a later array
    // position is tried FIRST. `htmlBlockComponent` has to outrank `mdxComponent`
    // — `mdxComponent` claims any PascalCase tag outside
    // TOKENIZER_MDX_COMPONENT_EXCLUDED_TAGS, and `HTMLBlock` is not in it.
    const HTML_BLOCK = '<HTMLBlock>{`\n<div>raw</div>\n`}</HTMLBlock>';

    it('lets htmlBlockComponent win the `<` race for <HTMLBlock>', () => {
      const tree = parseWith(['jsxTable', 'mdxComponent', 'htmlBlockComponent'], HTML_BLOCK);

      // htmlBlockComponent claims the whole block as one `html` node; if
      // mdxComponent won instead this would be an mdxJsxFlowElement.
      expect(tree.children).toHaveLength(1);
      expect(tree.children[0].type).toBe('html');
    });

    it('claims <HTMLBlock> the same way regardless of how the caller lists features', () => {
      const backwards = parseWith(['htmlBlockComponent', 'mdxComponent', 'jsxTable'], HTML_BLOCK);

      expect(backwards.children[0].type).toBe('html');
    });

    it('ignores duplicate feature entries', () => {
      const once = mdxishExtensions(['gemoji']);
      const twice = mdxishExtensions(['gemoji', 'gemoji']);

      expect(twice.micromarkExtensions).toHaveLength(once.micromarkExtensions.length);
    });
  });

  describe('feature selection', () => {
    it('only registers the requested features', () => {
      const { micromarkExtensions, fromMarkdownExtensions } = mdxishExtensions(['gemoji', 'legacyVariable']);

      // base disable + the two requested syntax extensions
      expect(micromarkExtensions).toHaveLength(3);
      expect(fromMarkdownExtensions).toHaveLength(2);
    });

    it('registers a fromMarkdown-only feature without adding a syntax extension', () => {
      const { micromarkExtensions, fromMarkdownExtensions } = mdxishExtensions(['emptyTaskListItem']);

      expect(micromarkExtensions).toHaveLength(1); // base disable only
      expect(fromMarkdownExtensions).toHaveLength(1);
    });

    it('returns fresh arrays per call so a caller spreading onto them is isolated', () => {
      const first = mdxishExtensions(['gemoji']);
      first.micromarkExtensions.push({});

      expect(mdxishExtensions(['gemoji']).micromarkExtensions).toHaveLength(2);
    });
  });

  describe('safeMode', () => {
    const EXPRESSION_FEATURES: MdxishFeature[] = ['jsxComment', 'mdxExpressionLenient', 'mdxjsEsm'];

    it('drops every expression-producing extension', () => {
      const open = mdxishExtensions(FEATURES.document);
      const safe = mdxishExtensions(FEATURES.document, { safeMode: true });

      expect(safe.micromarkExtensions).toHaveLength(open.micromarkExtensions.length - EXPRESSION_FEATURES.length);
    });

    it('leaves the non-expression extensions untouched', () => {
      const safe = mdxishExtensions(['gemoji', 'legacyVariable', 'jsxComment'], { safeMode: true });

      // base disable + gemoji + legacyVariable; jsxComment dropped
      expect(safe.micromarkExtensions).toHaveLength(3);
    });

    it('still applies the base construct config', () => {
      const { micromarkExtensions } = mdxishExtensions(FEATURES.document, { safeMode: true });

      expect(micromarkExtensions[0]).toStrictEqual({ disable: { null: ['codeIndented'] } });
    });
  });
});

// The drift this refactor exists to stop is a sub-parser whose hand-maintained
// extension array the shared config never reaches (CX-3705, CX-3739). Sub-parsers
// are still free to register their own subset — what they may not do is opt out of
// the base construct config, so that's what this asserts.
describe('extension registration is centralised (CX-3708)', () => {
  const ROOT = path.resolve(__dirname, '../../..');
  const SEARCH_DIRS = ['lib', 'processor'];

  const walk = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return entry.name === '__tests__' ? [] : walk(full);
      return entry.isFile() && entry.name.endsWith('.ts') ? [full] : [];
    });

  /** Files that register micromark extensions in code (not just in a doc comment). */
  const registrationSites = SEARCH_DIRS.flatMap(dir => walk(path.join(ROOT, dir)))
    .map(file => ({ path: path.relative(ROOT, file), source: fs.readFileSync(file, 'utf8') }))
    .filter(({ source }) =>
      source.split('\n').some(line => line.includes(".data('micromarkExtensions'") && !/^\s*(?:\*|\/\/)/.test(line)),
    );

  it('finds every known sub-parser', () => {
    expect(registrationSites.map(site => site.path).sort()).toStrictEqual([
      'lib/mdxish.ts',
      'lib/mdxishTags.ts',
      'lib/stripComments.ts',
      'processor/transform/mdxish/components/utils.ts',
      'processor/transform/mdxish/magic-blocks/magic-block-transformer.ts',
      'processor/transform/mdxish/tables/mdxish-tables.ts',
    ]);
  });

  it('routes every sub-parser through the shared base construct config', () => {
    const offenders = registrationSites
      .filter(({ source }) => !source.includes('mdxishExtensions(') && !source.includes('disableConstructs('))
      .map(site => site.path);

    expect(offenders).toStrictEqual([]);
  });

  // Every sub-parser but `stripComments` declares its set in FEATURES, so adding
  // a tokenizer means deciding for each row. A preset nobody reads means a site
  // was migrated away or renamed and the map went stale.
  it('has a consumer for every entry in the FEATURES map', () => {
    const sources = registrationSites.map(site => site.source).join('\n');
    const unused = Object.keys(FEATURES).filter(preset => !sources.includes(`FEATURES.${preset}`));

    expect(unused).toStrictEqual([]);
  });

  it('declares every sub-parser in the FEATURES map', () => {
    const offMap = registrationSites.filter(({ source }) => !source.includes('FEATURES.')).map(site => site.path);

    expect(offMap).toStrictEqual([]);
  });
});
