import React from 'react';

import Header from './Header';
import Doc from './Doc';
import { useParams, useSearchParams } from 'react-router-dom';
import Form from './Form';

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
