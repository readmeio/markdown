import PropTypes from 'prop-types';
import React from 'react';

import { CodeTabs } from '../CodeTabs';

const Div = props => {
  if (props.className === 'code-tabs') {
    return <CodeTabs {...props} />;
  }

  const { theme, ...rest } = props;

  // eslint-disable-next-line react/jsx-props-no-spreading
  return <div {...rest} />;
};

Div.propTypes = {
  children: PropTypes.arrayOf(PropTypes.any),
  className: PropTypes.string,
  theme: PropTypes.string,
};

const CreateDiv = ({ theme }) => {
  const DivWrapper = props => <Div theme={theme} {...props} />;
  return DivWrapper;
};

export default CreateDiv;
