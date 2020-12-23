import React from 'react';
import PropTypes from 'prop-types';
// eslint-disable-next-line import/no-extraneous-dependencies
import { LabeledCheckbox, Textarea } from '@readme/ui';

import markdown from '../index';
import Fixtures from './Fixtures';
import Header from './Header';
import Router from './Router';
import Params from './Params';
import Options from './Options';

require('./demo.scss');

function DemoContent({ params, children, fixture, name, onChange, opts, setParams }) {
  const options = { ...opts, ...params };

  if (params.ci) {
    return (
      <div className="rdmd-demo--display">
        <div className="markdown-body">{markdown(fixture, options)}</div>
      </div>
    );
  }

  return (
    <React.Fragment>
      <div className="rdmd-demo--editor">
        <div className="rdmd-demo--editor-container">
          <Options params={params} setParams={setParams} />
          {children}
          <Textarea name="demo-editor" onChange={onChange} value={fixture} />
        </div>
      </div>
      <div className="rdmd-demo--display">
        <h2 className="rdmd-demo--markdown-header">{name}</h2>
        <div className="markdown-body">{markdown(fixture, options)}</div>
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
  params: PropTypes.obj,
  setParams: PropTypes.func.isRequired,
};

function Demo({ opts }) {
  return (
    <Params>
      {({ params, setParams }) => (
        <React.Fragment>
          {!params.ci && <Header />}
          <div className="rdmd-demo--container">
            <div className="rdmd-demo--content">
              <Router>
                {({ route, getRoute }) => (
                  <Fixtures getRoute={getRoute} params={params} selected={route}>
                    {props => <DemoContent {...props} opts={opts} params={params} setParams={setParams} />}
                  </Fixtures>
                )}
              </Router>
            </div>
          </div>
        </React.Fragment>
      )}
    </Params>
  );
}

Demo.propTypes = {
  opts: PropTypes.obj,
};

export default Demo;
