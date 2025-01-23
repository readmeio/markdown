import * as Components from './components';
import { getHref } from './components/Anchor';
import { options } from './options';

import './styles/main.scss';

const utils = {
  get options() {
    return { ...options };
  },

  getHref,
  calloutIcons: {},
};

export { compile, exports, hast, run, mdast, mdastV6, mdx, migrate, plain, remarkPlugins, tags } from './lib';
export { Components, utils };
