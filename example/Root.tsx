import React from 'react';

import Header from './Header';
import Doc from './Doc';
import { useParams } from 'react-router-dom';
import Form from './Form';

const Root = () => {
  const { ci } = useParams();

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
