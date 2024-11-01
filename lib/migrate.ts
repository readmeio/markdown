import mdx from './mdx';
import mdastV6 from './mdastV6';

const migrate = (doc: string): string => {
  return mdx(mdastV6(doc)).replaceAll(/&#x20;/g, ' ');
};

export default migrate;
