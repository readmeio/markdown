import migrateCallouts from '../processor/transform/migrate-callouts';
import migrateHtmlTags from '../processor/transform/migrate-html-tags';
import migrateLinkReferences from '../processor/transform/migrate-link-references';

import mdastV6 from './mdastV6';
import mdx from './mdx';

const migrate = (doc: string, { rdmd }): string => {
  const ast = mdastV6(doc, { rdmd });

  return (
    mdx(ast, { remarkTransformers: [migrateCallouts, [migrateLinkReferences, { rdmd }], migrateHtmlTags], file: doc })
      .replaceAll(/&#x20;/g, ' ')
      // @note: I'm not sure what's happening, but I think mdx is converting an
      // 'a' to '&#x61;' as a means of escaping it. I think this helps with
      // parsing weird cases.
      .replaceAll(/&#x61;/g, 'a')
  );
};

export default migrate;
