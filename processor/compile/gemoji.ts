import type { Gemoji } from '../../types';

const gemoji = (node: Gemoji) => `:${node.name}:`;

export default gemoji;
