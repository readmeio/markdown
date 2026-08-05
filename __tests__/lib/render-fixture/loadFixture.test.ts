import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { loadFixture } from '../../../lib/render-fixture/loadFixture';

const FIXTURES_DIR = join(__dirname, '..', '..', 'regression', 'fixtures');

describe('loadFixture', () => {
  describe('convergent fixture', () => {
    it('returns a non-empty body string', () => {
      const { body } = loadFixture(join(FIXTURES_DIR, 'convergent'));
      expect(typeof body).toBe('string');
      expect(body.length).toBeGreaterThan(0);
    });

    it('returns ctx.variables with defaults array and user object', () => {
      const { ctx } = loadFixture(join(FIXTURES_DIR, 'convergent'));
      expect(ctx.variables).toBeDefined();
      expect(Array.isArray(ctx.variables.defaults)).toBe(true);
      expect(typeof ctx.variables.user).toBe('object');
    });

    it('returns ctx.glossary as an array', () => {
      const { ctx } = loadFixture(join(FIXTURES_DIR, 'convergent'));
      expect(Array.isArray(ctx.glossary)).toBe(true);
    });

    it('loads components from components/ directory', () => {
      const { ctx } = loadFixture(join(FIXTURES_DIR, 'convergent'));
      expect(ctx.components.length).toBeGreaterThan(0);
    });

    it('registers Note.mdx as tag "Note" with non-empty source', () => {
      const { ctx } = loadFixture(join(FIXTURES_DIR, 'convergent'));
      const noteBlock = ctx.components.find(c => c.tag === 'Note');
      expect(noteBlock).toBeDefined();
      expect(typeof noteBlock!.source).toBe('string');
      expect(noteBlock!.source.length).toBeGreaterThan(0);
    });
  });

  describe('divergent fixture', () => {
    it('returns a non-empty body string', () => {
      const { body } = loadFixture(join(FIXTURES_DIR, 'divergent'));
      expect(typeof body).toBe('string');
      expect(body.length).toBeGreaterThan(0);
    });

    it('returns ctx.variables with defaults array and user object', () => {
      const { ctx } = loadFixture(join(FIXTURES_DIR, 'divergent'));
      expect(ctx.variables).toBeDefined();
      expect(Array.isArray(ctx.variables.defaults)).toBe(true);
      expect(typeof ctx.variables.user).toBe('object');
    });

    it('returns ctx.glossary as an array', () => {
      const { ctx } = loadFixture(join(FIXTURES_DIR, 'divergent'));
      expect(Array.isArray(ctx.glossary)).toBe(true);
    });

    it('loads with ctx.components as [] when no components/ directory exists', () => {
      const { ctx } = loadFixture(join(FIXTURES_DIR, 'divergent'));
      expect(ctx.components).toStrictEqual([]);
    });
  });

  describe('context.json defaults', () => {
    it('uses { defaults: [], user: {} } when variables key is fully specified as such', () => {
      // Both checked-in fixtures specify variables fully — this case exercises
      // the "specified-as-empty" path. The truly-absent path is covered below
      // via an inline temp dir.
      const { ctx } = loadFixture(join(FIXTURES_DIR, 'convergent'));
      expect(ctx.variables.defaults).toStrictEqual([]);
      expect(ctx.variables.user).toStrictEqual({});
    });

    it('defaults glossary to [] when absent', () => {
      const { ctx } = loadFixture(join(FIXTURES_DIR, 'convergent'));
      expect(ctx.glossary).toStrictEqual([]);
    });

    describe('with an inline temp fixture (true absent-key coverage)', () => {
      // Create a minimal fixture where context.json OMITS the variables key
      // entirely, to exercise the runtime fallback in loadFixture rather than
      // the "specified-as-empty" path. Same pattern is used for the partial
      // case (variables.defaults present, user omitted).
      let tmpRoot: string;

      beforeAll(() => {
        tmpRoot = mkdtempSync(join(tmpdir(), 'loadFixture-defaults-'));

        // Variant A: variables key entirely absent.
        const absentDir = join(tmpRoot, 'absent');
        mkdirSync(absentDir);
        writeFileSync(join(absentDir, 'body.md'), '# absent\n');
        writeFileSync(join(absentDir, 'context.json'), JSON.stringify({}));

        // Variant B: variables.defaults present, variables.user omitted.
        const partialDir = join(tmpRoot, 'partial');
        mkdirSync(partialDir);
        writeFileSync(join(partialDir, 'body.md'), '# partial\n');
        writeFileSync(
          join(partialDir, 'context.json'),
          JSON.stringify({
            variables: { defaults: [{ name: 'foo', default: 'bar' }] },
          }),
        );
      });

      afterAll(() => {
        rmSync(tmpRoot, { recursive: true, force: true });
      });

      it('defaults variables to { defaults: [], user: {} } when the key is absent', () => {
        const { ctx } = loadFixture(join(tmpRoot, 'absent'));
        expect(ctx.variables).toStrictEqual({ defaults: [], user: {} });
      });

      it('defaults variables.user to {} when only variables.defaults is provided', () => {
        const { ctx } = loadFixture(join(tmpRoot, 'partial'));
        expect(ctx.variables.defaults).toStrictEqual([{ name: 'foo', default: 'bar' }]);
        // user was undefined under the old `??` fallback when `defaults` was
        // specified but `user` was omitted; both must always be populated.
        expect(ctx.variables.user).toStrictEqual({});
      });
    });
  });

  describe('components/ filtering', () => {
    it('ignores non-.mdx files in components/', () => {
      // The convergent fixture only has Note.mdx — exactly 1 component
      const { ctx } = loadFixture(join(FIXTURES_DIR, 'convergent'));
      expect(ctx.components).toHaveLength(1);
      expect(ctx.components[0].tag).toBe('Note');
    });
  });
});
