import PropTypes from 'prop-types';
import React from 'react';

import GlossaryContext from '../contexts/GlossaryTerms';
import markdown, { reactProcessor, reactTOC } from '../index';

import Fixtures from './Fixtures';
import Header from './Header';
import Router from './Router';

require('./demo.scss');

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

const Maybe = ({ when, children }) => when && children;

function DemoContent({ ci, children, fixture, name, onChange, opts }) {
  return (
    <React.Fragment>
      <Maybe when={!ci}>
        <div className="rdmd-demo--editor">
          <div className="rdmd-demo--editor-container">
            {children}
            <textarea name="demo-editor" onChange={onChange} value={fixture} />
          </div>
        </div>
      </Maybe>
      <div className="rdmd-demo--display">
        <section id="hub-content">
          <Maybe when={!ci}>
            <h2 className="rdmd-demo--markdown-header">{name}</h2>
          </Maybe>
          <div id="content-container">
            <div className="markdown-body">{markdown(fixture, opts)}</div>
            <section className="content-toc">{reactTOC(reactProcessor().parse(fixture), opts)}</section>
          </div>
        </section>
      </div>
    </React.Fragment>
  );
}

DemoContent.propTypes = {
  children: PropTypes.node.isRequired,
  ci: PropTypes.bool,
  fixture: PropTypes.string,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  opts: PropTypes.object,
};

function Demo({ opts }) {
  return (
    <GlossaryContext.Provider value={terms}>
      <Router
        render={({ route, getRoute, params, setQuery }) => {
          return (
            <>
              {!params.ci && <Header />}
              <div className="rdmd-demo--container">
                <div className="rdmd-demo--content">
                  <Fixtures
                    ci={params.ci}
                    getRoute={getRoute}
                    lazyImages={params['lazy-images']}
                    render={({ options, ...props }) => (
                      <DemoContent {...props} ci={!!params.ci} opts={{ ...opts, ...options }} />
                    )}
                    safeMode={params['safe-mode']}
                    selected={route}
                    setQuery={setQuery}
                  />
                </div>
              </div>
            </>
          );
        }}
      />
    </GlossaryContext.Provider>
  );
}

Demo.propTypes = {
  opts: PropTypes.object,
};

export default Demo;
