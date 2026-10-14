import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export type CorpusVariant = 'crlf' | 'lf' | 'tabs';

export interface CorpusInput {
  doc: string;
  name: string;
  variant: CorpusVariant;
}

const REPO_ROOT = join(__dirname, '../../../..');
const FIXTURES_DIR = join(REPO_ROOT, '__tests__/regression/fixtures');
const DOCS_DIR = join(REPO_ROOT, 'docs');
const POSITION_FIXTURES_DIR = join(__dirname, 'fixtures');

const LINE_ENDING = /\r?\n/g;
const LEADING_TWO_SPACE_INDENTS = /^(?: {2})+/gm;

const readFixtureBodies = () =>
  readdirSync(FIXTURES_DIR, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && existsSync(join(FIXTURES_DIR, entry.name, 'body.md')))
    .map(entry => ({
      name: `fixtures/${entry.name}`,
      doc: readFileSync(join(FIXTURES_DIR, entry.name, 'body.md'), 'utf8'),
    }));

const readMarkdownFiles = (directory: string, label: string) =>
  readdirSync(directory)
    .filter(file => /\.mdx?$/.test(file))
    .map(file => ({ name: `${label}/${file}`, doc: readFileSync(join(directory, file), 'utf8') }));

// Tabs expand to 4 columns, so swapping 2-space indents also exercises tab column math.
const toTabIndents = (doc: string) => doc.replace(LEADING_TWO_SPACE_INDENTS, indent => '\t'.repeat(indent.length / 2));

/**
 * The regression fixtures, docs pages and position fixtures, each also with CRLF line
 * endings and tab indentation, since both have shifted offsets in the past.
 */
export const buildPositionCorpus = (): CorpusInput[] =>
  [
    ...readFixtureBodies(),
    ...readMarkdownFiles(DOCS_DIR, 'docs'),
    ...readMarkdownFiles(POSITION_FIXTURES_DIR, 'positions'),
  ].flatMap(({ name, doc }) => {
    const inputs: CorpusInput[] = [
      { name, variant: 'lf', doc },
      { name, variant: 'crlf', doc: doc.replace(LINE_ENDING, '\r\n') },
    ];
    const tabbed = toTabIndents(doc);
    if (tabbed !== doc) inputs.push({ name, variant: 'tabs', doc: tabbed });
    return inputs;
  });
