import React, { useState } from 'react';
import ReactDOM from 'react-dom';

import syntaxFixtures from './Syntax';

const initialFixture = Object.keys(syntaxFixtures)[0];

const Fixtures = props => {
  const [fixture, setFixture] = useState(initialFixture);
  const onChange = event => setFixture(event.target.value);

  return (
    <React.Fragment>
      <select name="fixture-select" onChange={onChange} value={fixture}>
        {Object.keys(syntaxFixtures).map(name => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
      {props.render(syntaxFixtures[fixture].doc)}
    </React.Fragment>
  );
};

export default Fixtures;
