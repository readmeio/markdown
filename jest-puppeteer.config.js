module.exports = {
  launch: {
    args: ['--no-sandbox'],
    dumpio: true,
  },
  server: {
    command: 'npm run start',
    debug: true,
    port: process.env.PORT || 9966,
    protocol: 'http-get',
    launchTimeout: 60000,
  },
};
