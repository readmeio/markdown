import React from 'react';
import ReactDOM from 'react-dom';
import { AppContainer } from 'react-hot-loader';

import Demo from './Demo';

function render(Component) {
  ReactDOM.render(
    <AppContainer>
      <Component text="# hello kelly!!!" />
    </AppContainer>,
    document.getElementById('markdown')
  );
}

render(Demo);

// Webpack Hot Module Replacement API
if (module.hot) {
  module.hot.accept('./Demo', () => render(Demo)); // eslint-disable-line global-require
}
