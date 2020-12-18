/* global page */
import { toMatchImageSnapshot } from 'jest-image-snapshot';
import path from 'path';

const kebabCase = str => str.replace(/[ .]/g, '-').replace(/['"]/g, '');

async function customToMatchImageSnapshot(...args) {
  const { pass, message } = toMatchImageSnapshot.bind(this)(...args);

  if (!pass) {
    const { testPath, currentTestName } = this;

    // copied from: https://github.com/americanexpress/jest-image-snapshot/blob/b82b068c6e001a2e098ac2fbde3abc55ffeb493b/src/index.js#L109
    const snapshotName = kebabCase(`${path.basename(testPath)}-${currentTestName}-ci`);
    const snapshotPath = `${path.dirname(testPath)}/__image_snapshots__/${snapshotName}.png`;

    // eslint-disable-next-line no-console
    console.log(message);

    await page.screenshot({ fullPage: true, path: snapshotPath });
  }

  return { pass, message };
}

expect.extend({ toMatchImageSnapshot: customToMatchImageSnapshot });
