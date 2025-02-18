import React from 'react';
import { useSearchParams } from 'react-router-dom';

import Doc from './Doc';
import Form from './Form';
import Header from './Header';

const Root = () => {
  const [searchParams] = useSearchParams();
  const ci = searchParams.has('ci');

  return (
    <>
      {!ci && <Header />}
      <div className="rdmd-demo--container">
        <div className="rdmd-demo--content">
          {!ci && <Form />}
          <Doc />
        </div>
      </div>
    </>
  );
};

export default Root;
