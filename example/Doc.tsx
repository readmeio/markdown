import React, { FunctionComponent, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import * as mdx from '../index';
import docs from './docs';
import RenderError from './RenderError';

const Doc = () => {
  const { fixture } = useParams();
  const [searchParams] = useSearchParams();
  const ci = searchParams.has('ci');
  const lazyImages = searchParams.has('lazyImages');
  const safeMode = searchParams.has('safeMode');

  const [name, doc] =
    fixture === 'edited' ? [fixture, searchParams.get('edit') || ''] : [docs[fixture].name, docs[fixture].doc];

  const [Content, setContent] = useState<FunctionComponent>(null);
  const [error, setError] = useState<string>(null);

  useEffect(() => {
    const render = async () => {
      const opts = {
        lazyImages,
        safeMode,
      };

      try {
        const code = mdx.compile(doc, opts);
        const content = await mdx.run(code);

        setError(() => null);
        setContent(() => content);
      } catch (e) {
        setError(() => e.message);
      }
    };

    render();
  }, [doc, lazyImages, safeMode]);

  console.log(mdx.mdx(mdx.mdast(doc)));

  return (
    <React.Fragment>
      <div className="rdmd-demo--display">
        <section id="hub-content">
          {!ci && <h2 className="rdmd-demo--markdown-header">{name}</h2>}
          <div id="content-container">
            <RenderError error={error}>
              <div className="markdown-body">{Content && <Content />}</div>
            </RenderError>
          </div>
        </section>
      </div>
    </React.Fragment>
  );
};

export default Doc;
