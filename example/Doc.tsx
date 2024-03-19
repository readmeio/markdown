import React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import * as mdx from '../index';
import docs from './docs';

const Doc = () => {
  const { fixture } = useParams();
  const [searchParams] = useSearchParams();

  const [name, doc] =
    fixture === 'edited' ? [fixture, searchParams.get('edit') || ''] : [docs[fixture].name, docs[fixture].doc];

  const opts = {
    lazyImages: searchParams.has('lazyImages'),
    safeMode: searchParams.has('safeMode'),
  };

  const Content = mdx.run(String(mdx.react(doc, opts)));

  return (
    <React.Fragment>
      <div className="rdmd-demo--display">
        <section id="hub-content">
          <h2 className="rdmd-demo--markdown-header">{name}</h2>
          <div id="content-container">
            <div className="markdown-body">
              <Content />
            </div>
          </div>
        </section>
      </div>
    </React.Fragment>
  );
};

export default Doc;
