const rmdx = require('.');

const ast = rmdx.mdast(`
<HTMLBlock>{\`
  <div />
\`}</HTMLBlock>
`);

console.log(JSON.stringify(ast, null, 2));
