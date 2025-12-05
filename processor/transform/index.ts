import calloutTransformer from './callouts';
import codeTabsTransformer from './code-tabs';
import compatabilityTransfomer from './compatability';
import divTransformer from './div';
import embedTransformer from './embeds';
import gemojiTransformer from './gemoji+';
import handleMissingComponents from './handle-missing-components';
import imageTransformer from './images';
import injectComponents from './inject-components';
import mdxToHast from './mdx-to-hast';
import mdxishTables from './mdxish/mdxish-tables';
import mermaidTransformer from './mermaid';
import readmeComponentsTransformer from './readme-components';
import readmeToMdx from './readme-to-mdx';
import tablesToJsx from './tables-to-jsx';
import tailwindTransformer from './tailwind';
import validateMCPIntro from './validate-mcpintro';
import variablesTransformer from './variables';

export {
  compatabilityTransfomer,
  divTransformer,
  injectComponents,
  mdxToHast,
  mdxishTables,
  mermaidTransformer,
  readmeComponentsTransformer,
  readmeToMdx,
  tablesToJsx,
  tailwindTransformer,
  handleMissingComponents,
  validateMCPIntro,
  variablesTransformer,
};

export const defaultTransforms = {
  calloutTransformer,
  codeTabsTransformer,
  embedTransformer,
  imageTransformer,
  gemojiTransformer,
};

export const mdxishTransformers = [calloutTransformer, codeTabsTransformer, imageTransformer, gemojiTransformer];

export default Object.values(defaultTransforms);
