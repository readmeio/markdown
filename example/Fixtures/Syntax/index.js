import callouts from './callouts.md';
import codeBlockTests from './code-blocks/code-block-tests.md';
import codeBlockVarsTest from './code-blocks/vars-test.md';
import codeBlocks from './code-blocks.md';
import embeds from './embeds.md';
import features from './features.md';
import headings from './headings.md';
import images from './images.md';
import lists from './lists.md';
import tables from './tables.md';

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
