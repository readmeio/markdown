import calloutTests from '../__tests__/fixtures/callout-tests.md';
import callouts from '../docs/callouts.md';
import codeBlockTests from '../__tests__/fixtures/code-block-tests.md';
import codeBlocks from '../docs/code-blocks.md';
import embeds from '../docs/embeds.md';
import exportTests from '../__tests__/fixtures/export-tests.mdx';
import features from '../docs/features.md';
import gettingStarted from '../docs/getting-started.md';
import headings from '../docs/headings.md';
import images from '../docs/images.md';
import imageTests from '../__tests__/fixtures/image-tests.mdx';
import lists from '../docs/lists.md';
import mdxComponents from '../docs/mdx-components.mdx';
import builtInComponents from '../docs/built-in-components.mdx';
import mermaid from '../docs/mermaid.md';
import sanitizingTests from '../__tests__/fixtures/sanitizing-tests.md';
import tableOfContentsTests from '../__tests__/fixtures/table-of-contents-tests.md';
import tables from '../docs/tables.md';
import varsTest from '../__tests__/fixtures/variable-tests.md';

const lowerCase = (str: string) =>
  str.replaceAll(/([a-z])([A-Z])/g, (_: string, p1: string, p2: string) => `${p1} ${p2.toLowerCase()}`);

const fixtures = Object.entries({
  calloutTests,
  callouts,
  codeBlockTests,
  codeBlocks,
  embeds,
  exportTests,
  features,
  gettingStarted,
  headings,
  images,
  imageTests,
  lists,
  mdxComponents,
  builtInComponents,
  mermaid,
  sanitizingTests,
  tableOfContentsTests,
  tables,
  varsTest,
}).reduce((memo, [sym, doc]) => {
  const name = lowerCase(sym);
  memo[sym] = { name, doc };
  return memo;
}, {});

export default fixtures;
