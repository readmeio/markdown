import calloutTests from '../docs/callout-tests.md';
import callouts from '../docs/callouts.md';
import codeBlockTests from '../docs/code-block-tests.md';
import codeBlocks from '../docs/code-blocks.md';
import embeds from '../docs/embeds.md';
import features from '../docs/features.md';
import gettingStarted from '../docs/getting-started.md';
import headings from '../docs/headings.md';
import images from '../docs/images.md';
import lists from '../docs/lists.md';
import sanitizingTests from '../docs/sanitizing-tests.md';
import tableOfContentsTests from '../docs/table-of-contents-tests.md';
import tablesTests from '../docs/tables-tests.md';
import tables from '../docs/tables.md';
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
  sanitizingTests,
  tableOfContentsTests,
  tables,
  tablesTests,
  varsTest,
}).reduce((memo, [sym, doc]) => {
  const name = lowerCase(sym);
  memo[sym] = { name, doc };
  return memo;
}, {});

export default fixtures;
