import React from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';

import './demo.scss';
import docs from './docs';
import Root from './Root';

const App = () => {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Root />} path="/:fixture" />
        <Route element={<Navigate replace to={`${Object.keys(docs)[0]}`} />} path="*" />
      </Routes>
    </HashRouter>
  );
};

export default App;
