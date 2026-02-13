import type { RMDXModule } from 'types';

import * as rdmd from '@readme/markdown-legacy';
import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

import { TailwindStyle } from '../components';
import * as mdx from '../index';

import components from './components';
import docs from './docs';
import RenderError from './RenderError';

const executedComponents = {};
const componentsByExport = { ...components };
Object.entries(components).forEach(async ([tag, body]) => {
  const mod = await mdx.run(await mdx.compile(body));

  executedComponents[tag] = mod;
  Object.keys(mod).forEach(subTag => {
    if (['toc', 'Toc', 'default', 'stylesheet'].includes(subTag)) return;

    componentsByExport[subTag] = body;
  });
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
  const legacy = searchParams.has('legacy');
  const mdxish = searchParams.has('mdxish');
  const stripComments = searchParams.has('stripComments');
  const lazyImages = searchParams.has('lazyImages');
  const safeMode = searchParams.has('safeMode');
  const copyButtons = searchParams.has('copyButtons');
  const darkModeDataAttribute = searchParams.has('darkModeDataAttribute');

  const [name, doc] =
    fixture === 'edited' ? [fixture, searchParams.get('edit') || ''] : [docs[fixture].name, docs[fixture].doc];

  const [{ default: Content, Toc }, setContent] = useState<Pick<RMDXModule, 'default' | 'Toc'>>({
    default: null,
    Toc: null,
  });
  const [error, setError] = useState<string>(null);
  const [legacyContent, setLegacyContent] = useState<React.ReactNode>(null);

  useEffect(() => {
    const sanitize = async () => {
      console.log('sanitize()', { stripComments });
      if (!stripComments) return doc;
      let sanitized = doc;
      try {
        sanitized = await mdx.stripComments(doc, {
          mdx: !(legacy || mdxish),
          mdxish,
        });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
      }
      console.log({
        before: doc,
        after: sanitized,
      })
      return sanitized;
    };

    const renderRMDX = async () => {
      const opts = {
        lazyImages,
        safeMode,
        copyButtons,
      };

      try {
        const sanitized = await sanitize();
        const code = await mdx.compile(sanitized, {
          ...opts,
          components: componentsByExport,
          useTailwind: true,
        });
        const content = await mdx.run(code, {
          components: executedComponents,
          terms,
          variables,
        });
        setError(() => null);
        setContent(() => content);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        setError(() => e.message);
      }
    };

    const renderXish = async () => {
      try {
        const sanitized = await sanitize();
        const tree = mdx.mdxish(sanitized);
        const vdom = mdx.renderMdxish(tree, { terms, variables });
        setError(() => null);
        setContent(vdom);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        setError(() => e.message);
      }
    };

    const renderRDMD = async () => {
      const sanitized = await sanitize();
      setLegacyContent(rdmd.react(sanitized));
    };

    if (mdxish) {
      renderXish();
    } else if (legacy) {
      renderRDMD();
    } else {
      renderRMDX();
    }
  }, [doc, lazyImages, safeMode, copyButtons, legacy, mdxish, stripComments]);

  useEffect(() => {
    if (error) setError(null);
  }, [error]);

  return (
    <div className="rdmd-demo--display">
      <section id="hub-content">
        {!ci && <h2 className="rdmd-demo--markdown-header">{name}</h2>}
        <div id="content-container">
          <RenderError error={error}>
            <TailwindStyle darkModeDataAttribute={darkModeDataAttribute ? 'data-theme' : null}>
              <div className="markdown-body">{legacy ? legacyContent : Content ? <Content /> : null}</div>
            </TailwindStyle>
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
