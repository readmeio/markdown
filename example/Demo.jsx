import React from 'react';

import Fixtures from './Fixtures';
import markdown from '../index.js';

function Markdown({ opts }) {
  return (
    <div className="markdown-demo-container">
      <div className="markdown-demo-content">
        <Fixtures
          render={fixture => {
            console.log('in render props', { fixture });
            return (
              <React.Fragment>
                <textarea name="demo-editor" value={fixture} />
                {markdown(fixture, opts)}
              </React.Fragment>
            );
          }}
        />
      </div>
    </div>
  );
}

export default Markdown;
