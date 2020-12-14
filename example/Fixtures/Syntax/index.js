import { lowerCase } from 'lodash';

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
  memo[name] = { name, doc };
  return memo;
}, {});

export default fixtures;
