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
    // This is add the sub components to the executedComponents object and mdxish
    executedComponents[subTag] = { default: mod[subTag], Toc: null, toc: [] };
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

interface StripState {
  error: string | null;
  stripped: string | null;
}

type PipelineKey = 'legacy' | 'mdxish' | 'rmdx';

const EMPTY_STRIP_STATE: StripState = { error: null, stripped: null };
const EMPTY_STRIP_STATE_MAP: Record<PipelineKey, StripState> = {
  legacy: EMPTY_STRIP_STATE,
  mdxish: EMPTY_STRIP_STATE,
  rmdx: EMPTY_STRIP_STATE,
};

const Doc = () => {
  const { fixture } = useParams();
  const [searchParams] = useSearchParams();
  const ci = searchParams.has('ci');
  const legacy = searchParams.has('legacy');
  const mdxish = searchParams.has('mdxish');
  const showRmdx = searchParams.has('rmdx');

  const selectedPipelines: PipelineKey[] = [];
  if (showRmdx) selectedPipelines.push('rmdx');
  if (legacy) selectedPipelines.push('legacy');
  if (mdxish) selectedPipelines.push('mdxish');
  const activePipelines = selectedPipelines.length > 0 ? selectedPipelines : (['rmdx'] as PipelineKey[]);
  const stripComments = searchParams.has('stripComments');
  const lazyImages = searchParams.has('lazyImages');
  const safeMode = searchParams.has('safeMode');
  const copyButtons = searchParams.has('copyButtons');
  const darkModeDataAttribute = searchParams.has('darkModeDataAttribute');
  const showAst = searchParams.has('showAst');
  const newEditorTypes = searchParams.has('newEditorTypes');

  const [name, doc] =
    fixture === 'edited' ? [fixture, searchParams.get('edit') || ''] : [docs[fixture].name, docs[fixture].doc];

  const [rmdxResult, setRmdxResult] = useState<Pick<RMDXModule, 'default' | 'Toc'>>({ default: null, Toc: null });
  const [rmdxError, setRmdxError] = useState<string | null>(null);
  const [mdxishResult, setMdxishResult] = useState<Pick<RMDXModule, 'default' | 'Toc'>>({ default: null, Toc: null });
  const [mdxishError, setMdxishError] = useState<string | null>(null);
  const [legacyContent, setLegacyContent] = useState<React.ReactNode>(null);
  const [legacyError, setLegacyError] = useState<string | null>(null);
  const [rmdxMdast, setRmdxMdast] = useState<object | null>(null);
  const [rmdxHast, setRmdxHast] = useState<object | null>(null);
  const [mdxishMdast, setMdxishMdast] = useState<object | null>(null);
  const [mdxishHast, setMdxishHast] = useState<object | null>(null);
  const [stripByPipeline, setStripByPipeline] = useState<Record<PipelineKey, StripState>>(EMPTY_STRIP_STATE_MAP);
  const hasAnyStripped = Object.values(stripByPipeline).some(s => s.stripped !== null);
  const [view, setView] = useState<'hast' | 'markdown' | 'mdast' | 'rendered'>('rendered');
  const showToc = fixture === 'tableOfContentsTests';

  useEffect(() => {
    if ((view === 'mdast' || view === 'hast') && !showAst) setView('rendered');
    if (view === 'markdown' && !stripComments) setView('rendered');
  }, [showAst, stripComments, view]);

  useEffect(() => {
    const sanitize = async (mode: PipelineKey) => {
      if (!stripComments) {
        setStripByPipeline(prev => ({ ...prev, [mode]: EMPTY_STRIP_STATE }));
        return doc;
      }
      try {
        const sanitized = await mdx.stripComments(doc, {
          mdx: mode === 'rmdx',
          mdxish: mode === 'mdxish',
        });
        setStripByPipeline(prev => ({ ...prev, [mode]: { stripped: sanitized, error: null } }));
        return sanitized;
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
        const message = e instanceof Error ? e.message : String(e);
        setStripByPipeline(prev => ({ ...prev, [mode]: { stripped: null, error: message } }));
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
        if (showAst) {
          try {
            setRmdxMdast(mdx.mdast(sanitized, { ...opts, components: componentsByExport }));
          } catch {
            setRmdxMdast(null);
          }
          try {
            setRmdxHast(mdx.hast(sanitized, { ...opts, components: componentsByExport }));
          } catch {
            setRmdxHast(null);
          }
        }
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
        const tree = mdx.mdxish(sanitized, { components: executedComponents, variables, newEditorTypes, useTailwind: true, safeMode });
        const vdom = mdx.renderMdxish(tree, { components: executedComponents, terms, variables, useTailwind: true });
        setMdxishError(null);
        setMdxishResult(vdom);
        if (showAst) {
          setMdxishHast(tree);
          try {
            const { processor, parserReadyContent } = mdx.mdxishAstProcessor(sanitized, { components: executedComponents, variables, newEditorTypes, safeMode });
            setMdxishMdast(processor.runSync(processor.parse(parserReadyContent)));
          } catch {
            setMdxishMdast(null);
          }
        }
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

    if (showRmdx || (!legacy && !mdxish)) renderRMDX();
    if (mdxish) renderXish();
    if (legacy) renderRDMD();
  }, [doc, lazyImages, safeMode, copyButtons, showRmdx, legacy, mdxish, stripComments, showAst, newEditorTypes]);


  const darkMode = darkModeDataAttribute ? 'data-theme' : null;

  const renderPanel = (pipeline: PipelineKey) => {
    const error = pipeline === 'rmdx' ? rmdxError : pipeline === 'mdxish' ? mdxishError : legacyError;

    const Toc = pipeline === 'rmdx' ? rmdxResult.Toc : pipeline === 'mdxish' ? mdxishResult.Toc : null;

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
            <div style={{ display: 'flex', gap: '2rem' }}>
              <div className="markdown-body">{content}</div>
              {showToc && Toc && <div className="content-toc"><Toc /></div>}
            </div>
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
        {(hasAnyStripped || showAst) && (
          <div className="rdmd-demo--view-toggle">
            <button
              className={view === 'rendered' ? 'active' : ''}
              onClick={() => setView('rendered')}
              type="button"
            >
              Rendered
            </button>
            {hasAnyStripped && (
              <button
                className={view === 'markdown' ? 'active' : ''}
                onClick={() => setView('markdown')}
                type="button"
              >
                Markdown
              </button>
            )}
            {showAst && (
              <button
                className={view === 'mdast' ? 'active' : ''}
                onClick={() => setView('mdast')}
                type="button"
              >
                MDAST
              </button>
            )}
            {showAst && (
              <button
                className={view === 'hast' ? 'active' : ''}
                onClick={() => setView('hast')}
                type="button"
              >
                HAST
              </button>
            )}
          </div>
        )}
        {view === 'markdown' && hasAnyStripped ? (
          <div className="rdmd-demo--panels">
            {activePipelines.map(p => {
              const { error, stripped } = stripByPipeline[p];
              return (
                <div key={p} className="rdmd-demo--panel">
                  <div className="rdmd-demo--panel-label">{pipelineLabels[p]}</div>
                  {error && (
                    <div className="rdmd-demo--strip-error">
                      <strong>stripComments error:</strong> {error}
                    </div>
                  )}
                  {stripped !== null ? (
                    <pre className="rdmd-demo--stripped-output">{stripped}</pre>
                  ) : (
                    !error && <div className="rdmd-demo--empty">No stripped output for this pipeline</div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (view === 'mdast' || view === 'hast') && showAst ? (
          <div className="rdmd-demo--panels">
            {activePipelines.map(p => {
              const ast =
                view === 'mdast'
                  ? p === 'rmdx' ? rmdxMdast : p === 'mdxish' ? mdxishMdast : null
                  : p === 'rmdx' ? rmdxHast : p === 'mdxish' ? mdxishHast : null;
              return (
                <div key={p} className="rdmd-demo--panel">
                  <div className="rdmd-demo--panel-label">{pipelineLabels[p]} {view.toUpperCase()}</div>
                  {ast ? (
                    <pre className="rdmd-demo--ast-output">{JSON.stringify(ast, null, 2)}</pre>
                  ) : (
                    <div className="rdmd-demo--empty">No {view.toUpperCase()} available for this pipeline</div>
                  )}
                </div>
              );
            })}
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
