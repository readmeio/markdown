import mdast from './mdast';
import { getExports } from '../processor/utils';

const exports = (doc: string) => {
  return getExports(mdast(doc));
};

export default exports;

