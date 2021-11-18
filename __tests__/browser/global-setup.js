import { setup as setupPuppeteer } from 'jest-environment-puppeteer';

export default async function globalSetup(globalConfig) {
  await setupPuppeteer(globalConfig);
}
