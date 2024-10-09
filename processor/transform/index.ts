import calloutTransformer from './callouts';
import codeTabsTransfromer from './code-tabs';
import embedTransformer from './embeds';
import imageTransformer from './images';
import gemojiTransformer from './gemoji+';

import divTransformer from './div';
import injectComponents from './inject-components';
import readmeComponentsTransformer from './readme-components';
import readmeToMdx from './readme-to-mdx';
import variablesTransformer from './variables';
import tablesToJsx from './tables-to-jsx';
import compatabilityTransfomer from './compatability';

export {
  compatabilityTransfomer,
  divTransformer,
  readmeComponentsTransformer,
  readmeToMdx,
  injectComponents,
  variablesTransformer,
  tablesToJsx,
};

export const defaultTransforms = {
  calloutTransformer,
  codeTabsTransfromer,
  embedTransformer,
  imageTransformer,
  gemojiTransformer,
};

export default Object.values(defaultTransforms);
