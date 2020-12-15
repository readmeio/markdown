import React from 'react';
import PropTypes from 'prop-types';

import markdown from '../index';
import Fixtures from './Fixtures';
import Header from './Header';

require('./demo.scss');

function Markdown({ opts }) {
  return (
    <React.Fragment>
      <Header />
      <div className="rdmd-demo--container">
        <div className="rdmd-demo--content">
          <Fixtures
            render={({ select, fixture, name, onChange }) => {
              return (
                <React.Fragment>
                  <div className="rdmd-demo--editor">
                    {select}
                    <textarea name="demo-editor" onChange={onChange} value={fixture} />
                  </div>
                  <div className="rdmd-demo--display">
                    <h2 className="rdmd-demo--markdown-header">{name}</h2>
                    <div className="markdown-body">{markdown(fixture, opts)}</div>
                  </div>
                </React.Fragment>
              );
            }}
          />
        </div>
      </div>
    </React.Fragment>
  );
}

Markdown.propTypes = {
  opts: PropTypes.object,
};

export default Markdown;
