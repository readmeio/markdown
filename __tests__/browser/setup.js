/* global page */
import { toMatchImageSnapshot } from 'jest-image-snapshot';
//import path from 'path';

//const kebabCase = str => str.replace(/[ .]/g, '-').replace(/['"]/g, '');

//async function customToMatchImageSnapshot(...args) {
  //const { pass, ...rest } = toMatchImageSnapshot.bind(this)(...args);

  //if (!pass) {
    //const { testPath, currentTestName, snapshotState } = this;

    //// copied from: https://github.com/americanexpress/jest-image-snapshot/blob/b82b068c6e001a2e098ac2fbde3abc55ffeb493b/src/index.js#L109
    //const counter = snapshotState._counters.get(currentTestName); // eslint-disable-line no-underscore-dangle
    //const snapshotName = kebabCase(`${path.basename(testPath)}-${currentTestName}-${counter}-ci`);
    //const snapshotPath = `${path.dirname(testPath)}/__image_snapshots__/${snapshotName}.png`;

    //await page.screenshot({ fullPage: true, path: snapshotPath });
  //}

  //return { pass, ...rest };
//}

expect.extend({ toMatchImageSnapshot });
