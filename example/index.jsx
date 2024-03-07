/* eslint-disable import/no-import-module-exports */
import React from 'react';
import ReactDOM from 'react-dom';
// eslint-disable-next-line import/no-extraneous-dependencies
import { AppContainer } from 'react-hot-loader';

import Demo from './Demo';

function render(Component) {
  ReactDOM.render(
    <AppContainer>
      <Component />
    </AppContainer>,
    document.getElementById('rdmd-demo'),
  );
}

render(Demo);

// Webpack Hot Module Replacement API
if (module.hot) {
  module.hot.accept('./Demo', () => render(Demo));
}
