import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, basename, extname } from 'node:path';

export interface RenderContext {
  components: { source: string, tag: string; }[];
  glossary: { definition: string, term: string; }[];
  variables: { defaults: { default: string, name: string; }[]; user: Record<string, string> };
}

interface RawContextJson {
  glossary?: unknown;
  variables?: unknown;
}

export function loadFixture(dir: string): { body: string; ctx: RenderContext } {
  const body = readFileSync(join(dir, 'body.md'), 'utf8');
  // `raw` is typed as `unknown`-ish shape so each field below MUST be
  // narrowed with Array.isArray / object guards before use. Any unguarded
  // property read is a type error.
  const raw: RawContextJson = JSON.parse(
    readFileSync(join(dir, 'context.json'), 'utf8'),
  );
  const components: { source: string, tag: string; }[] = [];

  const compDir = join(dir, 'components');
  // components/ directory is optional — missing dir yields components: [].
  // Only an absent directory is silently tolerated; any other I/O failure
  // (permissions, malformed reads, etc.) must surface rather than masquerade
  // as engine divergence downstream.
  if (existsSync(compDir)) {
    readdirSync(compDir)
      .filter(file => extname(file) === '.mdx')
      .forEach(file => {
        const tag = basename(file, '.mdx');
        const source = readFileSync(join(compDir, file), 'utf8');
        components.push({ tag, source });
      });
  }

  const rawVars: Record<string, unknown> =
    typeof raw.variables === 'object' && raw.variables !== null
      ? (raw.variables as Record<string, unknown>)
      : {};
  const variables: RenderContext['variables'] = {
    defaults: Array.isArray(rawVars.defaults)
      ? (rawVars.defaults as RenderContext['variables']['defaults'])
      : [],
    user:
      typeof rawVars.user === 'object' && rawVars.user !== null
        ? (rawVars.user as RenderContext['variables']['user'])
        : {},
  };

  return {
    body,
    ctx: {
      variables,
      glossary: Array.isArray(raw.glossary)
        ? (raw.glossary as RenderContext['glossary'])
        : [],
      components,
    },
  };
}
