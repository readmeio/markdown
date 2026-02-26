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
  const showRmdx = searchParams.has('rmdx');

  type PipelineKey = 'legacy' | 'mdxish' | 'rmdx';
  const activePipelines: PipelineKey[] = [];
  if (showRmdx) activePipelines.push('rmdx');
  if (legacy) activePipelines.push('legacy');
  if (mdxish) activePipelines.push('mdxish');
  const stripComments = searchParams.has('stripComments');
  const lazyImages = searchParams.has('lazyImages');
  const safeMode = searchParams.has('safeMode');
  const copyButtons = searchParams.has('copyButtons');
  const darkModeDataAttribute = searchParams.has('darkModeDataAttribute');

  const [name, doc] =
    fixture === 'edited' ? [fixture, searchParams.get('edit') || ''] : [docs[fixture].name, docs[fixture].doc];

  const [rmdxResult, setRmdxResult] = useState<Pick<RMDXModule, 'default' | 'Toc'>>({ default: null, Toc: null });
  const [rmdxError, setRmdxError] = useState<string | null>(null);
  const [mdxishResult, setMdxishResult] = useState<Pick<RMDXModule, 'default' | 'Toc'>>({ default: null, Toc: null });
  const [mdxishError, setMdxishError] = useState<string | null>(null);
  const [legacyContent, setLegacyContent] = useState<React.ReactNode>(null);
  const [legacyError, setLegacyError] = useState<string | null>(null);
  const [strippedMarkdown, setStrippedMarkdown] = useState<string | null>(null);
  const [stripError, setStripError] = useState<string | null>(null);
  const [view, setView] = useState<'markdown' | 'rendered'>('rendered');

  useEffect(() => {
    const sanitize = async (mode: PipelineKey) => {
      if (!stripComments) {
        setStrippedMarkdown(null);
        setStripError(null);
        return doc;
      }
      try {
        const sanitized = await mdx.stripComments(doc, {
          mdx: mode === 'rmdx',
          mdxish: mode === 'mdxish',
        });
        setStrippedMarkdown(sanitized);
        setStripError(null);
        return sanitized;
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        const message = e instanceof Error ? e.message : String(e);
        setStripError(message);
        setStrippedMarkdown(null);
        return null;
      }
    };

    const renderRMDX = async () => {
      const opts = { lazyImages, safeMode, copyButtons };
      try {
        const sanitized = await sanitize('rmdx');
        if (sanitized === null) return;
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
        setRmdxError(null);
        setRmdxResult(content);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        setRmdxError(e.message);
      }
    };

    const renderXish = async () => {
      try {
        const sanitized = await sanitize('mdxish');
        if (sanitized === null) return;
        const tree = mdx.mdxish(sanitized, { variables });
        const vdom = mdx.renderMdxish(tree, { terms, variables });
        setMdxishError(null);
        setMdxishResult(vdom);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        setMdxishError(e.message);
      }
    };

    const renderRDMD = async () => {
      const opts = { lazyImages, safeMode, copyButtons };
      try {
        const sanitized = await sanitize('legacy');
        if (sanitized === null) return;
        const { VariablesContext, GlossaryContext } = rdmd.utils;
        setLegacyError(null);
        setLegacyContent(
          <VariablesContext.Provider value={variables}>
            <GlossaryContext.Provider value={terms}>{rdmd.react(sanitized, opts)}</GlossaryContext.Provider>
          </VariablesContext.Provider>,
        );
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        setLegacyError(e.message);
      }
    };

    if (showRmdx) renderRMDX();
    if (mdxish) renderXish();
    if (legacy) renderRDMD();
  }, [doc, lazyImages, safeMode, copyButtons, showRmdx, legacy, mdxish, stripComments]);


  const darkMode = darkModeDataAttribute ? 'data-theme' : null;

  const renderPanel = (pipeline: PipelineKey) => {
    const error = pipeline === 'rmdx' ? rmdxError : pipeline === 'mdxish' ? mdxishError : legacyError;

    const content = (() => {
      switch (pipeline) {
        case 'rmdx': {
          const { default: RmdxContent } = rmdxResult;
          return RmdxContent ? <RmdxContent /> : null;
        }
        case 'mdxish': {
          const { default: MdxishContent } = mdxishResult;
          return MdxishContent ? <MdxishContent /> : null;
        }
        case 'legacy':
          return legacyContent;
        default:
          return null;
      }
    })();

    return (
      <>
        {error && (
          <div className="rdmd-demo--strip-error">
            <strong>Render error:</strong> {error}
          </div>
        )}
        <RenderError>
          <TailwindStyle darkModeDataAttribute={darkMode}>
            <div className="markdown-body">{content}</div>
          </TailwindStyle>
        </RenderError>
      </>
    );
  };

  const pipelineLabels: Record<PipelineKey, string> = {
    rmdx: 'RMDX',
    legacy: 'RDMD (legacy)',
    mdxish: 'MDXish',
  };

  return (
    <div className="rdmd-demo--display">
      <section id="hub-content">
        {!ci && <h2 className="rdmd-demo--markdown-header">{name}</h2>}
        {strippedMarkdown !== null && (
          <div className="rdmd-demo--view-toggle">
            <button
              className={view === 'rendered' ? 'active' : ''}
              onClick={() => setView('rendered')}
              type="button"
            >
              Rendered
            </button>
            <button
              className={view === 'markdown' ? 'active' : ''}
              onClick={() => setView('markdown')}
              type="button"
            >
              Markdown
            </button>
          </div>
        )}
        {stripError && (
          <div className="rdmd-demo--strip-error">
            <strong>stripComments error:</strong> {stripError}
          </div>
        )}
        {view === 'markdown' && strippedMarkdown !== null ? (
          <pre className="rdmd-demo--stripped-output">{strippedMarkdown}</pre>
        ) : activePipelines.length === 0 ? (
          <p className="rdmd-demo--empty">Please select a rendering pipeline...</p>
        ) : activePipelines.length === 1 ? (
          <div id="content-container">
            {renderPanel(activePipelines[0])}
            {activePipelines[0] === 'rmdx' && rmdxResult.Toc && (
              <div className="content-toc"><rmdxResult.Toc /></div>
            )}
          </div>
        ) : (
          <div className="rdmd-demo--panels">
            {activePipelines.map(p => (
              <div key={p} className="rdmd-demo--panel">
                <div className="rdmd-demo--panel-label">{pipelineLabels[p]}</div>
                {renderPanel(p)}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Doc;
