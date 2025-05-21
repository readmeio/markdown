import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import Doc from './Doc';
import Form from './Form';
import Header from './Header';

const Root = () => {
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('system');
  const [searchParams] = useSearchParams();
  const ci = searchParams.has('ci');

  return (
    <div data-color-mode={theme}>
      {!ci && <Header setTheme={setTheme} theme={theme} />}
      <div className="rdmd-demo--container">
        <div className="rdmd-demo--content">
          {!ci && <Form />}
          <Doc />
        </div>
      </div>
    </div>
  );
};

export default Root;
