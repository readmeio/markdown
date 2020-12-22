import React from 'react';
import PropTypes from 'prop-types';
// eslint-disable-next-line import/no-extraneous-dependencies
import { LabeledCheckbox, Textarea } from '@readme/ui';

import markdown from '../index';
import Fixtures from './Fixtures';
import Header from './Header';
import Router from './Router';
import Params from './Params';

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

  const toggle = param => () => {
    setParams({ [param]: !params[param] });
  };

  const toggles = ['compatabilityMode', 'copyButtons', 'correctnewlines'].map(param => (
    <LabeledCheckbox key={param} checked={!!params[param]} label={param} onChange={toggle(param)} type="toggle" />
  ));

  return (
    <React.Fragment>
      <div className="rdmd-demo--editor">
        <div className="rdmd-demo--editor-container">
          <fieldset className="rdmd-demo--options">
            <span className="rdmd-demo--label">options</span>
            <div className="rdmd-demo--toggles">{toggles}</div>
          </fieldset>
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
