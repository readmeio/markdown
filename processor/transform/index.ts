import calloutTransformer from './callouts';
import codeTabsTransformer from './code-tabs';
import compatabilityTransfomer from './compatability';
import divTransformer from './div';
import embedTransformer from './embeds';
import gemojiTransformer from './gemoji+';
import imageTransformer from './images';
import injectComponents from './inject-components';
import mdxToHast from './mdx-to-hast';
import mermaidTransformer from './mermaid';
import readmeComponentsTransformer from './readme-components';
import readmeToMdx from './readme-to-mdx';
import tablesToJsx from './tables-to-jsx';
import tailwindTransformer from './tailwind';
import trimNullComponents from './trim-null-components';
import variablesTransformer from './variables';

export {
  compatabilityTransfomer,
  divTransformer,
  injectComponents,
  mdxToHast,
  mermaidTransformer,
  readmeComponentsTransformer,
  readmeToMdx,
  tablesToJsx,
  tailwindTransformer,
  trimNullComponents,
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
