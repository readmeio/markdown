import callouts from '../../docs/callouts.md';
import codeBlocks from '../../docs/code-blocks.md';
import embeds from '../../docs/embeds.md';
import features from '../../docs/features.md';
import headings from '../../docs/headings.md';
import images from '../../docs/images.md';
import lists from '../../docs/lists.md';
import tables from '../../docs/tables.md';

import codeBlockTests from '../../docs/code-block-tests.md';
import codeBlockVarsTest from '../../docs/variable-tests.md';

const lowerCase = str => str.replaceAll(/([a-z])([A-Z])/g, (_, p1, p2) => `${p1} ${p2.toLowerCase()}`);

const fixtureMap = Object.entries({
  codeBlocks,
  codeBlockTests,
  codeBlockVarsTest,
  callouts,
  embeds,
  tables,
  lists,
  headings,
  images,
  features,
}).reduce((memo, [sym, doc]) => {
  const name = lowerCase(sym);
  memo[sym] = { name, doc };
  return memo;
}, {});

const fixtures = new Proxy(fixtureMap, {
  get: (obj, prop) => (prop in obj ? obj[prop] : obj[Object.keys(obj)[0]]),
});

export default fixtures;
