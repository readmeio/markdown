import React from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';

import GlossaryContext from '../contexts/GlossaryTerms.js';

require('./demo.scss');

import Root from './Root';
import docs from './docs';

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

const App = () => {
  return (
    <GlossaryContext.Provider value={terms}>
      <HashRouter>
        <Routes>
          <Route element={<Root />} path="/:fixture" />
          <Route path="*" element={<Navigate to={`${Object.keys(docs)[0]}`} replace />} />
        </Routes>
      </HashRouter>
    </GlossaryContext.Provider>
  );
};

export default App;
