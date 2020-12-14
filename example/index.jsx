import React from 'react';
import ReactDOM from 'react-dom';
import { AppContainer } from 'react-hot-loader';

import Demo from './Demo';

function render(Component) {
  ReactDOM.render(
    <AppContainer>
      <Component />
    </AppContainer>,
    document.getElementById('rdmd-demo')
  );
}

render(Demo);

// Webpack Hot Module Replacement API
if (module.hot) {
  module.hot.accept('./Demo', () => render(Demo));
}
