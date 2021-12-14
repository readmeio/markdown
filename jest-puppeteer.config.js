module.exports = {
  server: {
    command: 'npm run start',
    debug: true,
    port: process.env.PORT || 9966,
    protocol: 'http-get',
    launchTimeout: 45000,
  },
  // launch: {
  //   // https://docs.browserless.io/blog/2020/09/30/puppeteer-print.html
  //   args: ['--font-render-hinting=none'],
  // },
};
