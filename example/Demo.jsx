import React from 'react';
import markdown from '../index.js';

function Markdown({ text, opts }) {
  console.log(text);
  return <div>{markdown(text, opts)}</div>;
}

export default Markdown
