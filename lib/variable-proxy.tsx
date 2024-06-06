import React from 'react';
import { Variable } from '@readme/variable';

const VariableProxy = () =>
  new Proxy(
    {},
    {
      get(_, prop) {
        return <Variable name={prop} />;
      },
    },
  );

export default VariableProxy;
