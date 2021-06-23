module.exports = {
  launch: {
    product: 'chrome',
  },
  server: {
    command: 'npm run start',
    debug: true,
    port: process.env.PORT || 9966,
    protocol: 'http-get',
    launchTimeout: 45000,
  },
};
