import React, { FunctionComponent, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import * as mdx from '../index';
import docs from './docs';
import RenderError from './RenderError';
import { MDXContent, MDXModule } from 'mdx/types';

const mdxComponents = {
  Demo: `
## This is a Demo Component!

> 📘 It can render JSX components!
`,
};

const components = {};
Object.keys(mdxComponents).forEach(async comp => {
  components[comp] = await mdx.run(mdx.compile(comp));
});

const terms = [
  {
    term: 'demo',
    definition: 'a thing that breaks on presentation',
  },
  {
    term: 'exogenous',
    definition: 'relating to or developing from external factors',
  },
  {
    term: 'endogenous',
    definition: 'having an internal cause or origin',
  },
];

const Doc = () => {
  const { fixture } = useParams();
  const [searchParams] = useSearchParams();
  const ci = searchParams.has('ci');
  const lazyImages = searchParams.has('lazyImages');
  const safeMode = searchParams.has('safeMode');

  const [name, doc] =
    fixture === 'edited' ? [fixture, searchParams.get('edit') || ''] : [docs[fixture].name, docs[fixture].doc];

  const [{ default: Content, toc: Toc }, setContent] = useState<{ default: MDXContent; toc?: MDXContent }>({
    default: null,
    toc: null,
  });
  const [error, setError] = useState<string>(null);

  useEffect(() => {
    const render = async () => {
      const opts = {
        lazyImages,
        safeMode,
      };

      try {
        const code = mdx.compile(doc, opts);
        const content = await mdx.run(code, { components, terms });

        setError(() => null);
        setContent(() => content);
      } catch (e) {
        setError(() => e.message);
      }
    };

    render();
  }, [doc, lazyImages, safeMode]);

  return (
    <div className="rdmd-demo--display">
      <section id="hub-content">
        {!ci && <h2 className="rdmd-demo--markdown-header">{name}</h2>}
        <div id="content-container">
          <RenderError error={error}>
            <div className="markdown-body">{Content && <Content />}</div>
          </RenderError>
          {Toc && (
            <div className="content-toc">
              <Toc />
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Doc;
