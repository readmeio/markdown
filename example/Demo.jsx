import React from 'react';
import PropTypes from 'prop-types';

import markdown from '../index';
import Fixtures from './Fixtures';
import Header from './Header';
import Router from './Router';

require('./demo.scss');

function DemoContent({ children, fixture, name, onChange, opts }) {
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

function Demo({ opts }) {
  return (
    <React.Fragment>
      <Header />
      <div className="rdmd-demo--container">
        <div className="rdmd-demo--content">
          <Router
            render={({ route, getRoute }) => {
              return (
                <Fixtures
                  getRoute={getRoute}
                  render={props => <DemoContent {...props} opts={opts} />}
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
  opts: PropTypes.object,
};

export default Demo;
