import calloutTransformer from './callouts';
import codeTabsTransfromer from './code-tabs';
import embedTransformer from './embeds';
import gemojiTransformer from './gemoji+';
import injectComponents from './inject-components';
import readmeComponentsTransformer from './readme-components';
import readmeToMdx from './readme-to-mdx';
import variables from './variables';

export { readmeComponentsTransformer, readmeToMdx, injectComponents, variables };

export default [calloutTransformer, codeTabsTransfromer, embedTransformer, gemojiTransformer, variables];
