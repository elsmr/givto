const withOffline = require('next-offline');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

module.exports = withOffline({
  transformManifest: manifest => ['/'].concat(manifest),
  workboxOpts: {
    swDest: 'static/service-worker.js',
    debug: false,
    runtimeCaching: [
      {
        urlPattern: /^https?.*/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'https-calls',
          networkTimeoutSeconds: 15,
          expiration: {
            maxEntries: 150,
            maxAgeSeconds: 30 * 24 * 60 * 60 // 1 month
          },
          cacheableResponse: {
            statuses: [0, 200]
          }
        }
      }
    ]
  },
  webpack: config => {
    if (config.resolve.plugins) {
      config.resolve.plugins.push(new TsconfigPathsPlugin());
    } else {
      config.resolve.plugins = [new TsconfigPathsPlugin()];
    }

    const originalEntry = config.entry;
    config.entry = async () => {
      const entries = await originalEntry();

      if (
        entries['main.js'] &&
        !entries['main.js'].includes('./lib/frontend/polyfills.ts')
      ) {
        entries['main.js'].unshift('./lib/frontend/polyfills.ts');
      }

      return entries;
    };

    return config;
  },
  target: 'serverless'
});
