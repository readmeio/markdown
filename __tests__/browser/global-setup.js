import 'core-js/stable';
import 'regenerator-runtime/runtime';
import { setup as setupPuppeteer } from 'jest-environment-puppeteer';

module.exports = async function globalSetup(globalConfig) {
  await setupPuppeteer(globalConfig);
};
