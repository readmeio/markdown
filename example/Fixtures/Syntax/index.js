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

const fixtures = Object.entries({
  callouts,
  codeBlockTests,
  codeBlockVarsTest,
  codeBlocks,
  embeds,
  features,
  headings,
  images,
  lists,
  tables,
}).reduce((memo, [name, doc]) => {
  memo[name] = { name, doc };
  return memo;
}, {});

export default fixtures;
