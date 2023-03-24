const fs = require('fs');

const htmlEncode = require('he');

const md = fs.readFileSync('./test.md', 'utf-8');

console.log({
  md,
  decoded: htmlEncode.decode(md),
});
