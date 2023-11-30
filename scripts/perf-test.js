const childProcess = require('child_process');
const { Blob } = require('node:buffer');

const rdmd = require('..');

const mdBuffer = childProcess.execSync('cat ./docs/*', { encoding: 'utf8' });

const createDoc = bytes => {
  let doc = '';

  while (new Blob([doc]).size < bytes) {
    const start = Math.ceil(Math.random() * mdBuffer.length);
    doc += mdBuffer.slice(start, start + bytes);
  }

  return doc;
};

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

const max = 8;

console.log('n : string size : duration');

new Array(max).fill(0).forEach((_, i) => {
  const bytes = 10 ** i;
  const doc = createDoc(bytes);
  const then = Date.now();

  rdmd.mdast(doc);
  const duration = Date.now() - then;

  console.log(`${i} : ${humanFileSize(new Blob([doc]).size)} : ${duration / 1000} s`);
});
