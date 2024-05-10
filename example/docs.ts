// @ts-ignore
import calloutTests from '../docs/callout-tests.md';
// @ts-ignore
import callouts from '../docs/callouts.md';
// @ts-ignore
import codeBlockTests from '../docs/code-block-tests.md';
// @ts-ignore
import codeBlocks from '../docs/code-blocks.md';
// @ts-ignore
import embeds from '../docs/embeds.md';
// @ts-ignore
import features from '../docs/features.md';
// @ts-ignore
import gettingStarted from '../docs/getting-started.md';
// @ts-ignore
import headings from '../docs/headings.md';
// @ts-ignore
import images from '../docs/images.md';
// @ts-ignore
import lists from '../docs/lists.md';
// @ts-ignore
import mdxComponents from '../docs/mdx-components.mdx';
// @ts-ignore
import sanitizingTests from '../docs/sanitizing-tests.md';
// @ts-ignore
import tableOfContentsTests from '../docs/table-of-contents-tests.md';
// @ts-ignore
import tables from '../docs/tables.md';
// @ts-ignore
import varsTest from '../docs/variable-tests.md';

const lowerCase = (str: string) =>
  str.replaceAll(/([a-z])([A-Z])/g, (_: string, p1: string, p2: string) => `${p1} ${p2.toLowerCase()}`);

const fixtures = Object.entries({
  calloutTests,
  callouts,
  codeBlockTests,
  codeBlocks,
  embeds,
  features,
  gettingStarted,
  headings,
  images,
  lists,
  mdxComponents,
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
