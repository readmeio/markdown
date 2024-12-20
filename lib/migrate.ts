import mdx from './mdx';
import mdastV6 from './mdastV6';

const migrate = (doc: string, { rdmd }): string => {
  return mdx(mdastV6(doc, { rdmd })).replaceAll(/&#x20;/g, ' ');
};

export default migrate;
