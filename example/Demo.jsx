import React from 'react';
import PropTypes from 'prop-types';

import markdown from '../index';
import Fixtures from './Fixtures';
import Header from './Header';
import Router from './Router';

require('./demo.scss');

function DemoContent({ ci, children, fixture, name, onChange, opts }) {
  if (ci) {
    return (
      <div className="rdmd-demo--display">
        <div className="markdown-body">{markdown(fixture, opts)}</div>
      </div>
    );
  }

  return (
    <React.Fragment>
      <div className="rdmd-demo--editor">
        <div className="rdmd-demo--editor-container">
          {children}
          <textarea name="demo-editor" onChange={onChange} value={fixture} />
        </div>
      </div>
      <div className="rdmd-demo--display">
        <h2 className="rdmd-demo--markdown-header">{name}</h2>
        <div className="markdown-body">{markdown(fixture, opts)}</div>
      </div>
    </React.Fragment>
  );
}

DemoContent.propTypes = {
  children: PropTypes.node.isRequired,
  fixture: PropTypes.string,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  opts: PropTypes.obj,
};

function Demo({ opts }) {
  const ci = new URLSearchParams(location.search).get('ci');

  return (
    <React.Fragment>
      {!ci && <Header />}
      <div className="rdmd-demo--container">
        <div className="rdmd-demo--content">
          <Router
            render={({ route, getRoute }) => {
              return (
                <Fixtures
                  ci={ci}
                  getRoute={getRoute}
                  render={props => <DemoContent {...props} ci={ci} opts={opts} />}
                  selected={route}
                />
              );
            }}
          />
        </div>
      </div>
    </React.Fragment>
  );
}

Demo.propTypes = {
  opts: PropTypes.obj,
};

export default Demo;
