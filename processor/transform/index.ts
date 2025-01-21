import calloutTransformer from './callouts';
import codeTabsTransformer from './code-tabs';
import embedTransformer from './embeds';
import imageTransformer from './images';
import gemojiTransformer from './gemoji+';

import compatabilityTransfomer from './compatability';
import divTransformer from './div';
import injectComponents from './inject-components';
import mdxToHast from './mdx-to-hast';
import mermaidTransformer from './mermaid';
import readmeComponentsTransformer from './readme-components';
import readmeToMdx from './readme-to-mdx';
import tablesToJsx from './tables-to-jsx';
import variablesTransformer from './variables';
import tailwindRootTransformer from './tailwind-root';

export {
  compatabilityTransfomer,
  divTransformer,
  injectComponents,
  mdxToHast,
  mermaidTransformer,
  readmeComponentsTransformer,
  readmeToMdx,
  tablesToJsx,
  tailwindRootTransformer,
  variablesTransformer,
};

export const defaultTransforms = {
  calloutTransformer,
  codeTabsTransformer,
  embedTransformer,
  imageTransformer,
  gemojiTransformer,
};

export default Object.values(defaultTransforms);
