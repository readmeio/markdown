const React = require('react');
const ReactDOM = require('react-dom/server');
const fs = require('node:fs');
const { Blob } = require('node:buffer');

const rmdx = require('..');

const filenames = process.argv.splice(2);

// https://stackoverflow.com/a/14919494
function humanFileSize(bytes, si = false, dp = 1) {
  const thresh = si ? 1000 : 1024;

  if (Math.abs(bytes) < thresh) {
    return `${bytes} B`;
  }

  const units = si
    ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
  let u = -1;
  const r = 10 ** dp;

  do {
    // eslint-disable-next-line no-param-reassign
    bytes /= thresh;
    // eslint-disable-next-line no-plusplus
    ++u;
  } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);

  return `${bytes.toFixed(dp)} ${units[u]}`;
}

const promises = filenames.map(file => {
  const doc = fs.readFileSync(file, { encoding: 'utf8' }).toString();
  const then = Date.now();

  const code = rmdx.compile(doc);

  const compileTime = Date.now() - then;
  const runStart = Date.now();

  return rmdx.run(code).then(({ default: Component }) => {
    const runTime = Date.now() - runStart;

    ReactDOM.renderToString(React.createElement(Component));
    const total = Date.now() - then;

    return {
      timing: {
        compileTime,
        runTime,
        total,
      },
      file,
      size: new Blob([doc]).size,
    };
  });
});

Promise.all(promises).then(runs => {
  console.log(JSON.stringify(runs, null, 2));
});
