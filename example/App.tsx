import React from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';

import './demo.scss';

import Root from './Root';
import docs from './docs';

const App = () => {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Root />} path="/:fixture" />
        <Route path="*" element={<Navigate to={`${Object.keys(docs)[0]}`} replace />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
