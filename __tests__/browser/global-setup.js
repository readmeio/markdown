import { setup as setupPuppeteer } from 'jest-environment-puppeteer';

module.exports = async function globalSetup(globalConfig) {
  await setupPuppeteer(globalConfig);
};
