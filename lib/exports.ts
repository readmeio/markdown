import { getExports } from '../processor/utils';

import mdast from './mdast';

const exports = (doc: string) => {
  return getExports(mdast(doc));
};

export default exports;
