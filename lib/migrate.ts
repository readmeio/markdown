import mdastV6 from './mdastV6';
import mdx from './mdx';

const migrate = (doc: string, { rdmd }): string => {
  return (
    mdx(mdastV6(doc, { rdmd }))
      .replaceAll(/&#x20;/g, ' ')
      // @note: I'm not sure what's happening, but I think mdx is converting an
      // 'a' to '&#x61;' as a means of escaping it. I think this helps with
      // parsing weird cases.
      .replaceAll(/&#x61;/g, 'a')
  );
};

export default migrate;
