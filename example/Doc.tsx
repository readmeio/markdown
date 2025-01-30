import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import * as mdx from '../index';
import docs from './docs';
import RenderError from './RenderError';
import { MDXContent } from 'mdx/types';
import components from './components';

const executedComponents = {};
Object.entries(components).forEach(async ([tag, body]) => {
  executedComponents[tag] = await mdx.run(mdx.compile(body));
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

const variables = {
  user: {
    email: 'kelly@readme.io',
    name: 'kelly joseph price',
  },
  defaults: [
    {
      name: 'defvar',
      default: '(default value for defvar)',
    },
  ],
};

const Doc = () => {
  const { fixture } = useParams();
  const [searchParams] = useSearchParams();
  const ci = searchParams.has('ci');
  const lazyImages = searchParams.has('lazyImages');
  const safeMode = searchParams.has('safeMode');
  const copyButtons = searchParams.has('copyButtons');

  const [name, doc] =
    fixture === 'edited' ? [fixture, searchParams.get('edit') || ''] : [docs[fixture].name, docs[fixture].doc];

  const [{ default: Content, Toc }, setContent] = useState<{ default: MDXContent; Toc?: MDXContent }>({
    default: null,
    Toc: null,
  });
  const [error, setError] = useState<string>(null);

  useEffect(() => {
    const render = async () => {
      const opts = {
        lazyImages,
        safeMode,
        copyButtons,
      };

      try {
        const code = mdx.compile(doc, { ...opts, components: executedComponents });
        const content = await mdx.run(code, { components: executedComponents, terms, variables });

        setError(() => null);
        setContent(() => content);
      } catch (e) {
        console.error(e);
        setError(() => e.message);
      }
    };

    render();
  }, [doc, lazyImages, safeMode, copyButtons]);

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
