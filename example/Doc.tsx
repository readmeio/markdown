import React, { Fragment, FunctionComponent, useEffect, useState } from 'react';
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

  useEffect(() => {
    const render = async () => {
      const opts = {
        lazyImages,
        safeMode,
      };

      const code = mdx.compile(doc, opts);
      const content = await mdx.run(code);

      setContent(() => content);
    };
    render();
  }, [doc, lazyImages, safeMode]);

  return (
    <React.Fragment>
      <div className="rdmd-demo--display">
        <section id="hub-content">
          {!ci && <h2 className="rdmd-demo--markdown-header">{name}</h2>}
          <div id="content-container">
            <RenderError>
              <div className="markdown-body">{Content && <Content />}</div>
            </RenderError>
          </div>
        </section>
      </div>
    </React.Fragment>
  );
};

export default Doc;
